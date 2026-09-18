import { create } from 'zustand';
import { db, ShiftItem } from '../db/database';
import { getSupabaseClient } from '../services/supabase';

interface ShiftStoreState {
  shifts: ShiftItem[];
  isLoading: boolean;
  loadShifts: () => Promise<void>;
  addShift: (shift: Omit<ShiftItem, 'id' | 'synced'>) => Promise<void>;
  syncWithCloud: (userId: string) => Promise<void>;
}

export const useShiftStore = create<ShiftStoreState>((set, get) => ({
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

  addShift: async (newShiftData) => {
    const newItem: Omit<ShiftItem, 'id'> = {
      ...newShiftData,
      synced: false,
    };

    try {
      // Write locally first for instant UI response
      const id = await db.shifts.add(newItem as ShiftItem);
      const savedItem: ShiftItem = { ...newItem, id };

      set((state) => ({
        shifts: [...state.shifts, savedItem],
      }));
    } catch (error) {
      console.error('Failed to save shift locally:', error);
    }
  },

  syncWithCloud: async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // Find all local items that haven't been synced yet
      const unsyncedShifts = await db.shifts.where('synced').equals(0).toArray();
      if (unsyncedShifts.length === 0) return;

      // Push to Supabase
      const payload = unsyncedShifts.map(({ id, ...rest }) => ({
        ...rest,
        courier_id: userId,
      }));

      const { error } = await client.from('active_shifts').upsert(payload);

      if (!error) {
        // Mark local records as synced
        for (const shift of unsyncedShifts) {
          if (shift.id) {
            await db.shifts.update(shift.id, { synced: true });
          }
        }
        // Refresh state
        await get().loadShifts();
      }
    } catch (error) {
      console.error('Cloud synchronisation failed:', error);
    }
  },
}));