export interface Settings {
  id: string;
  theme: 'dark' | 'light';
  journal_path: string;
  notification_preferences: string; // JSON String
  launch_preferences: string;       // JSON String
  default_routine_id: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  name: string;
  sort_order: number;
  schedule_days: string; // JSON array of days e.g. '["mon", "tue"]'
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  routine_id: string;
  name: string;
  duration_minutes: number | null;
  url: string | null;
  sort_order: number;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  priority: string;
  energy_level: 'high' | 'medium' | 'low';
  created_at: string;
}

export type DailyStepStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface DailyStep {
  id: string;
  daily_plan_id: string;
  step_id: string | null;
  routine_id: string;
  name: string;
  duration_minutes: number | null;
  url: string | null;
  status: DailyStepStatus;
  started_at: string | null; // ISO Timestamp or date string
  completed_at: string | null;
  sort_order: number;
}

export interface DailyStepInput {
  id: string;
  step_id: string | null;
  routine_id: string;
  name: string;
  duration_minutes: number | null;
  url: string | null;
  sort_order: number;
}

export interface JournalEntry {
  id: string;
  daily_plan_id: string;
  date: string;
  went_well: string;
  went_poorly: string;
  tomorrow_focus: string;
  created_at: string;
}
