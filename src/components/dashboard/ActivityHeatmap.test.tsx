import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityHeatmap } from './ActivityHeatmap';

const todayKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

describe('ActivityHeatmap — smoke', () => {
  it('renders 53 × 7 = 371 cells by default', () => {
    const { container } = render(<ActivityHeatmap data={{}} />);
    const cells = container.querySelectorAll('button[aria-label]');
    expect(cells.length).toBe(53 * 7);
  });

  it('respects the weeks prop for grid width', () => {
    const { container } = render(<ActivityHeatmap data={{}} weeks={10} />);
    const cells = container.querySelectorAll('button[aria-label]');
    expect(cells.length).toBe(10 * 7);
  });

  it('renders aggregated totals in status bar when no cell is focused', () => {
    render(<ActivityHeatmap data={{ [todayKey]: 3 }} valueLabel="evento" />);
    // Aggregated stats line includes "dias ativos"
    expect(screen.getByText(/dias ativos/)).toBeInTheDocument();
  });

  it('updates the status bar to show hovered cell info on focus', () => {
    const { container } = render(
      <ActivityHeatmap data={{ [todayKey]: 5 }} valueLabel="evento" />,
    );
    const cell = container.querySelector(
      `button[aria-label="${todayKey}: 5 eventos"]`,
    );
    expect(cell).toBeTruthy();
    fireEvent.focus(cell!);
    // Status bar now shows the value
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onCellClick with dateKey + value when a cell is clicked', () => {
    const onCellClick = vi.fn();
    const { container } = render(
      <ActivityHeatmap
        data={{ [todayKey]: 2 }}
        valueLabel="evento"
        onCellClick={onCellClick}
      />,
    );
    const cell = container.querySelector(
      `button[aria-label="${todayKey}: 2 eventos"]`,
    );
    fireEvent.click(cell!);
    expect(onCellClick).toHaveBeenCalledWith(todayKey, 2);
  });

  it('disables future cells', () => {
    // O grid termina no último sábado >= hoje. Pra garantir que tem cell de
    // futuro no grid (segunda, terça, etc.), pegamos amanhã (que sempre cai
    // antes do próximo sábado, exceto se hoje é sexta — daí é o próprio sábado).
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const { container } = render(<ActivityHeatmap data={{}} />);
    const futureCell = container.querySelector<HTMLButtonElement>(
      `button[aria-label^="${tomorrowKey}"]`,
    );
    expect(futureCell).toBeTruthy();
    expect(futureCell?.disabled).toBe(true);
  });

  it('marks today cell with a foreground ring', () => {
    const { container } = render(<ActivityHeatmap data={{}} />);
    const todayCell = container.querySelector(
      `button[aria-label^="${todayKey}"]`,
    );
    expect(todayCell?.className).toMatch(/ring-/);
  });
});
