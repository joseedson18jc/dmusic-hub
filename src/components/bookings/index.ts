/**
 * Barrel — `@/components/bookings` reexporta os componentes do módulo
 * de bookings (pipeline + form + badges legados).
 *
 * Os componentes do pipeline visual (`PhaseSummaryTile`, `PhaseKanbanColumn`)
 * são os usuários canônicos das pipeline phases (`src/lib/bookingPhases.ts`)
 * e devem ser usados em qualquer página que mostre o kanban ou tiles de fase.
 *
 * Convenção:
 *   import { PhaseSummaryTile, PhaseKanbanColumn } from '@/components/bookings';
 */

export { PhaseSummaryTile } from './PhaseSummaryTile';
export type { PhaseSummaryTileProps } from './PhaseSummaryTile';

export { PhaseKanbanColumn } from './PhaseKanbanColumn';
export type { PhaseKanbanColumnProps } from './PhaseKanbanColumn';

export { BookingForm, SUPPORTED_TIMEZONES } from './BookingForm';

/**
 * Legacy — reexporta apenas para callsites que ainda não migraram para
 * `StatusPill` + `bookingStatusToPill`. Use `@/components/StatusPill` em
 * código novo.
 */
export { BookingStatusBadge, PriorityIndicator } from './BookingBadges';
