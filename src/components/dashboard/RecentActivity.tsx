import { forwardRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Briefcase,
  DollarSign,
  FileSignature,
  CheckSquare,
  Users,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RecentActivity — timeline lateral mostrando os últimos eventos cruzando
 * bookings / financial / contracts / tasks. Cada item tem ícone por tipo,
 * descrição curta, e timestamp relativo ("há 5 min").
 *
 * Ordenação é por `created_at` desc, top N (default 8). A timeline tem um
 * "rail" vertical com dots coloridos (igual ao padrão de Audit Logs).
 */

export type ActivityType = 'booking' | 'financial' | 'contract' | 'task' | 'producer';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  amount?: number;
  at: string; // ISO date string
}

/**
 * Cada tipo carrega o nome do token (sem `hsl(...)`) pra que possamos compor
 * `hsl(<token>)` ou `hsl(<token> / 0.12)` corretamente. Substituir o último
 * `)` por ` / α)` é frágil em `hsl(var(--x))` porque o `.replace(')')` pega o
 * primeiro fechamento (do `var()`), resultando em CSS inválido.
 */
const TYPE_META: Record<ActivityType, { Icon: LucideIcon; tokenVar: string; label: string }> = {
  booking:    { Icon: Briefcase,      tokenVar: 'var(--primary)', label: 'Booking' },
  financial:  { Icon: DollarSign,     tokenVar: 'var(--success)', label: 'Financeiro' },
  contract:   { Icon: FileSignature,  tokenVar: 'var(--info)',    label: 'Contrato' },
  task:       { Icon: CheckSquare,    tokenVar: 'var(--warning)', label: 'Tarefa' },
  producer:   { Icon: Users,          tokenVar: 'var(--violet)',  label: 'Produtor' },
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export interface RecentActivityProps {
  items: ActivityItem[];
  limit?: number;
  emptyHint?: string;
  /**
   * Callback opcional para navegação contextual ao clicar num item.
   * Quando setado, cada linha vira um `<button>` keyboard-accessible.
   * O consumer recebe o item completo e decide o destino (ex.: `navigate('/bookings/' + item.id)`).
   */
  onItemClick?: (item: ActivityItem) => void;
  className?: string;
}

export const RecentActivity = forwardRef<HTMLDivElement, RecentActivityProps>(function RecentActivity(
  { items, limit = 8, emptyHint = 'Sem atividade recente.', onItemClick, className },
  ref,
) {
  const sorted = [...items]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <div ref={ref} className={cn('text-center py-8 px-4', className)}>
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative px-4 py-3', className)}>
      {/* Vertical rail */}
      <div className="absolute left-[27px] top-3 bottom-3 w-px bg-border/50" aria-hidden />

      <ol className="space-y-3">
        {sorted.map((item) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.Icon;
          const colorSolid = `hsl(${meta.tokenVar})`;
          const colorTint = `hsl(${meta.tokenVar} / 0.12)`;
          const interactive = !!onItemClick;
          const handleActivate = () => onItemClick?.(item);
          const handleKey = (e: React.KeyboardEvent<HTMLLIElement>) => {
            if (!interactive) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate();
            }
          };

          return (
            <li
              key={item.id}
              className={cn(
                'relative pl-10 rounded-md transition-colors',
                interactive &&
                  'cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary -mx-1 px-1 py-0.5',
              )}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${meta.label}: ${item.title}` : undefined}
              onClick={interactive ? handleActivate : undefined}
              onKeyDown={interactive ? handleKey : undefined}
            >
              <span
                className="absolute left-[12px] top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: colorSolid,
                }}
                aria-hidden
              >
                <Icon className="h-2.5 w-2.5" style={{ color: colorSolid }} />
              </span>
              <div className="min-w-0 pr-5">
                <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-mini text-muted-foreground flex-wrap">
                  <span
                    className="px-1.5 rounded uppercase tracking-wider text-nano font-mono"
                    style={{
                      color: colorSolid,
                      backgroundColor: colorTint,
                    }}
                  >
                    {meta.label}
                  </span>
                  {item.detail && <span className="truncate">{item.detail}</span>}
                  {item.amount !== undefined && (
                    <span className="font-mono tabular-nums">{fmt(item.amount)}</span>
                  )}
                  <span className="ml-auto whitespace-nowrap tabular-nums">
                    {formatDistanceToNow(new Date(item.at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
              {interactive && (
                <ChevronRight
                  className="absolute right-1 top-2.5 h-3.5 w-3.5 text-muted-foreground/40"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
});
