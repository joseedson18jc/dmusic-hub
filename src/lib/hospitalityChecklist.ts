import { supabase } from '@/integrations/supabase/client';

/**
 * Hospitality checklist — gerador de tarefas operacionais para um booking.
 *
 * Por que isso é DJ-mgmt-specific:
 * Cada show confirmado tem ~6-8 itens recorrentes (hotel, transfer ida,
 * transfer volta, jantar, camarim, soundcheck, contato local, NFSe). Sem
 * checklist, alguma coisa esquece. E quando esquece, DJ não chega no palco
 * ou paga do bolso e a agência reembolsa depois.
 *
 * Solução: ao confirmar booking (status → `confirmado`), botão "Gerar
 * checklist" cria N tarefas pré-configuradas vinculadas ao booking, com
 * prazos relativos à `data_evento`.
 *
 * Cada item é uma `task` na tabela `tasks` — reuso da infra existente
 * (kanban, prioridades, atrasada-detection, notificações). Zero schema
 * change.
 */

const sb = supabase as any;

export interface HospitalityItem {
  title: string;
  description?: string;
  /** Quantos dias ANTES da data_evento. Negativo = depois do evento (ex.: NFSe = +3). */
  daysBeforeEvent: number;
  priority: 'alta' | 'media' | 'baixa';
  /** Quando este item entra no fluxo (categoria operacional). */
  category: 'logistica' | 'tecnico' | 'fiscal' | 'comunicacao';
}

/**
 * Template padrão — aplicado em TODOS os bookings confirmados.
 * Pode ser customizado por agência no futuro (`system_settings` table).
 */
export const DEFAULT_HOSPITALITY_TEMPLATE: HospitalityItem[] = [
  {
    title: 'Reservar hotel',
    description: 'Confirmar disponibilidade + check-in/out + extras (academia, frigobar).',
    daysBeforeEvent: 14,
    priority: 'alta',
    category: 'logistica',
  },
  {
    title: 'Comprar transfer ida (aeroporto → hotel/venue)',
    description: 'Voo + carro privativo. Confirmar motorista 24h antes.',
    daysBeforeEvent: 7,
    priority: 'alta',
    category: 'logistica',
  },
  {
    title: 'Comprar transfer volta (hotel → aeroporto)',
    description: 'Coordenar com horário de voo. Idealmente 3h antes do gate.',
    daysBeforeEvent: 7,
    priority: 'alta',
    category: 'logistica',
  },
  {
    title: 'Confirmar rider técnico com o venue',
    description: 'Enviar PDF do rider + checklist de equipamento. Pedir foto do palco montado.',
    daysBeforeEvent: 7,
    priority: 'alta',
    category: 'tecnico',
  },
  {
    title: 'Confirmar camarim + hospitality rider',
    description: 'Bebidas, comida, toalhas, água, condicionado, espelho, iluminação.',
    daysBeforeEvent: 3,
    priority: 'media',
    category: 'logistica',
  },
  {
    title: 'Enviar contato local de emergência ao DJ',
    description: 'Nome + WhatsApp do produtor local + responsável técnico.',
    daysBeforeEvent: 2,
    priority: 'media',
    category: 'comunicacao',
  },
  {
    title: 'Lembrete final pro DJ (D-1)',
    description: 'WhatsApp com: hora soundcheck, hora set, voo, hotel, transfer, contato local.',
    daysBeforeEvent: 1,
    priority: 'alta',
    category: 'comunicacao',
  },
  {
    title: 'Emitir NFSe + enviar ao produtor',
    description: 'Pós-evento. Coletar dados fiscais com produtor antes do evento ajuda.',
    daysBeforeEvent: -3, // 3 dias DEPOIS do evento
    priority: 'media',
    category: 'fiscal',
  },
];

export interface GenerateHospitalityArgs {
  booking_id: string;
  dj_id: string | null;
  producer_id: string | null;
  data_evento: string; // YYYY-MM-DD
  /** Customiza o template (default: DEFAULT_HOSPITALITY_TEMPLATE). */
  template?: HospitalityItem[];
  /** Quem está criando (audit). */
  created_by?: string;
}

export interface GenerateHospitalityResult {
  inserted: number;
  skipped: number;
  taskIds: string[];
}

/**
 * Cria as tarefas do checklist no banco. Idempotente: usa um marker no
 * `descricao` (`[hospitality:<booking_id>]`) pra detectar tarefas já criadas
 * pra esse booking e evitar duplicação.
 */
export async function generateHospitalityChecklist(
  args: GenerateHospitalityArgs,
): Promise<GenerateHospitalityResult> {
  const template = args.template ?? DEFAULT_HOSPITALITY_TEMPLATE;
  const eventDate = new Date(args.data_evento + 'T12:00:00');

  // Step 1: descobre tarefas já existentes pra esse booking
  const marker = `[hospitality:${args.booking_id}]`;
  const { data: existing = [] } = await sb
    .from('tasks')
    .select('id, titulo, descricao')
    .ilike('descricao', `%${marker}%`);

  const existingTitles = new Set<string>(
    (existing as Array<{ titulo: string }>).map((t) => t.titulo),
  );

  // Step 2: monta payload das tarefas faltantes
  const toInsert = template
    .filter((item) => !existingTitles.has(item.title))
    .map((item) => {
      const prazo = new Date(eventDate);
      prazo.setDate(prazo.getDate() - item.daysBeforeEvent);
      return {
        titulo: item.title,
        descricao: `${item.description ?? ''}\n\n${marker} · categoria: ${item.category}`.trim(),
        status: 'a_fazer',
        prioridade: item.priority,
        prazo: prazo.toISOString(),
        booking_id: args.booking_id,
        dj_id: args.dj_id,
        producer_id: args.producer_id,
        ...(args.created_by ? { created_by: args.created_by } : {}),
      };
    });

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: template.length, taskIds: [] };
  }

  const { data, error } = await sb.from('tasks').insert(toInsert).select('id');
  if (error) throw error;

  return {
    inserted: data?.length ?? 0,
    skipped: template.length - (data?.length ?? 0),
    taskIds: (data ?? []).map((t: { id: string }) => t.id),
  };
}

/**
 * Conta quantas tarefas de hospitality ainda estão pendentes pra um booking.
 * Útil pra mostrar badge "3 itens pendentes" no booking row.
 */
export async function getHospitalityProgress(booking_id: string): Promise<{
  total: number;
  done: number;
  overdue: number;
}> {
  const marker = `[hospitality:${booking_id}]`;
  const { data = [] } = await sb
    .from('tasks')
    .select('status, prazo')
    .ilike('descricao', `%${marker}%`);

  const items = data as Array<{ status: string; prazo: string | null }>;
  const total = items.length;
  const done = items.filter((t) => t.status === 'concluida').length;
  const now = Date.now();
  const overdue = items.filter(
    (t) => t.status !== 'concluida' && t.prazo && new Date(t.prazo).getTime() < now,
  ).length;
  return { total, done, overdue };
}
