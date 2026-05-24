import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Planning } from './pages/Planning';
import { Journal } from './pages/Journal';
import { Routines } from './pages/Routines';
import { Settings } from './pages/Settings';
import './styles/index.css';

const App: React.FC = () => {
  const { currentView, loadSettings, loadTodayState, settings } = useAppStore();

  useEffect(() => {
    // Initial data loading on startup
    const initApp = async () => {
      await loadSettings();
      await loadTodayState();
    };
    initApp();
  }, [loadSettings, loadTodayState]);

  // Dynamically set HTML attribute for styling theme
  useEffect(() => {
    if (settings) {
      document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [settings]);

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'planning':
        return <Planning />;
      case 'journal':
        return <Journal />;
      case 'routines':
        return <Routines />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default App;
