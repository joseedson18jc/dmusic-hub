import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GCalStatus {
  connected: boolean;
  calendar_id?: string;
  error?: string;
}

export function useGoogleCalendarStatus() {
  const [status, setStatus] = useState<GCalStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'status', booking: {} },
      });
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { status, loading, refresh: check };
}

export function useGoogleCalendarAuth() {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        method: 'POST',
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank', 'width=600,height=700');
      }
    } catch (err) {
      console.error('Google Calendar auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // We can't delete via client due to RLS with anon, but user owns the row
      const { error } = await (supabase as any)
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);
      if (error) console.error('Disconnect error:', error);
    }
  };

  return { connect, disconnect, loading };
}

export function useGoogleCalendarSync() {
  const [loading, setLoading] = useState(false);

  const syncBooking = async (action: 'create' | 'update' | 'delete', booking: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action, booking },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Calendar sync error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { syncBooking, loading };
}
