-- Dashboard summary RPC.
--
-- Why: src/pages/Index.tsx previously fetched ALL bookings, DJs, producers,
-- financial records, tasks and contracts on every dashboard load and computed
-- KPIs in JS. That doesn't scale past a few thousand rows and it ignores RLS
-- visibility (everything was fetched, then filtered).
--
-- This RPC moves the aggregation server-side. It runs as SECURITY INVOKER —
-- the caller's RLS policies decide what they can see, so a DJ-only user
-- gets numbers scoped to their own data without any extra filtering logic.
--
-- The return shape is a single JSONB row instead of multiple result sets so
-- the client only needs one round-trip and one cache key.
--
-- Idempotent: drop & recreate the function. Tables and policies are not
-- touched.

create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_revenue_types  text[] := array['receita','sinal','pagamento_final','parcela'];
  v_expense_types  text[] := array['despesa','repasse_dj','repasse_produtor','comissao','imposto'];
  v_active_status  text[] := array[
    'confirmado','planejamento','pronto_para_evento',
    'sinal_pendente','contrato_enviado','assinatura_pendente'
  ];
  v_won_status     text[] := array[
    'confirmado','planejamento','pronto_para_evento',
    'evento_realizado','fechado_ganho'
  ];
  v_today          date := current_date;
  v_horizon_30d    date := current_date + interval '30 days';

  v_revenue        numeric;
  v_expenses       numeric;
  v_overdue_count  int;
  v_active_count   int;
  v_total_bookings int;
  v_won_bookings   int;
  v_pending_tasks  int;
  v_overdue_tasks  int;
  v_dj_count       int;
  v_dj_active      int;
  v_producer_count int;
  v_contract_open  int;

  v_upcoming       jsonb;
  v_revenue_series jsonb;
  v_dj_perf        jsonb;
  v_overdue_top    jsonb;
begin
  -- Financial KPIs (paid only)
  select coalesce(sum(valor_bruto), 0)
    into v_revenue
    from financial_records
   where status = 'pago' and tipo::text = any(v_revenue_types);

  select coalesce(sum(valor_bruto), 0)
    into v_expenses
    from financial_records
   where status = 'pago' and tipo::text = any(v_expense_types);

  select count(*) into v_overdue_count
    from financial_records
   where status = 'vencido';

  -- Booking KPIs
  select count(*) into v_active_count
    from bookings where status::text = any(v_active_status);
  select count(*) into v_total_bookings from bookings;
  select count(*) into v_won_bookings from bookings where status::text = any(v_won_status);

  -- Task KPIs
  select count(*) into v_pending_tasks
    from tasks where status::text in ('a_fazer','em_andamento','atrasada');
  select count(*) into v_overdue_tasks
    from tasks where status::text = 'atrasada';

  -- Headline counts
  select count(*) into v_dj_count from djs;
  select count(*) into v_dj_active from djs where status::text = 'ativo';
  select count(*) into v_producer_count from producers;
  select count(*) into v_contract_open
    from contracts where status::text in ('rascunho','enviado');

  -- Upcoming events (next 30 days, top 5)
  select coalesce(jsonb_agg(row), '[]'::jsonb)
    into v_upcoming
    from (
      select jsonb_build_object(
        'id', b.id,
        'titulo', b.titulo,
        'data_evento', b.data_evento,
        'venue', b.venue,
        'cidade', b.cidade,
        'status', b.status,
        'fee_acordado', b.fee_acordado,
        'dj_nome', d.nome_artistico,
        'dj_foto', d.foto_url
      ) as row
      from bookings b
      left join djs d on d.id = b.dj_id
      where b.data_evento between v_today and v_horizon_30d
      order by b.data_evento asc
      limit 5
    ) t;

  -- Revenue vs expenses, last 6 months bucketed by month
  select coalesce(jsonb_agg(row order by (row->>'month_key')), '[]'::jsonb)
    into v_revenue_series
    from (
      select jsonb_build_object(
        'month_key', to_char(date_trunc('month', d), 'YYYY-MM'),
        'month',     to_char(date_trunc('month', d), 'Mon'),
        'receita',   coalesce(sum(case when fr.tipo::text = any(v_revenue_types) and fr.status::text = 'pago' then fr.valor_bruto end), 0),
        'despesa',   coalesce(sum(case when fr.tipo::text = any(v_expense_types) and fr.status::text = 'pago' then fr.valor_bruto end), 0)
      ) as row
      from generate_series(
        date_trunc('month', current_date) - interval '5 months',
        date_trunc('month', current_date),
        interval '1 month'
      ) d
      left join financial_records fr
        on date_trunc('month', coalesce(fr.data_vencimento::date, fr.created_at::date)) = d
      group by d
    ) t;

  -- DJ performance (top 5 by revenue from booking fees)
  select coalesce(jsonb_agg(row order by (row->>'revenue')::numeric desc), '[]'::jsonb)
    into v_dj_perf
    from (
      select jsonb_build_object(
        'name',     d.nome_artistico,
        'foto',     d.foto_url,
        'bookings', count(b.id),
        'revenue',  coalesce(sum(b.fee_acordado), 0)
      ) as row
      from djs d
      left join bookings b on b.dj_id = d.id
      where d.id is not null
      group by d.id, d.nome_artistico, d.foto_url
      having count(b.id) > 0
      order by coalesce(sum(b.fee_acordado), 0) desc
      limit 5
    ) t;

  -- Overdue payments (top 10)
  select coalesce(jsonb_agg(row), '[]'::jsonb)
    into v_overdue_top
    from (
      select jsonb_build_object(
        'id',            f.id,
        'descricao',     f.descricao,
        'tipo',          f.tipo,
        'valor_bruto',   f.valor_bruto,
        'data_vencimento', f.data_vencimento
      ) as row
      from financial_records f
      where f.status = 'vencido'
      order by f.data_vencimento asc
      limit 10
    ) t;

  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'revenue',        v_revenue,
      'expenses',       v_expenses,
      'profit',         v_revenue - v_expenses,
      'active_bookings', v_active_count,
      'total_bookings', v_total_bookings,
      'won_bookings',   v_won_bookings,
      'conversion_pct', case when v_total_bookings > 0
                              then round((v_won_bookings::numeric / v_total_bookings::numeric) * 100)
                              else 0 end,
      'pending_tasks',  v_pending_tasks,
      'overdue_tasks',  v_overdue_tasks,
      'overdue_count',  v_overdue_count,
      'dj_count',       v_dj_count,
      'dj_active',      v_dj_active,
      'producer_count', v_producer_count,
      'contract_open',  v_contract_open
    ),
    'upcoming',        v_upcoming,
    'revenue_series',  v_revenue_series,
    'dj_performance',  v_dj_perf,
    'overdue_top',     v_overdue_top,
    'generated_at',    now()
  );
end;
$$;

comment on function public.get_dashboard_summary() is
  'Returns a single JSONB blob with all dashboard KPIs and panels. Runs as SECURITY INVOKER so the caller''s RLS policies determine visibility.';

-- Anon callers don't get this; only authenticated users.
revoke all on function public.get_dashboard_summary() from public;
grant execute on function public.get_dashboard_summary() to authenticated;
