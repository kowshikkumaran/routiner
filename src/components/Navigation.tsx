import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Compass, BookOpen, Settings, Sliders, Calendar } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { currentView, setView, todayPlan } = useAppStore();

  const menuItems = [
    { id: 'dashboard', label: 'Active Execution', icon: LayoutDashboard, disabled: !todayPlan },
    { id: 'planning', label: 'Morning Planning', icon: Compass, disabled: false },
    { id: 'journal', label: 'End-of-Day Review', icon: BookOpen, disabled: !todayPlan },
    { id: 'routines', label: 'Routine Templates', icon: Sliders, disabled: false },
    { id: 'settings', label: 'Settings', icon: Settings, disabled: false }
  ] as const;

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className="logo-container">
          <Calendar size={24} style={{ color: 'hsl(var(--primary))' }} />
          <span className="logo-text">Routiner</span>
        </div>

        <nav className="nav-links">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => !item.disabled && setView(item.id as any)}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{
                  width: '100%',
                  background: 'none',
                  border: isActive ? undefined : 'none',
                  textAlign: 'left',
                  opacity: item.disabled ? 0.4 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer'
                }}
                disabled={item.disabled}
                title={item.disabled ? 'Plan a morning routine first to unlock' : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="user-profile">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', color: 'hsl(var(--text-muted))' }}>Today's Date</span>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};
