import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, MessageCircle, Mail, Settings, CheckCircle2, Clock,
  Sparkles, Zap, Shield, TrendingUp, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStripeStatus } from '@/hooks/useStripe';
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendar';
import { useWhatsAppStatus } from '@/hooks/useWhatsApp';
import StripeTab from '@/components/integrations/StripeTab';
import GoogleCalendarTab from '@/components/integrations/GoogleCalendarTab';
import WhatsAppTab from '@/components/integrations/WhatsAppTab';
import {
  PixIcon, BoletoIcon, CartaoIcon, StripeIcon, TransferenciaIcon, DinheiroIcon, Iso20022Icon,
} from '@/components/brand-icons';
import { BankLogo, BANK_CONFIGS, type BankKey } from '@/components/brand-icons';
import { cn } from '@/lib/utils';
import { EditorialHero } from '@/components/ui/EditorialHero';

const integrations = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sincronização bidirecional de agenda com detecção de conflitos',
    icon: Calendar,
    accent: 'from-sky-500/30 via-sky-400/15 to-transparent',
    iconBg: 'bg-sky-500/15 text-sky-400',
    features: ['OAuth2 por usuário', 'Agenda master + individual', 'Criação automática de evento', 'Detecção de conflitos'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Pagamentos, checkout sessions, links de pagamento e reconciliação',
    icon: null,
    brandIcon: 'stripe' as const,
    accent: 'from-violet-500/30 via-purple-500/15 to-transparent',
    iconBg: 'bg-violet-500/15 text-violet-400',
    features: ['Geração de links de pagamento', 'Checkout sessions', 'Webhooks para confirmação', 'Reconciliação financeira'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notificações automáticas para DJs, produtores e equipe',
    icon: MessageCircle,
    accent: 'from-green-500/30 via-emerald-500/15 to-transparent',
    iconBg: 'bg-green-500/15 text-green-400',
    features: ['Templates de mensagem', 'Variáveis dinâmicas', 'Regras de disparo automático', 'Histórico de mensagens'],
  },
  {
    id: 'email',
    name: 'Email Transacional',
    description: 'Emails automáticos para contratos, notificações e cobranças',
    icon: Mail,
    accent: 'from-amber-500/30 via-orange-500/15 to-transparent',
    iconBg: 'bg-amber-500/15 text-amber-400',
    features: ['Templates customizáveis', 'Envio automático por trigger', 'Tracking de abertura', 'Variáveis dinâmicas'],
  },
];

const PAYMENT_METHODS_DISPLAY = [
  { key: 'pix',           Icon: PixIcon,           label: 'PIX',           sub: 'Instantâneo · BACEN',         status: 'ativo' as const },
  { key: 'cartao',        Icon: CartaoIcon,        label: 'Cartão',        sub: 'Visa · Master · Elo',         status: 'ativo' as const },
  { key: 'boleto',        Icon: BoletoIcon,        label: 'Boleto',        sub: 'D+1 · D+2 compensação',       status: 'ativo' as const },
  { key: 'stripe',        Icon: StripeIcon,        label: 'Stripe',        sub: 'Internacional · USD/EUR/BRL', status: 'ativo' as const },
  { key: 'transferencia', Icon: TransferenciaIcon, label: 'TED · DOC',     sub: 'Transferência bancária',      status: 'ativo' as const },
  { key: 'dinheiro',      Icon: DinheiroIcon,      label: 'Dinheiro',      sub: 'Caixa local · recibo',        status: 'ativo' as const },
  { key: 'iso20022',      Icon: Iso20022Icon,      label: 'ISO 20022',     sub: 'Padrão global de pagamentos', status: 'roadmap' as const },
];

const SUPPORTED_BANKS: BankKey[] = ['azteca', 'nubank', 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'inter', 'c6', 'btg', 'sicredi', 'safra'];

