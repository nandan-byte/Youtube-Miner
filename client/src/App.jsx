import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import KpiSummary from './components/KpiSummary';
import AiAssistantBar from './components/AiAssistantBar';
import TestConfigurator from './components/TestConfigurator';
import LiveConsole from './components/LiveConsole';
import HistoryTable from './components/HistoryTable';
import RunDetailsModal from './components/RunDetailsModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/LoginView';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  // App settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiModel, setAiModel] = useState('openai/gpt-oss-120b');

  const [url, setUrl] = useState('');
  const [repetitions, setRepetitions] = useState(15); // default 15 repetitions as requested
  const [duration, setDuration] = useState(15);
  const [concurrency, setConcurrency] = useState(10); // default 10 at the same time
  const [playFullVideo, setPlayFullVideo] = useState(true); // default play full video
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [headless, setHeadless] = useState(false); // default visible window
  const [browserType, setBrowserType] = useState('chromium');

  // YouTube preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Real-time execution state
  const [isTesting, setIsTesting] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [playerState, setPlayerState] = useState(null);

  // History & Metrics state
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalRepetitions: 0,
    totalSuccess: 0,
    totalFailures: 0,
    successRate: 0
  });
  const [historyRuns, setHistoryRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const debounceTimerRef = useRef(null);

  // 1. Check Auth Status on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. Fetch history & stats
  const fetchHistoryAndStats = useCallback(async () => {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setHistoryRuns(data.runs || []);
        if (data.kpi) {
          setStats(data.kpi);
        }
      }
    } catch (e) {}
  }, []);

  // 3. Fetch active job status if any
  const checkActiveJob = useCallback(async () => {
    try {
      const res = await fetch('/api/tests/active');
      if (res.ok) {
        const data = await res.json();
        if (data.isBusy && data.activeJob) {
          setIsTesting(true);
          setCurrentRun(data.activeJob);
          if (data.activeJob.logs) {
            setLogs(data.activeJob.logs);
          }
        }
      }
    } catch (e) {}
  }, []);

  // 4. Fetch settings (AI model name)
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.grokModel) setAiModel(data.grokModel);
        if (typeof data.headlessDefault === 'boolean') setHeadless(data.headlessDefault);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistoryAndStats();
      checkActiveJob();
      fetchSettings();
    }
  }, [user, fetchHistoryAndStats, checkActiveJob, fetchSettings]);

  // 5. Debounced YouTube URL preview
  useEffect(() => {
    if (!url || url.trim().length < 10) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const res = await fetch(`/api/youtube/preview?url=${encodeURIComponent(url.trim())}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setPreviewError(data.error || 'Invalid or unavailable YouTube video URL');
          setPreviewData(null);
        } else {
          setPreviewData(data);
          setPreviewError(null);
        }
      } catch (err) {
        setPreviewError('Failed to query YouTube video preview');
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [url]);

  // 6. Connect to Server-Sent Events (SSE) when authenticated
  useEffect(() => {
    if (!user) return;

    let eventSource = null;

    try {
      eventSource = new EventSource('/api/tests/events');

      eventSource.addEventListener('test_started', (e) => {
        const data = JSON.parse(e.data);
        setIsTesting(true);
        setCurrentRun({
          runId: data.runId,
          repetitionIndex: 1,
          targetRepetitions: data.targetRepetitions,
          targetDuration: data.targetDurationSeconds,
          elapsedSeconds: 0,
          status: 'running'
        });
        setLogs([]);
        setPlayerState(null);
      });

      eventSource.addEventListener('repetition_started', (e) => {
        const data = JSON.parse(e.data);
        setCurrentRun(prev => ({
          ...(prev || {}),
          repetitionIndex: data.repetitionIndex,
          targetRepetitions: data.totalRepetitions,
          elapsedSeconds: 0,
          status: 'running'
        }));
        setPlayerState(null);
      });

      eventSource.addEventListener('log', (e) => {
        const data = JSON.parse(e.data);
        setLogs(prev => [...prev.slice(-150), data]);
      });

      eventSource.addEventListener('player_state', (e) => {
        const data = JSON.parse(e.data);
        setPlayerState(data);
        setCurrentRun(prev => ({
          ...(prev || {}),
          elapsedSeconds: data.elapsedSeconds || 0,
          repetitionIndex: data.repetitionIndex || 1
        }));
      });

      eventSource.addEventListener('repetition_completed', (e) => {
        const data = JSON.parse(e.data);
        setCurrentRun(prev => ({
          ...(prev || {}),
          repetitionIndex: data.repetitionIndex,
          elapsedSeconds: data.achievedDuration || 0
        }));
      });

      eventSource.addEventListener('test_completed', () => {
        setIsTesting(false);
        fetchHistoryAndStats();
      });

      eventSource.addEventListener('test_stopped', () => {
        setIsTesting(false);
        fetchHistoryAndStats();
      });

      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (e) {
      console.error('SSE initialization error:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, fetchHistoryAndStats]);

  // Apply AI settings
  const handleApplyAiSettings = (parsedData) => {
    if (parsedData.url) {
      setUrl(parsedData.url);
    }
    if (parsedData.repetitions) {
      setRepetitions(parsedData.repetitions);
    }
    if (parsedData.duration) {
      setDuration(parsedData.duration);
    }
  };

  // Start Playback QA Test
  const handleStartTest = async () => {
    if (!url || isTesting) return;

    try {
      const res = await fetch('/api/tests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          repetitions,
          duration,
          concurrency,
          playFullVideo,
          playbackSpeed,
          browserType,
          headless
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start playback test');
      } else {
        setIsTesting(true);
      }
    } catch (err) {
      alert(`Error starting test: ${err.message}`);
    }
  };

  // Stop Playback QA Test
  const handleStopTest = async () => {
    try {
      await fetch('/api/tests/stop', { method: 'POST' });
    } catch (e) {}
  };

  // Delete single run
  const handleDeleteRun = async (id) => {
    if (!window.confirm('Delete this test record?')) return;
    try {
      const res = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHistoryAndStats();
      }
    } catch (e) {}
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    try {
      const res = await fetch('/api/tests', { method: 'DELETE' });
      if (res.ok) {
        fetchHistoryAndStats();
      }
    } catch (e) {}
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (e) {}
  };

  // Loading screen
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 size={36} className="animate-spin" color="var(--accent-red)" />
        <span style={{ fontSize: '0.875rem' }}>Initializing Playback QA Bot...</span>
      </div>
    );
  }

  // Login view if unauthenticated
  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        user={user}
        isTesting={isTesting}
        aiModel={aiModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem 1.5rem'
      }}>
        {/* KPI Metrics Summary Cards */}
        <KpiSummary stats={stats} />

        {/* Groq AI Assistant Prompt Bar */}
        <AiAssistantBar
          onApplySettings={handleApplyAiSettings}
          isTesting={isTesting}
        />

        {/* Video & Playback Test Configurator */}
        <TestConfigurator
          url={url}
          setUrl={setUrl}
          repetitions={repetitions}
          setRepetitions={setRepetitions}
          duration={duration}
          setDuration={setDuration}
          concurrency={concurrency}
          setConcurrency={setConcurrency}
          playFullVideo={playFullVideo}
          setPlayFullVideo={setPlayFullVideo}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          headless={headless}
          setHeadless={setHeadless}
          browserType={browserType}
          setBrowserType={setBrowserType}
          isTesting={isTesting}
          onStartTest={handleStartTest}
          onStopTest={handleStopTest}
          previewData={previewData}
          previewLoading={previewLoading}
          previewError={previewError}
        />

        {/* Real-time Telemetry & Log Console */}
        <LiveConsole
          isTesting={isTesting}
          currentRun={currentRun}
          logs={logs}
          playerState={playerState}
        />

        {/* Past QA Test History */}
        <HistoryTable
          runs={historyRuns}
          onSelectRun={(id) => setSelectedRunId(id)}
          onDeleteRun={handleDeleteRun}
          onClearAllHistory={handleClearAllHistory}
          isTesting={isTesting}
        />
      </main>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        YouTube Playback QA Bot • Local Playwright Automation • Designed strictly for internal player quality assurance
      </footer>

      {/* Modals */}
      {selectedRunId && (
        <RunDetailsModal
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdated={fetchSettings}
        />
      )}
    </div>
  );
}
