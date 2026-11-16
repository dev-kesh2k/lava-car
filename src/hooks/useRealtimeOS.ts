import { useEffect, useRef } from 'react';
import type { AppointmentOS } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/**
 * Escuta mudanças em appointments_os pelo Supabase Realtime (o RLS filtra o que cada um recebe).
 * `filter` segue a sintaxe do Realtime, ex.: `tenant_id=eq.<id>` ou `customer_id=eq.<id>`.
 */
export function useRealtimeOS(filter: string | null, onChange: (row: AppointmentOS, event: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!filter) return;
    const channel = supabase
      .channel(`os:${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments_os', filter }, (payload) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as AppointmentOS;
        cb.current(row, payload.eventType);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filter]);
}
