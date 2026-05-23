/**
 * DJ booking conflict detection — específico de agência de DJ.
 *
 * Detecta:
 *  1. Mesma data, mesmo DJ → CONFLICT_OVERLAP (já existia, agora formalizado)
 *  2. Datas próximas (D-1 ou D+1) onde o tempo de deslocamento entre cidades
 *     é incompatível com a hora do evento → CONFLICT_TRAVEL
 *
 * Por que isso é DJ-mgmt-specific:
 *  Booker fecha um show 22h sexta em SP, e outro 02h sábado no Rio.
 *  No papel, são datas diferentes. Na prática, é impossível — voo entre SP-Rio
 *  + check-in + transfer = mínimo 4-5h. O DJ chega atrasado ou perde um show.
 *
 * Heurística do travel-time (sem chamar API de mapas):
 *  - Mesma cidade (ignore case, normalizado): 1h de buffer
 *  - Mesmo estado (proxy: 2 primeiras palavras coincidem): 4h
 *  - Cidades distintas: 8h (cobre voo doméstico + ground)
 *
 * Esse buffer é conservador de propósito — falso-positivo aceitável.
 * Falso-negativo (não detectar conflito real) é o que dói.
 */

export type ConflictType =
  | 'overlap'        // mesmo DJ, mesma data
  | 'travel'         // mesmo DJ, datas adjacentes, tempo de deslocamento insuficiente
  | 'none';

export interface BookingForConflict {
  id: string;
  dj_id: string | null;
  data_evento: string | null;  // YYYY-MM-DD
  hora_inicio?: string | null; // HH:MM:SS
  hora_fim?: string | null;
  cidade?: string | null;
  status?: string;
}

export interface ConflictResult {
  type: ConflictType;
  other?: BookingForConflict;
  /** Distância em horas necessárias entre os dois events; usado pra explicar UI. */
  requiredBufferHours?: number;
  /** Horas reais disponíveis entre o fim de um e o início do outro. */
  actualBufferHours?: number;
  message?: string;
}

/* ── Helpers ─────────────────────────────────────────────── */

function normalizeCity(c?: string | null): string {
  if (!c) return '';
  return c
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function travelBufferHours(cityA: string, cityB: string): number {
  const a = normalizeCity(cityA);
  const b = normalizeCity(cityB);
  if (!a || !b) return 8;            // cidade desconhecida — assume conservador
  if (a === b) return 1;             // mesma cidade
  // Estado proxy: 2 primeiras palavras coincidem? (ex.: "sao paulo capital" vs "sao paulo zona sul")
  const wordsA = a.split(' ').slice(0, 2).join(' ');
  const wordsB = b.split(' ').slice(0, 2).join(' ');
  if (wordsA === wordsB) return 4;   // mesmo estado/região metropolitana
  return 8;                          // cidades distintas
}

function parseDateTime(date: string | null | undefined, time: string | null | undefined): Date | null {
  if (!date) return null;
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '00:00';
  // Trata data como local; preferimos isso porque eventos têm fuso do venue.
  return new Date(`${date}T${t}:00`);
}

/**
 * Constrói o intervalo [start, end] de um booking, lidando com eventos que
 * atravessam meia-noite (ex.: 23:00 → 01:30 = end no D+1).
 * Critério: se hora_fim < hora_inicio em string, end é no dia seguinte.
 */
function bookingInterval(b: BookingForConflict): { start: Date; end: Date } | null {
  const start = parseDateTime(b.data_evento, b.hora_inicio);
  if (!start) return null;
  const endStr = b.hora_fim ?? b.hora_inicio ?? '23:59';
  const end = parseDateTime(b.data_evento, endStr);
  if (!end) return null;
  // Overnight: end menor que start (em mesma data) → adiciona 1 dia
  if (end.getTime() < start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / 3_600_000;
}

/* ── Core ──────────────────────────────────────────────── */

/**
 * Detecta conflito entre `subject` e cada item em `candidates`.
 * Retorna o conflito MAIS GRAVE (`overlap` > `travel`).
 *
 * `candidates` deve incluir o próprio booking — o algoritmo o ignora por `id`.
 * Bookings com status `fechado_perdido`/`cancelado` são ignorados.
 */
export function detectDJConflict(
  subject: BookingForConflict,
  candidates: BookingForConflict[],
): ConflictResult {
  if (!subject.dj_id || !subject.data_evento) return { type: 'none' };

  const subjInt = bookingInterval(subject);
  if (!subjInt) return { type: 'none' };
  const subjStart = subjInt.start;
  const subjEnd = subjInt.end;

  let bestOverlap: ConflictResult | null = null;
  let bestTravel: ConflictResult | null = null;

  for (const c of candidates) {
    if (c.id === subject.id) continue;
    if (c.dj_id !== subject.dj_id) continue;
    if (!c.data_evento) continue;
    if (c.status === 'fechado_perdido' || c.status === 'cancelado') continue;

    const cInt = bookingInterval(c);
    if (!cInt) continue;
    const cStart = cInt.start;
    const cEnd = cInt.end;

    // Overlap: as janelas se cruzam temporalmente
    if (subjStart < cEnd && cStart < subjEnd) {
      bestOverlap = {
        type: 'overlap',
        other: c,
        message: 'Mesmo DJ tem outro evento sobreposto neste horário.',
      };
      break; // overlap é o pior, pode sair logo
    }

    // Travel: gap entre o fim de um e o início do outro
    const earlier = cEnd < subjStart ? c : subject;
    const earlierEnd = cEnd < subjStart ? cEnd : subjEnd;
    const later = cEnd < subjStart ? subject : c;
    const laterStart = cEnd < subjStart ? subjStart : cStart;
    const gap = hoursBetween(earlierEnd, laterStart);
    const required = travelBufferHours(earlier.cidade ?? '', later.cidade ?? '');

    if (gap < required) {
      // Só registra se for o conflito mais apertado encontrado
      if (!bestTravel || (bestTravel.actualBufferHours ?? Infinity) > gap) {
        bestTravel = {
          type: 'travel',
          other: c,
          requiredBufferHours: required,
          actualBufferHours: Math.round(gap * 10) / 10,
          message: `Tempo entre eventos: ${Math.round(gap * 10) / 10}h. Necessário pelo menos ${required}h pra deslocamento entre ${earlier.cidade || '?'} → ${later.cidade || '?'}.`,
        };
      }
    }
  }

  return bestOverlap ?? bestTravel ?? { type: 'none' };
}

/**
 * Constrói um Map<bookingId, ConflictResult> rodando `detectDJConflict` em N².
 * Para listas até ~500 bookings é rápido (< 50ms). Acima disso, considerar
 * indexar por `dj_id` antes.
 */
export function buildConflictMap(bookings: BookingForConflict[]): Map<string, ConflictResult> {
  const out = new Map<string, ConflictResult>();
  for (const b of bookings) {
    const r = detectDJConflict(b, bookings);
    if (r.type !== 'none') out.set(b.id, r);
  }
  return out;
}
