import { create } from 'zustand';
import { Settings, DailyPlan, DailyStep, JournalEntry, DailyStepInput } from '../types';
import { dataService } from '../services';
import { openExternalUrl } from '../utils/url';

interface AppState {
  // Navigation
  currentView: 'dashboard' | 'planning' | 'journal' | 'routines' | 'settings';
  setView: (view: 'dashboard' | 'planning' | 'journal' | 'routines' | 'settings') => void;

  // Settings
  settings: Settings | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updated: Partial<Settings>) => Promise<void>;

  // Daily Execution
  todayPlan: DailyPlan | null;
  dailySteps: DailyStep[];
  activeStepId: string | null;
  timerElapsed: number; // in seconds
  isTimerPaused: boolean;

  loadTodayState: () => Promise<void>;
  startDay: (priority: string, energyLevel: 'high' | 'medium' | 'low') => Promise<void>;
  completeActiveStep: () => Promise<void>;
  skipActiveStep: () => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  setTimerElapsed: (elapsed: number) => void;
  tickTimer: () => void;

  // Journaling
  currentJournal: JournalEntry | null;
  loadJournal: () => Promise<void>;
  saveJournal: (wentWell: string, wentPoorly: string, tomorrowFocus: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  return {
    currentView: 'dashboard',
    setView: (view) => set({ currentView: view }),

    settings: null,
    loadSettings: async () => {
      try {
        const settings = await dataService.getSettings();
        set({ settings });
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    },
    updateSettings: async (updated) => {
      const current = get().settings;
      if (!current) return;
      const newSettings = { ...current, ...updated };
      try {
        const result = await dataService.updateSettings(newSettings);
        set({ settings: result });
      } catch (err) {
        console.error('Failed to update settings:', err);
      }
    },

    todayPlan: null,
    dailySteps: [],
    activeStepId: null,
    timerElapsed: 0,
    isTimerPaused: false,

    loadTodayState: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      try {
        const plan = await dataService.getDailyPlan(todayStr);
        if (plan) {
          const steps = await dataService.getDailySteps(plan.id);
          // Find first active or pending step
          const activeStep = steps.find(s => s.status === 'active') || steps.find(s => s.status === 'pending');

          let activeId = activeStep ? activeStep.id : null;

          // If we found a pending step but no active step is marked, let's mark it as active in DB
          if (activeStep && activeStep.status === 'pending') {
            const now = new Date().toISOString();
            const updated = await dataService.updateDailyStepStatus(activeStep.id, 'active', now, null);
            // Replace in array
            const idx = steps.findIndex(s => s.id === activeStep.id);
            if (idx !== -1) {
              steps[idx] = updated;
            }
            activeId = updated.id;
          }

          set({
            todayPlan: plan,
            dailySteps: steps,
            activeStepId: activeId,
            timerElapsed: 0,
            isTimerPaused: false,
            currentView: 'dashboard'
          });
        } else {
          set({
            todayPlan: null,
            dailySteps: [],
            activeStepId: null,
            currentView: 'planning'
          });
        }
      } catch (err) {
        console.error('Failed to load today state:', err);
      }
    },

    startDay: async (priority, energyLevel) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const planId = 'plan_' + Math.random().toString(36).substring(2, 11);

      try {
        // Fetch routine templates
        const routines = await dataService.getRoutines();
        const stepsByRoutine: { [key: string]: any[] } = {};

        // Load steps for all routines
        for (const r of routines) {
          stepsByRoutine[r.id] = await dataService.getSteps(r.id);
        }

        // Get current local weekday (mon, tue, wed, etc.)
        const weekday = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

        // Filter routines active for today
        const activeRoutines = routines.filter(r => {
          try {
            const days = JSON.parse(r.schedule_days) as string[];
            return days.includes(weekday);
          } catch (e) {
            return false;
          }
        });

        // Flatten active routines' steps into daily steps inputs
        const dailyStepInputs: DailyStepInput[] = [];
        let sortIndex = 0;

        for (const routine of activeRoutines) {
          const routineSteps = stepsByRoutine[routine.id] || [];
          for (const s of routineSteps) {
            dailyStepInputs.push({
              id: 'dstep_' + Math.random().toString(36).substring(2, 11),
              step_id: s.id,
              routine_id: routine.id,
              name: s.name,
              duration_minutes: s.duration_minutes,
              url: s.url,
              sort_order: sortIndex++
            });
          }
        }

        const plan = await dataService.startDay(planId, todayStr, priority, energyLevel, dailyStepInputs);
        const steps = await dataService.getDailySteps(plan.id);

        let activeId: string | null = null;
        if (steps.length > 0) {
          // Set first step to active
          const firstStep = steps[0];
          const now = new Date().toISOString();
          const updated = await dataService.updateDailyStepStatus(firstStep.id, 'active', now, null);
          steps[0] = updated;
          activeId = updated.id;

          // Proactively open URL if configured
          if (updated.url) {
            await openExternalUrl(updated.url);
          }
        }

        set({
          todayPlan: plan,
          dailySteps: steps,
          activeStepId: activeId,
          timerElapsed: 0,
          isTimerPaused: false,
          currentView: 'dashboard'
        });
      } catch (err) {
        console.error('Failed to start day:', err);
      }
    },

    completeActiveStep: async () => {
      const { activeStepId, dailySteps } = get();
      if (!activeStepId) return;

      const now = new Date().toISOString();
      try {
        const completed = await dataService.updateDailyStepStatus(activeStepId, 'completed', null, now);

        // Update local array
        const steps = dailySteps.map(s => s.id === activeStepId ? completed : s);

        // Find next step that is pending
        const nextStep = steps.find(s => s.status === 'pending');
        let nextActiveId: string | null = null;

        if (nextStep) {
          const updatedNext = await dataService.updateDailyStepStatus(nextStep.id, 'active', now, null);
          const nextIdx = steps.findIndex(s => s.id === nextStep.id);
          if (nextIdx !== -1) {
            steps[nextIdx] = updatedNext;
          }
          nextActiveId = updatedNext.id;

          // Proactively open URL if configured
          if (updatedNext.url) {
            await openExternalUrl(updatedNext.url);
          }
        }

        set({
          dailySteps: steps,
          activeStepId: nextActiveId,
          timerElapsed: 0,
          isTimerPaused: false
        });

        // If no more steps, navigate to journal
        if (!nextActiveId) {
          set({ currentView: 'journal' });
        }
      } catch (err) {
        console.error('Failed to complete step:', err);
      }
    },

    skipActiveStep: async () => {
      const { activeStepId, dailySteps } = get();
      if (!activeStepId) return;

      const now = new Date().toISOString();
      try {
        const skipped = await dataService.updateDailyStepStatus(activeStepId, 'skipped', null, now);

        // Update local array
        const steps = dailySteps.map(s => s.id === activeStepId ? skipped : s);

        // Find next step that is pending
        const nextStep = steps.find(s => s.status === 'pending');
        let nextActiveId: string | null = null;

        if (nextStep) {
          const updatedNext = await dataService.updateDailyStepStatus(nextStep.id, 'active', now, null);
          const nextIdx = steps.findIndex(s => s.id === nextStep.id);
          if (nextIdx !== -1) {
            steps[nextIdx] = updatedNext;
          }
          nextActiveId = updatedNext.id;

          // Proactively open URL if configured
          if (updatedNext.url) {
            await openExternalUrl(updatedNext.url);
          }
        }

        set({
          dailySteps: steps,
          activeStepId: nextActiveId,
          timerElapsed: 0,
          isTimerPaused: false
        });

        // If no more steps, navigate to journal
        if (!nextActiveId) {
          set({ currentView: 'journal' });
        }
      } catch (err) {
        console.error('Failed to skip step:', err);
      }
    },

    pauseTimer: () => set({ isTimerPaused: true }),
    resumeTimer: () => set({ isTimerPaused: false }),
    setTimerElapsed: (elapsed) => set({ timerElapsed: elapsed }),
    tickTimer: () => {
      const { isTimerPaused, activeStepId } = get();
      if (activeStepId && !isTimerPaused) {
        set(state => ({ timerElapsed: state.timerElapsed + 1 }));
      }
    },

    currentJournal: null,
    loadJournal: async () => {
      const { todayPlan } = get();
      if (!todayPlan) return;
      try {
        const journal = await dataService.getJournalEntry(todayPlan.id);
        set({ currentJournal: journal });
      } catch (err) {
        console.error('Failed to load journal:', err);
      }
    },
    saveJournal: async (wentWell, wentPoorly, tomorrowFocus) => {
      const { todayPlan } = get();
      if (!todayPlan) return;

      const journalId = 'journal_' + Math.random().toString(36).substring(2, 11);
      try {
        const saved = await dataService.saveJournal(journalId, todayPlan.id, todayPlan.date, wentWell, wentPoorly, tomorrowFocus);
        set({ currentJournal: saved });
      } catch (err) {
        console.error('Failed to save journal:', err);
      }
    }
  };
});
