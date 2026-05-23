import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateFilters, loadFilters, serializeFilters,
  DEFAULT_FILTERS, STORAGE_PREFIX, SCHEMA_VERSION,
} from './bookingsFilters';

describe('validateFilters', () => {
  it('returns DEFAULT_FILTERS for null', () => {
    expect(validateFilters(null)).toEqual(DEFAULT_FILTERS);
  });

  it('returns DEFAULT_FILTERS for undefined', () => {
    expect(validateFilters(undefined)).toEqual(DEFAULT_FILTERS);
  });

  it('returns DEFAULT_FILTERS for primitives', () => {
    expect(validateFilters('string')).toEqual(DEFAULT_FILTERS);
    expect(validateFilters(42)).toEqual(DEFAULT_FILTERS);
    expect(validateFilters(true)).toEqual(DEFAULT_FILTERS);
  });

  it('falls back to "todos" for unknown enum values', () => {
    const result = validateFilters({
      transporte: 'foguete',
      alimentacao: 'pizza',
      uber: 'maybe',
      sort: 'random',
      view: 'mosaic',
    });
    expect(result.transporte).toBe('todos');
    expect(result.alimentacao).toBe('todos');
    expect(result.uber).toBe('todos');
    expect(result.sort).toBe('data_desc');
    expect(result.view).toBe('tabela');
  });

  it('accepts valid enum values', () => {
    const result = validateFilters({
      transporte: 'uber',
      alimentacao: 'rider',
      uber: 'com',
      sort: 'data_asc',
      view: 'kanban',
    });
    expect(result.transporte).toBe('uber');
    expect(result.alimentacao).toBe('rider');
    expect(result.uber).toBe('com');
    expect(result.sort).toBe('data_asc');
    expect(result.view).toBe('kanban');
  });

  it('coerces non-string search to empty', () => {
    expect(validateFilters({ search: 123 }).search).toBe('');
    expect(validateFilters({ search: null }).search).toBe('');
    expect(validateFilters({ search: { x: 1 } }).search).toBe('');
  });

  it('truncates very long search strings', () => {
    const long = 'a'.repeat(500);
    expect(validateFilters({ search: long }).search.length).toBe(200);
  });

  it('falls back unknown status to "todos"', () => {
    expect(validateFilters({ status: 'invalid_status' }).status).toBe('todos');
  });

  it('accepts known status', () => {
    expect(validateFilters({ status: 'confirmado' }).status).toBe('confirmado');
  });

  it('falls back invalid page to default', () => {
    expect(validateFilters({ page: 0 }).page).toBe(DEFAULT_FILTERS.page);
    expect(validateFilters({ page: -5 }).page).toBe(DEFAULT_FILTERS.page);
    expect(validateFilters({ page: 1.5 }).page).toBe(DEFAULT_FILTERS.page);
    expect(validateFilters({ page: 'abc' }).page).toBe(DEFAULT_FILTERS.page);
  });

  it('accepts valid page', () => {
    expect(validateFilters({ page: 7 }).page).toBe(7);
  });

  it('falls back invalid pageSize to default', () => {
    expect(validateFilters({ pageSize: 17 }).pageSize).toBe(DEFAULT_FILTERS.pageSize);
    expect(validateFilters({ pageSize: 'big' }).pageSize).toBe(DEFAULT_FILTERS.pageSize);
  });

  it('accepts allowed pageSize', () => {
    expect(validateFilters({ pageSize: 50 }).pageSize).toBe(50);
  });
});

describe('loadFilters', () => {
  const key = `${STORAGE_PREFIX}:test-user`;

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns fresh + DEFAULT when nothing stored', () => {
    const r = loadFilters(key);
    expect(r.source).toBe('fresh');
    expect(r.filters).toEqual(DEFAULT_FILTERS);
  });

  it('returns reset on corrupted JSON', () => {
    localStorage.setItem(key, '{not valid json');
    const r = loadFilters(key);
    expect(r.source).toBe('reset');
    expect(r.filters).toEqual(DEFAULT_FILTERS);
  });

  it('returns reset on schema version mismatch', () => {
    localStorage.setItem(key, JSON.stringify({ __v: 999, view: 'kanban' }));
    const r = loadFilters(key);
    expect(r.source).toBe('reset');
    expect(r.filters).toEqual(DEFAULT_FILTERS);
  });

  it('returns ok on valid stored data', () => {
    localStorage.setItem(key, JSON.stringify({ __v: SCHEMA_VERSION, view: 'kanban', sort: 'data_asc' }));
    const r = loadFilters(key);
    expect(r.source).toBe('ok');
    expect(r.filters.view).toBe('kanban');
    expect(r.filters.sort).toBe('data_asc');
  });

  it('migrates from v1 legacy key and removes it', () => {
    const legacyKey = `bookings:filters:v1:test-user`;
    localStorage.setItem(legacyKey, JSON.stringify({ view: 'cartoes', uber: 'com' }));
    const r = loadFilters(key);
    expect(r.source).toBe('migrated');
    expect(r.filters.view).toBe('cartoes');
    expect(r.filters.uber).toBe('com');
    expect(localStorage.getItem(legacyKey)).toBeNull();
  });

  it('sanitizes invalid values from legacy key during migration', () => {
    const legacyKey = `bookings:filters:v1:test-user`;
    localStorage.setItem(legacyKey, JSON.stringify({ view: 'aliens', sort: 'xyz' }));
    const r = loadFilters(key);
    expect(r.source).toBe('migrated');
    expect(r.filters.view).toBe('tabela');
    expect(r.filters.sort).toBe('data_desc');
  });
});

describe('serializeFilters', () => {
  it('includes schema version', () => {
    const out = JSON.parse(serializeFilters(DEFAULT_FILTERS));
    expect(out.__v).toBe(SCHEMA_VERSION);
    expect(out.view).toBe(DEFAULT_FILTERS.view);
  });
});
