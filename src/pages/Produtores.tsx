import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Loader2, UserCheck, UserPlus, Activity } from 'lucide-react';
import { KpiStat } from '@/components/KpiCard';
import { ProducerForm } from '@/components/producers/ProducerForm';
import { ProducerStatusBadge, HealthScoreBadge, PapelBadge } from '@/components/producers/ProducerBadges';
import { useProducers, useDeleteProducer, PAPEIS_COMERCIAIS } from '@/hooks/useProducers';
import { ListSkeleton, EmptyState, ErrorState } from '@/components/states';
import { EditorialHero } from '@/components/ui/EditorialHero';
import type { Tables } from '@/integrations/supabase/types';

export default function Produtores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [papelFilter, setPapelFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProducer, setEditingProducer] = useState<Tables<'producers'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: producers, isLoading, error, refetch } = useProducers({ search, status: statusFilter, papel: papelFilter });
  const deleteMutation = useDeleteProducer();

  const handleEdit = (p: Tables<'producers'>) => { setEditingProducer(p); setFormOpen(true); };
  const handleNew = () => { setEditingProducer(null); setFormOpen(true); };

  const counts = {
    total: producers?.length ?? 0,
    ativo: producers?.filter((p: any) => p.status_relacionamento === 'ativo').length ?? 0,
    prospeccao: producers?.filter((p: any) => p.status_relacionamento === 'prospeccao').length ?? 0,
    avgScore: producers?.length
      ? Math.round(
          producers.reduce((s: number, p: any) => s + (p.score_saude ?? 0), 0) / producers.length,
        )
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="PRODUTORES"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--magenta, 320 70% 65%))"
        status={[
          { label: 'NETWORK · LIVE', tone: 'live' },
          { label: `▸ ${counts.total} contatos`, tone: 'muted' },
          ...(counts.avgScore < 5 && counts.total > 0
            ? [{ label: `⚠ health ${counts.avgScore}/10`, tone: 'warn' as const }]
            : []),
        ]}
        ticker={[
          { label: 'ativos', value: String(counts.ativo), valueColor: 'hsl(var(--success))' },
          { label: 'prospecção', value: String(counts.prospeccao), valueColor: 'hsl(var(--info))' },
          { label: 'health médio', value: `${counts.avgScore}/10`, valueColor: 'hsl(var(--warning))' },
        ]}
        actions={
          <Button onClick={handleNew} className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Plus className="h-4 w-4" /> Novo Produtor
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={Users} label="Total" value={counts.total} tone="primary" />
        <KpiStat icon={UserCheck} label="Ativos" value={counts.ativo} tone="success" />
        <KpiStat icon={UserPlus} label="Em prospecção" value={counts.prospeccao} tone="info" />
        <KpiStat icon={Activity} label="Health médio" value={counts.avgScore} tone="warning" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, empresa, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="prospeccao">Prospecção</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={papelFilter} onValueChange={setPapelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Papel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Papéis</SelectItem>
            {PAPEIS_COMERCIAIS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} cols={4} />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar os produtores"
          error={error}
          onRetry={() => refetch()}
        />
      ) : !producers?.length ? (
        <EmptyState
          icon={Users}
          title="Nenhum produtor encontrado"
          description="Produtores são a entidade comercial central do sistema."
          action={{ label: 'Novo produtor', onClick: () => { setEditingProducer(null); setFormOpen(true); } }}
        />
      ) : (
      <Card className="glass-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produtor</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {producers.map((p: Tables<'producers'>) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/produtores/${p.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {p.nome.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{p.nome}</p>
                        {p.empresa && <p className="text-xs text-muted-foreground">{p.empresa}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.papeis_comerciais as string[] | null)?.slice(0, 2).map((r: string) => (
                        <PapelBadge key={r} papel={r} />
                      ))}
                      {((p.papeis_comerciais as string[] | null)?.length ?? 0) > 2 && (
                        <span className="text-xs text-muted-foreground">+{(p.papeis_comerciais as string[]).length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.cidade ? `${p.cidade}, ${p.pais}` : '—'}
                  </TableCell>
                  <TableCell><HealthScoreBadge score={p.score_saude} /></TableCell>
                  <TableCell><ProducerStatusBadge status={p.status_relacionamento ?? 'ativo'} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/produtores/${p.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(p); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </Card>
      )}

      <ProducerForm open={formOpen} onOpenChange={setFormOpen} producer={editingProducer} onSuccess={refetch} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produtor</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) }); }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
