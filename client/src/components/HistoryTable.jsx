import React, { useState } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Film
} from 'lucide-react';

export default function HistoryTable({
  runs = [],
  onSelectRun,
  onDeleteRun,
  onClearAllHistory,
  isTesting
}) {
  const [filter, setFilter] = useState('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true;
    if (filter === 'completed') return run.status === 'completed';
    if (filter === 'failed') return run.status === 'failed' || run.failure_count > 0;
    if (filter === 'stopped') return run.status === 'stopped';
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <History size={20} color="var(--accent-red)" />
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
              Playback QA Test History
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Complete record of automated playback checks and player performance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            {['all', 'completed', 'failed', 'stopped'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="btn btn-ghost"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  background: filter === f ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: filter === f ? '#f8fafc' : 'var(--text-muted)',
                  borderRadius: '4px'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Clear All History Button */}
          {runs.length > 0 && (
            <button
              id="clear-history-btn"
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowClearConfirm(true)}
              disabled={isTesting}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', color: '#fca5a5' }}
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.75rem', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Clear Test History?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete all past test runs and repetition logs? This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                id="confirm-clear-btn"
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onClearAllHistory();
                  setShowClearConfirm(false);
                }}
              >
                Yes, Clear All History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table or Empty State */}
      {filteredRuns.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
          {runs.length === 0 ? 'No playback QA tests recorded yet. Configure a video above and click Start Playback Test!' : 'No test records matching current filter.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Video Target</th>
                <th style={{ padding: '0.75rem 1rem' }}>Repetitions</th>
                <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                <th style={{ padding: '0.75rem 1rem' }}>Outcome</th>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                let badgeClass = 'badge-info';
                if (run.status === 'completed') badgeClass = 'badge-success';
                if (run.status === 'failed') badgeClass = 'badge-error';
                if (run.status === 'stopped') badgeClass = 'badge-warning';
                if (run.status === 'partial') badgeClass = 'badge-warning';

                const formattedDate = new Date(run.created_at).toLocaleString();

                return (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Video info */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '48px',
                          height: '32px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#000'
                        }}>
                          <img
                            src={`https://img.youtube.com/vi/${run.video_id}/hqdefault.jpg`}
                            alt={run.video_title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ maxWidth: '280px' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {run.video_title || `Video ${run.video_id}`}
                          </div>
                          <a
                            href={run.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                          >
                            <span>ID: {run.video_id}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Repetitions */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RotateCcw size={13} color="var(--text-muted)" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {run.completed_repetitions} / {run.target_repetitions}
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} color="var(--text-muted)" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {run.target_duration_seconds}s
                        </span>
                      </div>
                    </td>

                    {/* Outcome */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className={`badge ${badgeClass}`} style={{ width: 'fit-content' }}>
                          {run.status}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {run.success_count} passed, {run.failure_count} failed
                        </div>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {formattedDate}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onSelectRun(run.id)}
                          title="View Repetition Logs & Telemetry"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => onDeleteRun(run.id)}
                          title="Delete test record"
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
