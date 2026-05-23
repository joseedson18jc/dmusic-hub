import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DJMgmtPanel } from '@/components/bookings/DJMgmtPanel';
import { Loader2 } from 'lucide-react';
import { useSystemSetting, type EventTypes } from '@/hooks/useSystemSettings';

const SIMPLE_STATUSES = [
  { value: 'novo_lead', label: 'Pré Agendado', color: '🟢' },
  { value: 'confirmado', label: 'Confirmado', color: '🔵' },
  { value: 'fechado_perdido', label: 'Cancelado', color: '🔴' },
  { value: 'evento_realizado', label: 'Não Atendida', color: '🔴' },
];

// Lista canônica oficial de fusos suportados.
// DEVE ser idêntica a `public.supported_timezones()` no Postgres e ao
// SUPPORTED_TIMEZONES das edge functions `google-calendar-sync` e
// `google-calendar-retry`. Qualquer mudança aqui exige atualizar todos.
export const SUPPORTED_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Rio_Branco',
  'America/Noronha',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Tokyo',
  'UTC',
] as const;

const TIMEZONE_LABELS: Record<(typeof SUPPORTED_TIMEZONES)[number], string> = {
  'America/Sao_Paulo': '🇧🇷 São Paulo / Brasília (GMT-3)',
  'America/Manaus': '🇧🇷 Manaus (GMT-4)',
  'America/Rio_Branco': '🇧🇷 Rio Branco (GMT-5)',
  'America/Noronha': '🇧🇷 Fernando de Noronha (GMT-2)',
  'America/Argentina/Buenos_Aires': '🇦🇷 Buenos Aires (GMT-3)',
  'America/Mexico_City': '🇲🇽 Cidade do México (GMT-6)',
  'America/New_York': '🇺🇸 Nova York (GMT-5/-4)',
  'America/Los_Angeles': '🇺🇸 Los Angeles (GMT-8/-7)',
  'Europe/Lisbon': '🇵🇹 Lisboa (GMT+0/+1)',
  'Europe/London': '🇬🇧 Londres (GMT+0/+1)',
  'Europe/Madrid': '🇪🇸 Madri (GMT+1/+2)',
  'Europe/Berlin': '🇩🇪 Berlim (GMT+1/+2)',
  'Asia/Dubai': '🇦🇪 Dubai (GMT+4)',
  'Asia/Tokyo': '🇯🇵 Tóquio (GMT+9)',
  UTC: 'UTC',
};

