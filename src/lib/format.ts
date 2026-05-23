import { format as fnsFormat, formatDistanceToNow as fnsDistance, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateInput = Date | string | number | null | undefined;

function toDate(v: DateInput): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = v.length === 10 ? new Date(v + "T12:00:00") : parseISO(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "27 de abril de 2026" */
export function formatDate(v: DateInput, fallback = "—"): string {
  const d = toDate(v);
  return d ? fnsFormat(d, "PPP", { locale: ptBR }) : fallback;
}

/** "27/04/2026" */
export function formatShortDate(v: DateInput, fallback = "—"): string {
  const d = toDate(v);
  return d ? fnsFormat(d, "dd/MM/yyyy", { locale: ptBR }) : fallback;
}

/** "27 abr 2026, 14:30" */
export function formatDateTime(v: DateInput, fallback = "—"): string {
  const d = toDate(v);
  return d ? fnsFormat(d, "dd MMM yyyy, HH:mm", { locale: ptBR }) : fallback;
}

/** "14:30" */
export function formatTime(v: DateInput, fallback = "—"): string {
  const d = toDate(v);
  return d ? fnsFormat(d, "HH:mm", { locale: ptBR }) : fallback;
}

/** "há 3 dias" */
export function formatRelative(v: DateInput, fallback = "—"): string {
  const d = toDate(v);
  return d ? fnsDistance(d, { addSuffix: true, locale: ptBR }) : fallback;
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});
const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const NUM = new Intl.NumberFormat("pt-BR");
const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** R$ 1.234,56 */
export function formatCurrency(v: number | string | null | undefined, fallback = "—"): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || !isFinite(n as number)) return fallback;
  return BRL.format(n as number);
}

/** R$ 12,3 mil — para KPIs */
export function formatCurrencyCompact(v: number | string | null | undefined, fallback = "—"): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || !isFinite(n as number)) return fallback;
  return BRL_COMPACT.format(n as number);
}

/** 1.234 */
export function formatNumber(v: number | string | null | undefined, fallback = "—"): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || !isFinite(n as number)) return fallback;
  return NUM.format(n as number);
}

/** 0.123 → "12,3%" */
export function formatPercent(v: number | string | null | undefined, fallback = "—"): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || !isFinite(n as number)) return fallback;
  return PCT.format(n as number);
}
