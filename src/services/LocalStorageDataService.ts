import { DataService } from './DataService';
import { Settings, Routine, Step, DailyPlan, DailyStep, DailyStepInput, JournalEntry } from '../types';

export class LocalStorageDataService implements DataService {
  // Helper keys
  private readonly SETTINGS_KEY = 'routiner_settings';
  private readonly ROUTINES_KEY = 'routiner_routines';
  private readonly STEPS_KEY = 'routiner_steps';
  private readonly PLANS_KEY = 'routiner_daily_plans';
  private readonly DAILY_STEPS_KEY = 'routiner_daily_steps';
  private readonly JOURNAL_KEY = 'routiner_journal_entries';

  // Helper getters/setters for raw localStorage operations
  private getItem<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- Settings ---
  async getSettings(): Promise<Settings> {
    const settings = localStorage.getItem(this.SETTINGS_KEY);
    if (!settings) {
      const defaultSettings: Settings = {
        id: 'default',
        theme: 'dark',
        journal_path: '',
        notification_preferences: '{}',
        launch_preferences: '{}',
        default_routine_id: '',
        updated_at: new Date().toISOString(),
      };
      this.setItem(this.SETTINGS_KEY, defaultSettings);
      return defaultSettings;
    }
    return JSON.parse(settings) as Settings;
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const updated = { ...settings, updated_at: new Date().toISOString() };
    this.setItem(this.SETTINGS_KEY, updated);
    return updated;
  }

  // --- Routines ---
  async getRoutines(): Promise<Routine[]> {
    const routines = this.getItem<Routine[]>(this.ROUTINES_KEY, []);
    return routines.sort((a, b) => a.sort_order - b.sort_order);
  }

