import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { PAPEIS_COMERCIAIS, STATUS_RELACIONAMENTO } from '@/hooks/useProducers';
import type { Tables } from '@/integrations/supabase/types';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  empresa: z.string().optional(),
  tipo_produtor: z.string().optional(),
  papeis_comerciais: z.array(z.string()).optional(),
  contato_principal: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  site: z.string().optional(),
  cidade: z.string().optional(),
  pais: z.string().optional(),
  idiomas: z.string().optional(),
  tags: z.string().optional(),
  origem_relacionamento: z.string().optional(),
  status_relacionamento: z.string().optional(),
  condicoes_comerciais: z.string().optional(),
  forma_pagamento: z.string().optional(),
  notas_internas: z.string().optional(),
  proxima_acao: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProducerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producer?: Tables<'producers'> | null;
  onSuccess: () => void;
}

export function ProducerForm({ open, onOpenChange, producer, onSuccess }: ProducerFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!producer;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: producer?.nome ?? '',
      empresa: producer?.empresa ?? '',
      tipo_produtor: producer?.tipo_produtor ?? '',
      papeis_comerciais: (producer?.papeis_comerciais as string[]) ?? [],
      contato_principal: producer?.contato_principal ?? '',
      telefone: producer?.telefone ?? '',
      email: producer?.email ?? '',
      whatsapp: producer?.whatsapp ?? '',
      instagram: producer?.instagram ?? '',
      site: producer?.site ?? '',
      cidade: producer?.cidade ?? '',
      pais: producer?.pais ?? 'Brasil',
      idiomas: producer?.idiomas?.join(', ') ?? '',
      tags: producer?.tags?.join(', ') ?? '',
      origem_relacionamento: producer?.origem_relacionamento ?? '',
      status_relacionamento: producer?.status_relacionamento ?? 'ativo',
      condicoes_comerciais: producer?.condicoes_comerciais ?? '',
      forma_pagamento: producer?.forma_pagamento ?? '',
      notas_internas: producer?.notas_internas ?? '',
      proxima_acao: producer?.proxima_acao ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        nome: values.nome,
        empresa: values.empresa || null,
        tipo_produtor: values.tipo_produtor || null,
        papeis_comerciais: values.papeis_comerciais?.length ? values.papeis_comerciais : [],
        contato_principal: values.contato_principal || null,
        telefone: values.telefone || null,
        email: values.email || null,
        whatsapp: values.whatsapp || null,
        instagram: values.instagram || null,
        site: values.site || null,
        cidade: values.cidade || null,
        pais: values.pais || 'Brasil',
        idiomas: values.idiomas ? values.idiomas.split(',').map(i => i.trim()).filter(Boolean) : [],
        tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        origem_relacionamento: values.origem_relacionamento || null,
        status_relacionamento: values.status_relacionamento || 'ativo',
        condicoes_comerciais: values.condicoes_comerciais || null,
        forma_pagamento: values.forma_pagamento || null,
        notas_internas: values.notas_internas || null,
        proxima_acao: values.proxima_acao || null,
      };

      const sb = supabase as any;
      if (isEditing && producer) {
        const { error } = await sb.from('producers').update(payload).eq('id', producer.id);
        if (error) throw error;
        toast.success('Produtor atualizado com sucesso');
      } else {
        const { error } = await sb.from('producers').insert(payload);
        if (error) throw error;
        toast.success('Produtor cadastrado com sucesso');
      }
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar produtor');
    } finally {
      setLoading(false);
    }
  };

  const selectedPapeis = form.watch('papeis_comerciais') ?? [];

  const togglePapel = (value: string) => {
    const current = form.getValues('papeis_comerciais') ?? [];
    if (current.includes(value)) {
      form.setValue('papeis_comerciais', current.filter((p: string) => p !== value));
    } else {
      form.setValue('papeis_comerciais', [...current, value]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produtor' : 'Novo Produtor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="comercial">Comercial</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl><Input placeholder="Nome do produtor" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="empresa" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="telefone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contato_principal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato Principal</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="instagram" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl><Input placeholder="@usuario" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="site" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site</FormLabel>
                      <FormControl><Input placeholder="https://" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cidade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="idiomas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idiomas (vírgula)</FormLabel>
                      <FormControl><Input placeholder="Português, Inglês" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (vírgula)</FormLabel>
                      <FormControl><Input placeholder="VIP, recorrente" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="comercial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tipo_produtor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Produtor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="independente">Independente</SelectItem>
                          <SelectItem value="empresa">Empresa</SelectItem>
                          <SelectItem value="agencia">Agência</SelectItem>
                          <SelectItem value="festival">Festival</SelectItem>
                          <SelectItem value="casa_noturna">Casa Noturna</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status_relacionamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Relacionamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUS_RELACIONAMENTO.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="origem_relacionamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem do Relacionamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="indicacao">Indicação</SelectItem>
                          <SelectItem value="rede_social">Rede Social</SelectItem>
                          <SelectItem value="evento">Evento</SelectItem>
                          <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                          <SelectItem value="parceiro">Parceiro</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Papéis Comerciais</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PAPEIS_COMERCIAIS.map(p => (
                      <div key={p.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPapeis.includes(p.value)}
                          onCheckedChange={() => togglePapel(p.value)}
                        />
                        <label className="text-sm cursor-pointer" onClick={() => togglePapel(p.value)}>
                          {p.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4 mt-4">
                <FormField control={form.control} name="condicoes_comerciais" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condições Comerciais</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento Preferida</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="internacional">Internacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="notas" className="space-y-4 mt-4">
                <FormField control={form.control} name="notas_internas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Internas</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="proxima_acao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próxima Ação Obrigatória</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Produtor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
