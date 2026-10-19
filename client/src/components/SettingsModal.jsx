import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Key,
  Shield,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Info
} from 'lucide-react';

export default function SettingsModal({ onClose, onSettingsUpdated }) {
  const [tab, setTab] = useState('ai'); // 'ai' | 'security' | 'about'

  // AI config states
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [apiBase, setApiBase] = useState('https://api.groq.com/openai/v1');
  const [model, setModel] = useState('openai/gpt-oss-120b');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiSaveMsg, setAiSaveMsg] = useState(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setMaskedKey(data.grokApiKeyMasked || '');
        if (data.grokApiBase) setApiBase(data.grokApiBase);
        if (data.grokModel) setModel(data.grokModel);
      })
      .catch(() => {});
  }, []);

  const handleSaveAi = async (e) => {
    e.preventDefault();
    setAiSaveMsg(null);
    setAiTestResult(null);

    try {
      const payload = {
        grokApiBase: apiBase,
        grokModel: model
      };
      if (apiKey.trim()) {
        payload.grokApiKey = apiKey.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setAiSaveMsg('AI Settings saved successfully!');
      if (apiKey.trim()) {
        setMaskedKey(`${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
        setApiKey('');
      }
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      setAiTestResult({ success: false, message: err.message });
    }
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST'
      });
      const data = await res.json();
      setAiTestResult({
        success: data.success,
        message: data.message || data.error || 'Unknown response'
      });
    } catch (err) {
      setAiTestResult({
        success: false,
        message: `Connection error: ${err.message}`
      });
    } finally {
      setAiTesting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }

    setPwLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPwSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={20} color="var(--accent-red)" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
              Application Settings
            </h3>
          </div>

          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            type="button"
            onClick={() => setTab('ai')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'ai' ? '2px solid var(--accent-ai)' : '2px solid transparent',
              color: tab === 'ai' ? '#e9d5ff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sparkles size={16} />
            <span>AI Configuration</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('security')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'security' ? '2px solid var(--accent-red)' : '2px solid transparent',
              color: tab === 'security' ? '#f8fafc' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Shield size={16} />
            <span>Security & Password</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('about')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'about' ? '2px solid #3b82f6' : '2px solid transparent',
              color: tab === 'about' ? '#f8fafc' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Info size={16} />
            <span>QA Compliance</span>
          </button>
        </div>

        {/* Tab 1: AI Configuration */}
        {tab === 'ai' && (
          <form onSubmit={handleSaveAi} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Configure Groq or xAI Grok credentials to enable natural language parsing of playback test commands. The API key is kept secure on the server.
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="settings-api-key">
                Groq / Grok API Key
              </label>
              <input
                id="settings-api-key"
                type="password"
                className="input-field"
                placeholder={maskedKey ? `Configured (${maskedKey}) - enter new to replace` : 'gsk_... or xai-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {maskedKey && (
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                  ✓ Active Key: {maskedKey}
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="settings-api-base">
                API Base Endpoint
              </label>
              <input
                id="settings-api-base"
                type="text"
                className="input-field"
                placeholder="https://api.groq.com/openai/v1"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Groq: https://api.groq.com/openai/v1 | xAI Grok: https://api.x.ai/v1
              </span>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="settings-model">
                Model Name
              </label>
              <input
                id="settings-model"
                type="text"
                className="input-field"
                placeholder="openai/gpt-oss-120b"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supported on your account: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b
              </span>
            </div>

            {aiSaveMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.8125rem' }}>
                <CheckCircle size={15} />
                <span>{aiSaveMsg}</span>
              </div>
            )}

            {aiTestResult && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: aiTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${aiTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: aiTestResult.success ? '#34d399' : '#f87171',
                fontSize: '0.8125rem'
              }}>
                {aiTestResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{aiTestResult.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                id="test-ai-conn-btn"
                type="button"
                className="btn btn-secondary"
                onClick={handleTestAi}
                disabled={aiTesting}
              >
                {aiTesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Pinging AI API...</span>
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    <span>Test AI Connection</span>
                  </>
                )}
              </button>

              <button
                id="save-ai-settings-btn"
                type="submit"
                className="btn btn-ai"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {tab === 'security' && (
          <form onSubmit={handleChangePassword} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Change your dashboard access password. Passwords are securely hashed with bcrypt.
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="current-pw">Current Password</label>
              <input
                id="current-pw"
                type="password"
                className="input-field"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="new-pw">New Password (min 8 chars)</label>
              <input
                id="new-pw"
                type="password"
                className="input-field"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirm-pw">Confirm New Password</label>
              <input
                id="confirm-pw"
                type="password"
                className="input-field"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {pwError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.8125rem' }}>
                <AlertCircle size={15} />
                <span>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.8125rem' }}>
                <CheckCircle size={15} />
                <span>{pwSuccess}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                id="submit-password-change-btn"
                type="submit"
                className="btn btn-primary"
                disabled={pwLoading}
              >
                {pwLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Compliance & Notice */}
        {tab === 'about' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <h4 style={{ color: '#f8fafc', fontWeight: 600 }}>QA Testing & Compliance Policy</h4>
            <p>
              This application is an internal playback Quality Assurance (QA) and verification tool. It utilizes Playwright with Chromium to verify that YouTube video players mount correctly, initiate playback without unhandled JavaScript exceptions, and maintain active playback without stalling.
            </p>
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93c5fd' }}>
              <strong>Quality Assurance Disclaimer:</strong> These tests are strictly for playback verification. They do not simulate public view counts, inflate YouTube statistics, or interact with private YouTube accounts.
            </div>
            <p>
              Local SQLite stores metadata for audit purposes only. No YouTube credentials or tokens are ever stored or requested.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
