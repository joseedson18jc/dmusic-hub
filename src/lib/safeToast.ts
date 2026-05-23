import { toast } from 'sonner';

/**
 * Erros que NÃO devem virar toast vermelho — features opcionais
 * (Stripe, WhatsApp, Google Calendar, contracts PDF) cuja edge function
 * pode não existir no projeto Supabase atual. Falham silenciosamente.
 */
const SILENT_ERROR_PATTERNS = [
  /failed to send a request to the edge function/i,
  /functionsfetcherror/i,
  /function not found/i,
  /edge function .* not deployed/i,
  /failed to fetch/i,
];

function isSilentError(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  return SILENT_ERROR_PATTERNS.some((rx) => rx.test(message));
}

/**
 * Substitui `toast.error(err.message)` por uma versão que:
 *   • Mostra toast se for erro real (de banco, validação, etc.)
 *   • Loga em console + retorna void se for erro de edge-function ausente
 *     (mantém UX limpa quando features opcionais estão desativadas)
 *
 * Uso:
 *   onError: (err: any) => safeErrorToast(err)
 */
export function safeErrorToast(err: unknown, fallbackMessage?: string): void {
  const message =
    typeof err === 'string'
      ? err
      : (err as { message?: string })?.message ?? fallbackMessage ?? 'Erro inesperado.';

  if (isSilentError(message)) {
    // eslint-disable-next-line no-console
    console.warn('[safeErrorToast] silenced edge-function error:', message);
    return;
  }
  toast.error(message);
}