export default function Integracoes() {
  const { status: stripeStatus } = useStripeStatus();
  const { status: gcalStatus } = useGoogleCalendarStatus();
  const { status: whatsappStatus } = useWhatsAppStatus();

  const getStatus = (id: string) => {
    if (id === 'stripe') return stripeStatus?.connected ? 'ativo' : 'pendente';
    if (id === 'google-calendar') return gcalStatus?.connected ? 'ativo' : 'pendente';
    if (id === 'whatsapp') return whatsappStatus?.configured ? 'ativo' : 'pendente';
    return 'pendente';
  };

  /* KPIs no topo */
  const activeCount = useMemo(
    () => integrations.filter((i) => getStatus(i.id) === 'ativo').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stripeStatus, gcalStatus, whatsappStatus],
  );

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="INTEGRAÇÕES"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'INTEGRATIONS · LIVE', tone: 'live' },
          { label: `▸ ${activeCount}/${integrations.length} ativas`, tone: activeCount > 0 ? 'info' as const : 'warn' as const },
        ]}
        ticker={[
          { label: 'métodos', value: String(PAYMENT_METHODS_DISPLAY.filter(p => p.status === 'ativo').length), valueColor: 'hsl(var(--info))' },
          { label: 'bancos', value: String(SUPPORTED_BANKS.length), valueColor: 'hsl(var(--primary))' },
          { label: 'pix · stripe', value: 'on', valueColor: 'hsl(var(--success))' },
        ]}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="payments">Métodos de pagamento</TabsTrigger>
          <TabsTrigger value="banks">Bancos suportados</TabsTrigger>
          <TabsTrigger value="google-calendar">Google Calendar</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        {/* ════════ Overview ════════ */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integ) => {
              const status = getStatus(integ.id);
              return (
                <Card
                  key={integ.id}
                  className="relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none opacity-60', integ.accent)} />
                  <CardContent className="relative p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {integ.brandIcon === 'stripe' ? (
                        <StripeIcon size={44} />
                      ) : integ.icon ? (
                        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-border/40', integ.iconBg)}>
                          <integ.icon className="h-5 w-5" />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">{integ.name}</h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-micro shrink-0 font-mono',
                              status === 'ativo'
                                ? 'border-success/40 bg-success/15 text-success'
                                : 'border-border bg-muted/30 text-muted-foreground',
                            )}
                          >
                            {status === 'ativo' ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{integ.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {integ.features.map((f) => (
                        <p key={f} className="text-mini text-muted-foreground/80 flex items-center gap-1.5 truncate">
                          <Sparkles className="h-2.5 w-2.5 text-primary/60 flex-shrink-0" /> {f}
                        </p>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 group-hover:border-primary/40"
                      onClick={() => toast.info(`Configure ${integ.name} na aba dedicada`)}
                    >
                      <Settings className="h-3 w-3 mr-1" /> Configurar
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick glance dos métodos de pagamento */}
          <Card className="border-border/60 bg-card/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Métodos de pagamento aceitos</h3>
                </div>
                <span className="text-mini text-muted-foreground">7 métodos · 12 bancos</span>
              </div>
              <PaymentMethodGrid />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════ Métodos de pagamento (detalhado) ════════ */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/40">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Catálogo de métodos
                  </h2>
                  <p className="text-mini text-muted-foreground mt-1">
                    Cada booking pode usar qualquer combinação. PIX e cartão são mais comuns; boleto cobre prazos longos; Stripe cobre internacionais.
                  </p>
                </div>
              </div>
              <PaymentMethodGrid variant="large" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════ Bancos suportados (com Banco Azteca!) ════════ */}
        <TabsContent value="banks" className="mt-4 space-y-4">
          <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/40">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Bancos suportados
                </h2>
                <p className="text-mini text-muted-foreground mt-1">
                  Conta bancária de qualquer dessas instituições pra repasses de cachê. Banco Azteca cobre DJs de turnês na América Latina (MX/Centroamérica).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {SUPPORTED_BANKS.map((b) => {
                  const cfg = BANK_CONFIGS[b];
                  return (
                    <div
                      key={b}
                      className={cn(
                        'group relative flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 hover:shadow-lg transition-all',
                        b === 'azteca' && 'ring-2 ring-primary/30 shadow-lg shadow-primary/10',
                      )}
                    >
                      <BankLogo bank={b} size={56} showRegion className="transition-transform group-hover:scale-110 group-hover:-rotate-2" />
                      <div className="text-center">
                        <p className="text-mini font-semibold leading-tight">{cfg.name}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">{cfg.region}</p>
                      </div>
                      {b === 'azteca' && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded-full ring-1 ring-primary/30">
                          Novo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-border/40 text-mini text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" /> Suportado para repasse
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-info" /> Conta corrente / poupança
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Chave PIX vinculada
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google-calendar" className="mt-4 space-y-4">
          <GoogleCalendarTab />
        </TabsContent>

        <TabsContent value="stripe" className="mt-4 space-y-4">
          <StripeTab />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <WhatsAppTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-componente: badge KPI no header
   ═══════════════════════════════════════════════════════════════════ */
function KpiBadge({ label, value, tone }: { label: string; value: string; tone: 'success' | 'info' | 'primary' }) {
  const toneClass =
    tone === 'success' ? 'border-success/40 bg-success/10 text-success'
    : tone === 'info'   ? 'border-info/40 bg-info/10 text-info'
    :                     'border-primary/40 bg-primary/10 text-primary';
  return (
    <div className={cn('rounded-xl border px-3 py-2 backdrop-blur-sm flex items-baseline gap-2', toneClass)}>
      <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="text-mini opacity-80">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-componente: grid de métodos de pagamento (2 variantes)
   ═══════════════════════════════════════════════════════════════════ */
function PaymentMethodGrid({ variant = 'compact' }: { variant?: 'compact' | 'large' }) {
  const size = variant === 'large' ? 56 : 40;
  return (
    <div className={cn(
      'grid gap-3',
      variant === 'large' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-7',
    )}>
      {PAYMENT_METHODS_DISPLAY.map(({ key, Icon, label, sub, status }) => (
        <div
          key={key}
          className={cn(
            'group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 hover:border-primary/40 hover:shadow-md transition-all',
            status === 'roadmap' && 'opacity-60',
          )}
        >
          <div className="relative">
            <Icon size={size} className="transition-transform group-hover:scale-110" />
            {status === 'roadmap' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/15 px-1 py-px rounded-full ring-1 ring-amber-400/30">
                soon
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="text-mini font-semibold leading-tight">{label}</p>
            {variant === 'large' && (
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
