import { describe, it, expect } from 'vitest';
import { detectDJConflict, buildConflictMap, type BookingForConflict } from './djConflicts';

const make = (over: Partial<BookingForConflict>): BookingForConflict => ({
  id: 'b-' + Math.random().toString(36).slice(2, 8),
  dj_id: 'dj-1',
  data_evento: '2026-06-15',
  hora_inicio: '22:00:00',
  hora_fim: '23:30:00',
  cidade: 'São Paulo',
  status: 'confirmado',
  ...over,
});

describe('detectDJConflict — overlap (mesmo DJ, mesmo intervalo)', () => {
  it('detecta sobreposição exata', () => {
    const a = make({ id: 'a' });
    const b = make({ id: 'b' });
    const r = detectDJConflict(a, [a, b]);
    expect(r.type).toBe('overlap');
    expect(r.other?.id).toBe('b');
  });

  it('detecta sobreposição parcial', () => {
    const a = make({ id: 'a', hora_inicio: '22:00:00', hora_fim: '23:30:00' });
    const b = make({ id: 'b', hora_inicio: '23:00:00', hora_fim: '00:30:00' });
    expect(detectDJConflict(a, [a, b]).type).toBe('overlap');
  });

  it('NÃO sinaliza overlap se o status do outro for fechado_perdido', () => {
    const a = make({ id: 'a' });
    const b = make({ id: 'b', status: 'fechado_perdido' });
    expect(detectDJConflict(a, [a, b]).type).toBe('none');
  });

  it('NÃO conflita com DJ diferente', () => {
    const a = make({ id: 'a', dj_id: 'dj-1' });
    const b = make({ id: 'b', dj_id: 'dj-2' });
    expect(detectDJConflict(a, [a, b]).type).toBe('none');
  });
});

describe('detectDJConflict — travel-time entre cidades', () => {
  it('SP 22h → Rio 02h+1d = conflito (gap < 8h required)', () => {
    const sp = make({
      id: 'sp',
      data_evento: '2026-06-15',
      hora_inicio: '22:00:00',
      hora_fim: '23:30:00',
      cidade: 'São Paulo',
    });
    const rio = make({
      id: 'rio',
      data_evento: '2026-06-16',
      hora_inicio: '02:00:00',
      hora_fim: '04:00:00',
      cidade: 'Rio de Janeiro',
    });
    const r = detectDJConflict(sp, [sp, rio]);
    expect(r.type).toBe('travel');
    expect(r.requiredBufferHours).toBe(8);
    expect(r.actualBufferHours).toBeLessThan(8);
    expect(r.message).toMatch(/deslocamento/i);
  });

  it('Mesma cidade D 22h → D+1 02h = OK (gap > 1h required)', () => {
    const a = make({
      id: 'a',
      data_evento: '2026-06-15',
      hora_inicio: '22:00:00',
      hora_fim: '23:30:00',
      cidade: 'São Paulo',
    });
    const b = make({
      id: 'b',
      data_evento: '2026-06-16',
      hora_inicio: '02:00:00',
      hora_fim: '04:00:00',
      cidade: 'São Paulo',
    });
    expect(detectDJConflict(a, [a, b]).type).toBe('none');
  });

  it('Mesma cidade D 22h → D+1 00:30 = conflito (gap 1h, mas required também 1h — OK)', () => {
    const a = make({
      id: 'a',
      data_evento: '2026-06-15',
      hora_inicio: '22:00:00',
      hora_fim: '23:30:00',
      cidade: 'São Paulo',
    });
    const b = make({
      id: 'b',
      data_evento: '2026-06-16',
      hora_inicio: '00:00:00',
      hora_fim: '01:00:00',
      cidade: 'São Paulo',
    });
    // Gap = 30min, required = 1h → travel conflict
    const r = detectDJConflict(a, [a, b]);
    expect(r.type).toBe('travel');
  });

  it('Cidades em estados diferentes (proxy: 1ª palavra muda) usa buffer 8h', () => {
    const a = make({
      id: 'a',
      data_evento: '2026-06-15',
      hora_inicio: '22:00:00',
      hora_fim: '23:30:00',
      cidade: 'Curitiba',
    });
    const b = make({
      id: 'b',
      data_evento: '2026-06-16',
      hora_inicio: '10:00:00',
      hora_fim: '12:00:00',
      cidade: 'Belo Horizonte',
    });
    const r = detectDJConflict(a, [a, b]);
    // gap ≈ 10.5h > 8h → sem conflito
    expect(r.type).toBe('none');
  });

  it('Cidade desconhecida (null) assume buffer conservador de 8h', () => {
    const a = make({ id: 'a', cidade: null, data_evento: '2026-06-15', hora_inicio: '22:00:00', hora_fim: '23:30:00' });
    const b = make({ id: 'b', cidade: 'Rio de Janeiro', data_evento: '2026-06-16', hora_inicio: '01:00:00', hora_fim: '02:00:00' });
    expect(detectDJConflict(a, [a, b]).type).toBe('travel');
  });
});

describe('buildConflictMap', () => {
  it('retorna Map só com bookings em conflito', () => {
    const a = make({ id: 'a', data_evento: '2026-06-15', hora_inicio: '22:00:00', cidade: 'SP' });
    const b = make({ id: 'b', data_evento: '2026-06-15', hora_inicio: '23:00:00', cidade: 'SP' });
    const c = make({ id: 'c', data_evento: '2026-07-15', cidade: 'SP' });
    const map = buildConflictMap([a, b, c]);
    expect(map.has('a')).toBe(true);
    expect(map.has('b')).toBe(true);
    expect(map.has('c')).toBe(false);
  });

  it('overlap tem prioridade sobre travel', () => {
    const a = make({ id: 'a', data_evento: '2026-06-15', hora_inicio: '22:00:00', cidade: 'SP' });
    const b = make({ id: 'b', data_evento: '2026-06-15', hora_inicio: '22:30:00', cidade: 'SP' }); // overlap
    const c = make({ id: 'c', data_evento: '2026-06-16', hora_inicio: '01:00:00', cidade: 'Rio' }); // travel
    const r = detectDJConflict(a, [a, b, c]);
    expect(r.type).toBe('overlap'); // overlap vence
  });
});
