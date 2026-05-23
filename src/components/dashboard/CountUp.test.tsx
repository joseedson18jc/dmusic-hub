import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CountUp } from './CountUp';

describe('CountUp — smoke', () => {
  it('eventually renders the target value', async () => {
    const { container } = render(<CountUp to={42} duration={50} />);
    await waitFor(
      () => {
        expect(container.textContent).toBe('42');
      },
      { timeout: 500 },
    );
  });

  it('applies the format function to the displayed value', async () => {
    const { container } = render(
      <CountUp to={1234} duration={50} format={(v) => `R$ ${Math.round(v)}`} />,
    );
    await waitFor(
      () => {
        expect(container.textContent).toBe('R$ 1234');
      },
      { timeout: 500 },
    );
  });

  it('starts from the `from` value when specified', () => {
    const { container } = render(<CountUp to={100} from={50} duration={5000} />);
    // First render before RAF tick — value should still be `from`
    const initial = Number(container.textContent);
    expect(initial).toBeGreaterThanOrEqual(50);
    expect(initial).toBeLessThanOrEqual(100);
  });

  it('renders a <span> wrapper with the className applied', () => {
    const { container } = render(
      <CountUp to={1} duration={10} className="text-primary" />,
    );
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-primary');
  });

  it('uses pt-BR locale grouping when format is omitted', async () => {
    const { container } = render(<CountUp to={1234} duration={20} />);
    await waitFor(
      () => {
        // pt-BR groups with dot: "1.234"
        expect(container.textContent).toBe('1.234');
      },
      { timeout: 500 },
    );
  });
});
