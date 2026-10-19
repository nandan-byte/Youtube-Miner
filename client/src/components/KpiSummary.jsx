import React from 'react';
import { Activity, CheckCircle2, XCircle, RotateCcw, Percent } from 'lucide-react';

export default function KpiSummary({ stats }) {
  const {
    totalRuns = 0,
    totalRepetitions = 0,
    totalSuccess = 0,
    totalFailures = 0,
    successRate = 0
  } = stats || {};

  const cards = [
    {
      id: 'kpi-runs',
      label: 'Total QA Runs',
      value: totalRuns,
      sub: 'Session & past jobs',
      icon: Activity,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    {
      id: 'kpi-reps',
      label: 'Repetitions Tested',
      value: totalRepetitions,
      sub: 'Individual video cycles',
      icon: RotateCcw,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)'
    },
    {
      id: 'kpi-success',
      label: 'Verified Playbacks',
      value: totalSuccess,
      sub: 'Player verified & observed',
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      id: 'kpi-failures',
      label: 'Playback Errors',
      value: totalFailures,
      sub: 'Loading/player issues',
      icon: XCircle,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)'
    },
    {
      id: 'kpi-rate',
      label: 'QA Pass Rate',
      value: `${successRate}%`,
      sub: totalRepetitions > 0 ? `${totalSuccess}/${totalRepetitions} passed` : 'No tests run yet',
      icon: Percent,
      color: successRate >= 80 ? '#10b981' : (successRate > 0 ? '#f59e0b' : '#94a3b8'),
      bg: 'rgba(255, 255, 255, 0.05)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.75rem'
    }}>
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="glass-panel"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {card.sub}
              </div>
            </div>

            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: card.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color,
              flexShrink: 0
            }}>
              <IconComponent size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
