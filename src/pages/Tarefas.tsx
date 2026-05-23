import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  CheckSquare,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  AlertTriangle,
  ListChecks,
  LayoutGrid,
  Activity,
  Clock,
  Flame,
} from 'lucide-react';
import {
  useTasks,
  useUpdateTaskStatus,
  useDeleteTask,
  TASK_STATUSES,
  TASK_PRIORITIES,
  KANBAN_TASK_COLUMNS,
} from '@/hooks/useTasks';
import { TaskForm } from '@/components/tasks/TaskForm';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/StatusPill';
import { KpiStat } from '@/components/KpiCard';
import { EditorialHero } from '@/components/ui/EditorialHero';

/**
 * Mapeia status interno de tarefas → variant + label do StatusPill.
 * Tasks têm um set diferente de status (a_fazer, em_andamento, etc).
 */
function taskStatusToPill(status: string): { variant: 'lead' | 'negociacao' | 'realizacao' | 'pos_evento' | 'perdido' | 'neutral'; label: string; emoji?: string } {
  const s = TASK_STATUSES.find((x) => x.value === status);
  const emoji = s?.emoji;
  const label = s?.label ?? status;
  switch (status) {
    case 'a_fazer':             return { variant: 'lead',       label, emoji };
    case 'em_andamento':        return { variant: 'realizacao', label, emoji };
    case 'aguardando_terceiro': return { variant: 'negociacao', label, emoji };
    case 'concluida':           return { variant: 'pos_evento', label, emoji };
    case 'atrasada':            return { variant: 'perdido',    label, emoji };
    case 'cancelada':           return { variant: 'neutral',    label, emoji };
    default:                    return { variant: 'neutral',    label, emoji };
  }
}

/* ──────────────────────────────────────────────────────────────
   Column theming (HSL tokens — no hardcoded hex)
   ────────────────────────────────────────────────────────────── */
const COLUMN_THEME: Record<string, { dot: string; ring: string; tint: string }> = {
  a_fazer:       { dot: 'bg-info',        ring: 'border-info/30',        tint: 'bg-info/[0.04]' },
  em_andamento:  { dot: 'bg-primary',     ring: 'border-primary/30',     tint: 'bg-primary/[0.05]' },
  aguardando:    { dot: 'bg-[hsl(var(--warning))]', ring: 'border-[hsl(var(--warning))]/30', tint: 'bg-[hsl(var(--warning))]/[0.04]' },
  concluida:     { dot: 'bg-[hsl(var(--success))]', ring: 'border-[hsl(var(--success))]/30', tint: 'bg-[hsl(var(--success))]/[0.04]' },
};

function PriorityChip({ prioridade }: { prioridade: string }) {
  const p = TASK_PRIORITIES.find((x) => x.value === prioridade);
  if (!p) return null;
  const tone =
    p.value === 'alta'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : p.value === 'media'
      ? 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30'
      : 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium border',
        tone,
      )}
    >
      {p.emoji} {p.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const pill = taskStatusToPill(status);
  return (
    <StatusPill variant={pill.variant} size="sm">
      {pill.emoji} {pill.label}
    </StatusPill>
  );
}

