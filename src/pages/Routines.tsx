import React, { useState, useEffect } from 'react';
import { useRoutineStore } from '../store/useRoutineStore';
import { Plus, Trash, ArrowUp, ArrowDown, Settings, Clock, Link as LinkIcon, Edit } from 'lucide-react';
import { Step } from '../types';

export const Routines: React.FC = () => {
  const {
    routines,
    selectedRoutine,
    steps,
    loadRoutines,
    setSelectedRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps
  } = useRoutineStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [stepName, setStepName] = useState('');
  const [stepDuration, setStepDuration] = useState<number | ''>('');
  const [stepUrl, setStepUrl] = useState('');

  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const handleCreateRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;
    try {
      const created = await createRoutine(newRoutineName.trim(), newRoutineDays);
      setSelectedRoutine(created);
      setNewRoutineName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDayToggle = async (day: string) => {
    if (!selectedRoutine) return;
    try {
      let days: string[] = [];
      try {
        days = JSON.parse(selectedRoutine.schedule_days) as string[];
      } catch (e) {
        days = [];
      }
      
      const newDays = days.includes(day)
        ? days.filter(d => d !== day)
        : [...days, day];
      
      await updateRoutine(selectedRoutine.id, selectedRoutine.name, newDays);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutine || !stepName.trim()) return;

    const duration = stepDuration === '' ? null : Number(stepDuration);
    const url = stepUrl.trim() === '' ? null : stepUrl.trim();

    try {
      if (editingStep) {
        await updateStep(editingStep.id, stepName.trim(), duration, url);
      } else {
        await addStep(selectedRoutine.id, stepName.trim(), duration, url);
      }
      setShowStepModal(false);
      setStepName('');
      setStepDuration('');
      setStepUrl('');
      setEditingStep(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddStepModal = () => {
    setEditingStep(null);
    setStepName('');
    setStepDuration('');
    setStepUrl('');
    setShowStepModal(true);
  };

  const openEditStepModal = (step: Step) => {
    setEditingStep(step);
    setStepName(step.name);
    setStepDuration(step.duration_minutes !== null ? step.duration_minutes : '');
    setStepUrl(step.url || '');
    setShowStepModal(true);
  };

  const handleStepMove = async (index: number, direction: 'up' | 'down') => {
    if (!selectedRoutine) return;
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // Swap steps
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const ids = newSteps.map(s => s.id);
    await reorderSteps(selectedRoutine.id, ids);
  };

  const handleDeleteRoutine = async () => {
    if (!selectedRoutine) return;
    if (confirm(`Are you sure you want to delete the routine "${selectedRoutine.name}" and all of its steps?`)) {
      try {
        await deleteRoutine(selectedRoutine.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div>
      <div className="header-area">
        <div>
          <h1 className="header-title">Routine Templates</h1>
          <p className="header-subtitle">Build and schedule execution sequences</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} /> Create Routine
        </button>
      </div>

      <div className="routine-grid">
        {/* Left Side: Routines List */}
        <div className="card routine-list-panel">
          <h3 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
            My Routines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {routines.map((r) => {
              let parsedDays: string[] = [];
              try {
                parsedDays = JSON.parse(r.schedule_days);
              } catch (e) {}

              return (
                <div
                  key={r.id}
                  className={`routine-list-item ${selectedRoutine?.id === r.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRoutine(r)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{r.name}</span>
                    <span className="routine-days-tag">
                      {parsedDays.length === 7 ? 'Every day' : parsedDays.join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
            {routines.length === 0 && (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No routines defined.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Steps & Settings for Selected Routine */}
        <div className="card routine-details-panel">
          {selectedRoutine ? (
            <>
              <div className="routine-header-row">
                <div>
                  <h2 style={{ fontSize: '24px' }}>{selectedRoutine.name}</h2>
                  <div className="days-selector">
                    {weekdays.map((day) => {
                      let activeDays: string[] = [];
                      try {
                        activeDays = JSON.parse(selectedRoutine.schedule_days) as string[];
                      } catch (e) {}
                      const isSelected = activeDays.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleDayToggle(day)}
                          title={`Toggle ${day.toUpperCase()}`}
                        >
                          {day.substring(0, 1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={openAddStepModal} className="btn btn-secondary" style={{ gap: '6px' }}>
                    <Plus size={16} /> Add Step
                  </button>
                  <button onClick={handleDeleteRoutine} className="btn btn-danger btn-icon" title="Delete Routine">
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '10px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Steps Sequence</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {steps.map((step, idx) => (
                    <div key={step.id} className="step-editor-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="step-number" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>{idx + 1}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>{step.name}</div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            {step.duration_minutes && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
                                <Clock size={12} /> {step.duration_minutes}m
                              </span>
                            )}
                            {step.url && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'hsl(var(--primary))' }}>
                                <LinkIcon size={12} /> {step.url}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="step-editor-actions">
                        <button
                          onClick={() => handleStepMove(idx, 'up')}
                          disabled={idx === 0}
                          className="btn btn-secondary btn-icon"
                          style={{ padding: '6px', opacity: idx === 0 ? 0.3 : 1 }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleStepMove(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="btn btn-secondary btn-icon"
                          style={{ padding: '6px', opacity: idx === steps.length - 1 ? 0.3 : 1 }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => openEditStepModal(step)}
                          className="btn btn-secondary btn-icon"
                          style={{ padding: '6px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete step "${step.name}"?`)) {
                              deleteStep(step.id);
                            }
                          }}
                          className="btn btn-danger btn-icon"
                          style={{ padding: '6px' }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {steps.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed hsl(var(--border))', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '14px' }}>No steps in this routine. Click Add Step to build.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--text-muted))', padding: '40px' }}>
              <Settings size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h2>Select a Routine</h2>
              <p className="header-subtitle" style={{ textAlign: 'center', marginTop: '6px' }}>Pick or create a routine template from the sidebar to manage steps and active days.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE ROUTINE MODAL */}
      {showCreateModal && (
        <div className="overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Create Routine Template</h2>
            <form onSubmit={handleCreateRoutineSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="new-routine-name">Routine Name</label>
                <input
                  id="new-routine-name"
                  type="text"
                  className="input-control"
                  placeholder="e.g. Morning Focus, Evening Shutdown..."
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT STEP MODAL */}
      {showStepModal && (
        <div className="overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
              {editingStep ? 'Edit Step' : 'Add Step to Routine'}
            </h2>
            <form onSubmit={handleStepSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="step-name-input">Step Name</label>
                <input
                  id="step-name-input"
                  type="text"
                  className="input-control"
                  placeholder="e.g. Journaling, Meditate, Typing Practice"
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="step-duration-input">Duration (minutes, optional)</label>
                <input
                  id="step-duration-input"
                  type="number"
                  className="input-control"
                  placeholder="e.g. 15"
                  value={stepDuration}
                  onChange={(e) => setStepDuration(e.target.value === '' ? '' : Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="step-url-input">Auto-Open URL (optional)</label>
                <input
                  id="step-url-input"
                  type="url"
                  className="input-control"
                  placeholder="e.g. https://monkeytype.com"
                  value={stepUrl}
                  onChange={(e) => setStepUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowStepModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStep ? 'Save Step' : 'Add Step'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