  async createRoutine(id: string, name: string, sortOrder: number, scheduleDays: string): Promise<Routine> {
    const routines = await this.getRoutines();
    const newRoutine: Routine = {
      id,
      name,
      sort_order: sortOrder,
      schedule_days: scheduleDays,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    routines.push(newRoutine);
    this.setItem(this.ROUTINES_KEY, routines);
    return newRoutine;
  }

  async updateRoutine(id: string, name: string, scheduleDays: string): Promise<Routine> {
    const routines = await this.getRoutines();
    const index = routines.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Routine with id ${id} not found`);
    }
    routines[index] = {
      ...routines[index],
      name,
      schedule_days: scheduleDays,
      updated_at: new Date().toISOString(),
    };
    this.setItem(this.ROUTINES_KEY, routines);
    return routines[index];
  }

  async deleteRoutine(id: string): Promise<void> {
    // Delete routine
    const routines = await this.getRoutines();
    this.setItem(this.ROUTINES_KEY, routines.filter(r => r.id !== id));

    // Cascade delete steps
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    this.setItem(this.STEPS_KEY, steps.filter(s => s.routine_id !== id));
  }

  async reorderRoutines(ids: string[]): Promise<void> {
    const routines = await this.getRoutines();
    const updated = routines.map(r => {
      const idx = ids.indexOf(r.id);
      if (idx !== -1) {
        return { ...r, sort_order: idx, updated_at: new Date().toISOString() };
      }
      return r;
    });
    this.setItem(this.ROUTINES_KEY, updated);
  }

  // --- Steps ---
  async getSteps(routineId: string): Promise<Step[]> {
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    return steps
      .filter(s => s.routine_id === routineId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async addStep(id: string, routineId: string, name: string, durationMinutes: number | null, url: string | null, sortOrder: number): Promise<Step> {
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    const newStep: Step = {
      id,
      routine_id: routineId,
      name,
      duration_minutes: durationMinutes,
      url,
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
    };
    steps.push(newStep);
    this.setItem(this.STEPS_KEY, steps);
    return newStep;
  }

  async updateStep(id: string, name: string, durationMinutes: number | null, url: string | null): Promise<Step> {
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    const index = steps.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Step with id ${id} not found`);
    }
    steps[index] = {
      ...steps[index],
      name,
      duration_minutes: durationMinutes,
      url,
    };
    this.setItem(this.STEPS_KEY, steps);
    return steps[index];
  }

  async deleteStep(id: string): Promise<void> {
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    this.setItem(this.STEPS_KEY, steps.filter(s => s.id !== id));
  }

  async reorderSteps(routineId: string, stepIds: string[]): Promise<void> {
    const steps = this.getItem<Step[]>(this.STEPS_KEY, []);
    const updated = steps.map(s => {
      if (s.routine_id === routineId) {
        const idx = stepIds.indexOf(s.id);
        if (idx !== -1) {
          return { ...s, sort_order: idx };
        }
      }
      return s;
    });
    this.setItem(this.STEPS_KEY, updated);
  }

  // --- Daily Execution ---
  async getDailyPlan(date: string): Promise<DailyPlan | null> {
    const plans = this.getItem<DailyPlan[]>(this.PLANS_KEY, []);
    const plan = plans.find(p => p.date === date);
    return plan || null;
  }

  async startDay(id: string, date: string, priority: string, energyLevel: 'high' | 'medium' | 'low', dailySteps: DailyStepInput[]): Promise<DailyPlan> {
    // 1. Insert daily plan (overwrite/replace if same date)
    const plans = this.getItem<DailyPlan[]>(this.PLANS_KEY, []);
    const filteredPlans = plans.filter(p => p.date !== date);
    const newPlan: DailyPlan = {
      id,
      date,
      priority,
      energy_level: energyLevel,
      created_at: new Date().toISOString(),
    };
    filteredPlans.push(newPlan);
    this.setItem(this.PLANS_KEY, filteredPlans);

    // 2. Clear existing steps for this plan id
    const currentDailySteps = this.getItem<DailyStep[]>(this.DAILY_STEPS_KEY, []);
    const filteredSteps = currentDailySteps.filter(s => s.daily_plan_id !== id);

    // 3. Map inputs to DailySteps
    const newDailySteps: DailyStep[] = dailySteps.map(step => ({
      id: step.id,
      daily_plan_id: id,
      step_id: step.step_id,
      routine_id: step.routine_id,
      name: step.name,
      duration_minutes: step.duration_minutes,
      url: step.url,
      status: 'pending',
      started_at: null,
      completed_at: null,
      sort_order: step.sort_order,
    }));

    filteredSteps.push(...newDailySteps);
    this.setItem(this.DAILY_STEPS_KEY, filteredSteps);

    return newPlan;
  }

  async getDailySteps(dailyPlanId: string): Promise<DailyStep[]> {
    const dailySteps = this.getItem<DailyStep[]>(this.DAILY_STEPS_KEY, []);
    return dailySteps
      .filter(s => s.daily_plan_id === dailyPlanId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async updateDailyStepStatus(id: string, status: string, startedAt: string | null, completedAt: string | null): Promise<DailyStep> {
    const dailySteps = this.getItem<DailyStep[]>(this.DAILY_STEPS_KEY, []);
    const index = dailySteps.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`DailyStep with id ${id} not found`);
    }
    
    dailySteps[index] = {
      ...dailySteps[index],
      status: status as any,
      started_at: startedAt,
      completed_at: completedAt,
    };
    this.setItem(this.DAILY_STEPS_KEY, dailySteps);
    return dailySteps[index];
  }

  // --- Journaling ---
  async getJournalEntry(dailyPlanId: string): Promise<JournalEntry | null> {
    const entries = this.getItem<JournalEntry[]>(this.JOURNAL_KEY, []);
    const entry = entries.find(e => e.daily_plan_id === dailyPlanId);
    return entry || null;
  }

  async saveJournal(id: string, dailyPlanId: string, date: string, wentWell: string, wentPoorly: string, tomorrowFocus: string): Promise<JournalEntry> {
    const entries = this.getItem<JournalEntry[]>(this.JOURNAL_KEY, []);
    const filtered = entries.filter(e => e.daily_plan_id !== dailyPlanId);
    const newEntry: JournalEntry = {
      id,
      daily_plan_id: dailyPlanId,
      date,
      went_well: wentWell,
      went_poorly: wentPoorly,
      tomorrow_focus: tomorrowFocus,
      created_at: new Date().toISOString(),
    };
    filtered.push(newEntry);
    this.setItem(this.JOURNAL_KEY, filtered);
    return newEntry;
  }

  async exportJournal(date: string, _path: string, content: string): Promise<void> {
    // In web environment, path is ignored and we download the file natively.
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `journal-${date}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
