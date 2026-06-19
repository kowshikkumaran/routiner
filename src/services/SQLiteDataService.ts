import { DataService } from './DataService';
import { Settings, Routine, Step, DailyPlan, DailyStep, DailyStepInput, JournalEntry } from '../types';

export class SQLiteDataService implements DataService {
  async getSettings(): Promise<Settings> {
    return window.electron.ipcRenderer.invoke<Settings>('get_settings');
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    return window.electron.ipcRenderer.invoke<Settings>('update_settings', { settings });
  }

  async getRoutines(): Promise<Routine[]> {
    return window.electron.ipcRenderer.invoke<Routine[]>('get_routines');
  }

  async createRoutine(id: string, name: string, sortOrder: number, scheduleDays: string): Promise<Routine> {
    return window.electron.ipcRenderer.invoke<Routine>('create_routine', { id, name, sortOrder, scheduleDays });
  }

  async updateRoutine(id: string, name: string, scheduleDays: string): Promise<Routine> {
    return window.electron.ipcRenderer.invoke<Routine>('update_routine', { id, name, scheduleDays });
  }

  async deleteRoutine(id: string): Promise<void> {
    return window.electron.ipcRenderer.invoke<void>('delete_routine', { id });
  }

  async reorderRoutines(ids: string[]): Promise<void> {
    return window.electron.ipcRenderer.invoke<void>('reorder_routines', { ids });
  }

  async getSteps(routineId: string): Promise<Step[]> {
    return window.electron.ipcRenderer.invoke<Step[]>('get_steps', { routineId });
  }

  async addStep(id: string, routineId: string, name: string, durationMinutes: number | null, url: string | null, sortOrder: number): Promise<Step> {
    return window.electron.ipcRenderer.invoke<Step>('add_step', { id, routineId, name, durationMinutes, url, sortOrder });
  }

  async updateStep(id: string, name: string, durationMinutes: number | null, url: string | null): Promise<Step> {
    return window.electron.ipcRenderer.invoke<Step>('update_step', { id, name, durationMinutes, url });
  }

  async deleteStep(id: string): Promise<void> {
    return window.electron.ipcRenderer.invoke<void>('delete_step', { id });
  }

  async reorderSteps(routineId: string, stepIds: string[]): Promise<void> {
    return window.electron.ipcRenderer.invoke<void>('reorder_steps', { routineId, stepIds });
  }

  async getDailyPlan(date: string): Promise<DailyPlan | null> {
    return window.electron.ipcRenderer.invoke<DailyPlan | null>('get_daily_plan', { date });
  }

  async startDay(id: string, date: string, priority: string, energyLevel: 'high' | 'medium' | 'low', dailySteps: DailyStepInput[]): Promise<DailyPlan> {
    return window.electron.ipcRenderer.invoke<DailyPlan>('start_day', { id, date, priority, energyLevel, dailySteps });
  }

  async getDailySteps(dailyPlanId: string): Promise<DailyStep[]> {
    return window.electron.ipcRenderer.invoke<DailyStep[]>('get_daily_steps', { dailyPlanId });
  }

  async updateDailyStepStatus(id: string, status: string, startedAt: string | null, completedAt: string | null): Promise<DailyStep> {
    return window.electron.ipcRenderer.invoke<DailyStep>('update_daily_step_status', { id, status, startedAt, completedAt });
  }

  async getJournalEntry(dailyPlanId: string): Promise<JournalEntry | null> {
    return window.electron.ipcRenderer.invoke<JournalEntry | null>('get_journal_entry', { dailyPlanId });
  }

  async saveJournal(id: string, dailyPlanId: string, date: string, wentWell: string, wentPoorly: string, tomorrowFocus: string): Promise<JournalEntry> {
    return window.electron.ipcRenderer.invoke<JournalEntry>('save_journal', { id, dailyPlanId, date, wentWell, wentPoorly, tomorrowFocus });
  }

  async exportJournal(date: string, path: string, content: string): Promise<void> {
    return window.electron.ipcRenderer.invoke<void>('export_journal', { date, path, content });
  }
}
