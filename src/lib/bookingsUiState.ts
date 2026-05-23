import { supabase } from '@/integrations/supabase/client';

export const UI_STATE_PREFIX = 'bookings:ui:v1';
const FOCUS_IDS = new Set(['bookings-search-input']);

export type UiState = {
  scrollY: number;
  focusedId: string | null;
  search: string;
};

export function loadUiState(key: string): UiState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const scrollY = typeof parsed.scrollY === 'number' && parsed.scrollY >= 0 ? parsed.scrollY : 0;
    const focusedId = typeof parsed.focusedId === 'string' && FOCUS_IDS.has(parsed.focusedId) ? parsed.focusedId : null;
    const search = typeof parsed.search === 'string' ? parsed.search.slice(0, 200) : '';
    return { scrollY, focusedId, search };
  } catch {
    return null;
  }
}

export function saveUiState(key: string, state: UiState): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function clearUiState(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

/** Logs critical filter events to audit_logs (best-effort, never throws). */
export async function auditFilterEvent(action: 'filters_migrated_v1_to_v2', details: Record<string, unknown> = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type: 'bookings_filters',
      details: { ...details, ts: new Date().toISOString(), ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null },
    });
  } catch (err) {
    console.warn('[audit] failed to log filter event', err);
  }
}
