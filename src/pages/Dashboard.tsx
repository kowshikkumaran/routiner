import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, Check, SkipForward, ExternalLink, Moon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    todayPlan,
    dailySteps,
    activeStepId,
    timerElapsed,
    isTimerPaused,
    completeActiveStep,
    skipActiveStep,
    pauseTimer,
    resumeTimer,
    tickTimer
  } = useAppStore();

  // Tick the timer every second if a step is active and not paused
  useEffect(() => {
    if (!activeStepId || isTimerPaused) return;
    
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeStepId, isTimerPaused, tickTimer]);

  const activeStep = dailySteps.find(s => s.id === activeStepId);
  const completedSteps = dailySteps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const progressPercent = dailySteps.length > 0 ? (completedSteps / dailySteps.length) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOpenUrl = async () => {
    if (activeStep?.url) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(activeStep.url);
      } catch (err) {
        console.error('Failed to open URL:', err);
      }
    }
  };

  if (!todayPlan || dailySteps.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>No schedule initialized for today.</h2>
        <p className="header-subtitle">Navigate to Morning Planning to begin your day.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-area">
        <div>
          <h1 className="header-title">Today's Execution</h1>
          <p className="header-subtitle">
            Focus: <strong style={{ color: 'hsl(var(--text))' }}>{todayPlan.priority}</strong> &bull; Energy: <strong style={{ color: 'hsl(var(--text))' }}>{todayPlan.energy_level}</strong>
          </p>
        </div>
        <div className="step-duration" style={{ fontWeight: 600 }}>
          {completedSteps} / {dailySteps.length} Steps Complete ({Math.round(progressPercent)}%)
        </div>
      </div>

      <div className="progress-container" style={{ marginBottom: '32px' }}>
        <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Active Step Details */}
        <div className="card timer-box">
          {activeStep ? (
            <>
              <span className="timer-label">Current Step</span>
              <h2 style={{ fontSize: '28px', marginTop: '8px', fontWeight: 700 }}>{activeStep.name}</h2>
              {activeStep.duration_minutes && (
                <p className="step-duration" style={{ marginTop: '4px' }}>
                  Target: {activeStep.duration_minutes} min
                </p>
              )}

              <div className="timer-display">{formatTime(timerElapsed)}</div>

              <div className="dashboard-controls">
                {isTimerPaused ? (
                  <button onClick={resumeTimer} className="btn btn-secondary" title="Resume Timer">
                    <Play size={20} /> Resume
                  </button>
                ) : (
                  <button onClick={pauseTimer} className="btn btn-secondary" title="Pause Timer">
                    <Pause size={20} /> Pause
                  </button>
                )}

                <button onClick={completeActiveStep} className="btn btn-primary" title="Complete Step">
                  <Check size={20} /> Complete
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to skip this routine step?")) {
                      skipActiveStep();
                    }
                  }}
                  className="btn btn-secondary"
                  title="Skip Step"
                >
                  <SkipForward size={20} /> Skip
                </button>
              </div>

              {activeStep.url && (
                <button
                  onClick={handleOpenUrl}
                  className="btn btn-secondary"
                  style={{ marginTop: '24px', gap: '6px', fontSize: '13px' }}
                >
                  <ExternalLink size={14} /> Open Target Page
                </button>
              )}
            </>
          ) : (
            <div className="transition-container" style={{ padding: '20px 0' }}>
              <Moon size={48} style={{ color: 'hsl(var(--success))', marginBottom: '16px' }} />
              <h2>All routines completed!</h2>
              <p className="header-subtitle" style={{ margin: '8px 0 20px' }}>You successfully finished your routines for the day.</p>
              <div className="dashboard-controls">
                <button onClick={() => useAppStore.getState().setView('journal')} className="btn btn-primary">
                  Review Day & Journal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Steps Sequence */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>Timeline</h3>
          <div className="steps-list">
            {dailySteps.map((step, idx) => {
              const isActive = step.id === activeStepId;
              const isCompleted = step.status === 'completed';
              const isSkipped = step.status === 'skipped';

              return (
                <div
                  key={step.id}
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}`}
                >
                  <div className="step-info">
                    <div className="step-number">
                      {isCompleted ? '✓' : isSkipped ? '»' : idx + 1}
                    </div>
                    <div>
                      <span className="step-name" style={{ textDecoration: isCompleted || isSkipped ? 'line-through' : 'none' }}>
                        {step.name}
                      </span>
                      {step.url && (
                        <span style={{ fontSize: '11px', display: 'block', color: 'hsl(var(--primary))', marginTop: '2px' }}>
                          Auto-opens link
                        </span>
                      )}
                    </div>
                  </div>
                  {step.duration_minutes && (
                    <span className="step-duration">{step.duration_minutes}m</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
