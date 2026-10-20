const { chromium } = require('playwright');
const EventEmitter = require('events');
const { db } = require('./db');

class PlaybackRunner extends EventEmitter {
  constructor() {
    super();
    this.activeJob = null;
  }

  isBusy() {
    return this.activeJob !== null;
  }

  getActiveJobStatus() {
    if (!this.activeJob) return null;
    return {
      runId: this.activeJob.runId,
      videoUrl: this.activeJob.videoUrl,
      videoTitle: this.activeJob.videoTitle,
      repetitionIndex: this.activeJob.currentRepetition,
      targetRepetitions: this.activeJob.targetRepetitions,
      targetDuration: this.activeJob.targetDuration,
      concurrency: this.activeJob.concurrency || 1,
      playFullVideo: this.activeJob.playFullVideo,
      playbackSpeed: this.activeJob.playbackSpeed || 1,
      status: this.activeJob.status,
      elapsedSeconds: this.activeJob.elapsedSeconds || 0,
      totalVideoDuration: this.activeJob.totalVideoDuration || 0,
      activeStreamsCount: this.activeJob.activeContexts ? this.activeJob.activeContexts.size : 0,
      logs: this.activeJob.logs ? this.activeJob.logs.slice(-30) : []
    };
  }

  async stopActiveJob() {
    if (!this.activeJob) {
      return { success: false, message: 'No active playback test is running.' };
    }

    const { runId, activeContexts, sharedBrowser } = this.activeJob;
    this.activeJob.isAborted = true;
    this.activeJob.status = 'stopping';

    this.emitLog(runId, null, 'Cancellation requested by user. Terminating all active parallel browser sessions...', 'warn');

    if (activeContexts) {
      for (const ctx of activeContexts) {
        try {
          await ctx.close().catch(() => {});
        } catch (e) {}
      }
      activeContexts.clear();
    }

    if (sharedBrowser) {
      try {
        await sharedBrowser.close().catch(() => {});
      } catch (e) {}
      this.activeJob.sharedBrowser = null;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE test_runs 
      SET status = 'stopped', updated_at = ?, error_message = 'Test terminated by user'
      WHERE id = ? AND status = 'running'
    `).run(now, runId);

    db.prepare(`
      UPDATE test_items
      SET status = 'stopped', error_message = 'Test cancelled by user', completed_at = ?
      WHERE run_id = ? AND status = 'running'
    `).run(now, runId);

    this.emit('test_stopped', { runId, message: 'Playback test was stopped by user.' });
    this.activeJob = null;

    return { success: true, message: 'Playback test stopped successfully.' };
  }

  emitLog(runId, repetitionIndex, message, level = 'info') {
    const logItem = {
      timestamp: new Date().toISOString(),
      runId,
      repetitionIndex,
      level,
      message
    };

    if (this.activeJob && this.activeJob.runId === runId) {
      if (!this.activeJob.logs) this.activeJob.logs = [];
      this.activeJob.logs.push(logItem);
    }

    this.emit('log', logItem);
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async startTest({
    runId,
    videoUrl,
    videoId,
    videoTitle,
    targetRepetitions = 1,
    targetDurationSeconds = 15,
    concurrency = 10,
    playFullVideo = true,
    playbackSpeed = 1,
    browserType = 'chromium',
    headless = false
  }) {
    if (this.isBusy()) {
      throw new Error('A playback QA test is already in progress. Please wait for it to finish or click Stop Test.');
    }

    const maxConcurrency = Math.max(1, Math.min(10, parseInt(concurrency, 10) || 1));

    this.activeJob = {
      runId,
      videoUrl,
      videoId,
      videoTitle,
      targetRepetitions,
      targetDuration: targetDurationSeconds,
      concurrency: maxConcurrency,
      playFullVideo: Boolean(playFullVideo),
      playbackSpeed: parseFloat(playbackSpeed) || 1,
      browserType,
      headless,
      currentRepetition: 1,
      completedRepetitions: 0,
      status: 'starting',
      isAborted: false,
      elapsedSeconds: 0,
      totalVideoDuration: 0,
      logs: [],
      activeContexts: new Set(),
      sharedBrowser: null
    };

    this.emit('test_started', {
      runId,
      videoUrl,
      videoTitle,
      targetRepetitions,
      targetDurationSeconds,
      concurrency: maxConcurrency,
      playFullVideo: Boolean(playFullVideo),
      playbackSpeed
    });

    this.runJobLoop(runId).catch(err => {
      console.error(`[PlaybackRunner] Uncaught error in job ${runId}:`, err);
    });

    return { success: true, runId };
  }

  async getSharedBrowser(job) {
    if (job.sharedBrowser && job.sharedBrowser.isConnected()) {
      return job.sharedBrowser;
    }

    const isNoDisplayLinux = process.platform === 'linux' && !process.env.DISPLAY;
    const effectiveHeadless = isNoDisplayLinux ? true : Boolean(job.headless);

    this.emitLog(
      job.runId,
      null,
      `Initializing shared Chromium engine (Headless: ${effectiveHeadless ? 'YES' : 'NO'}${isNoDisplayLinux && !job.headless ? ' - cloud container' : ''})...`
    );

    const browser = await chromium.launch({
      headless: effectiveHeadless,
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-zygote',
        '--mute-audio',
        '--window-size=1280,720'
      ]
    });

    job.sharedBrowser = browser;
    return browser;
  }

  async runJobLoop(runId) {
    const job = this.activeJob;
    if (!job || job.runId !== runId) return;

    const concurrency = Math.max(1, Math.min(10, job.concurrency || 1));
    const workerCount = Math.min(concurrency, job.targetRepetitions);

    // Queue of repetition numbers: e.g. [1, 2, 3, ..., 15]
    const queue = Array.from({ length: job.targetRepetitions }, (_, i) => i + 1);

    let completedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    const modeStr = job.playFullVideo ? 'Complete Video (Start to End)' : `${job.targetDuration}s fixed duration`;
    this.emitLog(
      runId,
      null,
      `Launching Parallel QA Pipeline: ${job.targetRepetitions} total cycles with ${workerCount} parallel streams running simultaneously (Mode: ${modeStr}, Speed: ${job.playbackSpeed}x)...`,
      'info'
    );

    try {
      await this.getSharedBrowser(job);
    } catch (launchErr) {
      this.emitLog(runId, null, `Failed to launch Chromium engine: ${launchErr.message}`, 'error');
      db.prepare(`UPDATE test_runs SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`)
        .run(launchErr.message, new Date().toISOString(), runId);
      this.emit('test_completed', {
        runId,
        status: 'failed',
        successCount: 0,
        failureCount: job.targetRepetitions,
        totalRepetitions: job.targetRepetitions
      });
      this.activeJob = null;
      return;
    }

    // Worker definition: pulls next repetition from queue when ready
    const runWorker = async (workerId) => {
      // Stagger worker start to eliminate instant CPU and RAM spikes on container launch
      if (workerId > 1) {
        await new Promise(r => setTimeout(r, (workerId - 1) * 500));
      }

      while (queue.length > 0 && !job.isAborted) {
        const rep = queue.shift();
        if (!rep) break;

        job.currentRepetition = rep;
        job.status = 'running';

        const itemStartTime = new Date().toISOString();

        const insertResult = db.prepare(`
          INSERT INTO test_items (run_id, repetition_index, status, playback_duration_achieved, logs_json, started_at)
          VALUES (?, ?, 'running', 0, '[]', ?)
        `).run(runId, rep, itemStartTime);
        const itemId = insertResult.lastInsertRowid;

        this.emit('repetition_started', {
          runId,
          repetitionIndex: rep,
          totalRepetitions: job.targetRepetitions,
          workerId,
          activeStreamsCount: job.activeContexts ? job.activeContexts.size + 1 : 1,
          playFullVideo: job.playFullVideo
        });

        this.emitLog(runId, rep, `[Stream ${workerId}] Launched parallel session for Repetition ${rep} of ${job.targetRepetitions}...`);

        let repResult = null;
        let attempts = 0;
        while (attempts < 2 && !job.isAborted) {
          attempts++;
          try {
            repResult = await this.executeSingleRepetition(job, rep, workerId);
            if (repResult.success) break;

            const isCrash = repResult.error && (
              repResult.error.toLowerCase().includes('crash') ||
              repResult.error.toLowerCase().includes('closed') ||
              repResult.error.toLowerCase().includes('destroyed')
            );

            if (isCrash && attempts < 2 && !job.isAborted) {
              this.emitLog(runId, rep, `[Stream ${workerId}] Detected transient container glitch (${repResult.error}). Auto-recovering session (retry 2/2)...`, 'warn');
              await new Promise(r => setTimeout(r, 1200));
              continue;
            }
            break;
          } catch (err) {
            const isCrash = err.message && (
              err.message.toLowerCase().includes('crash') ||
              err.message.toLowerCase().includes('closed') ||
              err.message.toLowerCase().includes('destroyed')
            );

            if (isCrash && attempts < 2 && !job.isAborted) {
              this.emitLog(runId, rep, `[Stream ${workerId}] Transient error caught. Retrying repetition ${rep}...`, 'warn');
              await new Promise(r => setTimeout(r, 1200));
              continue;
            }

            repResult = {
              success: false,
              achievedDuration: 0,
              error: err.message || 'Unknown automation error'
            };
            break;
          }
        }

        if (job.isAborted) break;

        completedCount++;
        job.completedRepetitions = completedCount;
        const itemCompletedTime = new Date().toISOString();

        if (repResult.success) {
          successCount++;
          const achievedFormatted = this.formatTime(repResult.achievedDuration);
          this.emitLog(runId, rep, `[Stream ${workerId}] Repetition ${rep} of ${job.targetRepetitions} finished successfully! (${achievedFormatted})`, 'success');

          db.prepare(`
            UPDATE test_items
            SET status = 'success', playback_duration_achieved = ?, logs_json = ?, completed_at = ?
            WHERE id = ?
          `).run(repResult.achievedDuration, JSON.stringify(job.logs || []), itemCompletedTime, itemId);
        } else {
          failureCount++;
          this.emitLog(runId, rep, `[Stream ${workerId}] Repetition ${rep} failed: ${repResult.error}`, 'error');

          db.prepare(`
            UPDATE test_items
            SET status = 'failed', playback_duration_achieved = ?, error_message = ?, logs_json = ?, completed_at = ?
            WHERE id = ?
          `).run(repResult.achievedDuration, repResult.error, JSON.stringify(job.logs || []), itemCompletedTime, itemId);
        }

        db.prepare(`
          UPDATE test_runs
          SET completed_repetitions = ?, success_count = ?, failure_count = ?, updated_at = ?
          WHERE id = ?
        `).run(completedCount, successCount, failureCount, itemCompletedTime, runId);

        this.emit('repetition_completed', {
          runId,
          repetitionIndex: rep,
          totalRepetitions: job.targetRepetitions,
          completedCount,
          workerId,
          status: repResult.success ? 'success' : 'failed',
          achievedDuration: repResult.achievedDuration,
          error: repResult.error || null,
          successCount,
          failureCount
        });
      }
    };

    // Execute up to 10 workers in parallel!
    await Promise.all(
      Array.from({ length: workerCount }, (_, i) => runWorker(i + 1))
    );

    // Clean up shared browser
    if (job.sharedBrowser) {
      try {
        await job.sharedBrowser.close().catch(() => {});
      } catch (e) {}
      job.sharedBrowser = null;
    }

    if (job.isAborted) {
      this.emitLog(runId, null, 'Playback test execution aborted by user.', 'warn');
      return;
    }

    const finalStatus = failureCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
    const finishTime = new Date().toISOString();

    db.prepare(`
      UPDATE test_runs
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(finalStatus, finishTime, runId);

    this.emit('test_completed', {
      runId,
      status: finalStatus,
      successCount,
      failureCount,
      totalRepetitions: job.targetRepetitions
    });

    this.emitLog(
      runId,
      null,
      `All ${job.targetRepetitions} parallel playback QA tests completed! Passed: ${successCount}, Failed: ${failureCount}`,
      'info'
    );

    this.activeJob = null;
  }

  async executeSingleRepetition(job, rep, workerId) {
    let context = null;
    let page = null;
    let achievedDuration = 0;

    try {
      const browser = await this.getSharedBrowser(job);

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'en-US'
      });

      if (job.activeContexts) {
        job.activeContexts.add(context);
      }

      if (job.isAborted) {
        if (job.activeContexts) job.activeContexts.delete(context);
        await context.close().catch(() => {});
        return { success: false, achievedDuration: 0, error: 'Cancelled' };
      }

      page = await context.newPage();

      // Intercept and abort heavy non-essential assets to keep memory minimal on Docker/Railway
      await page.route('**/*', (route) => {
        const req = route.request();
        const type = req.resourceType();
        const url = req.url();
        if (
          type === 'image' ||
          type === 'font' ||
          url.includes('google-analytics.com') ||
          url.includes('doubleclick.net')
        ) {
          return route.abort();
        }
        return route.continue();
      });

      this.emitLog(job.runId, rep, `[Stream ${workerId}] Navigating to video...`);
      await page.goto(job.videoUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      if (job.isAborted) throw new Error('Test cancelled by user');

      await this.handleConsentDialogs(page, job.runId, rep);

      if (job.isAborted) throw new Error('Test cancelled by user');

      const availabilityCheck = await this.checkVideoAvailability(page);
      if (!availabilityCheck.available) {
        throw new Error(`Video unavailable: ${availabilityCheck.reason}`);
      }

      await page.waitForSelector('video', { timeout: 15000 });

      const playbackSpeed = job.playbackSpeed || 1;
      await page.evaluate((speed) => {
        const v = document.querySelector('video');
        if (v) {
          v.muted = true;
          v.playbackRate = speed;
          if (v.paused) v.play().catch(() => {});
        }
      }, playbackSpeed);

      await page.waitForTimeout(1000);

      const isPaused = await page.evaluate(() => {
        const v = document.querySelector('video');
        return v ? v.paused : true;
      });

      if (isPaused) {
        const playButton = await page.$('.ytp-play-button, button.ytp-large-play-button, video');
        if (playButton) await playButton.click().catch(() => {});
      }

      const playbackStarted = await this.verifyPlaybackStarted(page, job, rep, 15000);
      if (!playbackStarted.started) {
        throw new Error(`Playback verification failed: ${playbackStarted.reason}`);
      }

      const initialMetrics = await page.evaluate(() => {
        const v = document.querySelector('video');
        return { duration: v ? v.duration : 0, currentTime: v ? v.currentTime : 0 };
      });

      const videoDuration = initialMetrics.duration || job.targetDuration || 60;
      job.totalVideoDuration = videoDuration;
      const formattedTotal = this.formatTime(videoDuration);

      this.emitLog(
        job.runId,
        rep,
        `[Stream ${workerId}] Playback active! Observing ${job.playFullVideo ? 'full video' : `${job.targetDuration}s`} (Length: ${formattedTotal})...`,
        'success'
      );

      const startTime = Date.now();
      let lastReportedSec = 0;
      let adCheckCounter = 0;

      while (!job.isAborted) {
        adCheckCounter++;
        if (adCheckCounter % 3 === 0) {
          await this.handleYouTubeAds(page, job.runId, rep);
        }

        const state = await page.evaluate((speed) => {
          const v = document.querySelector('video');
          const player = document.querySelector('#movie_player');
          const isAd = player ? player.classList.contains('ad-showing') : false;

          if (!v) return { exists: false };
          if (speed && v.playbackRate !== speed) v.playbackRate = speed;

          return {
            exists: true,
            currentTime: v.currentTime,
            duration: v.duration,
            paused: v.paused,
            ended: v.ended,
            readyState: v.readyState,
            isAdShowing: isAd,
            error: v.error ? (v.error.message || `MediaError code ${v.error.code}`) : null
          };
        }, playbackSpeed).catch(() => ({ exists: false, error: 'Failed to evaluate player state' }));

        if (!state.exists) {
          throw new Error('Video player unmounted unexpectedly during playback.');
        }

        if (state.error) {
          throw new Error(`Player reported error: ${state.error}`);
        }

        achievedDuration = state.currentTime || 0;
        job.elapsedSeconds = achievedDuration;

        this.emit('player_state', {
          runId: job.runId,
          repetitionIndex: rep,
          workerId,
          elapsedSeconds: achievedDuration,
          targetDuration: job.targetDuration,
          currentTime: state.currentTime,
          duration: state.duration,
          paused: state.paused,
          isAdShowing: state.isAdShowing,
          readyState: state.readyState,
          activeStreamsCount: job.activeContexts ? job.activeContexts.size : 1
        });

        if (job.playFullVideo) {
          if ((state.ended || (state.duration > 0 && state.currentTime >= state.duration - 1)) && !state.isAdShowing) {
            this.emitLog(job.runId, rep, `[Stream ${workerId}] Reached natural video completion (${this.formatTime(state.currentTime)} / ${this.formatTime(state.duration)}).`, 'success');
            break;
          }
        } else {
          const wallElapsed = (Date.now() - startTime) / 1000;
          if (wallElapsed >= job.targetDuration) {
            break;
          }
        }

        if (state.paused && !state.ended && !state.isAdShowing) {
          await page.evaluate(() => {
            const v = document.querySelector('video');
            if (v && v.paused) v.play().catch(() => {});
          });
        }

        const currentSecInt = Math.floor(achievedDuration);
        if (currentSecInt > lastReportedSec && currentSecInt % 20 === 0) {
          lastReportedSec = currentSecInt;
          const currFmt = this.formatTime(state.currentTime);
          const durFmt = this.formatTime(state.duration || job.targetDuration);
          this.emitLog(job.runId, rep, `[Stream ${workerId} - Rep ${rep}] Playing: ${currFmt} / ${durFmt}`);
        }

        await page.waitForTimeout(1000);
      }

      if (context) {
        if (job.activeContexts) job.activeContexts.delete(context);
        await context.close().catch(() => {});
      }

      return {
        success: true,
        achievedDuration: achievedDuration
      };

    } catch (err) {
      if (context) {
        if (job.activeContexts) job.activeContexts.delete(context);
        await context.close().catch(() => {});
      }
      return {
        success: false,
        achievedDuration: achievedDuration,
        error: err.message || 'Playback automation error'
      };
    }
  }

