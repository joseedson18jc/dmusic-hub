-- Adiciona colunas para controle de reenvio do contrato
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0;

-- Função RPC: incrementa atomicamente o contador de envios
-- Aplica cooldown de 60s para evitar duplicação por clique repetido
CREATE OR REPLACE FUNCTION public.contract_register_send(_contract_id uuid, _cooldown_seconds integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract record;
  v_seconds_since numeric;
BEGIN
  -- Apenas admin pode reenviar
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Apenas administradores podem reenviar contratos.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, status, last_sent_at, send_attempts
    INTO v_contract
    FROM public.contracts
   WHERE id = _contract_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.status = 'assinado' THEN
    RAISE EXCEPTION 'ALREADY_SIGNED: Contrato já assinado, reenvio não permitido.'
      USING ERRCODE = 'P0001', HINT = 'already_signed';
  END IF;

  IF v_contract.status = 'cancelado' THEN
    RAISE EXCEPTION 'CANCELLED: Contrato cancelado, reenvio não permitido.'
      USING ERRCODE = 'P0001', HINT = 'cancelled';
  END IF;

  -- Cooldown: bloqueia reenvio dentro de _cooldown_seconds
  IF v_contract.last_sent_at IS NOT NULL THEN
    v_seconds_since := EXTRACT(EPOCH FROM (now() - v_contract.last_sent_at));
    IF v_seconds_since < _cooldown_seconds THEN
      RAISE EXCEPTION 'COOLDOWN_ACTIVE: Aguarde % segundos antes de reenviar.', ceil(_cooldown_seconds - v_seconds_since)
        USING ERRCODE = 'P0001', HINT = 'cooldown';
    END IF;
  END IF;

  UPDATE public.contracts
     SET last_sent_at = now(),
         send_attempts = COALESCE(send_attempts, 0) + 1,
         updated_at = now()
   WHERE id = _contract_id;

  RETURN jsonb_build_object(
    'attempt_number', COALESCE(v_contract.send_attempts, 0) + 1,
    'last_sent_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contract_register_send(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contract_register_send(uuid, integer) TO authenticated;