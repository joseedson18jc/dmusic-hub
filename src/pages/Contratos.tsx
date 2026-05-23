import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSignature, Plus, FileText, Download, Eye, Loader2, Send, History, Clock, CheckCircle, XCircle, Search, Pencil, MessageCircle, Link2, PenTool, Copy, FileCheck2, FileX2, Files } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useContracts, useCreateContract, useUpdateContractStatus, useContractHistory, useCreateContractVersion, getContractShareableLink } from '@/hooks/useContracts';
import { useBookings } from '@/hooks/useBookings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSystemSetting, type ContractTemplates } from '@/hooks/useSystemSettings';
import { logContractEvent } from '@/lib/contractAudit';
import { StatusPill, contractStatusToPill } from '@/components/StatusPill';
import { KpiStat } from '@/components/KpiCard';
import { EditorialHero } from '@/components/ui/EditorialHero';

const FALLBACK_TEMPLATES = [
  { id: 'booking-standard', name: 'Contrato de Booking Padrão', description: 'Contrato padrão para apresentações de DJ', category: 'contrato', fields: ['produtor', 'dj', 'evento', 'data', 'horario', 'cache', 'pagamento', 'cancelamento'] },
  { id: 'booking-international', name: 'Contrato de Booking Internacional', description: 'Contrato bilíngue para eventos internacionais', category: 'contrato', fields: ['produtor', 'dj', 'evento', 'data', 'horario', 'cache', 'moeda', 'logistica'] },
  { id: 'proposta-comercial', name: 'Proposta Comercial', description: 'Proposta de cachê e condições para produtores', category: 'proposta', fields: ['produtor', 'dj', 'cache', 'condições', 'validade'] },
  { id: 'rider-tecnico', name: 'Rider Técnico', description: 'Especificações técnicas e equipamentos necessários', category: 'rider', fields: ['dj', 'equipamentos', 'especificações'] },
  { id: 'recibo', name: 'Recibo de Pagamento', description: 'Recibo para pagamentos recebidos ou efetuados', category: 'recibo', fields: ['pagador', 'recebedor', 'valor', 'referência'] },
  { id: 'aditivo', name: 'Aditivo Contratual', description: 'Alterações e adições a contratos existentes', category: 'aditivo', fields: ['contrato_original', 'alterações'] },
];

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  rascunho: { label: 'Rascunho', icon: FileText, className: 'bg-muted text-muted-foreground' },
  enviado: { label: 'Enviado', icon: Send, className: 'status-pending' },
  assinado: { label: 'Assinado', icon: CheckCircle, className: 'status-paid' },
  cancelado: { label: 'Cancelado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  expirado: { label: 'Expirado', icon: Clock, className: 'bg-muted text-muted-foreground' },
};

