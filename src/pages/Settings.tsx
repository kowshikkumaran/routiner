import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useRoutineStore } from '../store/useRoutineStore';
import { Save, AlertCircle, Info } from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useAppStore();
  const { routines, loadRoutines } = useRoutineStore();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [journalPath, setJournalPath] = useState('');
  const [defaultRoutineId, setDefaultRoutineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Notifications & Launch state parsed from JSON
  const [enableSound, setEnableSound] = useState(true);
  const [enableDesktopNotifs, setEnableDesktopNotifs] = useState(true);
  const [launchAtStartup, setLaunchAtStartup] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme);
      setJournalPath(settings.journal_path || '');
      setDefaultRoutineId(settings.default_routine_id || '');

      // Parse notifications
      try {
        const notifs = JSON.parse(settings.notification_preferences || '{}');
        setEnableSound(notifs.sound !== false);
        setEnableDesktopNotifs(notifs.desktop !== false);
      } catch (e) {
        console.error('Failed to parse notifications preferences:', e);
      }

      // Parse launch preferences
      try {
        const launch = JSON.parse(settings.launch_preferences || '{}');
        setLaunchAtStartup(launch.startup === true);
      } catch (e) {
        console.error('Failed to parse launch preferences:', e);
      }
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    setSuccess(false);
    setError('');

    const updatedNotifs = JSON.stringify({ sound: enableSound, desktop: enableDesktopNotifs });
    const updatedLaunch = JSON.stringify({ startup: launchAtStartup });

    try {
      await updateSettings({
        theme,
        journal_path: journalPath.trim(),
        default_routine_id: defaultRoutineId,
        notification_preferences: updatedNotifs,
        launch_preferences: updatedLaunch
      });

      // Update HTML theme attribute dynamically
      document.documentElement.setAttribute('data-theme', theme);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update settings. Verify inputs and database status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="header-area">
        <div>
          <h1 className="header-title">Application Settings</h1>
          <p className="header-subtitle">Customize your routine execution operating system</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {success && (
          <div className="step-item" style={{ borderColor: 'hsl(var(--success) / 0.3)', backgroundColor: 'hsl(var(--success) / 0.05)', color: 'hsl(var(--success))', marginBottom: '16px' }}>
            <span>Settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="step-item" style={{ borderColor: 'hsl(var(--danger) / 0.3)', backgroundColor: 'hsl(var(--danger) / 0.05)', color: 'hsl(var(--danger))', marginBottom: '16px', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Theme Settings */}
        <div className="settings-section">
          <h3>Interface Theme</h3>
          <div className="input-group">
            <label className="input-label" htmlFor="theme-select">Visual Mode</label>
            <select
              id="theme-select"
              className="input-control"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <option value="dark">Dark Theme (Deep Slate)</option>
              <option value="light">Light Theme (Warm Paper)</option>
            </select>
          </div>
        </div>

        {/* Journal Export Path */}
        <div className="settings-section">
          <h3>Journal Exporting</h3>
          <div className="input-group">
            <label className="input-label" htmlFor="journal-path-input">Markdown Directory Path</label>
            <input
              id="journal-path-input"
              type="text"
              className="input-control"
              placeholder="e.g. /home/user/Obsidian/PersonalVault/Journal"
              value={journalPath}
              onChange={(e) => setJournalPath(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> Specify the absolute directory where markdown journals will be written (perfect for Obsidian vaults).
            </span>
          </div>
        </div>

        {/* Default Routine Selection */}
        <div className="settings-section">
          <h3>Routine Behavior</h3>
          <div className="input-group">
            <label className="input-label" htmlFor="default-routine-select">Default Morning Routine</label>
            <select
              id="default-routine-select"
              className="input-control"
              value={defaultRoutineId}
              onChange={(e) => setDefaultRoutineId(e.target.value)}
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <option value="">None</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* User Preferences Toggles */}
        <div className="settings-section" style={{ borderBottom: 'none' }}>
          <h3>Application Preferences</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableDesktopNotifs}
                onChange={(e) => setEnableDesktopNotifs(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Enable desktop status notifications</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableSound}
                onChange={(e) => setEnableSound(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Play sound effects when step completes</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={launchAtStartup}
                onChange={(e) => setLaunchAtStartup(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Start Routiner automatically on system boot</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};
