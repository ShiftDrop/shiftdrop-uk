import { create } from 'zustand';
import { db, ShiftItem } from '../db/database';

interface ShiftStoreState {
  shifts: ShiftItem[];
  isLoading: boolean;
  loadShifts: () => Promise<void>;
  addShift: (shift: Omit<ShiftItem, 'id' | 'synced'>) => Promise<void>;
}

export const useShiftStore = create<ShiftStoreState>((set) => ({
  shifts: [],
  isLoading: false,

  loadShifts: async () => {
    set({ isLoading: true });
    try {
      const localShifts = await db.shifts.toArray();
      set({ shifts: localShifts, isLoading: false });
    } catch (error) {
      console.error('Failed to load local shifts:', error);
      set({ isLoading: false });
    }
  },

  addShift: async (newShiftData: Omit<ShiftItem, 'id' | 'synced'>) => {
    const newItem: Omit<ShiftItem, 'id'> = {
      ...newShiftData,
      synced: false,
    };

    try {
      // Write locally first for instant UI response
      const id = await db.shifts.add(newItem as ShiftItem);
      const savedItem: ShiftItem = { ...newItem, id };

      set((state: ShiftStoreState) => ({
        shifts: [...state.shifts, savedItem],
      }));
    } catch (error) {
      console.error('Failed to save shift locally:', error);
    }
  },
}));