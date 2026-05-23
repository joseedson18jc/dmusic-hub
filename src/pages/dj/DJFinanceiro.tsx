import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;
const fmt = (v: number | null) => v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function DJFinanceiro() {
  const { user } = useAuth();

  const { data: dj } = useQuery({
    queryKey: ['dj-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.from('djs').select('id').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['dj-financial', dj?.id],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from('financial_records')
        .select('*, bookings:booking_id(titulo, venue, cidade, data_evento, producers:producer_id(nome))')
        .eq('dj_id', dj.id)
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendentes = records.filter((r: any) => r.status === 'pendente');
  const pagos = records.filter((r: any) => r.status === 'pago');
  const totalPendente = pendentes.reduce((s: number, r: any) => s + (r.valor_bruto || 0), 0);
  const totalPago = pagos.reduce((s: number, r: any) => s + (r.valor_bruto || 0), 0);

  if (!user) return <p className="text-muted-foreground p-8">Faça login para ver seu financeiro.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Meu Financeiro</h1>
        <p className="section-subtitle">Repasses e pagamentos vinculados a você</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Recebido</p>
            <p className="text-2xl font-bold text-[hsl(var(--success))]">{fmt(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-2xl font-bold text-[hsl(var(--warning))]">{fmt(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total de Registros</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        {isLoading ? (
          <CardContent className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>
        ) : records.length === 0 ? (
          <CardContent className="flex flex-col items-center py-12">
            <DollarSign className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum registro financeiro.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.descricao || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.bookings?.titulo ? (
                      <div>
                        <p className="font-medium text-foreground">{r.bookings.titulo}</p>
                        {r.bookings.venue && <p>{r.bookings.venue}</p>}
                        {r.bookings.producers?.nome && <p>👤 {r.bookings.producers.nome}</p>}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.tipo?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{fmt(r.valor_bruto)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.data_vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${r.status === 'pago' ? 'border-[hsl(var(--success))]/30 text-[hsl(var(--success))]' : r.status === 'pendente' ? 'border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))]' : ''}`}>
                      {r.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
