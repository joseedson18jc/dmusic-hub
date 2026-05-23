import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadialProgress } from './RadialProgress';

describe('RadialProgress — smoke', () => {
  it('renders 2 SVG circles (track + progress arc)', () => {
    const { container } = render(<RadialProgress value={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('renders displayValue node when provided', () => {
    render(<RadialProgress value={75} displayValue="3/4" />);
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('renders the optional label beneath the center value', () => {
    render(<RadialProgress value={50} label="Meta" />);
    expect(screen.getByText('Meta')).toBeInTheDocument();
  });

  it('clamps value > 100 without throwing (visual cap only)', () => {
    const { container } = render(<RadialProgress value={200} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('clamps value < 0 to 0 without throwing', () => {
    const { container } = render(<RadialProgress value={-50} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('size prop drives the SVG width/height', () => {
    const { container } = render(<RadialProgress value={50} size={140} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('140');
    expect(svg?.getAttribute('height')).toBe('140');
  });

  it('uses the tone token color for the progress arc stroke', () => {
    const { container } = render(<RadialProgress value={50} tone="success" />);
    const arcs = container.querySelectorAll('circle');
    // Second circle is the progress arc (track is first)
    expect(arcs[1].getAttribute('stroke')).toBe('hsl(var(--success))');
  });
});
