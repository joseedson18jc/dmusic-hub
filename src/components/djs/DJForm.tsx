import { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { Tables } from '@/integrations/supabase/types';

const djSchema = z.object({
  nome_artistico: z.string().min(1, 'Nome artístico é obrigatório'),
  nome_civil: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  cidade: z.string().optional(),
  pais: z.string().optional(),
  data_nascimento: z.string().optional(),
  documento: z.string().optional(),
  endereco: z.string().optional(),
  mini_bio: z.string().optional(),
  bio_completa: z.string().optional(),
  generos_musicais: z.string().optional(),
  estilo_performance: z.string().optional(),
  idiomas: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  spotify: z.string().optional(),
  youtube: z.string().optional(),
  soundcloud: z.string().optional(),
  press_kit_url: z.string().optional(),
  rider_tecnico_url: z.string().optional(),
  rider_hospitalidade_url: z.string().optional(),
  equipamentos_proprios: z.string().optional(),
  equipamentos_necessarios: z.string().optional(),
  restricoes: z.string().optional(),
  preferencias_viagem: z.string().optional(),
  valor_cache_padrao: z.coerce.number().min(0).optional(),
  valor_minimo: z.coerce.number().min(0).optional(),
  comissao_gestao: z.coerce.number().min(0).max(100).optional(),
  pix: z.string().optional(),
  status: z.enum(['ativo', 'pausa', 'indisponivel']).optional(),
  notas_internas: z.string().optional(),
  observacoes_estrategicas: z.string().optional(),
});

type DJFormValues = z.infer<typeof djSchema>;

interface DJFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dj?: Tables<'djs'> | null;
  onSuccess: () => void;
}

