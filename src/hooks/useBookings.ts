import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { escapeSearch } from '@/lib/searchEscape';

const sb = supabase as any;

export const BOOKING_STAGES = [
  { value: 'novo_lead', label: 'Novo Lead', color: 'bg-muted' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-primary/20' },
  { value: 'briefing_recebido', label: 'Briefing', color: 'bg-primary/30' },
  { value: 'proposta_enviada', label: 'Proposta', color: 'bg-primary/40' },
  { value: 'negociacao', label: 'Negociação', color: 'bg-[hsl(var(--warning))]/20' },
  { value: 'aguardando_aprovacao', label: 'Aprovação', color: 'bg-[hsl(var(--warning))]/30' },
  { value: 'contrato_enviado', label: 'Contrato', color: 'bg-[hsl(var(--warning))]/40' },
  { value: 'assinatura_pendente', label: 'Assinatura', color: 'bg-[hsl(var(--warning))]/50' },
  { value: 'sinal_pendente', label: 'Sinal', color: 'bg-[hsl(var(--warning))]/60' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-[hsl(var(--success))]/20' },
  { value: 'planejamento', label: 'Planejamento', color: 'bg-[hsl(var(--success))]/30' },
  { value: 'pronto_para_evento', label: 'Pronto', color: 'bg-[hsl(var(--success))]/40' },
  { value: 'evento_realizado', label: 'Realizado', color: 'bg-[hsl(var(--success))]/50' },
  { value: 'pagamento_final_pendente', label: 'Pgto Final', color: 'bg-[hsl(var(--success))]/60' },
  { value: 'repasse_pendente', label: 'Repasse', color: 'bg-[hsl(var(--success))]/70' },
  { value: 'fechado_ganho', label: 'Ganho ✓', color: 'bg-[hsl(var(--success))]/80' },
  { value: 'fechado_perdido', label: 'Perdido ✗', color: 'bg-destructive/30' },
] as const;

// Simplified stages for Kanban columns
export const KANBAN_COLUMNS = [
  { key: 'lead', label: 'Lead', statuses: ['novo_lead', 'qualificado', 'briefing_recebido'] },
  { key: 'proposta', label: 'Proposta', statuses: ['proposta_enviada', 'negociacao', 'aguardando_aprovacao'] },
  { key: 'contrato', label: 'Contrato', statuses: ['contrato_enviado', 'assinatura_pendente', 'sinal_pendente'] },
  { key: 'confirmado', label: 'Confirmado', statuses: ['confirmado', 'planejamento', 'pronto_para_evento'] },
  { key: 'realizado', label: 'Realizado', statuses: ['evento_realizado', 'pagamento_final_pendente', 'repasse_pendente'] },
  { key: 'fechado', label: 'Fechado', statuses: ['fechado_ganho', 'fechado_perdido'] },
] as const;

/**
 * Read the automation_rules setting. Returns defaults if the row is missing
 * or unreadable (e.g. anon user). Each missing flag defaults to `true` to
 * preserve backwards-compatible behavior — except stripe link which is opt-in.
 */
type AutomationRulesShape = {
  whatsapp_on_confirm?: boolean;
  google_calendar_auto_sync?: boolean;
  email_on_contract_sent?: boolean;
  stripe_link_on_confirm?: boolean;
  whatsapp_payment_reminder_days?: number;
};

async function loadAutomationRules(): Promise<Required<AutomationRulesShape>> {
  const { data } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', 'automation_rules')
    .maybeSingle();
  const r = (data?.value ?? {}) as AutomationRulesShape;
  return {
    whatsapp_on_confirm: r.whatsapp_on_confirm !== false,
    google_calendar_auto_sync: r.google_calendar_auto_sync !== false,
    email_on_contract_sent: r.email_on_contract_sent !== false,
    // Stripe is opt-in: only enable when explicitly true
    stripe_link_on_confirm: r.stripe_link_on_confirm === true,
    whatsapp_payment_reminder_days:
      typeof r.whatsapp_payment_reminder_days === 'number'
        ? r.whatsapp_payment_reminder_days
        : 3,
  };
}

async function triggerConfirmadoAutomation(bookingId: string) {
  try {
    const rules = await loadAutomationRules();
    const waEnabled = rules.whatsapp_on_confirm;
    const calEnabled = rules.google_calendar_auto_sync;
    const stripeEnabled = rules.stripe_link_on_confirm;

    // Fetch full booking data with relations
    const { data: booking, error } = await sb
      .from('bookings')
      .select('*, djs:dj_id(nome_artistico, whatsapp, whatsapp_opt_in, valor_cache_padrao, user_id), producers:producer_id(nome, email, whatsapp, whatsapp_opt_in, empresa)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('Failed to fetch booking for automation:', error);
      return;
    }

    const formatCurrency = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A definir';

    // 1. Google Calendar — create event
    if (calEnabled) try {
      const { error: calError } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'create',
          booking: {
            id: booking.id,
            titulo: booking.titulo,
            evento_nome: booking.evento_nome,
            venue: booking.venue,
            data_evento: booking.data_evento,
            hora_inicio: booking.hora_inicio,
            hora_fim: booking.hora_fim,
            fuso_horario: booking.fuso_horario,
            dj_name: booking.djs?.nome_artistico,
            gcal_sync_mode: booking.gcal_sync_mode,
          },
        },
      });
      if (calError) throw calError;
      toast.success('📅 Evento criado no Google Calendar (Manager)');
    } catch (err) {
      console.warn('Google Calendar sync (manager) skipped:', err);
    }

    // 1b. Google Calendar — create event in DJ's calendar if DJ has user_id
    const djData = booking.djs;
    if (calEnabled && djData?.user_id) {
      try {
        const { error: djCalError } = await supabase.functions.invoke('google-calendar-sync', {
          body: {
            action: 'create',
            target_user_id: djData.user_id,
            booking: {
              id: booking.id,
              titulo: booking.titulo,
              evento_nome: booking.evento_nome,
              venue: booking.venue,
              data_evento: booking.data_evento,
              hora_inicio: booking.hora_inicio,
              hora_fim: booking.hora_fim,
              fuso_horario: booking.fuso_horario,
              dj_name: djData.nome_artistico,
              gcal_sync_mode: booking.gcal_sync_mode,
            },
          },
        });
        if (djCalError) throw djCalError;
        toast.success('📅 Evento criado no Google Calendar do DJ');
      } catch (err) {
        console.warn('Google Calendar sync (DJ) skipped:', err);
      }
    }

    // 2. WhatsApp — notify producer if opted in
    const producer = booking.producers;
    if (waEnabled && producer?.whatsapp && producer?.whatsapp_opt_in) {
      try {
        const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            action: 'send',
            template_id: 'booking_confirmado',
            to: producer.whatsapp,
            recipient_name: producer.nome,
            variables: {
              evento_clube: booking.venue || 'A definir',
              festa: booking.evento_nome || booking.titulo,
              contratante: producer?.nome || producer?.empresa || 'A definir',
              cidade: booking.cidade || 'A definir',
              cache: formatCurrency(booking.fee_acordado),
              transporte: booking.transporte || 'A definir',
              alimentacao: booking.alimentacao || 'A definir',
              reembolso_uber: booking.reembolso_uber != null ? formatCurrency(booking.reembolso_uber) : 'N/A',
              data_pagamento: booking.data_pagamento || 'A definir',
              responsavel_pagamento: booking.responsavel_pagamento || 'A definir',
              contato_responsavel_pagamento: booking.contato_responsavel_pagamento || 'A definir',
              data: booking.data_evento || 'A definir',
              dj: booking.djs?.nome_artistico || 'A definir',
            },
            entity_type: 'booking',
            entity_id: booking.id,
          },
        });
        if (waError) throw waError;
        toast.success('📱 WhatsApp enviado ao produtor');
      } catch (err) {
        console.warn('WhatsApp to producer skipped:', err);
      }
    }

    // 3. WhatsApp — notify DJ if opted in
    const dj = booking.djs;
    if (waEnabled && dj?.whatsapp && dj?.whatsapp_opt_in) {
      try {
        const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            action: 'send',
            template_id: 'booking_confirmado_dj',
            to: dj.whatsapp,
            recipient_name: dj.nome_artistico,
            variables: {
              evento_clube: booking.venue || 'A definir',
              festa: booking.evento_nome || booking.titulo,
              contratante: producer?.nome || producer?.empresa || 'A definir',
              cidade: booking.cidade || 'A definir',
              cache: formatCurrency(booking.fee_acordado),
              transporte: booking.transporte || 'A definir',
              alimentacao: booking.alimentacao || 'A definir',
              reembolso_uber: booking.reembolso_uber != null ? formatCurrency(booking.reembolso_uber) : 'N/A',
              data_pagamento: booking.data_pagamento || 'A definir',
              responsavel_pagamento: booking.responsavel_pagamento || 'A definir',
              contato_responsavel_pagamento: booking.contato_responsavel_pagamento || 'A definir',
              data: booking.data_evento || 'A definir',
            },
            entity_type: 'booking',
            entity_id: booking.id,
          },
        });
        if (waError) throw waError;
        toast.success('📱 WhatsApp enviado ao DJ');
      } catch (err) {
        console.warn('WhatsApp to DJ skipped:', err);
      }
    }

    // 4. Stripe payment link — only if rule is enabled and we have an amount + producer
    if (stripeEnabled && booking.fee_acordado && booking.fee_acordado > 0 && producer) {
      try {
        const { data: linkData, error: linkError } = await supabase.functions.invoke('create-payment-link', {
          body: {
            description: `Sinal/Pagamento — ${booking.titulo}`,
            amount: Number(booking.sinal) > 0 ? Number(booking.sinal) : Number(booking.fee_acordado),
            customer_email: producer.email || undefined,
            booking_id: booking.id,
            producer_id: booking.producer_id,
          },
        });
        if (linkError) throw linkError;
        if (linkData?.payment_link_url) {
          toast.success('💳 Link Stripe criado para o produtor');
        }
      } catch (err) {
        console.warn('Stripe payment link skipped:', err);
      }
    }
  } catch (err) {
    console.error('Automation error:', err);
  }
}

