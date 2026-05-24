import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Zap, AlertCircle } from 'lucide-react';

export const Planning: React.FC = () => {
  const [priority, setPriority] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const startDay = useAppStore(state => state.startDay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priority.trim()) {
      setError("Please set today's primary focus.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await startDay(priority.trim(), energyLevel);
    } catch (err: any) {
      console.error(err);
      setError("Failed to create today's plan. Make sure you have routines active for today.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="planning-container">
      <div className="planning-header">
        <h1>Morning Planning</h1>
        <p className="header-subtitle">Align your energy and lock in your focus before starting the day</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {error && (
          <div className="step-item" style={{ borderColor: 'hsl(var(--danger) / 0.3)', backgroundColor: 'hsl(var(--danger) / 0.05)', color: 'hsl(var(--danger))', marginBottom: '20px', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="input-group">
          <label className="input-label" htmlFor="priority-input">What is your #1 priority today?</label>
          <input
            id="priority-input"
            type="text"
            className="input-control"
            placeholder="e.g., Deliver the prototype deck, complete design review..."
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label className="input-label">What is your energy level right now?</label>
          <div className="energy-selector">
            {(['low', 'medium', 'high'] as const).map((level) => {
              const label = level.charAt(0).toUpperCase() + level.slice(1);
              return (
                <div
                  key={level}
                  className={`energy-option ${energyLevel === level ? 'selected' : ''}`}
                  onClick={() => setEnergyLevel(level)}
                >
                  <Zap size={24} style={{ opacity: energyLevel === level ? 1 : 0.6 }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
          {loading ? 'Generating Schedule...' : 'Unlock Today'}
        </button>
      </form>
    </div>
  );
};
