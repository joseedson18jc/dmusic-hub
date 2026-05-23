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
import { Loader2 } from 'lucide-react';
import { FINANCIAL_TYPES, PAYMENT_STATUSES } from '@/hooks/useFinancial';
import { useSystemSetting, type FinancialCategories } from '@/hooks/useSystemSettings';
import { PaymentMethodIcon, type PaymentMethodKey } from '@/components/brand-icons';

const schema = z.object({
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  valor_bruto: z.coerce.number().min(0, 'Valor inválido'),
  comissao: z.coerce.number().min(0).optional(),
  status: z.string().optional(),
  data_vencimento: z.string().optional(),
  data_pagamento: z.string().optional(),
  metodo_pagamento: z.string().optional(),
  moeda: z.string().optional(),
  centro_custo: z.string().optional(),
  dj_id: z.string().optional(),
  producer_id: z.string().optional(),
  booking_id: z.string().optional(),
  notas: z.string().optional(),
});

interface FinancialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: any;
  onSuccess: () => void;
}

export function FinancialForm({ open, onOpenChange, record, onSuccess }: FinancialFormProps) {
  const [loading, setLoading] = useState(false);
  const [djs, setDjs] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const isEditing = !!record;
  const sb = supabase as any;
  const { data: financialCategories } = useSystemSetting<FinancialCategories>('financial_categories');

  useEffect(() => {
    if (open) {
      sb.from('djs').select('id, nome_artistico').order('nome_artistico').then(({ data }: any) => setDjs(data ?? []));
      sb.from('producers').select('id, nome').order('nome').then(({ data }: any) => setProducers(data ?? []));
      sb.from('bookings').select('id, titulo').order('created_at', { ascending: false }).limit(50).then(({ data }: any) => setBookings(data ?? []));
    }
  }, [open]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: record?.tipo ?? '',
      descricao: record?.descricao ?? '',
      categoria: record?.categoria ?? '',
      valor_bruto: record?.valor_bruto ?? 0,
      comissao: record?.comissao ?? 0,
      status: record?.status ?? 'pendente',
      data_vencimento: record?.data_vencimento ?? '',
      data_pagamento: record?.data_pagamento ?? '',
      metodo_pagamento: record?.metodo_pagamento ?? '',
      moeda: record?.moeda ?? 'BRL',
      centro_custo: record?.centro_custo ?? '',
      dj_id: record?.dj_id ?? '',
      producer_id: record?.producer_id ?? '',
      booking_id: record?.booking_id ?? '',
      notas: record?.notas ?? '',
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const valorLiquido = values.valor_bruto - (values.comissao || 0);
      const payload = {
        tipo: values.tipo,
        descricao: values.descricao || null,
        categoria: values.categoria || null,
        valor_bruto: values.valor_bruto,
        valor_liquido: valorLiquido,
        comissao: values.comissao || null,
        status: values.status || 'pendente',
        data_vencimento: values.data_vencimento || null,
        data_pagamento: values.data_pagamento || null,
        metodo_pagamento: values.metodo_pagamento || null,
        moeda: values.moeda || 'BRL',
        centro_custo: values.centro_custo || null,
        dj_id: values.dj_id || null,
        producer_id: values.producer_id || null,
        booking_id: values.booking_id || null,
        notas: values.notas || null,
      };

      if (isEditing) {
        const { error } = await sb.from('financial_records').update(payload).eq('id', record.id);
        if (error) throw error;
        toast.success('Lançamento atualizado');
      } else {
        const { error } = await sb.from('financial_records').insert(payload);
        if (error) throw error;
        toast.success('Lançamento criado');
      }
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {FINANCIAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Input {...field} /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="valor_bruto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Bruto (R$) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="comissao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Comissão (R$)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="moeda" render={({ field }) => (
                <FormItem>
                  <FormLabel>Moeda</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_vencimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="data_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Pagamento</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="dj_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>DJ</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>{djs.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nome_artistico}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="producer_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Produtor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>{producers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="booking_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.titulo}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="metodo_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Método</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(['pix', 'transferencia', 'boleto', 'cartao', 'stripe', 'dinheiro'] as PaymentMethodKey[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          <span className="flex items-center gap-2">
                            <PaymentMethodIcon method={m} size={18} />
                            <span className="capitalize">
                              {m === 'pix' ? 'PIX'
                                : m === 'transferencia' ? 'Transferência (TED/DOC)'
                                : m === 'cartao' ? 'Cartão'
                                : m.charAt(0).toUpperCase() + m.slice(1)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="categoria" render={({ field }) => {
                const tipoAtual = form.watch('tipo');
                const opcoes = (tipoAtual === 'receita'
                  ? financialCategories?.receita
                  : tipoAtual === 'despesa'
                  ? financialCategories?.despesa
                  : []) ?? [];
                return (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    {opcoes.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {opcoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl><Input placeholder="Ex: Cachê, Logística..." {...field} /></FormControl>
                    )}
                  </FormItem>
                );
              }} />
            </div>
            <FormField control={form.control} name="notas" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
              </FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Lançamento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
