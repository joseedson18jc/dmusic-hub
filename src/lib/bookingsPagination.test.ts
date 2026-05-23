import { describe, it, expect } from 'vitest';
import { computeTotalPages, clampPage, paginate, shouldResetPage } from './bookingsPagination';

describe('computeTotalPages', () => {
  it('returns 1 when there are no items', () => {
    expect(computeTotalPages(0, 25)).toBe(1);
  });
  it('rounds up partial pages', () => {
    expect(computeTotalPages(26, 25)).toBe(2);
    expect(computeTotalPages(51, 25)).toBe(3);
  });
  it('handles exact multiples', () => {
    expect(computeTotalPages(50, 25)).toBe(2);
  });
});

describe('clampPage', () => {
  it('clamps when current page exceeds totalPages after the list shrinks', () => {
    // started on page 5 (with 100 items @ 25 = 4 pages), list shrinks to 30 items (=2 pages)
    expect(clampPage(5, 30, 25)).toBe(2);
  });
  it('keeps the page when valid', () => {
    expect(clampPage(2, 60, 25)).toBe(2);
  });
  it('falls back to page 1 for invalid input', () => {
    expect(clampPage(0, 60, 25)).toBe(1);
    expect(clampPage(-3, 60, 25)).toBe(1);
    expect(clampPage(NaN, 60, 25)).toBe(1);
  });
  it('clamps to 1 when the list becomes empty', () => {
    expect(clampPage(7, 0, 25)).toBe(1);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 57 }, (_, i) => i + 1);
  it('returns the correct slice for page 1', () => {
    expect(paginate(items, 1, 25)).toEqual(items.slice(0, 25));
  });
  it('returns the correct slice for the last page', () => {
    expect(paginate(items, 3, 25)).toEqual(items.slice(50, 57));
  });
  it('clamps when the requested page is too high', () => {
    expect(paginate(items, 99, 25)).toEqual(items.slice(50, 57));
  });
});

describe('shouldResetPage', () => {
  const base = {
    search: '', status: 'todos', transporte: 'todos',
    alimentacao: 'todos', uber: 'todos', sort: 'data_desc',
    view: 'tabela', pageSize: 25,
  };
  it('returns true when search changes', () => {
    expect(shouldResetPage(base, { ...base, search: 'fest' })).toBe(true);
  });
  it('returns true when status changes', () => {
    expect(shouldResetPage(base, { ...base, status: 'confirmado' })).toBe(true);
  });
  it('returns true when sort changes', () => {
    expect(shouldResetPage(base, { ...base, sort: 'data_asc' })).toBe(true);
  });
  it('returns false when only view mode changes', () => {
    expect(shouldResetPage(base, { ...base, view: 'kanban' })).toBe(false);
  });
  it('returns false when only pageSize changes (handled separately)', () => {
    expect(shouldResetPage(base, { ...base, pageSize: 50 })).toBe(false);
  });
  it('returns false when nothing changes', () => {
    expect(shouldResetPage(base, { ...base })).toBe(false);
  });
});
