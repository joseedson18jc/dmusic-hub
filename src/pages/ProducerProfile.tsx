import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Globe, Instagram, Building2, Calendar, DollarSign, FileText, Clock, Loader2 } from 'lucide-react';
import { useProducer, useProducerBookings, useProducerFinancial } from '@/hooks/useProducers';
import { ProducerForm } from '@/components/producers/ProducerForm';
import { ProducerContacts } from '@/components/producers/ProducerContacts';
import { ProducerStatusBadge, HealthScoreBadge, PapelBadge } from '@/components/producers/ProducerBadges';
import { ProducerWhatsAppHistory } from '@/components/producers/ProducerWhatsAppHistory';
import type { Tables } from '@/integrations/supabase/types';

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function ProducerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: producer, isLoading, refetch } = useProducer(id);
  const { data: bookings } = useProducerBookings(id);
  const { data: financial } = useProducerFinancial(id);
  const [formOpen, setFormOpen] = useState(false);

  const fmt = (v: number | null) =>
    v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!producer) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">Produtor não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/produtores')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const totalBookings = bookings?.length ?? 0;
  const totalReceita = financial?.filter((f: any) => ['receita', 'sinal', 'pagamento_final'].includes(f.tipo)).reduce((s: number, f: any) => s + Number(f.valor_bruto), 0) ?? 0;
  const pendingPayments = financial?.filter((f: any) => f.status === 'pendente').length ?? 0;
  const overduePayments = financial?.filter((f: any) => f.status === 'vencido').length ?? 0;

  // Health score breakdown
  const healthScore = producer.score_saude ?? 5;
  const healthColor = healthScore >= 7 ? 'text-[hsl(var(--success))]' : healthScore >= 4 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  const healthBg = healthScore >= 7 ? 'bg-[hsl(var(--success))]' : healthScore >= 4 ? 'bg-[hsl(var(--warning))]' : 'bg-destructive';

  // Profile completeness
  const fields = [producer.email, producer.telefone, producer.cidade, producer.empresa, producer.contato_principal, producer.whatsapp, (producer.papeis_comerciais as any)?.length > 0 ? 'yes' : null];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/produtores')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-lg">
              {producer.nome.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{producer.nome}</h1>
              <ProducerStatusBadge status={producer.status_relacionamento ?? 'ativo'} />
              <HealthScoreBadge score={producer.score_saude} />
            </div>
            {producer.empresa && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {producer.empresa}</p>}
            {producer.cidade && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {producer.cidade}, {producer.pais}</p>}
          </div>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
        </div>
      </div>

      {/* Papéis Comerciais */}
      {(producer.papeis_comerciais as string[] | null)?.length ? (
        <div className="flex flex-wrap gap-2">
          {(producer.papeis_comerciais as string[]).map((p: string) => (
            <PapelBadge key={p} papel={p} />
          ))}
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold">{fmt(totalReceita)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pagamentos Pendentes</p>
            <p className="text-2xl font-bold">{pendingPayments}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Score de Saúde</p>
            <div className="flex items-center gap-3 mt-1">
              <p className={`text-2xl font-bold ${healthColor}`}>{healthScore.toFixed(1)}</p>
              <Progress value={healthScore * 10} className={`flex-1 h-2 ${healthBg}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        {/* Dados */}
        <TabsContent value="dados" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Contato Principal" value={producer.contato_principal} icon={Phone} />
                <InfoRow label="Email" value={producer.email} icon={Mail} />
                <InfoRow label="Telefone" value={producer.telefone} icon={Phone} />
                <InfoRow label="WhatsApp" value={producer.whatsapp} icon={Phone} />
                <InfoRow label="Instagram" value={producer.instagram} icon={Instagram} />
                <InfoRow label="Site" value={producer.site} icon={Globe} />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Comercial</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Tipo de Produtor" value={producer.tipo_produtor} icon={Building2} />
                <InfoRow label="Origem do Relacionamento" value={producer.origem_relacionamento} />
                <InfoRow label="Forma de Pagamento" value={producer.forma_pagamento} icon={DollarSign} />
                <InfoRow label="Condições Comerciais" value={producer.condicoes_comerciais} />
                {producer.tags?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {producer.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {producer.idiomas?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1">Idiomas</p>
                    <div className="flex flex-wrap gap-1">
                      {producer.idiomas.map((i: string) => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Completude do Perfil</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={completeness} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{completeness}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completeness < 100 ? 'Complete os dados para melhorar o score de saúde.' : 'Perfil completo! ✓'}
                </p>
              </CardContent>
            </Card>

            {(producer.notas_internas || producer.proxima_acao) && (
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-base">Notas & Ações</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {producer.proxima_acao && (
                    <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary font-medium mb-1">⚡ Próxima Ação</p>
                      <p className="text-sm">{producer.proxima_acao}</p>
                    </div>
                  )}
                  {producer.notas_internas && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas Internas</p>
                      <p className="text-sm whitespace-pre-wrap">{producer.notas_internas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Contatos */}
        <TabsContent value="contatos" className="mt-4">
          <ProducerContacts producerId={producer.id} />
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="mt-4">
          <Card className="glass-card">
            {!bookings?.length ? (
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">Nenhum booking encontrado.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>DJ</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm">{b.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.djs?.nome_artistico ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.data_evento ?? '—'}</TableCell>
                      <TableCell className="text-sm">{fmt(b.fee_acordado)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{b.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro" className="mt-4">
          <Card className="glass-card">
            {!financial?.length ? (
              <CardContent className="flex flex-col items-center justify-center py-16">
                <DollarSign className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">Nenhum registro financeiro.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-sm">{f.descricao || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{f.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{fmt(f.valor_bruto)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.data_vencimento ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${f.status === 'pago' ? 'status-paid' : f.status === 'pendente' ? 'status-pending' : f.status === 'vencido' ? 'status-overdue' : ''}`}>
                          {f.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Timeline de Atividades</CardTitle></CardHeader>
            <CardContent>
              {/* Timeline based on bookings and financial records */}
              {(() => {
                const events: { date: string; type: string; description: string; icon: string }[] = [];
                bookings?.forEach((b: any) => {
                  events.push({
                    date: b.created_at,
                    type: 'booking',
                    description: `Booking "${b.titulo}" criado — Status: ${b.status.replace(/_/g, ' ')}`,
                    icon: '📋',
                  });
                });
                financial?.forEach((f: any) => {
                  events.push({
                    date: f.created_at,
                    type: 'financial',
                    description: `${f.tipo.replace(/_/g, ' ')} — ${fmt(f.valor_bruto)} — ${f.status.replace(/_/g, ' ')}`,
                    icon: '💰',
                  });
                });
                events.push({
                  date: producer.created_at,
                  type: 'system',
                  description: 'Produtor cadastrado no sistema',
                  icon: '🆕',
                });
                if (producer.ultimo_contato) {
                  events.push({
                    date: producer.ultimo_contato,
                    type: 'contact',
                    description: 'Último contato registrado',
                    icon: '📞',
                  });
                }
                events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (!events.length) {
                  return (
                    <div className="flex flex-col items-center py-8">
                      <Clock className="h-10 w-10 text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {events.slice(0, 20).map((e, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-lg mt-0.5">{e.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{e.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <ProducerWhatsAppHistory producerId={producer.id} />
        </TabsContent>
      </Tabs>

      <ProducerForm open={formOpen} onOpenChange={setFormOpen} producer={producer} onSuccess={refetch} />
    </div>
  );
}