  async handleYouTubeAds(page, runId, rep) {
    try {
      const skipSelectors = [
        'button.ytp-ad-skip-button',
        'button.ytp-skip-ad-button',
        '.ytp-ad-skip-button-modern',
        'button[class*="skip__button"]',
        '.ytp-ad-overlay-close-button',
        'button[aria-label*="Skip"]'
      ];

      for (const sel of skipSelectors) {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          this.emitLog(runId, rep, 'YouTube Ad detected. Clicking "Skip Ad"...', 'info');
          await btn.click().catch(() => {});
          return;
        }
      }
    } catch (e) {}
  }

  async handleConsentDialogs(page, runId, rep) {
    try {
      const consentSelectors = [
        'button[aria-label*="Accept all"]',
        'button[aria-label*="Reject all"]',
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'button:has-text("Reject all")',
        'form[action*="consent"] button'
      ];

      for (const sel of consentSelectors) {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1000);
          return;
        }
      }
    } catch (e) {}
  }

  async checkVideoAvailability(page) {
    try {
      const errorText = await page.evaluate(() => {
        const errorRenderer = document.querySelector('.yt-player-error-message-renderer, #error-screen, ytd-player-error-message-renderer');
        if (errorRenderer) {
          const text = errorRenderer.innerText || '';
          if (text.includes('Video unavailable') || text.includes('private') || text.includes('removed')) {
            return text.trim().slice(0, 150);
          }
        }

        const unavailableHeader = document.querySelector('div#reason, h1#reason');
        if (unavailableHeader && unavailableHeader.offsetParent !== null) {
          return unavailableHeader.innerText.trim();
        }

        return null;
      });

      if (errorText) {
        return { available: false, reason: errorText };
      }

      return { available: true };
    } catch (e) {
      return { available: true };
    }
  }

  async verifyPlaybackStarted(page, job, rep, timeoutMs = 15000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (job.isAborted) return { started: false, reason: 'Test cancelled' };

      const status = await page.evaluate(() => {
        const v = document.querySelector('video');
        if (!v) return { exists: false };
        return {
          exists: true,
          currentTime: v.currentTime,
          paused: v.paused,
          readyState: v.readyState,
          ended: v.ended
        };
      }).catch(() => ({ exists: false }));

      if (status.exists && status.currentTime > 0.1 && !status.paused) {
        return { started: true };
      }

      await page.evaluate(() => {
        const v = document.querySelector('video');
        if (v && v.paused) {
          v.play().catch(() => {});
        }
      }).catch(() => {});

      await page.waitForTimeout(800);
    }

    return {
      started: false,
      reason: 'Video playback did not initiate within 15 seconds.'
    };
  }
}

const playbackRunner = new PlaybackRunner();
module.exports = playbackRunner;