async function triggerDJCalendarSync(bookingId: string, eventoStatus: string) {
  try {
    const rules = await loadAutomationRules();
    if (!rules.google_calendar_auto_sync) {
      console.info('Google Calendar sync disabled by automation_rules');
      return;
    }

    const { data: booking, error } = await sb
      .from('bookings')
      .select('*, djs:dj_id(nome_artistico, user_id)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('Failed to fetch booking for DJ calendar sync:', error);
      return;
    }

    const djData = booking.djs;
    if (!djData?.user_id) {
      console.warn('DJ has no user_id, skipping calendar sync');
      return;
    }

    const statusLabel = eventoStatus === 'confirmado' ? '✅ CONFIRMADO' : '⏳ A CONFIRMAR';

    const { error: calError } = await supabase.functions.invoke('google-calendar-sync', {
      body: {
        action: 'create',
        target_user_id: djData.user_id,
        booking: {
          id: booking.id,
          titulo: `${statusLabel} — ${booking.titulo}`,
          evento_nome: booking.evento_nome,
          venue: booking.venue,
          data_evento: booking.data_evento,
          hora_inicio: booking.hora_inicio,
          hora_fim: booking.hora_fim,
          fuso_horario: booking.fuso_horario,
          dj_name: djData.nome_artistico,
          gcal_sync_mode: booking.gcal_sync_mode,
        },
      },
    });
    if (calError) throw calError;
    toast.success(`📅 Evento sincronizado no Google Calendar do DJ (${statusLabel})`);
  } catch (err) {
    console.warn('DJ Calendar sync skipped:', err);
  }
}

