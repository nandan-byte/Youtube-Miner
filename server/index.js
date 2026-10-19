require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { db, initDatabase, getSetting, setSetting } = require('./db');
const {
  requireAuth,
  loginLimiter,
  handleLogin,
  handleLogout,
  handleAuthStatus,
  handleChangePassword
} = require('./auth');
const { getVideoPreview } = require('./youtubeHelper');
const playbackRunner = require('./playbackRunner');
const { parseNaturalLanguageIntent, testAiConnection, getAiConfig } = require('./grokService');

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Enable CORS for local development (e.g. Vite dev server on 5173)
app.use(cors({
  origin: true,
  credentials: true
}));

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/login', loginLimiter, handleLogin);
app.post('/api/auth/logout', handleLogout);
app.get('/api/auth/status', handleAuthStatus);
app.post('/api/auth/change-password', requireAuth, handleChangePassword);

// ==========================================
// 2. YOUTUBE URL VALIDATION & PREVIEW
// ==========================================
app.get('/api/youtube/preview', requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ valid: false, error: 'YouTube URL query parameter is required.' });
  }

  const preview = await getVideoPreview(url);
  return res.json(preview);
});

// ==========================================
// 3. GROK / GROQ AI ROUTES
// ==========================================
app.post('/api/ai/parse-intent', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  const result = await parseNaturalLanguageIntent(prompt);
  return res.json(result);
});

app.post('/api/ai/test-connection', requireAuth, async (req, res) => {
  const result = await testAiConnection();
  return res.json(result);
});

// ==========================================
// 4. SETTINGS ROUTES
// ==========================================
app.get('/api/settings', requireAuth, (req, res) => {
  const { apiKey, apiBase, model } = getAiConfig();

  // Mask the API key for display
  let maskedKey = '';
  if (apiKey) {
    if (apiKey.length > 10) {
      maskedKey = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
    } else {
      maskedKey = '***';
    }
  }

  return res.json({
    grokApiKeyMasked: maskedKey,
    hasApiKey: Boolean(apiKey),
    grokApiBase: apiBase,
    grokModel: model,
    defaultBrowser: process.env.DEFAULT_BROWSER || 'chromium',
    headlessDefault: process.env.HEADLESS_DEFAULT === 'true',
    maxRepetitions: parseInt(process.env.MAX_REPETITIONS, 10) || 100,
    maxDurationSeconds: parseInt(process.env.MAX_DURATION_SECONDS, 10) || 14400
  });
});

app.post('/api/settings', requireAuth, (req, res) => {
  const { grokApiKey, grokApiBase, grokModel } = req.body;

  if (grokApiKey && typeof grokApiKey === 'string' && grokApiKey.trim()) {
    setSetting('grok_api_key', grokApiKey.trim());
  }

  if (grokApiBase && typeof grokApiBase === 'string') {
    setSetting('grok_api_base', grokApiBase.trim());
  }

  if (grokModel && typeof grokModel === 'string') {
    setSetting('grok_model', grokModel.trim());
  }

  return res.json({ success: true, message: 'Settings saved successfully.' });
});

// ==========================================
// 5. PLAYBACK TESTING ROUTES
// ==========================================