export function DJForm({ open, onOpenChange, dj, onSuccess }: DJFormProps) {
  const [loading, setLoading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(dj?.foto_url ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>((dj as any)?.cover_url ?? null);
  const isEditing = !!dj;
  // Pasta de upload no Storage — usa o ID do DJ se editando, ou um temporário
  // baseado em timestamp pra novos. Em ambos os casos fica isolado.
  const uploadFolder = isEditing ? `roster/${dj!.id}` : `roster/new-${Date.now()}`;

  // Resync upload state quando o DJ alvo muda (editar A → editar B, ou novo após edit)
  useEffect(() => {
    if (open) {
      setFotoUrl(dj?.foto_url ?? null);
      setCoverUrl((dj as any)?.cover_url ?? null);
    }
  }, [dj, open]);

  const form = useForm<DJFormValues>({
    resolver: zodResolver(djSchema),
    defaultValues: {
      nome_artistico: dj?.nome_artistico ?? '',
      nome_civil: dj?.nome_civil ?? '',
      email: dj?.email ?? '',
      telefone: dj?.telefone ?? '',
      whatsapp: dj?.whatsapp ?? '',
      cidade: dj?.cidade ?? '',
      pais: dj?.pais ?? 'Brasil',
      data_nascimento: dj?.data_nascimento ?? '',
      documento: dj?.documento ?? '',
      endereco: dj?.endereco ?? '',
      mini_bio: dj?.mini_bio ?? '',
      bio_completa: dj?.bio_completa ?? '',
      generos_musicais: dj?.generos_musicais?.join(', ') ?? '',
      estilo_performance: dj?.estilo_performance ?? '',
      idiomas: dj?.idiomas?.join(', ') ?? '',
      instagram: dj?.instagram ?? '',
      tiktok: dj?.tiktok ?? '',
      spotify: dj?.spotify ?? '',
      youtube: dj?.youtube ?? '',
      soundcloud: dj?.soundcloud ?? '',
      press_kit_url: dj?.press_kit_url ?? '',
      rider_tecnico_url: dj?.rider_tecnico_url ?? '',
      rider_hospitalidade_url: dj?.rider_hospitalidade_url ?? '',
      equipamentos_proprios: dj?.equipamentos_proprios ?? '',
      equipamentos_necessarios: dj?.equipamentos_necessarios ?? '',
      restricoes: dj?.restricoes ?? '',
      preferencias_viagem: dj?.preferencias_viagem ?? '',
      valor_cache_padrao: dj?.valor_cache_padrao ?? 0,
      valor_minimo: dj?.valor_minimo ?? 0,
      comissao_gestao: dj?.comissao_gestao ?? 15,
      pix: dj?.pix ?? '',
      status: (dj?.status as 'ativo' | 'pausa' | 'indisponivel') ?? 'ativo',
      notas_internas: dj?.notas_internas ?? '',
      observacoes_estrategicas: dj?.observacoes_estrategicas ?? '',
    },
  });

  const onSubmit = async (values: DJFormValues) => {
    setLoading(true);
    try {
      const payload = {
        nome_artistico: values.nome_artistico,
        nome_civil: values.nome_civil || null,
        foto_url: fotoUrl,
        cover_url: coverUrl,
        email: values.email || null,
        telefone: values.telefone || null,
        whatsapp: values.whatsapp || null,
        cidade: values.cidade || null,
        pais: values.pais || 'Brasil',
        data_nascimento: values.data_nascimento || null,
        documento: values.documento || null,
        endereco: values.endereco || null,
        mini_bio: values.mini_bio || null,
        bio_completa: values.bio_completa || null,
        generos_musicais: values.generos_musicais ? values.generos_musicais.split(',').map(g => g.trim()).filter(Boolean) : null,
        estilo_performance: values.estilo_performance || null,
        idiomas: values.idiomas ? values.idiomas.split(',').map(i => i.trim()).filter(Boolean) : null,
        instagram: values.instagram || null,
        tiktok: values.tiktok || null,
        spotify: values.spotify || null,
        youtube: values.youtube || null,
        soundcloud: values.soundcloud || null,
        press_kit_url: values.press_kit_url || null,
        rider_tecnico_url: values.rider_tecnico_url || null,
        rider_hospitalidade_url: values.rider_hospitalidade_url || null,
        equipamentos_proprios: values.equipamentos_proprios || null,
        equipamentos_necessarios: values.equipamentos_necessarios || null,
        restricoes: values.restricoes || null,
        preferencias_viagem: values.preferencias_viagem || null,
        valor_cache_padrao: values.valor_cache_padrao ?? 0,
        valor_minimo: values.valor_minimo ?? 0,
        comissao_gestao: values.comissao_gestao ?? 15,
        pix: values.pix || null,
        status: values.status ?? 'ativo',
        notas_internas: values.notas_internas || null,
        observacoes_estrategicas: values.observacoes_estrategicas || null,
      };

      let djId: string | null = null;
      let alreadyHasUser = false;

      if (isEditing && dj) {
        const { error } = await (supabase as any).from('djs').update(payload).eq('id', dj.id);
        if (error) throw error;
        djId = dj.id;
        alreadyHasUser = !!(dj as any).user_id;
        toast.success('DJ atualizado com sucesso');
      } else {
        const { data: insData, error } = await (supabase as any)
          .from('djs')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        djId = insData?.id;
        toast.success('DJ cadastrado com sucesso');
      }

      // ════════ AUTO-CREATE conta de acesso do DJ ════════
      // Se DJ tem email cadastrado e ainda não tem user_id, cria conta
      // automaticamente + envia email de recovery pro DJ definir senha.
      if (djId && values.email && !alreadyHasUser) {
        try {
          const tempPassword = generateTempPassword();
          const fullName = values.nome_civil || values.nome_artistico;

          const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('create_dj_user_account', {
            p_dj_id: djId,
            p_email: values.email,
            p_password: tempPassword,
            p_full_name: fullName,
          });

          if (rpcErr) {
            // Não bloqueia o save do DJ — só avisa
            console.warn('[DJForm] auto-create account skipped:', rpcErr);
            toast.info('DJ salvo, mas não foi possível criar conta de acesso. Crie manualmente em /usuarios.');
          } else {
            const createdUserId = rpcData?.[0]?.user_id;
            // Dispara email de recuperação de senha — DJ recebe link
            // pra definir a própria senha. Usa SMTP nativo do Supabase.
            const { error: recErr } = await supabase.auth.resetPasswordForEmail(values.email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });

            if (recErr) {
              // Email falhou mas conta foi criada — mostra credenciais temp
              toast.info(`Conta criada (${values.email}). Email não enviou — senha temp: ${tempPassword}`, { duration: 15000 });
            } else {
              toast.success(`✅ Conta de DJ criada · email enviado para ${values.email} definir senha`, { duration: 8000 });
            }
            // eslint-disable-next-line no-console
            console.info('[DJForm] DJ user account ready, id=', createdUserId);
          }
        } catch (e) {
          console.warn('[DJForm] account creation failed (non-blocking):', e);
        }
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar DJ');
    } finally {
      setLoading(false);
    }
  };

  // Gera senha temp forte pra DJ — DJ usa email recovery pra trocar.
  function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar DJ' : 'Novo DJ'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="profissional">Profissional</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                {/* ════════ Mídia: foto de perfil + cover/banner ════════ */}
                <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
                  <p className="text-mini font-mono uppercase tracking-[0.16em] text-muted-foreground">
                    ◢ MÍDIA · imagens públicas do roster
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUpload
                      value={fotoUrl}
                      onChange={setFotoUrl}
                      bucket="dj-assets"
                      folder={`${uploadFolder}/profile`}
                      variant="circle"
                      label="Foto de perfil"
                      hint="JPG, PNG ou WEBP · max 5 MB · usada no avatar e card"
                    />
                    <ImageUpload
                      value={coverUrl}
                      onChange={setCoverUrl}
                      bucket="dj-assets"
                      folder={`${uploadFolder}/cover`}
                      variant="rect"
                      aspectRatio={3}
                      label="Capa / Cover"
                      hint="Banner horizontal (3:1) · max 5 MB · aparece no perfil"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome_artistico" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Artístico *</FormLabel>
                      <FormControl><Input placeholder="Ex: DJ Spark" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nome_civil" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Civil</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Email
                        {!isEditing && (
                          <span className="text-mini font-mono uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/30">
                            ✦ cria conta acesso
                          </span>
                        )}
                      </FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      {!isEditing && (
                        <p className="text-mini text-muted-foreground mt-1">
                          Se informado: cria conta de acesso pra o DJ (role <code>dj</code>) + envia email automático pra definir senha.
                        </p>
                      )}
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
                  <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="documento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento (CPF/RG)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="pausa">Pausa</SelectItem>
                          <SelectItem value="indisponivel">Indisponível</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="endereco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
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
                </div>
              </TabsContent>

              <TabsContent value="profissional" className="space-y-4 mt-4">
                <FormField control={form.control} name="mini_bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mini Bio</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="bio_completa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio Completa</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="generos_musicais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gêneros Musicais (separar por vírgula)</FormLabel>
                      <FormControl><Input placeholder="House, Techno, Bass" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="estilo_performance" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estilo de Performance</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="idiomas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idiomas (separar por vírgula)</FormLabel>
                      <FormControl><Input placeholder="Português, Inglês" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="instagram" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl><Input placeholder="@usuario" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tiktok" render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok</FormLabel>
                      <FormControl><Input placeholder="@usuario" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* SoundCloud é a plataforma canônica do roster (Spotify foi removido da UI; coluna legada
                      permanece no banco para histórico — `spotify` segue no schema mas não é mais exibido). */}
                  <FormField control={form.control} name="soundcloud" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SoundCloud</FormLabel>
                      <FormControl><Input placeholder="soundcloud.com/seu-artista" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="youtube" render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube</FormLabel>
                      <FormControl><Input placeholder="URL" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="press_kit_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Press Kit URL</FormLabel>
                      <FormControl><Input placeholder="URL" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="rider_tecnico_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rider Técnico URL</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rider_hospitalidade_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rider Hospitalidade URL</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="equipamentos_proprios" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipamentos Próprios</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="equipamentos_necessarios" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipamentos Necessários</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="restricoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restrições</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="preferencias_viagem" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferências de Viagem</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="valor_cache_padrao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cachê Padrão (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="valor_minimo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Mínimo (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="comissao_gestao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão Gestão (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="pix" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                <FormField control={form.control} name="observacoes_estrategicas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Estratégicas</FormLabel>
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Cadastrar DJ'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
