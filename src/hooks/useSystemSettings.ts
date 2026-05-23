import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';

const sb = supabase as any;

export type EventTypes = string[];
export type FinancialCategories = { receita: string[]; despesa: string[] };
export type CommissionRules = { default_pct: number; min_pct: number; max_pct: number };

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  /** Optional custom HTML body. Supports {{variable}} interpolation. */
  body_html?: string;
};
export type ContractTemplates = ContractTemplate[];

export type AutomationRules = {
  // ── WhatsApp ──
  whatsapp_on_confirm: boolean;
  whatsapp_on_contract_signed: boolean;
  whatsapp_payment_reminder_days: number;
  whatsapp_on_event_day: boolean;
  whatsapp_on_payment_received: boolean;

  // ── Email ──
  email_on_contract_sent: boolean;
  email_on_contract_signed: boolean;
  email_on_booking_confirmed: boolean;
  email_on_invoice_issued: boolean;
  email_on_payment_received: boolean;

  // ── Google Calendar ──
  google_calendar_auto_sync: boolean;
  google_calendar_sync_on_update: boolean;
  google_calendar_delete_on_cancel: boolean;

  // ── Stripe ──
  stripe_link_on_confirm: boolean;
  stripe_invoice_on_event_done: boolean;
  stripe_auto_charge_deposit: boolean;
};

export function useSystemSetting<T>(key: string) {
  return useQuery({
    queryKey: ['system_settings', key],
    queryFn: async () => {
      const { data, error } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as T) ?? null;
    },
  });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      const { data: existing } = await sb
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();
      if (existing) {
        const { error } = await sb
          .from('system_settings')
          .update({ value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('system_settings')
          .insert({ key, value, description });
        if (error) throw error;
      }
      return { key, value };
    },
    onSuccess: ({ key }) => {
      qc.invalidateQueries({ queryKey: ['system_settings', key] });
      toast.success('Configuração salva');
    },
    onError: (e: any) => safeErrorToast(e, 'Erro ao salvar configuração'),
  });
}