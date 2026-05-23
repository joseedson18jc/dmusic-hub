import type { PageSize } from './bookingsFilters';

export function computeTotalPages(totalCount: number, pageSize: PageSize): number {
  if (totalCount <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/** Clamps the requested page into [1, totalPages]. */
export function clampPage(page: number, totalCount: number, pageSize: PageSize): number {
  const totalPages = computeTotalPages(totalCount, pageSize);
  if (!Number.isFinite(page) || page < 1) return 1;
  if (page > totalPages) return totalPages;
  return Math.floor(page);
}

export function paginate<T>(items: T[], page: number, pageSize: PageSize): T[] {
  const safe = clampPage(page, items.length, pageSize);
  return items.slice((safe - 1) * pageSize, safe * pageSize);
}

/** Returns true when any "list-affecting" filter has changed and pagination should reset to page 1. */
export function shouldResetPage(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const keys = ['search', 'status', 'transporte', 'alimentacao', 'uber', 'sort'] as const;
  return keys.some(k => prev[k] !== next[k]);
}
