import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Timer,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  setHold,
  clearHold,
  describeHold,
  DEFAULT_HOLD_DAYS,
  MAX_HOLD_DAYS,
} from '@/lib/holdDates';
import {
  generateHospitalityChecklist,
  getHospitalityProgress,
  DEFAULT_HOSPITALITY_TEMPLATE,
} from '@/lib/hospitalityChecklist';
import {
  recordFeeChange,
  fetchFeeHistory,
  summarizeFeeHistory,
  type FeeChange,
} from '@/lib/feeNegotiation';

/**
 * DJMgmtPanel — agrupa as 4 features DJ-mgmt no BookingForm:
 *  1. Hold dates (timer + set/clear)
 *  2. Cachê negotiation timeline (history + new entry)
 *  3. Hospitality checklist (generate button + progress badge)
 *  4. (conflict detection roda no Bookings.tsx parent, não aqui)
 *
 * Self-contained: gerencia seu próprio state, faz fetches via hooks/libs.
 * Aparece como uma section dentro de uma aba "Operação" ou similar no Form.
 */

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export interface DJMgmtPanelProps {
  booking: {
    id: string;
    status: string;
    dj_id: string | null;
    producer_id: string | null;
    data_evento: string | null;
    hold_until?: string | null;
    fee_acordado?: number | null;
  };
  /** Chamado após qualquer mutação pra revalidar o booking parent. */
  onMutate?: () => void;
}

