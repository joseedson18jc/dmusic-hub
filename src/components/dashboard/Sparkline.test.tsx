import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline — smoke', () => {
  it('renders an SVG with a path when data has 2+ points', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('path')).toBeTruthy();
  });

  it('renders a flat fallback line when data has < 2 points', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('line')).toBeTruthy();
    expect(container.querySelector('path')).toBeNull();
  });

  it('renders an endpoint dot for non-empty data', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('omits the area fill when filled=false', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} filled={false} />);
    // No gradient defs when not filled
    expect(container.querySelector('linearGradient')).toBeNull();
  });

  it('uses the tone token for stroke color', () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} tone="warning" filled={false} />,
    );
    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('hsl(var(--warning))');
  });

  it('handles all-zero data without crashing (range fallback)', () => {
    const { container } = render(<Sparkline data={[0, 0, 0, 0]} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('path')).toBeTruthy();
  });
});
