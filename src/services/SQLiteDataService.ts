import { invoke } from '@tauri-apps/api/core';
import { DataService } from './DataService';
import { Settings, Routine, Step, DailyPlan, DailyStep, DailyStepInput, JournalEntry } from '../types';

export class SQLiteDataService implements DataService {
  async getSettings(): Promise<Settings> {
    return invoke<Settings>('get_settings');
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    return invoke<Settings>('update_settings', { settings });
  }

  async getRoutines(): Promise<Routine[]> {
    return invoke<Routine[]>('get_routines');
  }

  async createRoutine(id: string, name: string, sortOrder: number, scheduleDays: string): Promise<Routine> {
    return invoke<Routine>('create_routine', { id, name, sortOrder, scheduleDays });
  }

  async updateRoutine(id: string, name: string, scheduleDays: string): Promise<Routine> {
    return invoke<Routine>('update_routine', { id, name, scheduleDays });
  }

  async deleteRoutine(id: string): Promise<void> {
    return invoke<void>('delete_routine', { id });
  }

  async reorderRoutines(ids: string[]): Promise<void> {
    return invoke<void>('reorder_routines', { ids });
  }

  async getSteps(routineId: string): Promise<Step[]> {
    return invoke<Step[]>('get_steps', { routineId });
  }

  async addStep(id: string, routineId: string, name: string, durationMinutes: number | null, url: string | null, sortOrder: number): Promise<Step> {
    return invoke<Step>('add_step', { id, routineId, name, durationMinutes, url, sortOrder });
  }

  async updateStep(id: string, name: string, durationMinutes: number | null, url: string | null): Promise<Step> {
    return invoke<Step>('update_step', { id, name, durationMinutes, url });
  }

  async deleteStep(id: string): Promise<void> {
    return invoke<void>('delete_step', { id });
  }

  async reorderSteps(routineId: string, stepIds: string[]): Promise<void> {
    return invoke<void>('reorder_steps', { routineId, stepIds });
  }

  async getDailyPlan(date: string): Promise<DailyPlan | null> {
    return invoke<DailyPlan | null>('get_daily_plan', { date });
  }

  async startDay(id: string, date: string, priority: string, energyLevel: 'high' | 'medium' | 'low', dailySteps: DailyStepInput[]): Promise<DailyPlan> {
    return invoke<DailyPlan>('start_day', { id, date, priority, energyLevel, dailySteps });
  }

  async getDailySteps(dailyPlanId: string): Promise<DailyStep[]> {
    return invoke<DailyStep[]>('get_daily_steps', { dailyPlanId });
  }

  async updateDailyStepStatus(id: string, status: string, startedAt: string | null, completedAt: string | null): Promise<DailyStep> {
    return invoke<DailyStep>('update_daily_step_status', { id, status, startedAt, completedAt });
  }

  async getJournalEntry(dailyPlanId: string): Promise<JournalEntry | null> {
    return invoke<JournalEntry | null>('get_journal_entry', { dailyPlanId });
  }

  async saveJournal(id: string, dailyPlanId: string, date: string, wentWell: string, wentPoorly: string, tomorrowFocus: string): Promise<JournalEntry> {
    return invoke<JournalEntry>('save_journal', { id, dailyPlanId, date, wentWell, wentPoorly, tomorrowFocus });
  }

  async exportJournal(date: string, path: string, content: string): Promise<void> {
    return invoke<void>('export_journal', { date, path, content });
  }
}