function TaskCard({
  task,
  onEdit,
  onDragStart,
}: {
  task: any;
  onEdit: (t: any) => void;
  onDragStart: (id: string) => void;
}) {
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const isOverdue =
    task.prazo &&
    new Date(task.prazo) < new Date() &&
    task.status !== 'concluida' &&
    task.status !== 'cancelada';
  const isDone = task.status === 'concluida';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart(task.id);
      }}
      className={cn(
        'group rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all',
        'hover:border-primary/40 hover:shadow-sm',
        isOverdue && 'border-l-2 border-l-destructive',
        isDone && 'opacity-60',
        !isOverdue && !isDone && 'border-border/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <PriorityChip prioridade={task.prioridade} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="h-3 w-3 mr-2" />Editar
            </DropdownMenuItem>
            {TASK_STATUSES.filter((s) => s.value !== task.status && s.value !== 'cancelada').map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => updateStatus.mutate({ id: task.id, status: s.value })}
              >
                {s.emoji} Mover → {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate(task.id)}>
              <Trash2 className="h-3 w-3 mr-2" />Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className={cn('text-sm font-medium leading-snug', isDone && 'line-through')}>{task.titulo}</p>

      {task.descricao && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{task.descricao}</p>
      )}

      <div className="flex flex-wrap gap-1.5 items-center pt-1">
        {task.prazo && (
          <span
            className={cn(
              'text-micro flex items-center gap-1 tabular-nums',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
            {format(new Date(task.prazo), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        )}
        {task.djs && (
          <Badge variant="outline" className="text-micro py-0 px-1.5 border-border/50">
            🎧 {task.djs.nome_artistico}
          </Badge>
        )}
        {task.producers && (
          <Badge variant="outline" className="text-micro py-0 px-1.5 border-border/50">
            👤 {task.producers.nome}
          </Badge>
        )}
        {task.bookings && (
          <Badge variant="outline" className="text-micro py-0 px-1.5 border-border/50">
            📋 {task.bookings.titulo}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function Tarefas() {
  const [search, setSearch] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useTasks({ search, prioridade: filterPrioridade });
  const updateStatus = useUpdateTaskStatus();

  const openEdit = (task: any) => { setEditTask(task); setFormOpen(true); };
  const openNew = () => { setEditTask(null); setFormOpen(true); };

  /* ── KPI calculations ── */
  const stats = useMemo(() => {
    const all = tasks as any[];
    const now = new Date();
    const active = all.filter((t) => !['concluida', 'cancelada'].includes(t.status));
    const overdue = active.filter((t) => t.prazo && new Date(t.prazo) < now);
    const inProgress = all.filter((t) => t.status === 'em_andamento');
    const doneToday = all.filter(
      (t) => t.status === 'concluida' && t.updated_at && isToday(new Date(t.updated_at)),
    );
    return {
      active: active.length,
      overdue: overdue.length,
      inProgress: inProgress.length,
      doneToday: doneToday.length,
    };
  }, [tasks]);

  /* ── DnD ── */
  const handleDrop = (targetKey: string) => {
    setDragOverCol(null);
    if (!draggingId) return;
    const col = KANBAN_TASK_COLUMNS.find((c) => c.key === targetKey);
    const targetStatus = col?.statuses[0];
    if (!targetStatus) return;
    const task = (tasks as any[]).find((t) => t.id === draggingId);
    if (task && !(col!.statuses as readonly string[]).includes(task.status)) {
      updateStatus.mutate({ id: draggingId, status: targetStatus });
    }
    setDraggingId(null);
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="TAREFAS"
        accentHueA="hsl(var(--warning))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'OPS · LIVE', tone: 'live' },
          { label: `▸ ${stats.active} ativas`, tone: 'muted' },
          ...(stats.overdue > 0
            ? [{ label: `⚠ ${stats.overdue} atrasada${stats.overdue !== 1 ? 's' : ''}`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'em andamento', value: String(stats.inProgress), valueColor: 'hsl(var(--primary))' },
          { label: 'concluídas hoje', value: String(stats.doneToday), valueColor: 'hsl(var(--success))' },
        ]}
        actions={
          <Button onClick={openNew} className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Plus className="h-4 w-4" /> Nova Tarefa
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={ListChecks} label="Ativas" value={stats.active} tone="info" />
        <KpiStat icon={Flame} label="Atrasadas" value={stats.overdue} tone="destructive" emphasizeValue={stats.overdue > 0} />
        <KpiStat icon={Activity} label="Em andamento" value={stats.inProgress} tone="primary" />
        <KpiStat icon={Clock} label="Concluídas hoje" value={stats.doneToday} tone="success" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as prioridades</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.emoji} {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View segment control */}
        <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'kanban'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView('lista')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'lista'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* View */}
      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {KANBAN_TASK_COLUMNS.map((col) => {
            const colTasks = (tasks as any[]).filter((t: any) =>
              (col.statuses as readonly string[]).includes(t.status),
            );
            const theme = COLUMN_THEME[col.key] ?? COLUMN_THEME.a_fazer;
            const isDragOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverCol !== col.key) setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                onDrop={() => handleDrop(col.key)}
                className={cn(
                  'rounded-xl border transition-all',
                  theme.ring,
                  theme.tint,
                  isDragOver && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
                )}
              >
                {/* Column header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', theme.dot)} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/80 truncate">
                      {col.label}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-micro tabular-nums">
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Tasks */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {isLoading ? (
                    <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />
                  ) : colTasks.length === 0 ? (
                    <div className="text-mini text-muted-foreground/60 text-center py-6 border border-dashed border-border/40 rounded-lg">
                      Solte tarefas aqui
                    </div>
                  ) : (
                    colTasks.map((t: any) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onEdit={openEdit}
                        onDragStart={setDraggingId}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            {(tasks as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <CheckSquare className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm font-medium">Nenhuma tarefa encontrada</p>
                <p className="text-xs text-muted-foreground">
                  Crie uma nova tarefa ou ajuste os filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {(tasks as any[]).map((t: any) => {
                  const isOverdue =
                    t.prazo &&
                    new Date(t.prazo) < new Date() &&
                    !['concluida', 'cancelada'].includes(t.status);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors',
                        isOverdue && 'border-l-2 border-l-destructive bg-destructive/5',
                      )}
                    >
                      <PriorityChip prioridade={t.prioridade} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', t.status === 'concluida' && 'line-through opacity-60')}>
                          {t.titulo}
                        </p>
                        <div className="flex gap-2 mt-0.5 text-micro text-muted-foreground">
                          {t.djs && <span>🎧 {t.djs.nome_artistico}</span>}
                          {t.producers && <span>👤 {t.producers.nome}</span>}
                          {t.bookings && <span>📋 {t.bookings.titulo}</span>}
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                      {t.prazo && (
                        <span
                          className={cn(
                            'text-xs tabular-nums whitespace-nowrap',
                            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                          )}
                        >
                          {format(new Date(t.prazo), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editTask} />
    </div>
  );
}
