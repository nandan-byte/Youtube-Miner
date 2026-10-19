import React, { useState } from 'react';
import {
  Play,
  Square,
  Clock,
  RotateCcw,
  AlertTriangle,
  Eye,
  Loader2,
  Tv,
  CheckCircle2,
  Clipboard,
  Zap,
  VolumeX,
  FastForward,
  Film,
  Layers,
  Cpu
} from 'lucide-react';

export default function TestConfigurator({
  url,
  setUrl,
  repetitions,
  setRepetitions,
  duration,
  setDuration,
  concurrency,
  setConcurrency,
  playFullVideo,
  setPlayFullVideo,
  playbackSpeed,
  setPlaybackSpeed,
  headless,
  setHeadless,
  isTesting,
  onStartTest,
  onStopTest,
  previewData,
  previewLoading,
  previewError
}) {
  const [showEmbed, setShowEmbed] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch (e) {}
  };

  const repPresets = [1, 3, 5, 10, 15, 20, 50];
  const speedPresets = [1, 1.25, 1.5, 2];
  const concurrencyPresets = [1, 2, 5, 10];

  const effectiveConcurrency = Math.min(concurrency || 10, repetitions);

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            Playback Test Configuration
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Configure video target, parallel execution streams, and playback QA parameters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
            <Tv size={14} />
            <span>Playwright Chromium</span>
          </span>
          <span className="badge badge-ai" style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
            <Layers size={13} />
            <span>Up to {concurrency} Streams at Once</span>
          </span>
          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
            <VolumeX size={13} />
            <span>Muted QA Session</span>
          </span>
        </div>
      </div>

      {/* 1. Video URL Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label className="input-label" htmlFor="youtube-url-input">
            YouTube Video URL
          </label>
          <button
            type="button"
            onClick={handlePaste}
            className="btn btn-ghost"
            style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
          >
            <Clipboard size={12} />
            <span>Paste from clipboard</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="youtube-url-input"
            type="text"
            className="input-field"
            placeholder="Paste YouTube link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isTesting}
            style={{ fontSize: '0.9375rem' }}
          />
        </div>

        {/* Loading Indicator */}
        {previewLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <Loader2 size={14} className="animate-spin" />
            <span>Validating video URL & querying YouTube metadata...</span>
          </div>
        )}

        {/* Preview Error */}
        {previewError && !previewLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: '0.8125rem'
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{previewError}</span>
          </div>
        )}

        {/* Preview Card */}
        {previewData && previewData.valid && !previewLoading && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(10, 15, 26, 0.65)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Thumbnail */}
            <div style={{
              width: '140px',
              height: '80px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
              backgroundColor: '#000',
              border: '1px solid var(--border-subtle)'
            }}>
              <img
                src={previewData.thumbnail}
                alt={previewData.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {previewData.durationFormatted && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'rgba(0,0,0,0.85)',
                  color: '#34d399',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {previewData.durationFormatted}
                </div>
              )}
            </div>

            {/* Video Info */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  <CheckCircle2 size={12} />
                  <span>Target Verified</span>
                </span>
                {previewData.durationFormatted && (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    <Clock size={11} />
                    <span>Duration: {previewData.durationFormatted} ({previewData.durationSeconds}s)</span>
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ID: {previewData.videoId}
                </span>
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                {previewData.title}
              </h4>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Channel: <strong style={{ color: '#e2e8f0' }}>{previewData.author}</strong>
              </div>
            </div>

            {/* Embed preview toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowEmbed(!showEmbed)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
              >
                <Eye size={14} />
                <span>{showEmbed ? 'Hide Embed Player' : 'Live Player View'}</span>
              </button>
            </div>

            {/* Inline iframe */}
            {showEmbed && (
              <div style={{ width: '100%', marginTop: '0.75rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <iframe
                  title="YouTube Preview"
                  width="100%"
                  height="260"
                  src={previewData.embedUrl}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Duration & Playback Mode Selection */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label className="input-label" style={{ margin: 0 }}>
            Playback QA Duration Mode
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={playFullVideo ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setPlayFullVideo(true)}
              disabled={isTesting}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
            >
              <Film size={14} />
              <span>Full Video (Start to End)</span>
            </button>
            <button
              type="button"
              className={!playFullVideo ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setPlayFullVideo(false)}
              disabled={isTesting}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
            >
              <Clock size={14} />
              <span>Custom Fixed Duration</span>
            </button>
          </div>
        </div>

        {playFullVideo ? (
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            color: '#34d399',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Complete Video Playback Enabled:</strong> The browser automation will observe each repetition from <strong>0:00 all the way until the video naturally ends</strong>
              {previewData?.durationFormatted && ` (Total Video Length: ${previewData.durationFormatted})`}.
              It also handles and automatically skips YouTube ads.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                id="duration-input"
                type="number"
                min="5"
                max="14400"
                className="input-field"
                value={duration}
                onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value, 10) || 5))}
                disabled={isTesting}
                style={{ width: '120px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Seconds ({Math.floor(duration / 60)}m {duration % 60}s)
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
                {[15, 30, 60, 180, 300, 600].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDuration(s)}
                    disabled={isTesting}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    {s >= 60 ? `${s / 60}m` : `${s}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Controls Grid (Repetitions, Parallel Concurrency, Speed, Browser Visibility) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Test Repetitions */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" htmlFor="repetition-input">
              Total Test Cycles
            </label>
            <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>
              {repetitions} total repetition{repetitions > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRepetitions(Math.max(1, repetitions - 1))}
              disabled={isTesting || repetitions <= 1}
              style={{ width: '42px', height: '42px', fontSize: '1.2rem', padding: 0 }}
            >
              -
            </button>
            <input
              id="repetition-input"
              type="number"
              min="1"
              max="100"
              className="input-field"
              value={repetitions}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setRepetitions(Math.max(1, Math.min(100, val)));
              }}
              disabled={isTesting}
              style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRepetitions(Math.min(100, repetitions + 1))}
              disabled={isTesting || repetitions >= 100}
              style={{ width: '42px', height: '42px', fontSize: '1.2rem', padding: 0 }}
            >
              +
            </button>
          </div>

          {/* Quick Repetition Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {repPresets.map((r) => (
              <button
                key={r}
                type="button"
                className="btn btn-secondary"
                onClick={() => setRepetitions(r)}
                disabled={isTesting}
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  background: repetitions === r ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: repetitions === r ? 'var(--accent-red)' : 'var(--border-subtle)',
                  color: repetitions === r ? '#f8fafc' : 'var(--text-secondary)'
                }}
              >
                {r}x
              </button>
            ))}
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Total number of video plays to execute.
          </span>
        </div>

        {/* Parallel Concurrency (10 at the same time) */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" htmlFor="concurrency-input">
              Parallel Streams At Once
            </label>
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
              {effectiveConcurrency} active stream{effectiveConcurrency > 1 ? 's' : ''} at once
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConcurrency(Math.max(1, (concurrency || 10) - 1))}
              disabled={isTesting || (concurrency || 10) <= 1}
              style={{ width: '42px', height: '42px', fontSize: '1.2rem', padding: 0 }}
            >
              -
            </button>
            <input
              id="concurrency-input"
              type="number"
              min="1"
              max="10"
              className="input-field"
              value={concurrency || 10}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setConcurrency(Math.max(1, Math.min(10, val)));
              }}
              disabled={isTesting}
              style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: '#34d399' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConcurrency(Math.min(10, (concurrency || 10) + 1))}
              disabled={isTesting || (concurrency || 10) >= 10}
              style={{ width: '42px', height: '42px', fontSize: '1.2rem', padding: 0 }}
            >
              +
            </button>
          </div>

          {/* Quick Concurrency Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {concurrencyPresets.map((c) => (
              <button
                key={c}
                type="button"
                className="btn btn-secondary"
                onClick={() => setConcurrency(c)}
                disabled={isTesting}
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  background: (concurrency || 10) === c ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: (concurrency || 10) === c ? '#10b981' : 'var(--border-subtle)',
                  color: (concurrency || 10) === c ? '#34d399' : 'var(--text-secondary)'
                }}
              >
                {c === 1 ? '1 (Single)' : (c === 10 ? '10 (Max at Once)' : `${c} Parallel`)}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            10 parallel sessions at once uses ~2.5GB RAM (ideal for 16GB).
          </span>
        </div>

        {/* Playback Speed */}
        <div className="input-group">
          <label className="input-label">
            Playback Speed Rate
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', height: '42px' }}>
            {speedPresets.map((spd) => (
              <button
                key={spd}
                type="button"
                className={playbackSpeed === spd ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setPlaybackSpeed(spd)}
                disabled={isTesting}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}
              >
                <FastForward size={13} />
                <span>{spd}x</span>
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Speed up video playback (e.g. 2x finishes 9m in 4.5m).
          </span>
        </div>

        {/* Browser GUI Visibility */}
        <div className="input-group">
          <label className="input-label">
            Visible Browser GUI Window
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            minHeight: '42px',
            justifyContent: 'center'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                id="headless-checkbox"
                type="checkbox"
                checked={!headless}
                onChange={(e) => setHeadless(!e.target.checked)}
                disabled={isTesting}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-red)' }}
              />
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                Show Chromium Windows On Desktop
              </span>
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.6rem' }}>
              Shows the live browser sessions as they play simultaneously.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '1rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <button
          id="start-test-btn"
          type="button"
          className="btn btn-primary"
          onClick={onStartTest}
          disabled={isTesting || !url || (previewData && !previewData.valid)}
          style={{ padding: '0.875rem 2.25rem', fontSize: '1rem', fontWeight: 700 }}
        >
          {isTesting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Running {repetitions} Cycles ({effectiveConcurrency} at once)...</span>
            </>
          ) : (
            <>
              <Play size={20} fill="white" />
              <span>
                Start Playback QA Test ({repetitions} {repetitions === 1 ? 'Cycle' : 'Cycles'}
                {effectiveConcurrency > 1 ? ` • ${effectiveConcurrency} At The Same Time` : ''})
              </span>
            </>
          )}
        </button>

        <button
          id="stop-test-btn"
          type="button"
          className="btn btn-danger"
          onClick={onStopTest}
          disabled={!isTesting}
          style={{ padding: '0.875rem 1.75rem', fontSize: '1rem' }}
        >
          <Square size={18} fill="white" />
          <span>Stop All Tests Immediately</span>
        </button>

        {isTesting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontSize: '0.875rem', fontWeight: 600 }}>
            <span className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            <span>Running {effectiveConcurrency} parallel browser stream{effectiveConcurrency > 1 ? 's' : ''} simultaneously.</span>
          </div>
        )}
      </div>
    </div>
  );
}