export default function Contratos() {
  const [templateDialog, setTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof FALLBACK_TEMPLATES[0] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: contracts = [], isLoading } = useContracts();
  const createContract = useCreateContract();
  const updateStatus = useUpdateContractStatus();
  const createVersion = useCreateContractVersion();
  const queryClient = useQueryClient();
  const { data: history = [] } = useContractHistory(historyContractId);
  const { data: configuredTemplates } = useSystemSetting<ContractTemplates>('contract_templates');
  const { data: bookingsList = [] } = useBookings();
  const [linkedBookingId, setLinkedBookingId] = useState<string>('');
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [signingLinkId, setSigningLinkId] = useState<string | null>(null);
  const [signLink, setSignLink] = useState<{ url: string; contractName: string } | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);

  // Merge configured (enabled) templates with fallback definitions to retain field metadata.
  const CONTRACT_TEMPLATES = (configuredTemplates && configuredTemplates.length > 0
    ? configuredTemplates.filter((t) => t.enabled).map((t) => {
        const fb = FALLBACK_TEMPLATES.find((f) => f.id === t.id);
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          fields: fb?.fields ?? ['produtor', 'dj', 'evento', 'data', 'cache'],
          body_html: t.body_html,
        };
      })
    : FALLBACK_TEMPLATES);

  const [formData, setFormData] = useState({
    produtor: '', dj: '', evento: '', data: '', horario: '',
    cache: '', pagamento: '', local: '', cidade: '', observacoes: '',
  });

  const updateField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const prefillFromBooking = (bookingId: string) => {
    setLinkedBookingId(bookingId);
    if (!bookingId) return;
    const b = (bookingsList as any[]).find((x) => x.id === bookingId);
    if (!b) return;
    const horario = [b.hora_inicio, b.hora_fim].filter(Boolean).join(' às ');
    setFormData((prev) => ({
      ...prev,
      produtor: b.producers?.nome || prev.produtor,
      dj: b.djs?.nome_artistico || prev.dj,
      evento: b.evento_nome || b.titulo || prev.evento,
      data: b.data_evento || prev.data,
      horario: horario || prev.horario,
      cache: b.fee_acordado != null ? String(b.fee_acordado) : prev.cache,
      local: b.venue || prev.local,
      cidade: b.cidade || prev.cidade,
    }));
    toast.success('Dados pré-preenchidos do booking');
  };

  const linkedBooking = linkedBookingId
    ? (bookingsList as any[]).find((x) => x.id === linkedBookingId)
    : null;

  const handleGeneratePDF = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          data: formData,
          html_template: (selectedTemplate as any).body_html || undefined,
          save_to_storage: true,
          contract_id: editingContractId || undefined,
        },
      });

      if (error) throw error;

      if (editingContractId) {
        // Update existing → bumps version
        await createVersion.mutateAsync({
          id: editingContractId,
          form_data: formData,
          html_content: data.html,
        });
      } else {
        // Save new contract
        await createContract.mutateAsync({
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          form_data: formData,
          html_content: data.html,
          booking_id: linkedBooking?.id,
          dj_id: linkedBooking?.dj_id,
          producer_id: linkedBooking?.producer_id,
          file_url: data.file_url || undefined,
          file_path: data.file_path || undefined,
        });
      }

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }

      setTemplateDialog(false);
      setSelectedTemplate(null);
      setLinkedBookingId('');
      setEditingContractId(null);
      setFormData({ produtor: '', dj: '', evento: '', data: '', horario: '', cache: '', pagamento: '', local: '', cidade: '', observacoes: '' });
    } catch (err: any) {
      safeErrorToast(err, 'Erro ao gerar documento');
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = (contract: any) => {
    const tpl = CONTRACT_TEMPLATES.find((t) => t.id === contract.template_id) || {
      id: contract.template_id,
      name: contract.template_name,
      description: '',
      category: 'contrato',
      fields: ['produtor', 'dj', 'evento', 'data', 'cache'],
      body_html: undefined,
    };
    setSelectedTemplate(tpl as any);
    setEditingContractId(contract.id);
    setLinkedBookingId(contract.booking_id || '');
    const fi = (contract.form_data as any) || {};
    setFormData({
      produtor: fi.produtor || '',
      dj: fi.dj || '',
      evento: fi.evento || '',
      data: fi.data || '',
      horario: fi.horario || '',
      cache: fi.cache || '',
      pagamento: fi.pagamento || '',
      local: fi.local || '',
      cidade: fi.cidade || '',
      observacoes: fi.observacoes || '',
    });
    setTemplateDialog(true);
  };

  const handleSendWhatsApp = async (contract: any) => {
    const fi = (contract.form_data as any) || {};
    // Try to find producer phone from linked booking
    const linkedB = contract.booking_id
      ? (bookingsList as any[]).find((b) => b.id === contract.booking_id)
      : null;
    const phone = linkedB?.producers?.whatsapp || linkedB?.producers?.telefone;
    const recipientName = fi.produtor || linkedB?.producers?.nome;

    if (!phone) {
      toast.error('Produtor sem WhatsApp cadastrado. Vincule o contrato a um booking com produtor válido.');
      return;
    }

    setSendingId(contract.id);
    try {
      // 1. Registra atomicamente o envio (cooldown + contador) — bloqueia clique duplo
      const { data: sendMeta, error: rpcErr } = await (supabase as any).rpc(
        'contract_register_send',
        { _contract_id: contract.id, _cooldown_seconds: 60 },
      );
      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (msg.includes('COOLDOWN_ACTIVE')) {
          toast.error('Aguarde alguns segundos antes de reenviar este contrato.');
        } else if (msg.includes('ALREADY_SIGNED')) {
          toast.error('Este contrato já foi assinado.');
        } else if (msg.includes('CANCELLED')) {
          toast.error('Este contrato foi cancelado.');
        } else {
          toast.error(msg || 'Erro ao registrar reenvio.');
        }
        return;
      }

      const attemptN = sendMeta?.attempt_number ?? 1;

      // 2. Reusa link público de assinatura existente (se houver) ou aponta para o sistema
      let contractLink = `${window.location.origin}/contratos`;
      try {
        const { data: lastSig } = await (supabase as any)
          .from('contract_signatures')
          .select('token, expires_at, signed_at')
          .eq('contract_id', contract.id)
          .is('signed_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastSig?.token) {
          contractLink = `${window.location.origin}/assinar/${lastSig.token}`;
        }
      } catch {
        // segue com link genérico
      }

      // 3. Dispara o WhatsApp
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'send',
          template_id: 'contract-pending',
          to: phone,
          recipient_name: recipientName,
          variables: {
            name: recipientName || 'produtor',
            event_name: fi.evento || contract.template_name,
            contract_link: contractLink,
          },
          entity_type: 'contract',
          entity_id: contract.id,
          producer_id: contract.producer_id,
          dj_id: contract.dj_id,
          booking_id: contract.booking_id,
        },
      });
      if (error) {
        await logContractEvent({
          contractId: contract.id,
          action: 'envio_falhou',
          version: contract.version,
          details: {
            channel: 'whatsapp',
            recipient: recipientName,
            phone,
            attempt_number: attemptN,
            link_used: contractLink,
          },
          error,
        });
        throw error;
      }

      // 4. Move status para "enviado" se ainda for rascunho
      if (contract.status === 'rascunho') {
        await updateStatus.mutateAsync({ id: contract.id, status: 'enviado', oldStatus: contract.status });
      }

      // 5. Registra um único evento agregado no histórico (com nº da tentativa)
      await logContractEvent({
        contractId: contract.id,
        action: 'contrato_enviado',
        version: contract.version,
        details: {
          channel: 'whatsapp',
          recipient: recipientName,
          phone,
          attempt_number: attemptN,
          link_used: contractLink,
          sent_at: sendMeta?.last_sent_at || new Date().toISOString(),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(
        attemptN === 1
          ? `Contrato enviado para ${recipientName} via WhatsApp`
          : `Contrato reenviado para ${recipientName} (${attemptN}ª tentativa)`,
      );
    } catch (err: any) {
      safeErrorToast(err, 'Erro ao enviar WhatsApp');
    } finally {
      setSendingId(null);
    }
  };

  const handleGenerateSignLink = async (contract: any) => {
    setSigningLinkId(contract.id);
    try {
      // Token is minted server-side now (mint-sign-token edge function).
      // The server checks admin role, generates 256 bits of CSPRNG entropy,
      // and inserts the contract_signatures row using the service-role
      // client only after a user-scoped contract read confirms access.
      const { data, error } = await supabase.functions.invoke('mint-sign-token', {
        body: { contract_id: contract.id, ttl_days: 30 },
      });
      if (error) {
        await logContractEvent({
          contractId: contract.id,
          action: 'link_falhou',
          version: contract.version,
          details: { source: 'mint-sign-token', expires_in_days: 30 },
          error,
        });
        throw error;
      }
      if (!data?.token) {
        throw new Error(data?.error || 'Resposta inválida do servidor');
      }

      const token: string = data.token;
      const url = `${window.location.origin}/assinar/${token}`;
      setSignLink({ url, contractName: contract.template_name });

      await logContractEvent({
        contractId: contract.id,
        action: 'link_gerado',
        oldStatus: contract.status,
        newStatus: contract.status === 'rascunho' ? 'enviado' : contract.status,
        version: contract.version,
        details: {
          expires_in_days: 30,
          expires_at: data.expires_at,
          token_prefix: token.slice(0, 8),
          generated_at: new Date().toISOString(),
          source: 'mint-sign-token',
        },
      });

      if (contract.status === 'rascunho') {
        await updateStatus.mutateAsync({ id: contract.id, status: 'enviado', oldStatus: contract.status });
      }
    } catch (err: any) {
      safeErrorToast(err, 'Erro ao gerar link de assinatura');
    } finally {
      setSigningLinkId(null);
    }
  };

  const handlePreview = (contract: any) => {
    if (contract.html_content) {
      setPreviewHtml(contract.html_content);
      logContractEvent({
        contractId: contract.id,
        action: 'preview_admin',
        version: contract.version,
        details: { html_size: contract.html_content.length },
      });
    }
  };

  const handleDownload = (contract: any) => {
    if (!contract.html_content) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(contract.html_content);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
    logContractEvent({
      contractId: contract.id,
      action: 'download_admin',
      version: contract.version,
      details: { mode: 'print', html_size: contract.html_content.length },
    });
  };

  const handleShareLink = async (contract: any, mode: 'open' | 'copy') => {
    if (!contract.file_path && !contract.file_url) {
      toast.error('Este contrato ainda não possui arquivo no armazenamento. Gere o PDF novamente para criar o link compartilhável.');
      return;
    }
    setShareLoadingId(contract.id);
    try {
      // Sempre regerar via edge function — o file_url salvo pode ter expirado.
      const url = await getContractShareableLink(contract.id);
      if (mode === 'open') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copiado para a área de transferência');
        } catch {
          // Fallback silencioso quando clipboard não está disponível
          window.prompt('Copie o link do contrato:', url);
        }
      }
      await logContractEvent({
        contractId: contract.id,
        action: 'visualizado_admin',
        version: contract.version,
        details: { mode, source: 'shareable_link' },
      });
    } catch (e: any) {
      await logContractEvent({
        contractId: contract.id,
        action: 'link_falhou',
        version: contract.version,
        details: { mode, source: 'shareable_link' },
        error: e,
      });
      toast.error(e.message || 'Não foi possível gerar o link compartilhável');
    } finally {
      setShareLoadingId(null);
    }
  };

  const allContracts = contracts as any[];
  const filteredContracts = allContracts.filter((c: any) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fi = (c.form_data as any) || {};
    return [
      c.template_name,
      fi.produtor,
      fi.dj,
      fi.evento,
      c.producers?.nome,
      c.djs?.nome_artistico,
      c.bookings?.titulo,
    ].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
  });

  // KPI breakdown by status
  const statusCounts = {
    total: allContracts.length,
    rascunho: allContracts.filter((c: any) => c.status === 'rascunho').length,
    enviado: allContracts.filter((c: any) => c.status === 'enviado').length,
    assinado: allContracts.filter((c: any) => c.status === 'assinado').length,
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="CONTRATOS"
        accentHueA="hsl(var(--violet))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'LEGAL · LIVE', tone: 'live' },
          { label: `▸ ${statusCounts.total} documentos`, tone: 'muted' },
          ...(statusCounts.enviado > 0
            ? [{ label: `◆ ${statusCounts.enviado} aguardando`, tone: 'warn' as const }]
            : []),
        ]}
        ticker={[
          { label: 'rascunhos', value: String(statusCounts.rascunho), valueColor: 'hsl(var(--muted-foreground))' },
          { label: 'enviados', value: String(statusCounts.enviado), valueColor: 'hsl(var(--warning))' },
          { label: 'assinados', value: String(statusCounts.assinado), valueColor: 'hsl(var(--success))' },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => { setSelectedTemplate(null); setTemplateDialog(true); }}
            className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
          >
            <Plus className="h-4 w-4" /> Gerar Contrato
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={Files} label="Total" value={statusCounts.total} tone="neutral" />
        <KpiStat icon={FileText} label="Rascunhos" value={statusCounts.rascunho} tone="slate" />
        <KpiStat icon={Send} label="Enviados" value={statusCounts.enviado} tone="warning" />
        <KpiStat icon={FileCheck2} label="Assinados" value={statusCounts.assinado} tone="success" />
      </div>

      <Tabs defaultValue="gerados" className="w-full">
        <TabsList>
          <TabsTrigger value="gerados">Contratos ({allContracts.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="gerados" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por template, produtor, DJ, evento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="glass-card">
            {isLoading ? (
              <CardContent className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent>
            ) : filteredContracts.length === 0 ? (
              <CardContent className="empty-state">
                <FileSignature className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">
                  {allContracts.length === 0 ? 'Nenhum contrato gerado' : 'Nenhum resultado encontrado'}
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {allContracts.length === 0
                    ? 'Clique em "Gerar Contrato" para criar seu primeiro documento'
                    : 'Ajuste os filtros para visualizar mais contratos'}
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredContracts.map((c: any) => {
                  const sc = statusConfig[c.status] || statusConfig.rascunho;
                  const formInfo = c.form_data as Record<string, any> || {};
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileSignature className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.template_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formInfo.produtor || c.producers?.nome || '—'} → {formInfo.dj || c.djs?.nome_artistico || '—'} •{' '}
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-micro">v{c.version}</Badge>
                        {(() => {
                          const pill = contractStatusToPill(c.status);
                          const Icon = sc.icon;
                          return (
                            <StatusPill variant={pill.variant} size="sm" icon={<Icon className="h-2.5 w-2.5" />}>
                              {pill.label}
                            </StatusPill>
                          );
                        })()}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                              Status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(['rascunho', 'enviado', 'assinado', 'cancelado'] as const).filter(s => s !== c.status).map(s => (
                              <DropdownMenuItem key={s} onClick={() => updateStatus.mutate({ id: c.id, status: s, oldStatus: c.status })}>
                                {statusConfig[s]?.label || s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryContractId(c.id)} title="Histórico">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)} title="Nova versão">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 relative"
                          onClick={() => handleSendWhatsApp(c)}
                          disabled={sendingId === c.id || c.status === 'assinado' || c.status === 'cancelado'}
                          title={
                            c.last_sent_at
                              ? `Reenviar via WhatsApp — último envio em ${format(new Date(c.last_sent_at), "dd/MM HH:mm", { locale: ptBR })} (${c.send_attempts || 1}ª tentativa)`
                              : 'Enviar via WhatsApp'
                          }
                        >
                          {sendingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                          {(c.send_attempts || 0) > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-nano font-bold flex items-center justify-center">
                              {c.send_attempts}
                            </span>
                          )}
                        </Button>
                        {c.status !== 'assinado' && c.status !== 'cancelado' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleGenerateSignLink(c)} title="Gerar link de assinatura" disabled={signingLinkId === c.id}>
                            {signingLinkId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4 text-primary" />}
                          </Button>
                        )}
                        {(c.file_path || c.file_url) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleShareLink(c, 'open')}
                              disabled={shareLoadingId === c.id}
                              title="Abrir link compartilhável"
                            >
                              {shareLoadingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleShareLink(c, 'copy')}
                              disabled={shareLoadingId === c.id}
                              title="Copiar link compartilhável"
                            >
                              <Copy className="h-4 w-4 text-primary" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(c)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(c)}><Download className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CONTRACT_TEMPLATES.map((t) => (
              <Card key={t.id} className="glass-card-hover group cursor-pointer" onClick={() => { setSelectedTemplate(t); setTemplateDialog(true); }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-micro capitalize">{t.category}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.fields.slice(0, 4).map((f) => <Badge key={f} variant="secondary" className="text-micro capitalize">{f}</Badge>)}
                    {t.fields.length > 4 && <Badge variant="secondary" className="text-micro">+{t.fields.length - 4}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Generation Dialog */}
      <Dialog open={templateDialog} onOpenChange={(open) => { setTemplateDialog(open); if (!open) { setSelectedTemplate(null); setEditingContractId(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContractId ? 'Nova Versão do Contrato' : 'Gerar Documento'}</DialogTitle>
            <DialogDescription>
              {editingContractId
                ? `Editando "${selectedTemplate?.name}" — uma nova versão será criada ao salvar.`
                : selectedTemplate ? `Preencha os dados para "${selectedTemplate.name}"` : 'Selecione um template.'}
            </DialogDescription>
          </DialogHeader>
          {!selectedTemplate ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {CONTRACT_TEMPLATES.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors" onClick={() => setSelectedTemplate(t)}>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Vincular a um booking <span className="text-muted-foreground font-normal">(opcional — preenche os campos)</span>
                </Label>
                <Select value={linkedBookingId || 'none'} onValueChange={(v) => prefillFromBooking(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um booking..." /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="none">— Sem vínculo —</SelectItem>
                    {(bookingsList as any[]).slice(0, 50).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.titulo || b.evento_nome || 'Sem título'}
                        {b.data_evento ? ` • ${format(new Date(b.data_evento + 'T00:00:00'), 'dd/MM/yyyy')}` : ''}
                        {b.djs?.nome_artistico ? ` • ${b.djs.nome_artistico}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Produtor / Contratante</Label><Input placeholder="Nome do produtor" value={formData.produtor} onChange={e => updateField('produtor', e.target.value)} /></div>
                <div><Label className="text-xs">DJ</Label><Input placeholder="Nome do DJ" value={formData.dj} onChange={e => updateField('dj', e.target.value)} /></div>
                <div><Label className="text-xs">Evento</Label><Input placeholder="Nome do evento" value={formData.evento} onChange={e => updateField('evento', e.target.value)} /></div>
                <div><Label className="text-xs">Data</Label><Input type="date" value={formData.data} onChange={e => updateField('data', e.target.value)} /></div>
                <div><Label className="text-xs">Horário</Label><Input placeholder="22:00 - 04:00" value={formData.horario} onChange={e => updateField('horario', e.target.value)} /></div>
                <div><Label className="text-xs">Local / Venue</Label><Input placeholder="Nome do local" value={formData.local} onChange={e => updateField('local', e.target.value)} /></div>
                <div><Label className="text-xs">Cidade</Label><Input placeholder="São Paulo, SP" value={formData.cidade} onChange={e => updateField('cidade', e.target.value)} /></div>
                <div><Label className="text-xs">Cachê (R$)</Label><Input type="number" placeholder="0,00" value={formData.cache} onChange={e => updateField('cache', e.target.value)} /></div>
                <div className="col-span-2">
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select value={formData.pagamento} onValueChange={v => updateField('pagamento', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Transferência Bancária">Transferência</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão</SelectItem>
                      <SelectItem value="50% sinal + 50% no dia">50% + 50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Observações Específicas</Label><Textarea placeholder="Cláusulas adicionais..." rows={3} value={formData.observacoes} onChange={e => updateField('observacoes', e.target.value)} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setSelectedTemplate(null); setTemplateDialog(false); setEditingContractId(null); }}>Cancelar</Button>
                <Button onClick={handleGeneratePDF} disabled={generating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  {generating ? 'Gerando...' : (editingContractId ? 'Salvar Nova Versão' : 'Gerar PDF')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          <div className="overflow-auto max-h-[65vh] border rounded-lg">
            {previewHtml && <iframe srcDoc={previewHtml} sandbox="" className="w-full h-[600px] border-0" title="Preview" />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign Link Dialog */}
      <Dialog open={!!signLink} onOpenChange={(open) => !open && setSignLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de assinatura gerado</DialogTitle>
            <DialogDescription>
              Compartilhe este link com o produtor para que ele assine o contrato "{signLink?.contractName}". O link expira em 30 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={signLink?.url || ''} readOnly className="font-mono text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  if (signLink) {
                    navigator.clipboard.writeText(signLink.url);
                    toast.success('Link copiado!');
                  }
                }}
                title="Copiar link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Você pode também enviar este link diretamente via WhatsApp usando o botão correspondente na lista de contratos.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyContractId} onOpenChange={(open) => !open && setHistoryContractId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Histórico do Contrato</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(history as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum histórico registrado.</p>
            ) : (
              (history as any[]).map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{h.action.replace(/_/g, ' ')}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {h.old_status && <Badge variant="outline" className="text-micro">{h.old_status}</Badge>}
                      {h.old_status && h.new_status && <span className="text-micro text-muted-foreground">→</span>}
                      {h.new_status && <Badge variant="outline" className="text-micro">{h.new_status}</Badge>}
                      {h.version && <Badge variant="secondary" className="text-micro">v{h.version}</Badge>}
                    </div>
                    <p className="text-micro text-muted-foreground mt-1">
                      {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
