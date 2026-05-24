import { create } from 'zustand';
import { Routine, Step } from '../types';
import { dataService } from '../services';

interface RoutineState {
  routines: Routine[];
  selectedRoutine: Routine | null;
  steps: Step[];
  loading: boolean;

  loadRoutines: () => Promise<void>;
  setSelectedRoutine: (routine: Routine | null) => void;
  createRoutine: (name: string, scheduleDays: string[]) => Promise<Routine>;
  updateRoutine: (id: string, name: string, scheduleDays: string[]) => Promise<Routine>;
  deleteRoutine: (id: string) => Promise<void>;
  reorderRoutines: (ids: string[]) => Promise<void>;

  loadSteps: (routineId: string) => Promise<void>;
  addStep: (routineId: string, name: string, durationMinutes: number | null, url: string | null) => Promise<Step>;
  updateStep: (id: string, name: string, durationMinutes: number | null, url: string | null) => Promise<Step>;
  deleteStep: (id: string) => Promise<void>;
  reorderSteps: (routineId: string, stepIds: string[]) => Promise<void>;
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: [],
  selectedRoutine: null,
  steps: [],
  loading: false,

  loadRoutines: async () => {
    set({ loading: true });
    try {
      const routines = await dataService.getRoutines();
      set({ routines, loading: false });
    } catch (err) {
      console.error('Failed to load routines:', err);
      set({ loading: false });
    }
  },

  setSelectedRoutine: (routine) => {
    set({ selectedRoutine: routine, steps: [] });
    if (routine) {
      get().loadSteps(routine.id);
    }
  },

  createRoutine: async (name, scheduleDays) => {
    const id = 'routine_' + Math.random().toString(36).substring(2, 11);
    const sortOrder = get().routines.length;
    const daysStr = JSON.stringify(scheduleDays);
    try {
      const routine = await dataService.createRoutine(id, name, sortOrder, daysStr);
      set(state => ({ routines: [...state.routines, routine] }));
      return routine;
    } catch (err) {
      console.error('Failed to create routine:', err);
      throw err;
    }
  },

  updateRoutine: async (id, name, scheduleDays) => {
    const daysStr = JSON.stringify(scheduleDays);
    try {
      const updated = await dataService.updateRoutine(id, name, daysStr);
      set(state => ({
        routines: state.routines.map(r => r.id === id ? { ...r, ...updated } : r),
        selectedRoutine: state.selectedRoutine?.id === id ? { ...state.selectedRoutine, ...updated } : state.selectedRoutine
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update routine:', err);
      throw err;
    }
  },

  deleteRoutine: async (id) => {
    try {
      await dataService.deleteRoutine(id);
      set(state => ({
        routines: state.routines.filter(r => r.id !== id),
        selectedRoutine: state.selectedRoutine?.id === id ? null : state.selectedRoutine,
        steps: state.selectedRoutine?.id === id ? [] : state.steps
      }));
    } catch (err) {
      console.error('Failed to delete routine:', err);
      throw err;
    }
  },

  reorderRoutines: async (ids) => {
    try {
      await dataService.reorderRoutines(ids);
      const routines = [...get().routines];
      routines.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      set({ routines });
    } catch (err) {
      console.error('Failed to reorder routines:', err);
    }
  },

  loadSteps: async (routineId) => {
    try {
      const steps = await dataService.getSteps(routineId);
      set({ steps });
    } catch (err) {
      console.error('Failed to load steps:', err);
    }
  },

  addStep: async (routineId, name, durationMinutes, url) => {
    const id = 'step_' + Math.random().toString(36).substring(2, 11);
    const sortOrder = get().steps.length;
    try {
      const step = await dataService.addStep(id, routineId, name, durationMinutes, url, sortOrder);
      set(state => ({ steps: [...state.steps, step] }));
      return step;
    } catch (err) {
      console.error('Failed to add step:', err);
      throw err;
    }
  },

  updateStep: async (id, name, durationMinutes, url) => {
    try {
      const updated = await dataService.updateStep(id, name, durationMinutes, url);
      set(state => ({
        steps: state.steps.map(s => s.id === id ? updated : s)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update step:', err);
      throw err;
    }
  },

  deleteStep: async (id) => {
    try {
      await dataService.deleteStep(id);
      set(state => ({
        steps: state.steps.filter(s => s.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete step:', err);
      throw err;
    }
  },

  reorderSteps: async (routineId, stepIds) => {
    try {
      await dataService.reorderSteps(routineId, stepIds);
      const steps = [...get().steps];
      steps.sort((a, b) => stepIds.indexOf(a.id) - stepIds.indexOf(b.id));
      set({ steps });
    } catch (err) {
      console.error('Failed to reorder steps:', err);
    }
  }
}));
