import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, DollarSign, Users, Plus, X, Save, Loader2, FileText, Zap, Eye, MessageCircle, Mail, Calendar, CreditCard, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EditorialHero } from '@/components/ui/EditorialHero';
import {
  useSystemSetting,
  useUpdateSystemSetting,
  type EventTypes,
  type FinancialCategories,
  type CommissionRules,
  type ContractTemplates,
  type ContractTemplate,
  type AutomationRules,
} from '@/hooks/useSystemSettings';

function EventTypesEditor() {
  const { data, isLoading } = useSystemSetting<EventTypes>('event_types');
  const update = useUpdateSystemSetting();
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => { if (data) setItems(data); }, [data]);

  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    setItems([...items, v]);
    setDraft('');
  };
  const remove = (v: string) => setItems(items.filter((i) => i !== v));

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="gap-1.5 pr-1 text-xs">
            {i}
            <button onClick={() => remove(i)} aria-label={`Remover ${i}`} className="hover:text-destructive p-0.5 rounded">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum tipo cadastrado.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ex.: Open Air"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button variant="outline" onClick={add} className="gap-1"><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => update.mutate({ key: 'event_types', value: items })} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function FinancialCategoriesEditor() {
  const { data, isLoading } = useSystemSetting<FinancialCategories>('financial_categories');
  const update = useUpdateSystemSetting();
  const [receita, setReceita] = useState<string[]>([]);
  const [despesa, setDespesa] = useState<string[]>([]);
  const [draftR, setDraftR] = useState('');
  const [draftD, setDraftD] = useState('');

  useEffect(() => {
    if (data) {
      setReceita(data.receita ?? []);
      setDespesa(data.despesa ?? []);
    }
  }, [data]);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  const renderList = (
    title: string,
    items: string[],
    setItems: (v: string[]) => void,
    draft: string,
    setDraft: (v: string) => void,
  ) => (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{title}</Label>
      <div className="flex flex-wrap gap-2 min-h-[28px]">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="gap-1.5 pr-1 text-xs">
            {i}
            <button onClick={() => setItems(items.filter((x) => x !== i))} aria-label={`Remover ${i}`} className="hover:text-destructive p-0.5 rounded">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">Sem categorias.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nova categoria"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const v = draft.trim();
              if (v && !items.includes(v)) { setItems([...items, v]); setDraft(''); }
            }
          }}
        />
        <Button
          variant="outline"
          onClick={() => {
            const v = draft.trim();
            if (v && !items.includes(v)) { setItems([...items, v]); setDraft(''); }
          }}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {renderList('Receita', receita, setReceita, draftR, setDraftR)}
        {renderList('Despesa', despesa, setDespesa, draftD, setDraftD)}
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => update.mutate({ key: 'financial_categories', value: { receita, despesa } })}
          disabled={update.isPending}
          className="gap-2"
        >
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function CommissionRulesEditor() {
  const { data, isLoading } = useSystemSetting<CommissionRules>('commission_rules');
  const update = useUpdateSystemSetting();
  const [rules, setRules] = useState<CommissionRules>({ default_pct: 15, min_pct: 5, max_pct: 30 });

  useEffect(() => { if (data) setRules(data); }, [data]);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  const valid = rules.min_pct <= rules.default_pct && rules.default_pct <= rules.max_pct;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Mínimo (%)</Label>
          <Input type="number" min={0} max={100} value={rules.min_pct} onChange={(e) => setRules({ ...rules, min_pct: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Padrão (%)</Label>
          <Input type="number" min={0} max={100} value={rules.default_pct} onChange={(e) => setRules({ ...rules, default_pct: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Máximo (%)</Label>
          <Input type="number" min={0} max={100} value={rules.max_pct} onChange={(e) => setRules({ ...rules, max_pct: Number(e.target.value) })} />
        </div>
      </div>
      {!valid && <p className="text-xs text-destructive">Os valores devem obedecer: mínimo ≤ padrão ≤ máximo.</p>}
      <div className="flex justify-end">
        <Button
          onClick={() => update.mutate({ key: 'commission_rules', value: rules })}
          disabled={update.isPending || !valid}
          className="gap-2"
        >
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function ContractTemplatesEditor() {
  const { data, isLoading } = useSystemSetting<ContractTemplates>('contract_templates');
  const update = useUpdateSystemSetting();
  const [items, setItems] = useState<ContractTemplate[]>([]);
  const [editing, setEditing] = useState<ContractTemplate | null>(null);

  useEffect(() => { if (data) setItems(data); }, [data]);

  const upsert = (t: ContractTemplate) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === t.id);
      return exists ? prev.map((p) => (p.id === t.id ? t : p)) : [...prev, t];
    });
    setEditing(null);
  };
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const toggle = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditing({ id: '', name: '', description: '', category: 'contrato', enabled: true })}
        >
          <Plus className="h-4 w-4" /> Novo template
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum template cadastrado.</p>
      ) : (
        <div className="divide-y divide-border/50 rounded-lg border border-border/50">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <Badge variant="outline" className="text-micro capitalize">{t.category}</Badge>
                  {!t.enabled && <Badge variant="secondary" className="text-micro">Desativado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.description || t.id}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={t.enabled} onCheckedChange={() => toggle(t.id)} aria-label={`Ativar ${t.name}`} />
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditing(t)}>Editar</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)} aria-label={`Remover ${t.name}`}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => update.mutate({ key: 'contract_templates', value: items })} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      {editing && (
        <ContractTemplateDialog
          template={editing}
          existingIds={items.map((i) => i.id)}
          onCancel={() => setEditing(null)}
          onSave={upsert}
        />
      )}
    </div>
  );
}

