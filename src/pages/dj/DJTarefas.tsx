import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Calendar, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const sb = supabase as any;

function DJTaskForm({ open, onOpenChange, djId }: { open: boolean; onOpenChange: (o: boolean) => void; djId: string }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from('tasks').insert({
        titulo,
        descricao: descricao || null,
        prazo: prazo || null,
        dj_id: djId,
        prioridade: 'media',
        status: 'a_fazer',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-tasks'] });
      toast.success('Tarefa criada');
      setTitulo('');
      setDescricao('');
      setPrazo('');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { toast.error('Título obrigatório'); return; }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Detalhes opcionais..." />
          </div>
          <div className="space-y-2">
            <Label>Prazo</Label>
            <Input type="datetime-local" value={prazo} onChange={e => setPrazo(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DJTarefas() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);

  const { data: dj } = useQuery({
    queryKey: ['dj-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.from('djs').select('id').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['dj-tasks', dj?.id],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from('tasks')
        .select('*, bookings:booking_id(titulo)')
        .eq('dj_id', dj.id)
        .not('status', 'eq', 'cancelada')
        .order('prazo', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user) return <p className="text-muted-foreground p-8">Faça login para ver suas tarefas.</p>;

  const getStatusInfo = (status: string) => TASK_STATUSES.find(s => s.value === status);
  const getPriorityInfo = (p: string) => TASK_PRIORITIES.find(x => x.value === p);

  const activeTasks = (tasks as any[]).filter((t: any) => !['concluida', 'cancelada'].includes(t.status));
  const completedTasks = (tasks as any[]).filter((t: any) => t.status === 'concluida');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Minhas Tarefas</h1>
          <p className="section-subtitle">
            {activeTasks.length} ativa{activeTasks.length !== 1 ? 's' : ''}
            {completedTasks.length > 0 && <span className="text-muted-foreground"> · {completedTasks.length} concluída{completedTasks.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (tasks as any[]).length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center py-16">
            <CheckSquare className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa atribuída a você</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(tasks as any[]).map((t: any) => {
            const statusInfo = getStatusInfo(t.status);
            const priorityInfo = getPriorityInfo(t.prioridade);
            const isOverdue = t.prazo && new Date(t.prazo) < new Date() && !['concluida', 'cancelada'].includes(t.status);
            const variant = t.status === 'concluida' ? 'default' : t.status === 'atrasada' || isOverdue ? 'destructive' : 'secondary';

            return (
              <Card key={t.id} className={`glass-card ${isOverdue ? 'border-destructive/50' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">{priorityInfo?.emoji || '🟡'}</span>
                      <p className={`text-sm font-semibold truncate ${t.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                        {t.titulo}
                      </p>
                    </div>
                    <Badge variant={variant} className="text-micro shrink-0">
                      {statusInfo?.emoji} {statusInfo?.label || t.status}
                    </Badge>
                  </div>
                  {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {t.prazo && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(t.prazo), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {t.bookings?.titulo && (
                      <span>📋 {t.bookings.titulo}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dj?.id && <DJTaskForm open={formOpen} onOpenChange={setFormOpen} djId={dj.id} />}
    </div>
  );
}
