import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function DJNotificacoes() {
  const { user } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['dj-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  if (!user) return <p className="text-muted-foreground p-8">Faça login para ver suas notificações.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Notificações</h1>
        <p className="section-subtitle">Avisos e atualizações sobre seus eventos</p>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Recentes</CardTitle></CardHeader>
        {isLoading ? (
          <CardContent className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>
        ) : notifications.length === 0 ? (
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma notificação.</p>
          </CardContent>
        ) : (
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className={`p-3 rounded-lg border ${!n.lida ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                <p className="text-sm font-medium">{n.titulo}</p>
                {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>}
                <p className="text-micro text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
