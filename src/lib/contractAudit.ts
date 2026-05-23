/**
 * Helper centralizado de auditoria de contratos.
 *
 * Cada operação relevante (envio, assinatura, alteração de status, geração de link,
 * download, preview, falhas) é registrada em DOIS lugares:
 *
 * 1. `contract_history` — trilha granular por contrato (UI de histórico).
 * 2. `audit_logs`       — trilha administrativa transversal (compliance, busca cross-entity).
 *
 * As escritas são best-effort: nunca devem bloquear o fluxo de negócio.
 */
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

export type ContractAuditAction =
  // sucesso
  | 'criado'
  | 'nova_versao'
  | 'status_alterado'
  | 'link_gerado'
  | 'contrato_enviado'
  | 'visualizado_admin'
  | 'download_admin'
  | 'preview_admin'
  // falhas
  | 'envio_falhou'
  | 'link_falhou'
  | 'status_alteracao_falhou'
  | 'criacao_falhou'
  | 'versao_falhou'
  | 'assinatura_falhou';

export interface ContractAuditPayload {
  contractId: string;
  action: ContractAuditAction;
  oldStatus?: string | null;
  newStatus?: string | null;
  version?: number | null;
  details?: Record<string, unknown>;
  /** Se presente, marca o evento como falha e captura a causa. */
  error?: unknown;
}

function normalizeError(err: unknown): { message: string; code?: string; raw?: string } {
  if (!err) return { message: 'unknown_error' };
  if (typeof err === 'string') return { message: err };
  const e = err as any;
  return {
    message: e.message || e.error_description || e.error || 'unknown_error',
    code: e.code || e.status || e.statusCode,
    raw: typeof e.toString === 'function' ? String(e).slice(0, 500) : undefined,
  };
}

/**
 * Registra um evento de auditoria de contrato.
 * Best-effort: erros internos do log apenas vão para console.
 */
export async function logContractEvent(payload: ContractAuditPayload): Promise<void> {
  const ts = new Date().toISOString();
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* ignore */
  }

  const isFailure = !!payload.error;
  const errorInfo = isFailure ? normalizeError(payload.error) : undefined;

  const enrichedDetails: Record<string, unknown> = {
    ...(payload.details || {}),
    ts,
    ...(errorInfo ? { error: errorInfo } : {}),
  };

  // 1. contract_history (granular)
  try {
    await sb.from('contract_history').insert({
      contract_id: payload.contractId,
      action: payload.action,
      old_status: payload.oldStatus ?? null,
      new_status: payload.newStatus ?? null,
      version: payload.version ?? null,
      performed_by: userId,
      details: enrichedDetails,
    });
  } catch (e) {
    console.warn('[contractAudit] contract_history insert failed', e);
  }

  // 2. audit_logs (transversal) — somente se houver usuário autenticado (RLS exige)
  if (userId) {
    try {
      await sb.from('audit_logs').insert({
        user_id: userId,
        action: `contract.${payload.action}`,
        entity_type: 'contract',
        entity_id: payload.contractId,
        details: {
          old_status: payload.oldStatus ?? null,
          new_status: payload.newStatus ?? null,
          version: payload.version ?? null,
          failure: isFailure,
          ...enrichedDetails,
        },
      });
    } catch (e) {
      console.warn('[contractAudit] audit_logs insert failed', e);
    }
  }
}
