import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonutChart, type DonutSlice } from './DonutChart';

const sample: DonutSlice[] = [
  { id: 'a', label: 'Cachês',    value: 70, color: 'hsl(var(--primary))' },
  { id: 'b', label: 'Comissões', value: 30, color: 'hsl(var(--info))' },
];

describe('DonutChart — smoke', () => {
  it('renders track + N slice circles (1 + slices count)', () => {
    const { container } = render(<DonutChart data={sample} />);
    const circles = container.querySelectorAll('circle');
    // 1 track + 2 slices
    expect(circles.length).toBe(1 + sample.length);
  });

  it('renders "sem dados" placeholder when total is 0', () => {
    render(<DonutChart data={[]} />);
    expect(screen.getByText('sem dados')).toBeInTheDocument();
  });

  it('renders centerLabel and centerValue when nothing is hovered', () => {
    render(
      <DonutChart data={sample} centerLabel="Total" centerValue="R$ 100" />,
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('R$ 100')).toBeInTheDocument();
  });

  it('applies stroke-dasharray such that slice lengths sum to circumference', () => {
    const { container } = render(<DonutChart data={sample} size={200} thickness={20} />);
    const r = (200 - 20) / 2;
    const cir = 2 * Math.PI * r;
    const sliceEls = container.querySelectorAll('circle[stroke-dasharray]');
    let totalDash = 0;
    sliceEls.forEach((el) => {
      const dash = el.getAttribute('stroke-dasharray') || '';
      const first = parseFloat(dash.split(' ')[0]);
      totalDash += first;
    });
    expect(Math.round(totalDash)).toBe(Math.round(cir));
  });

  it('formatValue customizes the center display', () => {
    render(
      <DonutChart
        data={sample}
        centerLabel="Total"
        formatValue={(v) => `${v}!`}
      />,
    );
    // Total of sample = 100, formatted as "100!"
    expect(screen.getByText('100!')).toBeInTheDocument();
  });
});
