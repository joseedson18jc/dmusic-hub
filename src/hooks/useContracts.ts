import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { logContractEvent } from '@/lib/contractAudit';

const sb = supabase as any;

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('contracts')
        .select('*, djs:dj_id(nome_artistico), producers:producer_id(nome), bookings:booking_id(titulo)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useContractHistory(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-history', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('contract_history')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contract: {
      template_id: string;
      template_name: string;
      form_data: Record<string, any>;
      html_content?: string;
      booking_id?: string;
      dj_id?: string;
      producer_id?: string;
      file_url?: string;
      file_path?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('contracts').insert({
        ...contract,
        created_by: user?.id,
        status: 'rascunho',
        version: 1,
      }).select().single();
      if (error) {
        // Falha de criação: não há contractId ainda — registra apenas em audit_logs via console marker
        console.error('[contracts] create failed', error);
        throw error;
      }

      await logContractEvent({
        contractId: data.id,
        action: 'criado',
        newStatus: 'rascunho',
        version: 1,
        details: {
          template_id: contract.template_id,
          template_name: contract.template_name,
          booking_id: contract.booking_id ?? null,
          dj_id: contract.dj_id ?? null,
          producer_id: contract.producer_id ?? null,
          has_file: !!contract.file_path,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato salvo com sucesso!');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, oldStatus }: { id: string; status: string; oldStatus: string }) => {
      const { error } = await sb.from('contracts').update({ status }).eq('id', id);
      if (error) {
        await logContractEvent({
          contractId: id,
          action: 'status_alteracao_falhou',
          oldStatus,
          newStatus: status,
          error,
        });
        throw error;
      }

      await logContractEvent({
        contractId: id,
        action: 'status_alterado',
        oldStatus,
        newStatus: status,
        details: { reason: 'manual_admin_change' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Status atualizado');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useCreateContractVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form_data, html_content }: { id: string; form_data: Record<string, any>; html_content?: string }) => {
      // Get current version
      const { data: current, error: versionErr } = await sb.from('contracts').select('version').eq('id', id).maybeSingle();
      if (versionErr) throw versionErr;
      const newVersion = (current?.version || 1) + 1;

      const { error } = await sb.from('contracts').update({
        form_data,
        html_content,
        version: newVersion,
        status: 'rascunho',
      }).eq('id', id);
      if (error) {
        await logContractEvent({
          contractId: id,
          action: 'versao_falhou',
          version: newVersion,
          error,
        });
        throw error;
      }

      await logContractEvent({
        contractId: id,
        action: 'nova_versao',
        newStatus: 'rascunho',
        version: newVersion,
        details: {
          previous_version: current?.version || 1,
          fields_changed: Object.keys(form_data || {}),
          html_size: html_content?.length ?? 0,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Nova versão criada');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

/**
 * Gera (ou regenera) uma signed URL para o PDF/HTML do contrato no bucket privado `contracts`.
 * Usado para compartilhar o link com produtores/DJs sem expor permanentemente o arquivo.
 */
export async function getContractShareableLink(
  contractId: string,
  expiresInSeconds = 60 * 60 * 24 * 30,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-contract-link', {
    body: { contract_id: contractId, expires_in: expiresInSeconds },
  });
  if (error) throw new Error(error.message || 'Falha ao gerar link');
  if (!data?.url) throw new Error(data?.error || 'Arquivo do contrato indisponível');
  return data.url as string;
}
