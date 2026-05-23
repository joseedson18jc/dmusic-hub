import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiStat, KpiCard } from '@/components/KpiCard';
import { Headphones } from 'lucide-react';

describe('KpiStat — smoke', () => {
  it('renders label, value, and icon', () => {
    render(<KpiStat icon={Headphones} label="DJs ativos" value={12} tone="primary" />);
    expect(screen.getByText('DJs ativos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('applies tone-derived bg/border classes to the icon wrapper', () => {
    const { container } = render(
      <KpiStat icon={Headphones} label="x" value={1} tone="success" />,
    );
    // The icon wrapper has `bg-success/10` + `border-success/20`
    const iconWrap = container.querySelector('[class*="bg-success"]');
    expect(iconWrap).toBeTruthy();
  });

  it('emphasizes value with tone color when emphasizeValue is set', () => {
    const { container } = render(
      <KpiStat
        icon={Headphones}
        label="x"
        value={5}
        tone="destructive"
        emphasizeValue
      />,
    );
    // The value <p> should pick up the destructive color class
    expect(container.innerHTML).toMatch(/text-destructive/);
  });

  it('renders the optional hint line when provided', () => {
    render(
      <KpiStat
        icon={Headphones}
        label="x"
        value={1}
        tone="primary"
        hint="↑ 12% vs ontem"
      />,
    );
    expect(screen.getByText('↑ 12% vs ontem')).toBeInTheDocument();
  });

  it('accepts ReactNode for value (string, number, JSX)', () => {
    render(
      <KpiStat
        icon={Headphones}
        label="Receita"
        value="R$ 124K"
        tone="success"
      />,
    );
    expect(screen.getByText('R$ 124K')).toBeInTheDocument();
  });
});

describe('KpiCard — composable subcomponents', () => {
  it('renders Header label and Value together', () => {
    render(
      <KpiCard>
        <KpiCard.Header label="Receita" />
        <KpiCard.Value>R$ 124K</KpiCard.Value>
      </KpiCard>,
    );
    expect(screen.getByText('Receita')).toBeInTheDocument();
    expect(screen.getByText('R$ 124K')).toBeInTheDocument();
  });

  it('Header renders delta + sign when delta is provided', () => {
    render(
      <KpiCard>
        <KpiCard.Header label="Receita" delta={12} />
      </KpiCard>,
    );
    expect(screen.getByText(/\+12%/)).toBeInTheDocument();
  });

  it('Footer + Sparkline + Progress mount inside KpiCard without errors', () => {
    const { container } = render(
      <KpiCard tone="success">
        <KpiCard.Header label="x" />
        <KpiCard.Value>1</KpiCard.Value>
        <KpiCard.Sparkline data={[1, 2, 3, 4]} tone="success" />
        <KpiCard.Progress value={50} tone="success" />
        <KpiCard.Footer>foo</KpiCard.Footer>
      </KpiCard>,
    );
    expect(container.querySelector('svg')).toBeTruthy(); // sparkline
    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  it('renders as <a> when asLink is provided', () => {
    const { container } = render(
      <KpiCard asLink="/financeiro">
        <KpiCard.Value>1</KpiCard.Value>
      </KpiCard>,
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/financeiro');
  });
});
