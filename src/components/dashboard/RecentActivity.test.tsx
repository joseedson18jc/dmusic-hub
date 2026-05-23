import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentActivity, type ActivityItem } from './RecentActivity';

const baseItems: ActivityItem[] = [
  {
    id: '1',
    type: 'booking',
    title: 'Booking confirmado — Festival Neon',
    detail: 'Yara · 22/06',
    amount: 12800,
    at: '2026-01-01T10:00:00Z',
  },
  {
    id: '2',
    type: 'financial',
    title: 'Pagamento recebido — Acme Eventos',
    detail: 'sinal',
    amount: 6400,
    at: '2026-01-03T10:00:00Z',
  },
];

describe('RecentActivity — smoke', () => {
  it('renders all items when list is non-empty', () => {
    render(<RecentActivity items={baseItems} />);
    expect(screen.getByText('Booking confirmado — Festival Neon')).toBeInTheDocument();
    expect(screen.getByText('Pagamento recebido — Acme Eventos')).toBeInTheDocument();
  });

  it('renders the type chip with the corresponding label', () => {
    render(<RecentActivity items={baseItems} />);
    expect(screen.getByText('Booking')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
  });

  it('renders BRL-formatted amount when provided', () => {
    render(<RecentActivity items={[baseItems[1]]} />);
    // Intl pt-BR BRL for 6400 = "R$ 6.400"
    expect(screen.getByText(/R\$\s*6\.400/)).toBeInTheDocument();
  });

  it('shows emptyHint when items is empty', () => {
    render(<RecentActivity items={[]} emptyHint="Nada acontecendo" />);
    expect(screen.getByText('Nada acontecendo')).toBeInTheDocument();
  });

  it('respects the limit prop', () => {
    const many: ActivityItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`,
      type: 'task',
      title: `Task ${i}`,
      at: new Date(2026, 0, 1, i).toISOString(),
    }));
    render(<RecentActivity items={many} limit={3} />);
    // Newest 3 by date: 11, 10, 9
    expect(screen.getByText('Task 11')).toBeInTheDocument();
    expect(screen.getByText('Task 10')).toBeInTheDocument();
    expect(screen.getByText('Task 9')).toBeInTheDocument();
    expect(screen.queryByText('Task 8')).toBeNull();
  });

  it('sorts items by date descending (newest first)', () => {
    render(<RecentActivity items={baseItems} />);
    const titles = screen.getAllByText(/Booking confirmado|Pagamento recebido/);
    // Jan 3 (Pagamento) before Jan 1 (Booking)
    expect(titles[0].textContent).toMatch(/Pagamento/);
    expect(titles[1].textContent).toMatch(/Booking/);
  });
});

describe('RecentActivity — onItemClick (P1.4)', () => {
  it('does not render role=button when onItemClick is omitted', () => {
    render(<RecentActivity items={baseItems} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders each row as role=button when onItemClick is provided', () => {
    const onItemClick = vi.fn();
    render(<RecentActivity items={baseItems} onItemClick={onItemClick} />);
    expect(screen.getAllByRole('button')).toHaveLength(baseItems.length);
  });

  it('calls onItemClick with the full item on click', () => {
    const onItemClick = vi.fn();
    render(<RecentActivity items={baseItems} onItemClick={onItemClick} />);
    const firstRow = screen.getAllByRole('button')[0];
    fireEvent.click(firstRow);
    expect(onItemClick).toHaveBeenCalledOnce();
    // Newest item is "Pagamento recebido" (Jan 3)
    expect(onItemClick.mock.calls[0][0].title).toMatch(/Pagamento/);
  });

  it('activates on Enter/Space keypress (keyboard a11y)', () => {
    const onItemClick = vi.fn();
    render(<RecentActivity items={baseItems} onItemClick={onItemClick} />);
    const firstRow = screen.getAllByRole('button')[0];
    fireEvent.keyDown(firstRow, { key: 'Enter' });
    fireEvent.keyDown(firstRow, { key: ' ' });
    expect(onItemClick).toHaveBeenCalledTimes(2);
  });
});
