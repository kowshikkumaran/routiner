import { Settings, Routine, Step, DailyPlan, DailyStep, DailyStepInput, JournalEntry } from '../types';

export interface DataService {
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<Settings>;

  getRoutines(): Promise<Routine[]>;
  createRoutine(id: string, name: string, sortOrder: number, scheduleDays: string): Promise<Routine>;
  updateRoutine(id: string, name: string, scheduleDays: string): Promise<Routine>;
  deleteRoutine(id: string): Promise<void>;
  reorderRoutines(ids: string[]): Promise<void>;

  getSteps(routineId: string): Promise<Step[]>;
  addStep(id: string, routineId: string, name: string, durationMinutes: number | null, url: string | null, sortOrder: number): Promise<Step>;
  updateStep(id: string, name: string, durationMinutes: number | null, url: string | null): Promise<Step>;
  deleteStep(id: string): Promise<void>;
  reorderSteps(routineId: string, stepIds: string[]): Promise<void>;

  getDailyPlan(date: string): Promise<DailyPlan | null>;
  startDay(id: string, date: string, priority: string, energyLevel: 'high' | 'medium' | 'low', dailySteps: DailyStepInput[]): Promise<DailyPlan>;
  getDailySteps(dailyPlanId: string): Promise<DailyStep[]>;
  updateDailyStepStatus(id: string, status: string, startedAt: string | null, completedAt: string | null): Promise<DailyStep>;

  getJournalEntry(dailyPlanId: string): Promise<JournalEntry | null>;
  saveJournal(id: string, dailyPlanId: string, date: string, wentWell: string, wentPoorly: string, tomorrowFocus: string): Promise<JournalEntry>;
  exportJournal(date: string, path: string, content: string): Promise<void>;
}
