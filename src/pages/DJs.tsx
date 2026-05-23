import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, MessageSquare, CalendarPlus, User, Loader2, Music2, Headphones, Pause, Plane, Pencil, Trash2 } from 'lucide-react';
import { KpiStat } from '@/components/KpiCard';
import { DJForm } from '@/components/djs/DJForm';
import { useDJs, useDeleteDJ } from '@/hooks/useDJs';
import { ListSkeleton, EmptyState, ErrorState } from '@/components/states';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: 'Disponível', className: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30' },
  pausa: { label: 'Em estúdio', className: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30' },
  indisponivel: { label: 'Em turnê', className: 'bg-info/15 text-info border-info/30' },
};

export default function DJs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDJ, setEditingDJ] = useState<Tables<'djs'> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: djs, isLoading, error, refetch } = useDJs({ search, status: statusFilter });
  const deleteMutation = useDeleteDJ();

  const handleNew = () => { setEditingDJ(null); setFormOpen(true); };
  const handleEdit = (dj: Tables<'djs'>) => { setEditingDJ(dj); setFormOpen(true); };

  // KPI counts (computed from full list, not the filtered one)
  const counts = {
    total: djs?.length ?? 0,
    ativo: djs?.filter((d: any) => d.status === 'ativo').length ?? 0,
    pausa: djs?.filter((d: any) => d.status === 'pausa').length ?? 0,
    indisponivel: djs?.filter((d: any) => d.status === 'indisponivel').length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="ROSTER"
        size="xl"
        accentHueA="hsl(var(--violet))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'ROSTER · LIVE', tone: 'live' },
          { label: `▸ ${counts.total} artistas`, tone: 'muted' },
          ...(counts.indisponivel > 0
            ? [{ label: `✈ ${counts.indisponivel} em turnê`, tone: 'info' as const }]
            : []),
        ]}
        ticker={[
          { label: 'disponíveis', value: String(counts.ativo), valueColor: 'hsl(var(--success))' },
          { label: 'estúdio', value: String(counts.pausa), valueColor: 'hsl(var(--warning))' },
          { label: 'turnê', value: String(counts.indisponivel), valueColor: 'hsl(var(--info))' },
        ]}
        actions={
          <Button onClick={handleNew} className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Plus className="h-4 w-4" /> Novo DJ
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={Music2} label="Total no roster" value={counts.total} tone="primary" />
        <KpiStat icon={Headphones} label="Disponíveis" value={counts.ativo} tone="success" />
        <KpiStat icon={Pause} label="Em estúdio" value={counts.pausa} tone="warning" />
        <KpiStat icon={Plane} label="Em turnê" value={counts.indisponivel} tone="info" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome artístico ou gênero…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Disponível</SelectItem>
            <SelectItem value="pausa">Em estúdio</SelectItem>
            <SelectItem value="indisponivel">Em turnê</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <ListSkeleton rows={6} cols={3} />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar os DJs"
          error={error}
          onRetry={() => refetch()}
        />
      ) : !djs?.length ? (
        <EmptyState
          icon={Music2}
          title="Nenhum DJ encontrado"
          description={search || statusFilter !== 'todos'
            ? 'Ajuste os filtros para ver mais resultados.'
            : 'Cadastre o primeiro artista para começar.'}
          action={{ label: 'Adicionar DJ', onClick: handleNew }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {djs.map((dj: Tables<'djs'>) => {
            const isHovered = hoveredId === dj.id;
            const sc = statusConfig[dj.status] || { label: dj.status, className: 'bg-muted text-muted-foreground' };
            const coverUrl = (dj as any).cover_url as string | null | undefined;
            return (
              <Card
                key={dj.id}
                className="glass-card-hover relative overflow-hidden cursor-pointer group p-0 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all"
                onMouseEnter={() => setHoveredId(dj.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => navigate(`/djs/${dj.id}`)}
              >
                {/* ════ Cover banner (or gradient fallback) ════ */}
                <div className="relative h-24 overflow-hidden">
                  {coverUrl ? (
                    <>
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/40 to-card" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-violet-500/15 to-info/20" />
                  )}

                  {/* Top-right Edit + Delete admin actions */}
                  <div
                    className={cn(
                      'absolute top-2 right-2 z-20 flex gap-1.5 transition-opacity',
                      isHovered ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm hover:bg-background border border-border/60"
                      title="Editar"
                      onClick={(e) => { e.stopPropagation(); handleEdit(dj); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 bg-destructive/15 backdrop-blur-sm hover:bg-destructive/30 border border-destructive/40 text-destructive"
                      title="Excluir"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(dj.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6 pt-0 -mt-10 flex flex-col items-center text-center relative">
                  {/* Hover Quick Actions (left side) */}
                  {isHovered && (
                    <div className="absolute top-12 left-3 z-10 flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs gap-1.5 bg-secondary/90 backdrop-blur-sm"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <MessageSquare className="h-3 w-3" /> Message
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs gap-1.5 bg-secondary/90 backdrop-blur-sm"
                        onClick={(e) => { e.stopPropagation(); navigate('/bookings'); }}
                      >
                        <CalendarPlus className="h-3 w-3" /> Book
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs gap-1.5 bg-secondary/90 backdrop-blur-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/djs/${dj.id}`); }}
                      >
                        <User className="h-3 w-3" /> Profile
                      </Button>
                    </div>
                  )}

                  {/* Avatar — sobreposto ao banner */}
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-card group-hover:ring-primary/50 transition-all shadow-xl">
                    <AvatarImage src={dj.foto_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/5 text-foreground text-xl font-bold">
                      {dj.nome_artistico.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <h3 className="text-lg font-bold tracking-tight">{dj.nome_artistico}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {dj.generos_musicais?.slice(0, 2).join(' / ') || 'Sem gênero'}
                  </p>

                  {/* Status */}
                  <div className="mt-3">
                    <p className="text-micro text-muted-foreground uppercase tracking-widest mb-1">Current Status</p>
                    <Badge variant="outline" className={`text-xs font-medium px-3 py-1 rounded-full ${sc.className}`}>
                      {sc.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DJForm open={formOpen} onOpenChange={setFormOpen} dj={editingDJ} onSuccess={refetch} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir DJ</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este DJ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) }); }} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
