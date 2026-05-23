import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseKanbanColumn } from './PhaseKanbanColumn';
import { PIPELINE_PHASES } from '@/lib/bookingPhases';

describe('PhaseKanbanColumn — smoke', () => {
  const confPhase = PIPELINE_PHASES[2]; // key='conf'

  it('renders the short phase label + count badge', () => {
    render(
      <PhaseKanbanColumn phase={confPhase} count={4}>
        {null}
      </PhaseKanbanColumn>,
    );
    expect(screen.getByText(confPhase.short)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows "sem cards" empty state when no children are rendered', () => {
    render(
      <PhaseKanbanColumn phase={confPhase} count={0}>
        {null}
      </PhaseKanbanColumn>,
    );
    expect(screen.getByText('sem cards')).toBeInTheDocument();
  });

  it('renders the children when provided', () => {
    render(
      <PhaseKanbanColumn phase={confPhase} count={2}>
        <article data-testid="card-a">A</article>
        <article data-testid="card-b">B</article>
      </PhaseKanbanColumn>,
    );
    expect(screen.getByTestId('card-a')).toBeInTheDocument();
    expect(screen.getByTestId('card-b')).toBeInTheDocument();
    expect(screen.queryByText('sem cards')).toBeNull();
  });

  it('shows "Solte aqui" drop hint when isDragOver is true', () => {
    render(
      <PhaseKanbanColumn phase={confPhase} count={0} isDragOver>
        {null}
      </PhaseKanbanColumn>,
    );
    expect(screen.getByText('Solte aqui')).toBeInTheDocument();
  });

  it('fires onDrop when a drop event occurs on the drop zone', () => {
    const onDrop = vi.fn();
    const { container } = render(
      <PhaseKanbanColumn phase={confPhase} count={0} onDrop={onDrop}>
        {null}
      </PhaseKanbanColumn>,
    );
    // The drop zone is the relative div with min-h-[100px]
    const dropZone = container.querySelector('[class*="min-h-\\[100px\\]"]')
      || container.querySelector('div[class*="min-h"]');
    expect(dropZone).toBeTruthy();
    fireEvent.drop(dropZone!);
    expect(onDrop).toHaveBeenCalled();
  });

  // Nota: NÃO testamos aqui `borderTop: 2px solid hsl(var(--primary))` porque
  // o CSSStyleDeclaration do jsdom rejeita silenciosamente `var()` em shorthands
  // de borda. Isso é uma limitação do ambiente de teste, não do componente — em
  // browsers reais o token resolve normalmente. O smoke das 5 asserções acima
  // (render, count, empty state, drag-over hint, onDrop) já cobre o contrato.
});
