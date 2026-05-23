import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppStatus {
  configured: boolean;
  stats: {
    total: number;
    delivered: number;
    failed: number;
    queued?: number;
    rate: number;
  };
}

interface WhatsAppMessage {
  id: string;
  template_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  variables: Record<string, string>;
  status: string;
  error_message: string | null;
  twilio_sid: string | null;
  created_at: string;
  producer_id?: string | null;
  dj_id?: string | null;
  booking_id?: string | null;
}

export interface WhatsAppQueueItem {
  id: string;
  template_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  variables: Record<string, string>;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  next_retry_at: string | null;
  last_error: string | null;
  producer_id: string | null;
  dj_id: string | null;
  booking_id: string | null;
  created_at: string;
}

export function useWhatsAppStatus() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'status' },
      });
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ configured: false, stats: { total: 0, delivered: 0, failed: 0, rate: 0 } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { status, loading, refresh: check };
}

export function useWhatsAppMessages() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'messages' },
      });
      if (error) throw error;
      setMessages(data?.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { messages, loading, refresh: fetch };
}

export function useSendWhatsApp() {
  const [loading, setLoading] = useState(false);

  const send = async (params: {
    template_id: string;
    to: string;
    variables?: Record<string, string>;
    recipient_name?: string;
    entity_type?: string;
    entity_id?: string;
    producer_id?: string;
    dj_id?: string;
    booking_id?: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'send', ...params },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('WhatsApp send error:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const enqueue = async (params: {
    template_id: string;
    to: string;
    variables?: Record<string, string>;
    recipient_name?: string;
    entity_type?: string;
    entity_id?: string;
    producer_id?: string;
    dj_id?: string;
    booking_id?: string;
    scheduled_for?: string;
    max_attempts?: number;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'enqueue', ...params },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('WhatsApp enqueue error:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { send, enqueue, loading };
}

export function useWhatsAppQueue() {
  const [queue, setQueue] = useState<WhatsAppQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'queue' },
      });
      if (error) throw error;
      setQueue(data?.queue || []);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (id: string) => {
    await supabase.functions.invoke('send-whatsapp', { body: { action: 'cancel', id } });
    await fetchQueue();
  }, [fetchQueue]);

  const processNow = useCallback(async () => {
    const { data } = await supabase.functions.invoke('send-whatsapp', {
      body: { action: 'process_queue', limit: 25 },
    });
    await fetchQueue();
    return data;
  }, [fetchQueue]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  return { queue, loading, refresh: fetchQueue, cancel, processNow };
}

export function useProducerWhatsAppHistory(producerId?: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!producerId) { setMessages([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'history_by_producer', producer_id: producerId },
      });
      if (error) throw error;
      setMessages(data?.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [producerId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { messages, loading, refresh: fetchHistory };
}
