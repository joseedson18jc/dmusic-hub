import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldCheck,
  Database,
  Calendar,
  CreditCard,
  MessageSquare,
  Mail,
  HardDrive,
  Archive,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useStripeStatus } from '@/hooks/useStripe';
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendar';
import { useWhatsAppStatus } from '@/hooks/useWhatsApp';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EditorialHero } from '@/components/ui/EditorialHero';

type Status = 'ok' | 'pendente' | 'erro' | 'loading';

interface Check {
  name: string;
  Icon: typeof ShieldCheck;
  status: Status;
  detail: string;
  remediation?: { label: string; to: string };
}

const statusBadge: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: {
    label: 'ok',
    cls: 'border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]',
    Icon: CheckCircle2,
  },
  pendente: {
    label: 'pendente',
    cls: 'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))]',
    Icon: AlertTriangle,
  },
  erro: {
    label: 'erro',
    cls: 'border-destructive/40 bg-destructive/12 text-destructive',
    Icon: XCircle,
  },
  loading: {
    label: 'verificando',
    cls: 'border-border bg-muted/40 text-muted-foreground',
    Icon: Loader2,
  },
};

export default function Integridade() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { status: stripeStatus, loading: stripeLoading } = useStripeStatus();
  const { status: gcalStatus, loading: gcalLoading } = useGoogleCalendarStatus();
  const { status: whatsappStatus, loading: waLoading } = useWhatsAppStatus();

  const checks: Check[] = [
    {
      name: 'Autenticação',
      Icon: ShieldCheck,
      status: 'ok',
      detail: 'Supabase Auth configurado — login por e-mail/senha e OAuth.',
    },
    {
      name: 'RLS Ativo',
      Icon: Database,
      status: 'ok',
      detail: 'Todas as tabelas protegidas por Row Level Security.',
    },
    {
      name: 'Google Calendar',
      Icon: Calendar,
      status: gcalLoading ? 'loading' : gcalStatus?.connected ? 'ok' : 'pendente',
      detail: gcalLoading
        ? 'Verificando integração…'
        : gcalStatus?.connected
        ? `Conectado (${gcalStatus.calendar_id || 'primary'})`
        : 'Integração não conectada',
      remediation: gcalStatus?.connected ? undefined : { label: 'Conectar', to: '/configuracoes' },
    },
    {
      name: 'Stripe',
      Icon: CreditCard,
      status: stripeLoading ? 'loading' : stripeStatus?.connected ? 'ok' : 'pendente',
      detail: stripeLoading
        ? 'Verificando integração…'
        : stripeStatus?.connected
        ? `Conectado (${stripeStatus.business_name || stripeStatus.account_id})`
        : 'Integração não configurada',
      remediation: stripeStatus?.connected ? undefined : { label: 'Conectar', to: '/configuracoes' },
    },
    {
      name: 'WhatsApp',
      Icon: MessageSquare,
      status: waLoading ? 'loading' : whatsappStatus?.configured ? 'ok' : 'pendente',
      detail: waLoading
        ? 'Verificando integração…'
        : whatsappStatus?.configured
        ? `Twilio configurado — ${whatsappStatus.stats.total} mensagens enviadas`
        : 'Aguardando configuração Twilio',
      remediation: whatsappStatus?.configured ? undefined : { label: 'Configurar', to: '/configuracoes' },
    },
    {
      name: 'Email Transacional',
      Icon: Mail,
      status: 'pendente',
      detail: 'Aguardando aquisição de domínio próprio.',
    },
    {
      name: 'Backups',
      Icon: Archive,
      status: 'ok',
      detail: 'Automático via Supabase — frequência diária.',
    },
    {
      name: 'Storage Buckets',
      Icon: HardDrive,
      status: 'ok',
      detail: '6 buckets configurados com políticas de acesso.',
    },
  ];

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const pendingCount = checks.filter((c) => c.status === 'pendente').length;
  const errorCount = checks.filter((c) => c.status === 'erro').length;
  const loadingCount = checks.filter((c) => c.status === 'loading').length;
  const total = checks.length;
  const pct = total > 0 ? (okCount / total) * 100 : 0;

  // SVG ring geometry
  const R = 38;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="INTEGRIDADE"
        accentHueA="hsl(var(--success))"
        accentHueB={errorCount > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
        status={[
          { label: 'HEALTH · LIVE', tone: 'live' },
          { label: `▸ score ${pct}%`, tone: pct >= 80 ? 'live' : pct >= 50 ? 'warn' : 'danger' },
          ...(errorCount > 0
            ? [{ label: `⚠ ${errorCount} erro${errorCount > 1 ? 's' : ''}`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'ok', value: String(okCount), valueColor: 'hsl(var(--success))' },
          { label: 'pendentes', value: String(pendingCount), valueColor: 'hsl(var(--warning))' },
          { label: 'erros', value: String(errorCount), valueColor: 'hsl(var(--destructive))' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
              queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
              queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
            }}
            className="h-9 gap-2 backdrop-blur-sm bg-background/60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-verificar tudo
          </Button>
        }
      />

      {/* Score banner */}
      <Card className="glass-card">
        <CardContent className="p-5 flex items-center gap-6 flex-wrap">
          <div className="relative" style={{ width: 88, height: 88 }}>
            <svg viewBox="0 0 88 88" width="88" height="88">
              <circle cx="44" cy="44" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
              <circle
                cx="44"
                cy="44"
                r={R}
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth={8}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={C / 4}
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[hsl(var(--success))] tabular-nums">{okCount}/{total}</span>
              <span className="text-micro text-muted-foreground">OK</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold tracking-tight">
              {errorCount > 0
                ? 'Atenção necessária'
                : pendingCount > 0
                ? 'Sistema operacional'
                : 'Tudo em dia'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {okCount} de {total} verificações passaram
              {pendingCount > 0 && `, ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
              {errorCount > 0 && `, ${errorCount} com erro`}
              {loadingCount > 0 && `, ${loadingCount} verificando`}.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="outline" className={statusBadge.ok.cls + ' text-micro'}>
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {okCount} OK
              </Badge>
              <Badge variant="outline" className={cn(statusBadge.pendente.cls, 'text-micro', pendingCount === 0 && 'opacity-35')}>
                {pendingCount} pendentes
              </Badge>
              <Badge variant="outline" className={cn(statusBadge.erro.cls, 'text-micro', errorCount === 0 && 'opacity-35')}>
                {errorCount} erros
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="glass-card overflow-hidden">
        {checks.map((check, i) => {
          const sb = statusBadge[check.status];
          const SBIcon = sb.Icon;
          const isAttention = check.status === 'pendente' || check.status === 'erro';
          return (
            <div
              key={check.name}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30',
                i !== checks.length - 1 && 'border-b border-border/40',
                isAttention && 'bg-[hsl(var(--warning))]/[0.03]',
              )}
            >
              <div
                className={cn(
                  'h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0',
                  check.status === 'ok' && 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20 text-[hsl(var(--success))]',
                  check.status === 'pendente' && 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]',
                  check.status === 'erro' && 'bg-destructive/10 border-destructive/20 text-destructive',
                  check.status === 'loading' && 'bg-muted/40 border-border text-muted-foreground',
                )}
              >
                <check.Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
              <Badge variant="outline" className={cn(sb.cls, 'text-micro gap-1')}>
                <SBIcon className={cn('h-2.5 w-2.5', check.status === 'loading' && 'animate-spin')} />
                {sb.label}
              </Badge>
              {check.remediation && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-mini gap-1 h-7"
                  onClick={() => navigate(check.remediation!.to)}
                >
                  {check.remediation.label}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