function ContractTemplateDialog({
  template,
  existingIds,
  onCancel,
  onSave,
}: {
  template: ContractTemplate;
  existingIds: string[];
  onCancel: () => void;
  onSave: (t: ContractTemplate) => void;
}) {
  const isNew = !existingIds.includes(template.id);
  const [draft, setDraft] = useState<ContractTemplate>(template);

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const idValid = draft.id.length > 0 && (!isNew || !existingIds.includes(draft.id));
  const valid = draft.name.trim().length > 0 && idValid;

  const AVAILABLE_VARS = [
    'produtor', 'dj', 'evento', 'data', 'horario',
    'cache', 'pagamento', 'local', 'cidade', 'observacoes',
  ];

  const insertVar = (v: string) => {
    setDraft((d) => ({ ...d, body_html: `${d.body_html ?? ''}{{${v}}}` }));
  };

  const [showPreview, setShowPreview] = useState(false);
  const SAMPLE: Record<string, string> = {
    produtor: 'Acme Eventos Ltda.',
    dj: 'DJ Exemplo',
    evento: 'Festival Neon 2026',
    data: '15/08/2026',
    horario: '23:00 às 04:00',
    cache: '8000.00',
    pagamento: '50% sinal + 50% no dia',
    local: 'Arena Underground',
    cidade: 'São Paulo',
    observacoes: 'Inclui open bar e camarim privativo.',
  };
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const previewHtml = (() => {
    const body = (draft.body_html ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) =>
      SAMPLE[k] !== undefined ? escapeHtml(SAMPLE[k]) : ''
    );
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 24px; color: #1a1a1a; line-height: 1.6; background:#fff; }
      h1,h2,h3 { color: #f97316; }
    </style></head><body>${body || '<p style="color:#999;font-style:italic">Sem conteúdo ainda.</p>'}</body></html>`;
  })();

  return (
    <div className="rounded-lg border border-primary/30 bg-muted/20 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome *</Label>
          <Input
            value={draft.name}
            onChange={(e) => {
              const name = e.target.value;
              setDraft((d) => ({ ...d, name, id: isNew ? slugify(name) : d.id }));
            }}
            placeholder="Ex.: Contrato Internacional"
          />
        </div>
        <div>
          <Label className="text-xs">ID interno</Label>
          <Input value={draft.id} onChange={(e) => setDraft((d) => ({ ...d, id: slugify(e.target.value) }))} disabled={!isNew} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <Label className="text-xs">Categoria</Label>
          <Input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} placeholder="contrato, proposta, rider..." />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} id="tpl-enabled" />
          <Label htmlFor="tpl-enabled" className="text-xs">Ativo</Label>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs">Conteúdo HTML (opcional)</Label>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-micro text-muted-foreground mr-1">Inserir:</span>
            {AVAILABLE_VARS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="text-micro px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 border border-border/50 font-mono"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          rows={8}
          value={draft.body_html ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, body_html: e.target.value }))}
          placeholder="Deixe em branco para usar o template padrão. Ex.: <h1>Contrato</h1><p>Produtor: {{produtor}} — DJ: {{dj}}</p>"
          className="font-mono text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-micro text-muted-foreground">
            Use <code>{`{{variavel}}`}</code> para interpolação. Se vazio, o sistema usa o layout padrão.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setShowPreview((v) => !v)}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? 'Ocultar preview' : 'Ver preview'}
          </Button>
        </div>
        {showPreview && (
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <iframe
              title="Preview do template"
              sandbox=""
              srcDoc={previewHtml}
              className="w-full h-[360px] border-0"
            />
          </div>
        )}
      </div>
      {!idValid && isNew && <p className="text-xs text-destructive">ID já existe ou é inválido.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" disabled={!valid} onClick={() => onSave(draft)}>Aplicar</Button>
      </div>
    </div>
  );
}

const DEFAULT_AUTOMATIONS: AutomationRules = {
  // WhatsApp
  whatsapp_on_confirm: true,
  whatsapp_on_contract_signed: true,
  whatsapp_payment_reminder_days: 3,
  whatsapp_on_event_day: true,
  whatsapp_on_payment_received: true,
  // Email
  email_on_contract_sent: true,
  email_on_contract_signed: true,
  email_on_booking_confirmed: true,
  email_on_invoice_issued: true,
  email_on_payment_received: true,
  // Google Calendar
  google_calendar_auto_sync: true,
  google_calendar_sync_on_update: true,
  google_calendar_delete_on_cancel: true,
  // Stripe (defaults seguros: desligados — envolvem cobrança)
  stripe_link_on_confirm: false,
  stripe_invoice_on_event_done: false,
  stripe_auto_charge_deposit: false,
};

function AutomationsEditor() {
  const { data, isLoading } = useSystemSetting<AutomationRules>('automation_rules');
  const update = useUpdateSystemSetting();
  const [rules, setRules] = useState<AutomationRules>(DEFAULT_AUTOMATIONS);

  useEffect(() => { if (data) setRules({ ...DEFAULT_AUTOMATIONS, ...data }); }, [data]);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  type BoolKey = {
    [K in keyof AutomationRules]: AutomationRules[K] extends boolean ? K : never
  }[keyof AutomationRules];

  const toggle = (k: BoolKey) => (v: boolean) =>
    setRules((r) => ({ ...r, [k]: v }));

  const Row = ({ id, label, description, children }: {
    id: string; label: string; description: string; children: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  const ChannelGroup = ({ icon: Icon, title, color, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    color: 'success' | 'info' | 'primary' | 'accent';
    children: React.ReactNode;
  }) => {
    const colorMap = {
      success: 'text-success bg-success/10 border-success/20',
      info: 'text-info bg-info/10 border-info/20',
      primary: 'text-primary bg-primary/10 border-primary/20',
      accent: 'text-accent bg-accent/10 border-accent/20',
    } as const;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-md border ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        </div>
        <div className="space-y-2 pl-1">{children}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ChannelGroup icon={MessageCircle} title="WhatsApp" color="success">
        <Row id="aut-wa-confirm" label="Mensagem ao confirmar booking" description="Notifica DJ e produtor quando o status do booking muda para confirmado.">
          <Switch id="aut-wa-confirm" checked={rules.whatsapp_on_confirm} onCheckedChange={toggle('whatsapp_on_confirm')} />
        </Row>
        <Row id="aut-wa-signed" label="Aviso quando contrato é assinado" description="Envia confirmação ao DJ e produtor após assinatura digital do contrato.">
          <Switch id="aut-wa-signed" checked={rules.whatsapp_on_contract_signed} onCheckedChange={toggle('whatsapp_on_contract_signed')} />
        </Row>
        <Row id="aut-wa-reminder" label="Lembrete de pagamento (dias antes)" description="Quantos dias antes do vencimento disparar lembrete. Use 0 para desligar.">
          <Input
            id="aut-wa-reminder"
            type="number"
            min={0}
            max={30}
            value={rules.whatsapp_payment_reminder_days}
            onChange={(e) => setRules((r) => ({ ...r, whatsapp_payment_reminder_days: Math.max(0, Math.min(30, Number(e.target.value))) }))}
            className="w-24"
          />
        </Row>
        <Row id="aut-wa-eventday" label="Mensagem no dia do evento" description="Lembrete automático para DJ e produtor na manhã do evento.">
          <Switch id="aut-wa-eventday" checked={rules.whatsapp_on_event_day} onCheckedChange={toggle('whatsapp_on_event_day')} />
        </Row>
        <Row id="aut-wa-paid" label="Confirmação de pagamento recebido" description="Notifica produtor e DJ quando um pagamento é registrado como recebido.">
          <Switch id="aut-wa-paid" checked={rules.whatsapp_on_payment_received} onCheckedChange={toggle('whatsapp_on_payment_received')} />
        </Row>
      </ChannelGroup>

      <ChannelGroup icon={Mail} title="Email" color="info">
        <Row id="aut-email-contract" label="Email ao enviar contrato" description="Notifica o produtor por email quando um contrato é marcado como enviado.">
          <Switch id="aut-email-contract" checked={rules.email_on_contract_sent} onCheckedChange={toggle('email_on_contract_sent')} />
        </Row>
        <Row id="aut-email-signed" label="Email ao assinar contrato" description="Confirma assinatura por email para o produtor e o DJ.">
          <Switch id="aut-email-signed" checked={rules.email_on_contract_signed} onCheckedChange={toggle('email_on_contract_signed')} />
        </Row>
        <Row id="aut-email-booking" label="Email ao confirmar booking" description="Email automático ao produtor quando booking é confirmado.">
          <Switch id="aut-email-booking" checked={rules.email_on_booking_confirmed} onCheckedChange={toggle('email_on_booking_confirmed')} />
        </Row>
        <Row id="aut-email-invoice" label="Email ao emitir fatura" description="Envia o link da fatura ao produtor assim que ela é gerada.">
          <Switch id="aut-email-invoice" checked={rules.email_on_invoice_issued} onCheckedChange={toggle('email_on_invoice_issued')} />
        </Row>
        <Row id="aut-email-paid" label="Recibo automático" description="Envia recibo por email ao produtor após confirmação de pagamento.">
          <Switch id="aut-email-paid" checked={rules.email_on_payment_received} onCheckedChange={toggle('email_on_payment_received')} />
        </Row>
      </ChannelGroup>

      <ChannelGroup icon={Calendar} title="Google Calendar" color="primary">
        <Row id="aut-gcal" label="Sincronização automática" description="Cria evento no Google Calendar ao salvar booking confirmado.">
          <Switch id="aut-gcal" checked={rules.google_calendar_auto_sync} onCheckedChange={toggle('google_calendar_auto_sync')} />
        </Row>
        <Row id="aut-gcal-update" label="Atualizar evento ao editar booking" description="Propaga alterações de data/hora/local para o evento já criado.">
          <Switch id="aut-gcal-update" checked={rules.google_calendar_sync_on_update} onCheckedChange={toggle('google_calendar_sync_on_update')} />
        </Row>
        <Row id="aut-gcal-delete" label="Remover evento ao cancelar" description="Apaga o evento do Google Calendar quando o booking é cancelado/perdido.">
          <Switch id="aut-gcal-delete" checked={rules.google_calendar_delete_on_cancel} onCheckedChange={toggle('google_calendar_delete_on_cancel')} />
        </Row>
      </ChannelGroup>

      <ChannelGroup icon={CreditCard} title="Stripe" color="accent">
        <Row id="aut-stripe" label="Gerar link de pagamento ao confirmar" description="Cria automaticamente um payment link Stripe para o produtor ao confirmar booking.">
          <Switch id="aut-stripe" checked={rules.stripe_link_on_confirm} onCheckedChange={toggle('stripe_link_on_confirm')} />
        </Row>
        <Row id="aut-stripe-invoice" label="Emitir fatura após o evento" description="Gera fatura Stripe automaticamente quando o evento é marcado como realizado.">
          <Switch id="aut-stripe-invoice" checked={rules.stripe_invoice_on_event_done} onCheckedChange={toggle('stripe_invoice_on_event_done')} />
        </Row>
        <Row id="aut-stripe-deposit" label="Cobrança automática do sinal" description="Cobra o cartão salvo do produtor (50% sinal) ao confirmar booking. Requer cliente Stripe com método salvo.">
          <Switch id="aut-stripe-deposit" checked={rules.stripe_auto_charge_deposit} onCheckedChange={toggle('stripe_auto_charge_deposit')} />
        </Row>
      </ChannelGroup>

      <div className="flex justify-end pt-2 border-t border-border/50">
        <Button onClick={() => update.mutate({ key: 'automation_rules', value: rules })} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar automações
        </Button>
      </div>
    </div>
  );
}

type SectionId = 'event-types' | 'financial' | 'commission' | 'templates' | 'automations';

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  icon: typeof Settings;
  description: string;
  hint: string;
  component: JSX.Element;
}> = [
  {
    id: 'event-types',
    label: 'Tipos de Evento',
    icon: Settings,
    description: 'Categorias de eventos disponíveis em bookings',
    hint: 'Padroniza o dropdown ao criar bookings — afeta filtros e relatórios.',
    component: <EventTypesEditor />,
  },
  {
    id: 'financial',
    label: 'Categorias Financeiras',
    icon: DollarSign,
    description: 'Categorias de receita e despesa',
    hint: 'Aparecem nos lançamentos financeiros e na agregação por categoria do dashboard.',
    component: <FinancialCategoriesEditor />,
  },
  {
    id: 'commission',
    label: 'Regras de Comissão',
    icon: Users,
    description: 'Percentuais padrão de comissão da gestão',
    hint: 'Define o cálculo de repasse automático ao confirmar bookings.',
    component: <CommissionRulesEditor />,
  },
  {
    id: 'templates',
    label: 'Templates de Contrato',
    icon: FileText,
    description: 'Modelos disponíveis na geração de documentos',
    hint: 'Use variáveis como {{produtor}}, {{dj}}, {{cache}} — preview disponível no editor.',
    component: <ContractTemplatesEditor />,
  },
  {
    id: 'automations',
    label: 'Automações',
    icon: Zap,
    description: 'Gatilhos automáticos do sistema',
    hint: 'WhatsApp, e-mail, Google Calendar e Stripe — disparados por eventos do CRM.',
    component: <AutomationsEditor />,
  },
];

export default function Configuracoes() {
  const [active, setActive] = useState<SectionId>('event-types');
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()),
      )
    : SECTIONS;

  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const ActiveIcon = current.icon;

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="CONFIGURAÇÕES"
        size="lg"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'SYSTEM · SYNC OK', tone: 'live' },
          { label: `▸ ${SECTIONS.length} módulos`, tone: 'muted' },
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            regras de negócio, integrações e parâmetros — alterações afetam todo o workspace
          </p>
        }
      />

      {/* 2-column shell */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left rail nav */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar seção…"
              className="pl-8 h-9 text-xs"
            />
          </div>

          <nav className="flex flex-col gap-1" role="navigation" aria-label="Seções de configuração">
            {filtered.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-transparent hover:border-border hover:bg-muted/40 text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border',
                      isActive
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{s.label}</p>
                    <p
                      className={cn(
                        'text-mini leading-tight mt-0.5 truncate',
                        isActive ? 'text-primary/80' : 'text-muted-foreground',
                      )}
                    >
                      {s.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0 mt-1 transition-transform',
                      isActive ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40 group-hover:translate-x-0.5',
                    )}
                  />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma seção corresponde a “{search}”.</p>
            )}
          </nav>
        </aside>

        {/* Right content */}
        <section className="min-w-0">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <ActiveIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{current.label}</CardTitle>
                    <CardDescription className="mt-0.5">{current.description}</CardDescription>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{current.hint}</p>
            </CardHeader>
            <CardContent className="pt-5">{current.component}</CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
