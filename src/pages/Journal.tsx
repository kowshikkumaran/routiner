import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { dataService } from '../services';
import { Save, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';

export const Journal: React.FC = () => {
  const { todayPlan, currentJournal, loadJournal, saveJournal, settings } = useAppStore();
  
  const [wentWell, setWentWell] = useState('');
  const [wentPoorly, setWentPoorly] = useState('');
  const [tomorrowFocus, setTomorrowFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (todayPlan) {
      loadJournal();
    }
  }, [todayPlan, loadJournal]);

  useEffect(() => {
    if (currentJournal) {
      setWentWell(currentJournal.went_well);
      setWentPoorly(currentJournal.went_poorly);
      setTomorrowFocus(currentJournal.tomorrow_focus);
    }
  }, [currentJournal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayPlan) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveJournal(wentWell, wentPoorly, tomorrowFocus);
      setStatusMsg({ type: 'success', text: 'Journal entry saved to database!' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to save journal entry.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!todayPlan) return;
    if (!settings?.journal_path) {
      setStatusMsg({
        type: 'error',
        text: 'No journal export directory configured. Please set the Journal Path in Settings first.'
      });
      return;
    }

    setExporting(true);
    setStatusMsg(null);

    const markdownContent = `# Journal Review — ${todayPlan.date}

**Priority Focus**: ${todayPlan.priority}
**Energy Level**: ${todayPlan.energy_level}

## What Went Well?
${wentWell || '*No input provided*'}

## What Went Poorly?
${wentPoorly || '*No input provided*'}

## Focus for Tomorrow?
${tomorrowFocus || '*No input provided*'}

---
*Exported from Routiner execution system*
`;

    try {
      await dataService.exportJournal(todayPlan.date, settings.journal_path, markdownContent);
      setStatusMsg({
        type: 'success',
        text: `Successfully exported to ${settings.journal_path}/journal-${todayPlan.date}.md`
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.toString() || 'Failed to export markdown file. Verify directory permissions.'
      });
    } finally {
      setExporting(false);
    }
  };

  if (!todayPlan) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>No plan active for today.</h2>
        <p className="header-subtitle">Navigate to Morning Planning to start a day session.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="header-area">
        <div>
          <h1 className="header-title">End-of-Day Journaling</h1>
          <p className="header-subtitle">Reflect on today's execution to calibrate tomorrow's habits</p>
        </div>
      </div>

      {statusMsg && (
        <div
          className="step-item"
          style={{
            borderColor: statusMsg.type === 'success' ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--danger) / 0.3)',
            backgroundColor: statusMsg.type === 'success' ? 'hsl(var(--success) / 0.05)' : 'hsl(var(--danger) / 0.05)',
            color: statusMsg.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--danger))',
            marginBottom: '24px',
            gap: '12px',
            justifyContent: 'flex-start'
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="well-textarea">1. What went well today?</label>
          <textarea
            id="well-textarea"
            className="input-control journal-textarea"
            placeholder="Focus areas executed, wins achieved, positive momentum..."
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="poorly-textarea">2. What went poorly or could be improved?</label>
          <textarea
            id="poorly-textarea"
            className="input-control journal-textarea"
            placeholder="Distractions, missed timings, blockages, energy leaks..."
            value={wentPoorly}
            onChange={(e) => setWentPoorly(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="tomorrow-textarea">3. What is your primary focus for tomorrow?</label>
          <textarea
            id="tomorrow-textarea"
            className="input-control journal-textarea"
            placeholder="Key target, habits, routines or schedule updates..."
            value={tomorrowFocus}
            onChange={(e) => setTomorrowFocus(e.target.value)}
            disabled={saving}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Reflection'}
          </button>
          
          <button
            type="button"
            onClick={handleExport}
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={exporting}
          >
            <FileDown size={18} /> {exporting ? 'Exporting...' : 'Export Markdown'}
          </button>
        </div>
      </form>
    </div>
  );
};