// Start Playback Test
app.post('/api/tests/start', requireAuth, async (req, res) => {
  try {
    if (playbackRunner.isBusy()) {
      return res.status(409).json({
        error: 'A playback QA test is currently running. Please wait for it to finish or click Stop Test.'
      });
    }

    const {
      url,
      repetitions = 1,
      duration = 15,
      concurrency = 10,
      playFullVideo = true,
      playbackSpeed = 1,
      browserType = 'chromium',
      headless = false
    } = req.body;

    // Validate URL
    const preview = await getVideoPreview(url);
    if (!preview.valid) {
      return res.status(400).json({ error: preview.error || 'Invalid YouTube URL' });
    }

    // Validate parameters
    const maxRep = parseInt(process.env.MAX_REPETITIONS, 10) || 100;
    const maxDur = parseInt(process.env.MAX_DURATION_SECONDS, 10) || 14400;

    const repCount = Math.max(1, Math.min(maxRep, parseInt(repetitions, 10) || 1));
    const isFull = Boolean(playFullVideo);
    const durSec = isFull
      ? (preview.durationSeconds || Math.max(5, parseInt(duration, 10) || 60))
      : Math.max(5, Math.min(maxDur, parseInt(duration, 10) || 15));
    const conc = Math.max(1, Math.min(10, parseInt(concurrency, 10) || 1));

    const runId = `qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Create test run in SQLite
    db.prepare(`
      INSERT INTO test_runs (
        id, video_url, video_id, video_title, browser_type, headless,
        target_repetitions, target_duration_seconds, completed_repetitions,
        success_count, failure_count, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'running', ?, ?)
    `).run(
      runId,
      preview.canonicalUrl,
      preview.videoId,
      preview.title,
      browserType,
      headless ? 1 : 0,
      repCount,
      durSec,
      now,
      now
    );

    // Launch playback QA test in background
    await playbackRunner.startTest({
      runId,
      videoUrl: preview.canonicalUrl,
      videoId: preview.videoId,
      videoTitle: preview.title,
      targetRepetitions: repCount,
      targetDurationSeconds: durSec,
      concurrency: conc,
      playFullVideo: isFull,
      playbackSpeed: parseFloat(playbackSpeed) || 1,
      browserType,
      headless: Boolean(headless)
    });

    return res.json({
      success: true,
      message: isFull
        ? `Playback QA test initiated for ${repCount} complete video cycles (${conc} parallel streams).`
        : `Playback QA test initiated for ${repCount} repetitions (${durSec}s each, ${conc} parallel streams).`,
      runId
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to start playback test' });
  }
});

// Stop running test immediately
app.post('/api/tests/stop', requireAuth, async (req, res) => {
  const result = await playbackRunner.stopActiveJob();
  return res.json(result);
});

// Get active job status
app.get('/api/tests/active', requireAuth, (req, res) => {
  const activeStatus = playbackRunner.getActiveJobStatus();
  return res.json({
    isBusy: playbackRunner.isBusy(),
    activeJob: activeStatus
  });
});

// Real-time SSE (Server-Sent Events) stream
app.get('/api/tests/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  // Event handlers
  const onLog = (data) => {
    res.write(`event: log\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onTestStarted = (data) => {
    res.write(`event: test_started\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onRepStarted = (data) => {
    res.write(`event: repetition_started\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onPlayerState = (data) => {
    res.write(`event: player_state\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onRepCompleted = (data) => {
    res.write(`event: repetition_completed\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onTestCompleted = (data) => {
    res.write(`event: test_completed\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onTestStopped = (data) => {
    res.write(`event: test_stopped\ndata: ${JSON.stringify(data)}\n\n`);
  };

  playbackRunner.on('log', onLog);
  playbackRunner.on('test_started', onTestStarted);
  playbackRunner.on('repetition_started', onRepStarted);
  playbackRunner.on('player_state', onPlayerState);
  playbackRunner.on('repetition_completed', onRepCompleted);
  playbackRunner.on('test_completed', onTestCompleted);
  playbackRunner.on('test_stopped', onTestStopped);

  // Heartbeat every 15 seconds to prevent client timeout
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    playbackRunner.off('log', onLog);
    playbackRunner.off('test_started', onTestStarted);
    playbackRunner.off('repetition_started', onRepStarted);
    playbackRunner.off('player_state', onPlayerState);
    playbackRunner.off('repetition_completed', onRepCompleted);
    playbackRunner.off('test_completed', onTestCompleted);
    playbackRunner.off('test_stopped', onTestStopped);
  });
});

// Test history list with global KPI summary
app.get('/api/tests', requireAuth, (req, res) => {
  const runs = db.prepare(`
    SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 100
  `).all();

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalRuns,
      COALESCE(SUM(completed_repetitions), 0) as totalRepetitions,
      COALESCE(SUM(success_count), 0) as totalSuccess,
      COALESCE(SUM(failure_count), 0) as totalFailures
    FROM test_runs
  `).get();

  const totalRuns = stats.totalRuns || 0;
  const totalRepetitions = stats.totalRepetitions || 0;
  const totalSuccess = stats.totalSuccess || 0;
  const totalFailures = stats.totalFailures || 0;
  const successRate = totalRepetitions > 0 ? Math.round((totalSuccess / totalRepetitions) * 100) : 0;

  return res.json({
    runs,
    kpi: {
      totalRuns,
      totalRepetitions,
      totalSuccess,
      totalFailures,
      successRate
    }
  });
});

// Single test run details with repetition items
app.get('/api/tests/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(id);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found.' });
  }

  const items = db.prepare(`
    SELECT * FROM test_items WHERE run_id = ? ORDER BY repetition_index ASC
  `).all(id);

  // Parse logs_json for each item
  const formattedItems = items.map(item => ({
    ...item,
    logs: item.logs_json ? JSON.parse(item.logs_json) : []
  }));

  return res.json({ run, items: formattedItems });
});

// Delete specific test run
app.delete('/api/tests/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const run = db.prepare('SELECT id FROM test_runs WHERE id = ?').get(id);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found.' });
  }

  db.prepare('DELETE FROM test_items WHERE run_id = ?').run(id);
  db.prepare('DELETE FROM test_runs WHERE id = ?').run(id);

  return res.json({ success: true, message: 'Test run deleted successfully.' });
});

// Clear all test history
app.delete('/api/tests', requireAuth, (req, res) => {
  db.prepare('DELETE FROM test_items').run();
  db.prepare('DELETE FROM test_runs').run();

  return res.json({ success: true, message: 'All test history cleared successfully.' });
});

// ==========================================
// 6. STATIC ASSETS & SPA SERVING
// ==========================================
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res) => {
    // If request does not match an API endpoint, serve index.html
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>YouTube Playback Testing Bot</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem;">
          <h1>YouTube Playback QA Server is Running</h1>
          <p>The client application has not been built yet.</p>
          <p>Run <code>npm run build</code> in the root directory to build the React GUI, or start Vite with <code>npm --prefix client run dev</code>.</p>
        </body>
      </html>
    `);
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] YouTube Playback Testing Server running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
