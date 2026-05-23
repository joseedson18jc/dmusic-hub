import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseSummaryTile } from './PhaseSummaryTile';
import { PIPELINE_PHASES } from '@/lib/bookingPhases';

describe('PhaseSummaryTile — smoke', () => {
  const leadPhase = PIPELINE_PHASES[0]; // key='lead'

  it('renders phase label + count + statuses count', () => {
    render(<PhaseSummaryTile phase={leadPhase} count={7} />);
    expect(screen.getByText(leadPhase.label)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(`${leadPhase.statuses.length} status`)).toBeInTheDocument();
  });

  it('renders value line with default "potencial" suffix when totalValue > 0', () => {
    render(<PhaseSummaryTile phase={leadPhase} count={3} totalValue={5000} />);
    expect(screen.getByText(/potencial/)).toBeInTheDocument();
  });

  it('renders em-dash placeholder when totalValue is 0', () => {
    render(<PhaseSummaryTile phase={leadPhase} count={0} totalValue={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('does NOT render value line when totalValue is undefined', () => {
    render(<PhaseSummaryTile phase={leadPhase} count={3} />);
    expect(screen.queryByText(/potencial/)).toBeNull();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('uses custom valueLabel + formatCurrency when provided', () => {
    render(
      <PhaseSummaryTile
        phase={leadPhase}
        count={2}
        totalValue={5000}
        formatCurrency={(v) => `${v / 1000}K`}
        valueLabel="GMV"
      />,
    );
    expect(screen.getByText(/5K GMV/)).toBeInTheDocument();
  });

  it('fires onClick when the tile is clicked', () => {
    const onClick = vi.fn();
    render(<PhaseSummaryTile phase={leadPhase} count={1} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies highlight box-shadow style when highlight prop is set', () => {
    const { container } = render(
      <PhaseSummaryTile phase={leadPhase} count={1} highlight />,
    );
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('style')).toMatch(/box-shadow/);
  });
});
