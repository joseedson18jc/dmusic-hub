import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDJs } from '@/hooks/useDJs';
import { useProducers } from '@/hooks/useProducers';
import { useBookings } from '@/hooks/useBookings';
import { TASK_PRIORITIES } from '@/hooks/useTasks';

const sb = supabase as any;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
}

export function TaskForm({ open, onOpenChange, task }: TaskFormProps) {
  const queryClient = useQueryClient();
  const { data: djs } = useDJs();
  const { data: producers } = useProducers();
  const { data: bookings } = useBookings();

  const getDefaults = (t?: any) => ({
    titulo: t?.titulo || '',
    descricao: t?.descricao || '',
    prioridade: t?.prioridade || 'media',
    status: t?.status || 'a_fazer',
    prazo: t?.prazo ? new Date(t.prazo).toISOString().slice(0, 16) : '',
    dj_id: t?.dj_id || '',
    producer_id: t?.producer_id || '',
    booking_id: t?.booking_id || '',
  });

  const [form, setForm] = useState(getDefaults(task));

  useEffect(() => {
    setForm(getDefaults(task));
  }, [task, open]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        prazo: data.prazo || null,
        dj_id: data.dj_id || null,
        producer_id: data.producer_id || null,
        booking_id: data.booking_id || null,
      };
      if (task?.id) {
        const { error } = await sb.from('tasks').update(payload).eq('id', task.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('tasks').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(task ? 'Tarefa atualizada' : 'Tarefa criada');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) { toast.error('Título obrigatório'); return; }
    mutation.mutate(form);
  };

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => update('titulo', e.target.value)} placeholder="Título da tarefa" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => update('descricao', e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => update('prioridade', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.emoji} {p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="datetime-local" value={form.prazo} onChange={e => update('prazo', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>DJ</Label>
              <Select value={form.dj_id || "none"} onValueChange={v => update('dj_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(djs || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome_artistico}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produtor</Label>
              <Select value={form.producer_id || "none"} onValueChange={v => update('producer_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(producers || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Booking</Label>
              <Select value={form.booking_id || "none"} onValueChange={v => update('booking_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(bookings || []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : task ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
