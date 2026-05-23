import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from './BookingForm';

/**
 * Captura o último payload enviado em `.from('bookings').insert(payload)`
 * e em `.update(payload)` para que possamos validar se os campos novos
 * do Financeiro são persistidos corretamente.
 */
const insertSpy = vi.fn();
const updateSpy = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  const ok = (data: any = []) => Promise.resolve({ data, error: null });

  const fromMock = (table: string) => {
    if (table === 'djs') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ok([{ id: 'dj-1', nome_artistico: 'DJ Spark' }]),
          }),
        }),
      };
    }
    if (table === 'producers') {
      return {
        select: () => ({
          order: () => ok([{ id: 'prod-1', nome: 'Produtora X', empresa: 'Empresa X' }]),
        }),
      };
    }
    if (table === 'bookings') {
      return {
        insert: (payload: any) => {
          insertSpy(payload);
          return ok(null);
        },
        update: (payload: any) => {
          updateSpy(payload);
          return { eq: () => ok(null) };
        },
      };
    }
    return { select: () => ok([]) };
  };

  return {
    supabase: { from: vi.fn(fromMock) },
  };
});

// Hook de system settings (usado para event_types) — devolve lista vazia.
vi.mock('@/hooks/useSystemSettings', () => ({
  useSystemSetting: () => ({ data: [] }),
}));

// sonner toast — silencia notificações no teste.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderForm(props: Partial<React.ComponentProps<typeof BookingForm>> = {}) {
  return render(
    <BookingForm
      open={true}
      onOpenChange={() => {}}
      onSuccess={() => {}}
      {...props}
    />,
  );
}

describe('BookingForm — aba Financeiro (campos novos)', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    updateSpy.mockClear();
  });

  it('renderiza os 5 campos novos na aba Financeiro', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));

    expect(await screen.findByLabelText(/data do sinal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data pagamento restante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^transporte$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/carro por aplicativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^alimentação$/i)).toBeInTheDocument();
  });

  it('envia os campos novos no payload de insert para o Supabase', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderForm({ onSuccess });

    // Aguarda os selects assíncronos (djs/producers) carregarem.
    await waitFor(() => {
      // Título obrigatório
      expect(screen.getByLabelText(/evento\/cube/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Teste');

    // Seleciona o produtor (Radix Select usa role combobox).
    const comboboxes = screen.getAllByRole('combobox');
    await user.click(comboboxes[0]); // Produtor
    await user.click(await screen.findByRole('option', { name: /produtora x/i }));

    // Vai para Financeiro
    await user.click(screen.getByRole('tab', { name: /financeiro/i }));

    // Preenche os campos novos
    fireEvent.change(await screen.findByLabelText(/data do sinal/i), {
      target: { value: '2026-05-10' },
    });
    fireEvent.change(screen.getByLabelText(/data pagamento restante/i), {
      target: { value: '2026-06-15' },
    });
    await user.type(screen.getByLabelText(/^transporte$/i), 'Aéreo');
    fireEvent.change(screen.getByLabelText(/carro por aplicativo/i), {
      target: { value: '150.50' },
    });
    await user.type(screen.getByLabelText(/^alimentação$/i), 'Inclusa no rider');

    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));

    const payload = insertSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      titulo: 'Show Teste',
      producer_id: 'prod-1',
      data_sinal: '2026-05-10',
      data_pagamento: '2026-06-15',
      transporte: 'Aéreo',
      reembolso_uber: 150.5,
      alimentacao: 'Inclusa no rider',
    });
  });

  it('preserva valores existentes ao editar (update inclui campos novos)', async () => {
    const user = userEvent.setup();
    const booking = {
      id: 'book-1',
      titulo: 'Show Existente',
      producer_id: 'prod-1',
      data_sinal: '2026-04-01',
      data_pagamento: '2026-05-01',
      transporte: 'Ônibus',
      reembolso_uber: 80,
      alimentacao: 'Por conta do DJ',
      fee_acordado: 1000,
      comissao: 15,
      sinal: 500,
    };

    renderForm({ booking });

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));

    const payload = updateSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      data_sinal: '2026-04-01',
      data_pagamento: '2026-05-01',
      transporte: 'Ônibus',
      reembolso_uber: 80,
      alimentacao: 'Por conta do DJ',
    });
  });

  it('envia null quando campos opcionais ficam vazios', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Mínimo');

    const comboboxes = screen.getAllByRole('combobox');
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole('option', { name: /produtora x/i }));

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));
    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));

    const payload = insertSpy.mock.calls[0][0];
    expect(payload.data_sinal).toBeNull();
    expect(payload.data_pagamento).toBeNull();
    expect(payload.transporte).toBeNull();
    expect(payload.alimentacao).toBeNull();
  });
});

describe('BookingForm — validação cruzada de datas financeiras', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    updateSpy.mockClear();
  });

  async function selectProducer(user: ReturnType<typeof userEvent.setup>) {
    const comboboxes = screen.getAllByRole('combobox');
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole('option', { name: /produtora x/i }));
  }

  it('bloqueia quando pagamento restante é antes do sinal', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Inválido');
    await selectProducer(user);

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));

    fireEvent.change(await screen.findByLabelText(/data do sinal/i), {
      target: { value: '2026-06-10' },
    });
    fireEvent.change(screen.getByLabelText(/data pagamento restante/i), {
      target: { value: '2026-06-05' }, // antes do sinal
    });

    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    expect(
      await screen.findByText(/pagamento restante não pode ser anterior à data do sinal/i),
    ).toBeInTheDocument();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('bloqueia quando data do sinal é depois da data do evento', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Sinal Tarde');
    await selectProducer(user);

    // Define data do evento na aba Geral
    fireEvent.change(screen.getByLabelText(/^data$/i), {
      target: { value: '2026-06-10' },
    });

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));
    fireEvent.change(await screen.findByLabelText(/data do sinal/i), {
      target: { value: '2026-07-01' }, // depois do evento
    });

    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    expect(
      await screen.findByText(/data do sinal deve ser igual ou anterior à data do evento/i),
    ).toBeInTheDocument();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('aceita quando pagamento é igual ou depois do sinal', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Válido');
    await selectProducer(user);

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));

    // Preenche fee/sinal pra evitar warnings auxiliares
    fireEvent.change(await screen.findByLabelText(/fee acordado/i), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByLabelText(/^sinal/i), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText(/data do sinal/i), {
      target: { value: '2026-06-01' },
    });
    fireEvent.change(screen.getByLabelText(/data pagamento restante/i), {
      target: { value: '2026-06-15' },
    });

    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(/pagamento restante não pode ser anterior/i),
    ).not.toBeInTheDocument();
  });

  it('alerta quando intervalo entre sinal e pagamento é maior que 2 anos', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/evento\/cube/i), 'Show Intervalo');
    await selectProducer(user);

    await user.click(screen.getByRole('tab', { name: /financeiro/i }));
    fireEvent.change(await screen.findByLabelText(/data do sinal/i), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/data pagamento restante/i), {
      target: { value: '2030-01-01' }, // > 2 anos depois
    });

    await user.click(screen.getByRole('button', { name: /criar booking/i }));

    expect(
      await screen.findByText(/intervalo entre sinal e pagamento maior que 2 anos/i),
    ).toBeInTheDocument();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});