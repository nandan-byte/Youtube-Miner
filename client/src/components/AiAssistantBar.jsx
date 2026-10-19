import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function AiAssistantBar({ onApplySettings, isTesting }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastParsedNote, setLastParsedNote] = useState(null);

  const presets = [
    { label: '3 Repetitions @ 15s', text: 'Test this video 3 times for 15 seconds' },
    { label: '1 Repetition @ 30s', text: 'Run a thorough 30s playback QA test once' },
    { label: '5 Repetitions @ 10s', text: 'Quick smoke check 5 times for 10 seconds each' }
  ];

  const handleParse = async (customPrompt) => {
    const textToParse = customPrompt || prompt;
    if (!textToParse.trim()) {
      setError('Please type test instructions for the AI.');
      return;
    }

    setLoading(true);
    setError(null);
    setLastParsedNote(null);

    try {
      const response = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToParse })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to parse instructions with AI.');
      }

      setLastParsedNote(result.data.notes || 'Settings extracted successfully!');
      onApplySettings(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '1.25rem 1.5rem',
      marginBottom: '1.75rem',
      border: '1px solid rgba(139, 92, 246, 0.25)',
      background: 'linear-gradient(135deg, rgba(16, 23, 38, 0.8) 0%, rgba(26, 20, 48, 0.6) 100%)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="#c084fc" />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em', color: '#e9d5ff' }}>
            GROQ AI NATURAL LANGUAGE ASSISTANT
          </span>
          <span className="badge badge-ai" style={{ fontSize: '0.65rem' }}>
            Smart Extractor
          </span>
        </div>

        {/* Preset chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPrompt(p.text);
                handleParse(p.text);
              }}
              disabled={isTesting || loading}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-full)',
                borderColor: 'rgba(139, 92, 246, 0.3)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            id="ai-prompt-input"
            type="text"
            className="input-field"
            placeholder="Type instructions, e.g.: 'Test this video 3 times for 20s: https://www.youtube.com/watch?v=...'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleParse();
            }}
            disabled={isTesting || loading}
            style={{
              borderColor: 'rgba(139, 92, 246, 0.3)',
              background: 'rgba(12, 16, 29, 0.9)'
            }}
          />
        </div>

        <button
          id="ai-parse-btn"
          type="button"
          className="btn btn-ai"
          onClick={() => handleParse()}
          disabled={isTesting || loading}
          style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap' }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Parse with AI</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Feedback notes */}
      {lastParsedNote && (
        <div style={{
          marginTop: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8125rem',
          color: '#34d399'
        }}>
          <CheckCircle size={15} />
          <span>{lastParsedNote}</span>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8125rem',
          color: '#f87171'
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
