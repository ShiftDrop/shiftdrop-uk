import { useEffect } from 'react';
import { getSupabaseClient } from '../services/supabase';
import { useShiftStore } from '../stores/shiftStore';

export function useRealtimeSync(userId?: string) {
  const loadShifts = useShiftStore((state) => state.loadShifts);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseClient();
    if (!client) return;

    // Listen to changes on the active_shifts table for this user
    const channel = client
      .channel(`public:active_shifts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_shifts',
          filter: `courier_id=eq.${userId}`,
        },
        () => {
          // Whenever a change occurs on the server, reload local store/database
          loadShifts();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, loadShifts]);
}