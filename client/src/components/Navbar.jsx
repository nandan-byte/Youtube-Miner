import React from 'react';
import { Play, Sparkles, Settings, LogOut, CheckCircle, Radio } from 'lucide-react';

export default function Navbar({
  user,
  isTesting,
  aiReady,
  aiModel,
  onOpenSettings,
  onLogout
}) {
  return (
    <header className="glass-panel" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderRadius: 0,
      padding: '0.875rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      backgroundColor: 'rgba(9, 13, 22, 0.85)'
    }}>
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
        }}>
          <Play size={20} fill="white" color="white" style={{ marginLeft: '2px' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
              YouTube Playback QA
            </span>
            <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
              v1.0
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Playwright Automation & Verification Engine
          </p>
        </div>
      </div>

      {/* Middle Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Test Engine Status */}
        {isTesting ? (
          <div className="badge badge-warning" style={{ padding: '0.35rem 0.85rem' }}>
            <span className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span>PLAYBACK TEST IN PROGRESS</span>
          </div>
        ) : (
          <div className="badge badge-success" style={{ padding: '0.35rem 0.85rem' }}>
            <Radio size={14} color="#10b981" />
            <span>ENGINE IDLE & READY</span>
          </div>
        )}

        {/* AI Badge */}
        <div className="badge badge-ai" style={{ padding: '0.35rem 0.85rem', cursor: 'pointer' }} onClick={onOpenSettings} title="Click to configure AI settings">
          <Sparkles size={14} color="#c084fc" />
          <span>Groq AI: {aiModel || 'openai/gpt-oss-120b'}</span>
        </div>
      </div>

      {/* User Actions & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          id="navbar-settings-btn"
          className="btn btn-secondary"
          onClick={onOpenSettings}
          title="Open Settings"
          style={{ padding: '0.5rem 0.875rem' }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        <button
          id="navbar-logout-btn"
          className="btn btn-ghost"
          onClick={onLogout}
          title="Sign out"
          style={{ padding: '0.5rem 0.875rem', color: '#f87171' }}
        >
          <LogOut size={16} />
          <span>Logout ({user?.username || 'admin'})</span>
        </button>
      </div>
    </header>
  );
}