export function useBookings(filters?: { search?: string; status?: string; dj_id?: string; producer_id?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      let query = sb.from('bookings').select('*, djs:dj_id(nome_artistico, foto_url), producers:producer_id(nome, empresa)').order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.dj_id) query = query.eq('dj_id', filters.dj_id);
      if (filters?.producer_id) query = query.eq('producer_id', filters.producer_id);
      if (filters?.search) {
        const q = escapeSearch(filters.search);
        if (q) query = query.or(`titulo.ilike.%${q}%,evento_nome.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await sb.from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (status === 'confirmado') {
        triggerConfirmadoAutomation(id);
      }
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useUpdateEventoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, evento_status }: { id: string; evento_status: string }) => {
      const { error } = await sb.from('bookings').update({ evento_status }).eq('id', id);
      if (error) throw error;
      return { id, evento_status };
    },
    onSuccess: ({ id, evento_status }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(`Evento marcado como "${evento_status.replace('_', ' ')}"`);
      // Sync DJ calendar for both 'confirmado' and 'a_confirmar'
      if (evento_status === 'confirmado' || evento_status === 'a_confirmar') {
        triggerDJCalendarSync(id, evento_status);
      }
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useUpdateBookingDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data_evento }: { id: string; data_evento: string }) => {
      const { error } = await sb.from('bookings').update({ data_evento }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Data do evento atualizada');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking removido');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}
