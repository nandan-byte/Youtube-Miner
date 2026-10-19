import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, Clock, Film, Radio, FastForward } from 'lucide-react';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function LiveConsole({
  isTesting,
  currentRun,
  logs = [],
  playerState
}) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isTesting && logs.length === 0 && !currentRun) {
    return null;
  }

  const {
    repetitionIndex = 1,
    targetRepetitions = 1,
    targetDuration = 60,
    playFullVideo = true,
    playbackSpeed = 1,
    elapsedSeconds = 0,
    status = 'idle'
  } = currentRun || {};

  const currentSec = playerState?.currentTime || elapsedSeconds || 0;
  const totalSec = playerState?.duration || targetDuration || 1;

  // Repetition progress %
  const repProgress = totalSec > 0 ? Math.min(1, currentSec / totalSec) : 0;
  // Overall progress %
  const completedReps = Math.max(0, repetitionIndex - 1);
  const totalReps = Math.max(1, targetRepetitions);
  const overallPercent = Math.min(100, Math.round(((completedReps + repProgress) / totalReps) * 100));

  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      marginBottom: '1.75rem',
      border: isTesting ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
      boxShadow: isTesting ? '0 0 25px rgba(239, 68, 68, 0.15)' : 'none'
    }}>
      {/* Console Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: isTesting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isTesting ? 'var(--accent-red)' : 'var(--text-secondary)'
          }}>
            <Terminal size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f8fafc' }}>
              Real-time Playback Automation Console
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              Sequential QA Pipeline Telemetry
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">
            <Film size={12} />
            <span>Repetition {repetitionIndex} of {targetRepetitions}</span>
          </span>

          <span className="badge badge-warning" style={{ fontFamily: 'var(--font-mono)' }}>
            <Clock size={12} />
            <span>{formatTime(currentSec)} / {formatTime(totalSec)}</span>
          </span>

          {playbackSpeed > 1 && (
            <span className="badge badge-ai">
              <FastForward size={12} />
              <span>{playbackSpeed}x Speed</span>
            </span>
          )}

          {playerState?.isAdShowing && (
            <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
              <Radio size={12} className="animate-spin" />
              <span>Ad Playing (Auto-Skipping)</span>
            </span>
          )}

          <span className={isTesting ? 'badge badge-warning' : 'badge badge-success'}>
            <Activity size={12} />
            <span>{isTesting ? 'RUNNING TEST' : 'IDLE'}</span>
          </span>
        </div>
      </div>

      {/* Progress Bars */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
          <span>Overall QA Job Progress: <strong>{overallPercent}%</strong> (Repetition {repetitionIndex} of {targetRepetitions})</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            Current Video Time: <strong>{formatTime(currentSec)}</strong> / {formatTime(totalSec)}
          </span>
        </div>

        {/* Primary Progress Bar */}
        <div style={{
          width: '100%',
          height: '10px',
          borderRadius: '5px',
          background: 'rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div
            className={isTesting ? 'progress-bar-striped' : ''}
            style={{
              width: `${overallPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Real-time Player Telemetry Row */}
      {playerState && (
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          padding: '0.6rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '0.875rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          flexWrap: 'wrap'
        }}>
          <div>Video Progress: <strong style={{ color: '#34d399' }}>{formatTime(playerState.currentTime)}</strong> / {formatTime(playerState.duration)}</div>
          <div>Player Status: <strong style={{ color: playerState.paused ? '#f87171' : '#34d399' }}>{playerState.paused ? 'PAUSED' : 'PLAYING'}</strong></div>
          <div>Cycle Target: <strong style={{ color: '#e2e8f0' }}>{currentRun?.playFullVideo ? 'Full Video' : `${targetDuration}s`}</strong></div>
          <div>Repetition: <strong style={{ color: '#c084fc' }}>{repetitionIndex} of {targetRepetitions}</strong></div>
        </div>
      )}

      {/* Live Terminal Window */}
      <div className="terminal-window">
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
            Awaiting test execution commands...
          </div>
        ) : (
          logs.map((log, index) => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
            let levelClass = 'log-info';
            if (log.level === 'success') levelClass = 'log-success';
            if (log.level === 'warn') levelClass = 'log-warn';
            if (log.level === 'error') levelClass = 'log-error';

            return (
              <div key={index} className="log-line">
                <span className="log-time">[{timeStr}]</span>
                <span className={levelClass}>
                  {log.repetitionIndex ? `[Rep ${log.repetitionIndex}/${targetRepetitions}] ` : ''}{log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
