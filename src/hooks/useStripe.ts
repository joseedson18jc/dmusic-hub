import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';

interface StripeStatus {
  connected: boolean;
  account_id?: string;
  business_name?: string;
  country?: string;
  currency?: string;
  error?: string;
}

interface StripeCharge {
  id: string;
  tipo: string;
  descricao: string;
  customer_email: string | null;
  valor: number;
  moeda: string;
  status: string;
  url: string | null;
  created_at: string;
  metadata: Record<string, string>;
}

export function useStripeStatus() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-status');
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: 'Falha ao verificar conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { status, loading, refresh: check };
}

export function useStripeCharges() {
  const [charges, setCharges] = useState<StripeCharge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-stripe-charges');
      if (error) throw error;
      setCharges(data?.items || []);
    } catch {
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { charges, loading, refresh: fetch };
}

export function useCreatePaymentLink() {
  const [loading, setLoading] = useState(false);

  const create = async (params: {
    description: string;
    amount: number;
    customer_email?: string;
    booking_id?: string;
    producer_id?: string;
  }) => {
    setLoading(true);
    try {
      // The server decides whether to bypass the automation gate based on
      // the caller's role (admin/super_admin). The previous `manual: true`
      // flag was set client-side and trivially forgeable.
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.skipped) {
        toast.info(data.message || 'Geração de link Stripe está desativada.');
        return null;
      }
      toast.success('Link de pagamento criado!');
      return data;
    } catch (err: any) {
      safeErrorToast(err, 'Erro ao criar link');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}