export function DJMgmtPanel({ booking, onMutate }: DJMgmtPanelProps) {
  const { user } = useAuth();
  const [holdDays, setHoldDays] = useState(DEFAULT_HOLD_DAYS);
  const [holdLoading, setHoldLoading] = useState(false);

  const [feeHistory, setFeeHistory] = useState<FeeChange[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [feeNote, setFeeNote] = useState('');
  const [proposedBy, setProposedBy] = useState<'agencia' | 'produtor'>('agencia');

  const [progress, setProgress] = useState<{ total: number; done: number; overdue: number } | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  /* ──────────── Load fee history + hospitality progress ──────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fh, hp] = await Promise.all([
          fetchFeeHistory(booking.id),
          getHospitalityProgress(booking.id),
        ]);
        if (!cancelled) {
          setFeeHistory(fh);
          setProgress(hp);
        }
      } catch (err) {
        console.error('DJMgmtPanel load error', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booking.id]);

  /* ──────────── Hold actions ──────────── */
  const onSetHold = async () => {
    setHoldLoading(true);
    try {
      const r = await setHold({ booking_id: booking.id, days: holdDays, user_id: user?.id });
      toast.success(`Hold definido até ${new Date(r.hold_until).toLocaleString('pt-BR')}`);
      onMutate?.();
    } catch (err: any) {
      toast.error(
        err.message?.includes('hold_until')
          ? 'Coluna hold_until não existe. Aplique a migration SQL primeiro.'
          : `Erro: ${err.message}`,
      );
    } finally {
      setHoldLoading(false);
    }
  };

  const onClearHold = async () => {
    setHoldLoading(true);
    try {
      await clearHold(booking.id, user?.id);
      toast.success('Hold liberado.');
      onMutate?.();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setHoldLoading(false);
    }
  };

  /* ──────────── Fee actions ──────────── */
  const onAddFeeChange = async () => {
    const to = Number(newFee);
    if (!to || to <= 0) {
      toast.error('Informe um valor de cachê maior que zero.');
      return;
    }
    setFeeLoading(true);
    try {
      await recordFeeChange({
        booking_id: booking.id,
        from_amount: booking.fee_acordado ?? null,
        to_amount: to,
        proposed_by: proposedBy,
        note: feeNote || undefined,
        user_id: user?.id,
      });
      toast.success('Mudança de cachê registrada.');
      setNewFee('');
      setFeeNote('');
      const fh = await fetchFeeHistory(booking.id);
      setFeeHistory(fh);
      onMutate?.();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setFeeLoading(false);
    }
  };

  /* ──────────── Hospitality actions ──────────── */
  const onGenerateChecklist = async () => {
    if (!booking.data_evento) {
      toast.error('Booking precisa de data_evento pra gerar o checklist.');
      return;
    }
    setChecklistLoading(true);
    try {
      const r = await generateHospitalityChecklist({
        booking_id: booking.id,
        dj_id: booking.dj_id,
        producer_id: booking.producer_id,
        data_evento: booking.data_evento,
        created_by: user?.id,
      });
      if (r.inserted > 0) {
        toast.success(`${r.inserted} tarefas criadas no checklist hospitality.`);
      } else {
        toast.info('Checklist já existe — nenhuma tarefa duplicada.');
      }
      const hp = await getHospitalityProgress(booking.id);
      setProgress(hp);
      onMutate?.();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setChecklistLoading(false);
    }
  };

  const holdStatus = describeHold(booking.hold_until);

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════
           HOLD DATES
           ════════════════════════════════════════════════════════════ */}
      <section className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-3">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Hold de data</h3>
          </div>
          {holdStatus.active && (
            <span
              className={cn(
                'text-mini px-2 py-0.5 rounded-full font-mono tabular-nums border',
                holdStatus.tone === 'warning'
                  ? 'border-warning/40 bg-warning/15 text-warning'
                  : 'border-success/40 bg-success/15 text-success',
              )}
            >
              {holdStatus.label}
            </span>
          )}
          {holdStatus.expired && (
            <span className="text-mini px-2 py-0.5 rounded-full font-mono border border-destructive/40 bg-destructive/15 text-destructive">
              {holdStatus.label}
            </span>
          )}
        </header>

        {!holdStatus.active && !holdStatus.expired ? (
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <Label htmlFor="hold-days" className="text-mini">Dias de hold</Label>
              <Input
                id="hold-days"
                type="number"
                min={1}
                max={MAX_HOLD_DAYS}
                value={holdDays}
                onChange={(e) => setHoldDays(Math.min(MAX_HOLD_DAYS, Math.max(1, Number(e.target.value))))}
                className="w-24 h-9 mt-1"
              />
            </div>
            <Button
              size="sm"
              onClick={onSetHold}
              disabled={holdLoading}
              className="gap-1.5"
            >
              {holdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Marcar hold
            </Button>
            <p className="text-mini text-muted-foreground ml-2 w-full">
              Limite máximo: {MAX_HOLD_DAYS} dias. Produtor decide ou data é liberada.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={onClearHold} disabled={holdLoading}>
              {holdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Liberar data
            </Button>
            <p className="text-mini text-muted-foreground">
              Hold ativo desde então — clique pra liberar antes de expirar.
            </p>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════
           CACHÊ NEGOTIATION TIMELINE
           ════════════════════════════════════════════════════════════ */}
      <section className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-3">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Cachê — histórico de negociação</h3>
          </div>
          <span className="text-mini text-muted-foreground">
            {summarizeFeeHistory(feeHistory)}
          </span>
        </header>

        {feeHistory.length > 0 && (
          <ol className="relative pl-4 space-y-2 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
            {feeHistory.map((h) => {
              const up = (h.from_amount ?? 0) < h.to_amount;
              const TrendIcon = up ? TrendingUp : TrendingDown;
              const trendColor = up ? 'text-success' : 'text-destructive';
              return (
                <li key={h.id} className="relative pl-3">
                  <span
                    className={cn(
                      'absolute left-[-5px] top-1.5 w-2 h-2 rounded-full',
                      h.proposed_by === 'agencia' ? 'bg-primary' : 'bg-info',
                    )}
                  />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-mini font-mono text-muted-foreground tabular-nums">
                      {new Date(h.at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-mini uppercase tracking-wider opacity-70">
                      {h.proposed_by === 'agencia' ? 'agência' : 'produtor'}
                    </span>
                    {h.from_amount !== null && (
                      <>
                        <span className="font-mono text-mini text-muted-foreground/70 line-through tabular-nums">
                          {fmtBRL(h.from_amount)}
                        </span>
                        <TrendIcon className={cn('h-3 w-3', trendColor)} />
                      </>
                    )}
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {fmtBRL(h.to_amount)}
                    </span>
                  </div>
                  {h.note && <p className="text-mini text-muted-foreground mt-0.5">{h.note}</p>}
                </li>
              );
            })}
          </ol>
        )}

        {/* Form pra adicionar nova entrada */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
          <div>
            <Label htmlFor="fee-amount" className="text-mini">Novo cachê (R$)</Label>
            <Input
              id="fee-amount"
              type="number"
              min={0}
              step={100}
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              placeholder="8000"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-mini">Proposto por</Label>
            <Select value={proposedBy} onValueChange={(v) => setProposedBy(v as 'agencia' | 'produtor')}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agencia">Agência</SelectItem>
                <SelectItem value="produtor">Produtor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={onAddFeeChange}
            disabled={feeLoading || !newFee}
            className="h-9"
          >
            {feeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Registrar
          </Button>
        </div>
        <Textarea
          value={feeNote}
          onChange={(e) => setFeeNote(e.target.value)}
          placeholder="Nota opcional — ex.: 'subiu 1k por travel SP-Rio'"
          rows={2}
          className="text-mini"
        />
      </section>

      {/* ════════════════════════════════════════════════════════════
           HOSPITALITY CHECKLIST
           ════════════════════════════════════════════════════════════ */}
      <section className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-3">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Hospitality checklist</h3>
          </div>
          {progress && progress.total > 0 && (
            <span
              className={cn(
                'text-mini px-2 py-0.5 rounded-full font-mono tabular-nums border',
                progress.overdue > 0
                  ? 'border-destructive/40 bg-destructive/15 text-destructive'
                  : progress.done === progress.total
                  ? 'border-success/40 bg-success/15 text-success'
                  : 'border-border bg-muted/30 text-muted-foreground',
              )}
            >
              {progress.done}/{progress.total} feitas
              {progress.overdue > 0 && ` · ${progress.overdue} atrasada${progress.overdue !== 1 ? 's' : ''}`}
            </span>
          )}
        </header>

        {!progress || progress.total === 0 ? (
          <div className="space-y-2">
            <p className="text-mini text-muted-foreground">
              Nenhuma tarefa de hospitality criada. Gera o checklist padrão ({DEFAULT_HOSPITALITY_TEMPLATE.length} itens) com prazos relativos a <strong>{booking.data_evento || 'data do evento'}</strong>.
            </p>
            <Button
              size="sm"
              onClick={onGenerateChecklist}
              disabled={checklistLoading || !booking.data_evento}
              className="gap-1.5"
            >
              {checklistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar checklist padrão
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-mini text-muted-foreground">
              Já tem checklist criado. Os items aparecem como <strong>tarefas</strong> com prazo, visíveis em /tarefas e no kanban filtrado por este booking.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateChecklist}
              disabled={checklistLoading || !booking.data_evento}
              className="gap-1.5"
            >
              {checklistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Re-gerar (pula duplicatas)
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
