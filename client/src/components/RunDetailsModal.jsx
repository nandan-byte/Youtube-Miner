import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle, ExternalLink, Terminal } from 'lucide-react';

export default function RunDetailsModal({ runId, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRep, setExpandedRep] = useState(1);

  useEffect(() => {
    if (!runId) return;

    setLoading(true);
    fetch(`/api/tests/${runId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load test run details');
        return res.json();
      })
      .then(data => {
        setDetails(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [runId]);

  if (!runId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '780px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
              Playback QA Run Audit
            </h3>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Run ID: {runId}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: '0.35rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading test run telemetry...
            </div>
          )}

          {error && (
            <div style={{ color: '#f87171', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          {details && details.run && (
            <>
              {/* Summary Card */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.5rem'
              }}>
                <img
                  src={`https://img.youtube.com/vi/${details.run.video_id}/hqdefault.jpg`}
                  alt=""
                  style={{ width: '80px', height: '50px', borderRadius: '4px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9375rem' }}>
                    {details.run.video_title}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Target: {details.run.target_repetitions} cycles @ {details.run.target_duration_seconds}s</span>
                    <span>Status: <strong style={{ textTransform: 'uppercase', color: details.run.status === 'completed' ? '#34d399' : '#f87171' }}>{details.run.status}</strong></span>
                    <span>Result: {details.run.success_count} passed, {details.run.failure_count} failed</span>
                  </div>
                </div>
              </div>

              {/* Repetitions Breakdown */}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Individual Repetition Results ({details.items?.length || 0})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {details.items && details.items.map((item) => {
                  const isExpanded = expandedRep === item.repetition_index;
                  const isSuccess = item.status === 'success';

                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(10, 15, 26, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Repetition Item Header */}
                      <div
                        onClick={() => setExpandedRep(isExpanded ? null : item.repetition_index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isSuccess ? (
                            <CheckCircle2 size={16} color="#10b981" />
                          ) : (
                            <XCircle size={16} color="#ef4444" />
                          )}
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                            Repetition {item.repetition_index}
                          </span>
                          <span className={`badge ${isSuccess ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.65rem' }}>
                            {item.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Duration: <strong style={{ color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{item.playback_duration_achieved?.toFixed(1)}s</strong></span>
                          <span>{isExpanded ? 'Hide Logs' : 'View Logs'}</span>
                        </div>
                      </div>

                      {/* Repetition Content / Logs */}
                      {isExpanded && (
                        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)', background: '#070a10' }}>
                          {item.error_message && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              fontSize: '0.75rem',
                              marginBottom: '0.75rem'
                            }}>
                              <AlertTriangle size={14} />
                              <span>{item.error_message}</span>
                            </div>
                          )}

                          <div className="terminal-window" style={{ maxHeight: '180px' }}>
                            {(!item.logs || item.logs.length === 0) ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No individual logs recorded for this repetition.</div>
                            ) : (
                              item.logs.map((log, lIdx) => (
                                <div key={lIdx} className="log-line">
                                  <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                  <span className={log.level === 'error' ? 'log-error' : (log.level === 'success' ? 'log-success' : 'log-info')}>
                                    {log.message}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
