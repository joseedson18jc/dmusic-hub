import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StatusPill,
  bookingStatusToPill,
  financialStatusToPill,
  contractStatusToPill,
  djStatusToPill,
  producerStatusToPill,
} from '@/components/StatusPill';

describe('StatusPill — smoke', () => {
  it('renders children as the label', () => {
    render(<StatusPill variant="pago">Pago</StatusPill>);
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('applies tone-derived classes for visual differentiation', () => {
    const { container } = render(<StatusPill variant="pago">Pago</StatusPill>);
    const span = container.querySelector('span');
    // Should reference success token (any of bg/text/border)
    expect(span?.className).toMatch(/success/);
  });

  it('renders icon slot when provided', () => {
    render(
      <StatusPill variant="pago" icon={<svg data-testid="pill-icon" />}>
        Pago
      </StatusPill>,
    );
    expect(screen.getByTestId('pill-icon')).toBeInTheDocument();
  });

  it('size prop adjusts padding/font (sm < md < lg)', () => {
    // sm usa text-micro (10px), lg usa text-xs (12px) — tokens da P2.1.
    const { rerender, container } = render(
      <StatusPill variant="pago" size="sm">x</StatusPill>,
    );
    expect(container.querySelector('span')?.className).toMatch(/text-micro/);
    rerender(<StatusPill variant="pago" size="lg">x</StatusPill>);
    expect(container.querySelector('span')?.className).toMatch(/text-xs/);
  });
});

describe('StatusPill — status mapper helpers', () => {
  it('bookingStatusToPill maps DB enum → variant + label', () => {
    const r = bookingStatusToPill('contrato_enviado');
    expect(r.variant).toBe('confirmacao');
    expect(r.label).toBe('Contrato enviado');
  });

  it('bookingStatusToPill falls back to neutral for unknown status', () => {
    const r = bookingStatusToPill('asdfg');
    expect(r.variant).toBe('neutral');
  });

  it('financialStatusToPill collapses em_disputa → vencido variant', () => {
    expect(financialStatusToPill('em_disputa').variant).toBe('vencido');
    expect(financialStatusToPill('em_disputa').label).toBe('Em disputa');
  });

  it('contractStatusToPill returns label for known status', () => {
    expect(contractStatusToPill('assinado')).toEqual({ variant: 'assinado', label: 'Assinado' });
  });

  it('djStatusToPill localizes status to PT-BR', () => {
    expect(djStatusToPill('ativo').label).toBe('Disponível');
    expect(djStatusToPill('pausa').label).toBe('Em estúdio');
    expect(djStatusToPill('indisponivel').label).toBe('Em turnê');
  });

  it('producerStatusToPill maps prospeccao to info variant', () => {
    expect(producerStatusToPill('prospeccao').variant).toBe('prospeccao');
  });
});

describe('StatusPill — interactive prop (P2.3)', () => {
  it('does not set role=button when interactive is omitted', () => {
    render(<StatusPill variant="pago">Pago</StatusPill>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sets role=button + tabIndex=0 when interactive=true', () => {
    render(
      <StatusPill variant="pago" interactive onClick={() => {}}>
        Pago
      </StatusPill>,
    );
    const pill = screen.getByRole('button');
    expect(pill).toBeInTheDocument();
    expect(pill.getAttribute('tabindex')).toBe('0');
  });

  it('applies cursor-pointer + hover-brightness classes when interactive', () => {
    const { container } = render(
      <StatusPill variant="pago" interactive>
        Pago
      </StatusPill>,
    );
    const span = container.querySelector('span');
    expect(span?.className).toMatch(/cursor-pointer/);
    expect(span?.className).toMatch(/hover:brightness-110/);
  });

  it('fires onClick when interactive pill is clicked', () => {
    const onClick = vi.fn();
    render(
      <StatusPill variant="pago" interactive onClick={onClick}>
        Pago
      </StatusPill>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('activates onClick via Enter and Space keys (keyboard a11y)', () => {
    const onClick = vi.fn();
    render(
      <StatusPill variant="pago" interactive onClick={onClick}>
        Pago
      </StatusPill>,
    );
    const pill = screen.getByRole('button');
    fireEvent.keyDown(pill, { key: 'Enter' });
    fireEvent.keyDown(pill, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does NOT activate onClick on irrelevant keys', () => {
    const onClick = vi.fn();
    render(
      <StatusPill variant="pago" interactive onClick={onClick}>
        Pago
      </StatusPill>,
    );
    const pill = screen.getByRole('button');
    fireEvent.keyDown(pill, { key: 'a' });
    fireEvent.keyDown(pill, { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('preserves consumer-provided role/tabIndex over interactive defaults', () => {
    render(
      <StatusPill variant="pago" interactive role="link" tabIndex={-1}>
        Pago
      </StatusPill>,
    );
    const pill = screen.getByRole('link');
    expect(pill.getAttribute('tabindex')).toBe('-1');
  });
});