const schema = z.object({
  titulo: z.string().min(1, 'Evento/Cube é obrigatório'),
  producer_id: z.string().min(1, 'Produtor é obrigatório'),
  dj_id: z.string().optional(),
  status: z.string().optional(),
  evento_tipo: z.string().optional(),
  venue: z.string().optional(),
  cidade: z.string().optional(),
  pais: z.string().optional(),
  data_evento: z.string().optional(),
  hora_inicio: z.string().optional(),
  hora_fim: z.string().optional(),
  fuso_horario: z
    .enum(SUPPORTED_TIMEZONES, {
      errorMap: () => ({
        message:
          'Fuso horário inválido. Selecione um dos fusos oficiais suportados pelo sistema.',
      }),
    })
    .optional(),
  gcal_sync_mode: z.enum(['off', 'push', 'bidirectional']).optional(),
  fee_acordado: z.coerce.number().min(0).optional(),
  comissao: z.coerce.number().min(0).max(100).optional(),
  sinal: z.coerce.number().min(0).optional(),
  data_sinal: z.string().optional(),
  data_pagamento: z.string().optional(),
  probabilidade_fechamento: z.coerce.number().min(0).max(100).optional(),
  transporte: z.string().trim().max(200, { message: 'Máximo de 200 caracteres' }).optional(),
  reembolso_uber: z.coerce
    .number({ invalid_type_error: 'Informe um valor numérico válido' })
    .min(0, { message: 'Valor não pode ser negativo' })
    .max(100000, { message: 'Valor máximo: R$ 100.000' })
    .optional(),
  alimentacao: z.string().trim().max(200, { message: 'Máximo de 200 caracteres' }).optional(),
  briefing_musical: z.string().optional(),
  contatos_local: z.string().optional(),
  notas_internas: z.string().optional(),
}).superRefine((values, ctx) => {
  // Helper: parse YYYY-MM-DD como data local (evita issues de timezone).
  const parse = (s?: string) => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const dSinal = parse(values.data_sinal);
  const dPag = parse(values.data_pagamento);
  const dEvento = parse(values.data_evento);

  // 1. Pagamento restante não pode ser antes do sinal.
  if (dSinal && dPag && dPag < dSinal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_pagamento'],
      message: 'A data do pagamento restante não pode ser anterior à data do sinal.',
    });
  }

  // 2. Sinal não pode ser depois do evento (sinal é pago antes do show).
  if (dSinal && dEvento && dSinal > dEvento) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_sinal'],
      message: 'A data do sinal deve ser igual ou anterior à data do evento.',
    });
  }

  // 3. Pagamento restante não pode ser depois do sinal por mais de 2 anos
  //    (sanity check contra erros de digitação).
  if (dSinal && dPag) {
    const diffMs = dPag.getTime() - dSinal.getTime();
    const twoYearsMs = 1000 * 60 * 60 * 24 * 365 * 2;
    if (diffMs > twoYearsMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_pagamento'],
        message: 'Intervalo entre sinal e pagamento maior que 2 anos. Verifique as datas.',
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: any;
  onSuccess: () => void;
}

export function BookingForm({ open, onOpenChange, booking, onSuccess }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [djs, setDjs] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const isEditing = !!booking;
  const sb = supabase as any;
  const { data: eventTypes } = useSystemSetting<EventTypes>('event_types');

  useEffect(() => {
    if (open) {
      sb.from('djs').select('id, nome_artistico').eq('status', 'ativo').order('nome_artistico')
        .then(({ data, error }: any) => { if (error) console.error('[BookingForm] djs load:', error.message); else setDjs(data ?? []); });
      sb.from('producers').select('id, nome, empresa').order('nome')
        .then(({ data, error }: any) => { if (error) console.error('[BookingForm] producers load:', error.message); else setProducers(data ?? []); });
    }
  }, [open]);

  const getDefaults = (b?: any): FormValues => ({
    titulo: b?.titulo ?? '',
    producer_id: b?.producer_id ?? '',
    dj_id: b?.dj_id ?? '',
    status: b?.status ?? 'novo_lead',
    evento_tipo: b?.evento_tipo ?? '',
    venue: b?.venue ?? '',
    cidade: b?.cidade ?? '',
    pais: b?.pais ?? 'Brasil',
    data_evento: b?.data_evento ?? '',
    hora_inicio: b?.hora_inicio ?? '',
    hora_fim: b?.hora_fim ?? '',
    fuso_horario: b?.fuso_horario ?? 'America/Sao_Paulo',
    gcal_sync_mode: (b?.gcal_sync_mode as 'off' | 'push' | 'bidirectional') ?? 'push',
    fee_acordado: b?.fee_acordado ?? 0,
    comissao: b?.comissao ?? 15,
    sinal: b?.sinal ?? 0,
    data_sinal: b?.data_sinal ?? '',
    data_pagamento: b?.data_pagamento ?? '',
    probabilidade_fechamento: b?.probabilidade_fechamento ?? 50,
    transporte: b?.transporte ?? '',
    reembolso_uber: b?.reembolso_uber ?? 0,
    alimentacao: b?.alimentacao ?? '',
    briefing_musical: b?.briefing_musical ?? '',
    contatos_local: b?.contatos_local ?? '',
    notas_internas: b?.notas_internas ?? '',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(booking),
  });

  useEffect(() => {
    form.reset(getDefaults(booking));
  }, [booking, open]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const fee = values.fee_acordado ?? 0;
      const comissao = values.comissao ?? 15;
      const sinal = values.sinal ?? 0;
      const valorLiquido = fee - (fee * comissao / 100);

      const payload = {
        titulo: values.titulo,
        producer_id: values.producer_id,
        dj_id: values.dj_id || null,
        status: values.status || 'novo_lead',
        evento_tipo: values.evento_tipo || null,
        venue: values.venue || null,
        cidade: values.cidade || null,
        pais: values.pais || 'Brasil',
        data_evento: values.data_evento || null,
        hora_inicio: values.hora_inicio || null,
        hora_fim: values.hora_fim || null,
        fuso_horario: values.fuso_horario || 'America/Sao_Paulo',
        gcal_sync_mode: values.gcal_sync_mode || 'push',
        fee_acordado: fee,
        comissao,
        sinal,
        saldo: fee - sinal,
        valor_liquido: valorLiquido,
        probabilidade_fechamento: values.probabilidade_fechamento ?? 50,
        data_sinal: values.data_sinal || null,
        data_pagamento: values.data_pagamento || null,
        transporte: values.transporte || null,
        reembolso_uber: values.reembolso_uber || null,
        alimentacao: values.alimentacao || null,
        briefing_musical: values.briefing_musical || null,
        contatos_local: values.contatos_local || null,
        notas_internas: values.notas_internas || null,
      };

      if (isEditing) {
        const { error } = await sb.from('bookings').update(payload).eq('id', booking.id);
        if (error) throw error;
        toast.success('Booking atualizado');
      } else {
        const { error } = await sb.from('bookings').insert(payload);
        if (error) throw error;
        toast.success('Booking criado com sucesso');
      }
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('DOUBLE_BOOKING_DJ')) {
        const friendly = msg.replace(/^.*DOUBLE_BOOKING_DJ:\s*/, '');
        toast.error('Conflito de agenda do DJ', { description: friendly, duration: 8000 });
      } else if (msg.includes('DOUBLE_BOOKING_PRODUCER')) {
        const friendly = msg.replace(/^.*DOUBLE_BOOKING_PRODUCER:\s*/, '');
        toast.error('Conflito de agenda do produtor', { description: friendly, duration: 8000 });
      } else {
        toast.error(msg || 'Erro ao salvar booking');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Booking' : 'Novo Booking'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className={`grid w-full ${booking?.id ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                {booking?.id && <TabsTrigger value="operacao">Operação</TabsTrigger>}
              </TabsList>

              <TabsContent value="geral" className="space-y-4 mt-4">
                <FormField control={form.control} name="titulo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento/Cube *</FormLabel>
                    <FormControl><Input placeholder="Ex: Show DJ Spark - Club XYZ" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="producer_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produtor *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {producers.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}{p.empresa ? ` (${p.empresa})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dj_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>DJ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {djs.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>{d.nome_artistico}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {SIMPLE_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.color} {s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data_evento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="evento_tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do Evento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(eventTypes ?? []).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                          {(!eventTypes || eventTypes.length === 0) && (
                            <SelectItem value="outro">Outro</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="venue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl><Input placeholder="Local / Venue" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="hora_inicio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set Time (Início)</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hora_fim" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set Time (Fim)</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="fuso_horario" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuso horário (Google Calendar)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'America/Sao_Paulo'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o fuso" /></SelectTrigger></FormControl>
                      <SelectContent className="max-h-72">
                        {SUPPORTED_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {TIMEZONE_LABELS[tz]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-mini text-muted-foreground mt-1">
                      Usado para criar/atualizar o evento no Google Calendar com o horário local correto.
                    </p>
                  </FormItem>
                )} />
                <FormField control={form.control} name="gcal_sync_mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sincronização Google Calendar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'push'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Modo de sincronização" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="push">📤 Somente envio (push) — padrão</SelectItem>
                        <SelectItem value="bidirectional">🔄 Bidirecional — envia e recebe alterações</SelectItem>
                        <SelectItem value="off">🚫 Desativada — não sincronizar este booking</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-mini text-muted-foreground mt-1">
                      Controla se este booking deve ser enviado ao Google Calendar. O modo escolhido fica registrado no histórico de logs.
                    </p>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notas_internas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Internas</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4 mt-4">
                {booking && (
                  <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo Financeiro & Logística</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Fee Acordado</p>
                        <p className="font-semibold text-accent tabular-nums">{booking.fee_acordado != null ? `R$ ${Number(booking.fee_acordado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sinal</p>
                        <p className="font-semibold tabular-nums">{booking.sinal != null ? `R$ ${Number(booking.sinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                        <p className="font-semibold tabular-nums">{booking.comissao != null ? `${booking.comissao}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transporte</p>
                        <p className="font-medium">{booking.transporte || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Alimentação</p>
                        <p className="font-medium">{booking.alimentacao || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Carro por Aplicativo</p>
                        <p className="font-semibold text-accent tabular-nums">{booking.reembolso_uber != null ? `R$ ${Number(booking.reembolso_uber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="fee_acordado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Acordado (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="comissao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sinal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sinal (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="data_sinal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Sinal</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data_pagamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Pagamento Restante</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="transporte" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transporte</FormLabel>
                      <FormControl><Input placeholder="Ex: Aéreo, ônibus, carro próprio..." maxLength={200} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reembolso_uber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carro por Aplicativo (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" max="100000" placeholder="Ex: 150.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="alimentacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alimentação</FormLabel>
                      <FormControl><Input placeholder="Ex: Inclusa no rider, por conta do DJ..." maxLength={200} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="probabilidade_fechamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probabilidade de Fechamento (%)</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" {...field} /></FormControl>
                  </FormItem>
                )} />
              </TabsContent>

              {/* ════════ OPERAÇÃO — DJ-mgmt features (só edit) ════════ */}
              {booking?.id && (
                <TabsContent value="operacao" className="space-y-4 mt-4">
                  <DJMgmtPanel
                    booking={{
                      id: booking.id,
                      status: booking.status as string,
                      dj_id: booking.dj_id ?? null,
                      producer_id: booking.producer_id ?? null,
                      data_evento: booking.data_evento ?? null,
                      hold_until: (booking as { hold_until?: string }).hold_until ?? null,
                      fee_acordado: booking.fee_acordado ?? null,
                    }}
                    onMutate={onSuccess}
                  />
                </TabsContent>
              )}
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Booking'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
