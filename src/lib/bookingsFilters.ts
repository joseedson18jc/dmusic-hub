import { BOOKING_STAGES } from '@/hooks/useBookings';

export const STORAGE_PREFIX = 'bookings:filters:v2';
export const LEGACY_PREFIXES = ['bookings:filters:v1'] as const;
export const SCHEMA_VERSION = 2;

export type SortOption = 'data_desc' | 'data_asc';
export type ViewMode = 'tabela' | 'cartoes' | 'kanban';
export type UberFilter = 'todos' | 'com' | 'sem';
export type PageSize = 10 | 25 | 50 | 100;

export type FiltersState = {
  search: string;
  status: string;
  transporte: string;
  alimentacao: string;
  uber: UberFilter;
  sort: SortOption;
  view: ViewMode;
  page: number;
  pageSize: PageSize;
};

export const DEFAULT_FILTERS: FiltersState = {
  search: '', status: 'todos', transporte: 'todos', alimentacao: 'todos',
  uber: 'todos', sort: 'data_desc', view: 'tabela', page: 1, pageSize: 25,
};

export const TRANSPORTE_VALUES = ['todos', 'uber', 'ônibus', 'van', 'aéreo', 'carro'] as const;
export const ALIMENTACAO_VALUES = ['todos', 'inclusa', 'rider', 'dj'] as const;
export const UBER_VALUES: UberFilter[] = ['todos', 'com', 'sem'];
export const SORT_VALUES: SortOption[] = ['data_desc', 'data_asc'];
export const VIEW_VALUES: ViewMode[] = ['tabela', 'cartoes', 'kanban'];
export const PAGE_SIZE_VALUES: PageSize[] = [10, 25, 50, 100];

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickString(value: unknown, fallback: string, maxLen = 200): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLen);
}

function pickPositiveInt(value: unknown, fallback: number, max = 100000): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) return fallback;
  return n;
}

function pickPageSize(value: unknown): PageSize {
  const n = typeof value === 'number' ? value : Number(value);
  return (PAGE_SIZE_VALUES as number[]).includes(n) ? (n as PageSize) : DEFAULT_FILTERS.pageSize;
}

export function validateFilters(raw: unknown): FiltersState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FILTERS };
  const r = raw as Record<string, unknown>;
  const validStatuses = new Set<string>(['todos', ...BOOKING_STAGES.map(s => s.value)]);
  return {
    search: pickString(r.search, ''),
    status: typeof r.status === 'string' && validStatuses.has(r.status) ? r.status : 'todos',
    transporte: pickEnum(r.transporte, TRANSPORTE_VALUES as readonly string[], 'todos'),
    alimentacao: pickEnum(r.alimentacao, ALIMENTACAO_VALUES as readonly string[], 'todos'),
    uber: pickEnum(r.uber, UBER_VALUES, 'todos'),
    sort: pickEnum(r.sort, SORT_VALUES, 'data_desc'),
    view: pickEnum(r.view, VIEW_VALUES, 'tabela'),
    page: pickPositiveInt(r.page, DEFAULT_FILTERS.page),
    pageSize: pickPageSize(r.pageSize),
  };
}

export type LoadResult = {
  filters: FiltersState;
  /** 'fresh' = no data, 'ok' = loaded, 'migrated' = upgraded from legacy, 'reset' = invalid schema reset */
  source: 'fresh' | 'ok' | 'migrated' | 'reset';
};

export function loadFilters(key: string): LoadResult {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { filters: { ...DEFAULT_FILTERS }, source: 'reset' };
      }
      if (parsed && typeof parsed === 'object' && '__v' in (parsed as object) && (parsed as { __v: unknown }).__v !== SCHEMA_VERSION) {
        return { filters: { ...DEFAULT_FILTERS }, source: 'reset' };
      }
      return { filters: validateFilters(parsed), source: 'ok' };
    }
    const userSuffix = key.slice(STORAGE_PREFIX.length);
    for (const legacy of LEGACY_PREFIXES) {
      const legacyRaw = localStorage.getItem(`${legacy}${userSuffix}`);
      if (legacyRaw) {
        try {
          const validated = validateFilters(JSON.parse(legacyRaw));
          localStorage.removeItem(`${legacy}${userSuffix}`);
          return { filters: validated, source: 'migrated' };
        } catch { /* ignore */ }
      }
    }
    return { filters: { ...DEFAULT_FILTERS }, source: 'fresh' };
  } catch {
    return { filters: { ...DEFAULT_FILTERS }, source: 'reset' };
  }
}

export function serializeFilters(state: FiltersState): string {
  return JSON.stringify({ __v: SCHEMA_VERSION, ...state });
}
