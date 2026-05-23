-- =====================================================================
-- Validation function for contract_templates stored in system_settings
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validate_contract_templates(_value jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_id text;
  v_name text;
  v_html text;
  v_ids text[] := ARRAY[]::text[];
  v_id_pattern text := '^[a-z0-9_\-]{1,50}$';
BEGIN
  -- Must be a JSON array
  IF jsonb_typeof(_value) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_TEMPLATES_FORMAT: O valor de contract_templates deve ser uma lista (array) de templates.'
      USING ERRCODE = 'P0001', HINT = 'expected_array';
  END IF;

  -- Empty array is allowed (resets templates)
  IF jsonb_array_length(_value) = 0 THEN
    RETURN;
  END IF;

  -- Validate each template
  FOR v_item IN SELECT * FROM jsonb_array_elements(_value) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ITEM: Cada template deve ser um objeto JSON.'
        USING ERRCODE = 'P0001', HINT = 'expected_object';
    END IF;

    v_id   := NULLIF(btrim(COALESCE(v_item->>'id',   '')), '');
    v_name := NULLIF(btrim(COALESCE(v_item->>'name', v_item->>'nome', '')), '');
    v_html := NULLIF(btrim(COALESCE(v_item->>'html', v_item->>'html_content', '')), '');

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ID: Todo template precisa de um campo "id" não vazio.'
        USING ERRCODE = 'P0001', HINT = 'missing_id';
    END IF;

    IF v_id !~ v_id_pattern THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_ID_FORMAT: O ID "%" é inválido. Use apenas letras minúsculas, números, hífen e underscore (até 50 caracteres).', v_id
        USING ERRCODE = 'P0001', HINT = 'invalid_id_format';
    END IF;

    IF v_name IS NULL THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_NAME: O template "%" precisa de um nome não vazio.', v_id
        USING ERRCODE = 'P0001', HINT = 'missing_name';
    END IF;

    IF v_html IS NULL THEN
      RAISE EXCEPTION 'INVALID_TEMPLATE_HTML: O template "%" precisa de conteúdo HTML não vazio.', v_id
        USING ERRCODE = 'P0001', HINT = 'missing_html';
    END IF;

    IF length(v_html) > 200000 THEN
      RAISE EXCEPTION 'TEMPLATE_HTML_TOO_LARGE: O conteúdo HTML do template "%" excede 200.000 caracteres.', v_id
        USING ERRCODE = 'P0001', HINT = 'html_too_large';
    END IF;

    -- Duplicate detection
    IF v_id = ANY(v_ids) THEN
      RAISE EXCEPTION 'DUPLICATE_TEMPLATE_ID: O ID "%" está duplicado na lista de templates.', v_id
        USING ERRCODE = 'P0001', HINT = 'duplicate_id';
    END IF;

    v_ids := array_append(v_ids, v_id);
  END LOOP;
END;
$$;

-- =====================================================================
-- Trigger on system_settings: validate when key = 'contract_templates'
-- =====================================================================
CREATE OR REPLACE FUNCTION public.system_settings_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.key = 'contract_templates' THEN
    PERFORM public.validate_contract_templates(NEW.value);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_settings_validate ON public.system_settings;
CREATE TRIGGER trg_system_settings_validate
  BEFORE INSERT OR UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.system_settings_validate();

-- =====================================================================
-- RPC: safe upsert of a single contract template (admins only)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.upsert_contract_template(
  _id text,
  _name text,
  _html text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current jsonb;
  v_new_list jsonb;
  v_template jsonb;
  v_found boolean := false;
  v_item jsonb;
  v_acc jsonb := '[]'::jsonb;
BEGIN
  -- Authorization: only admins / super_admins
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Apenas administradores podem alterar templates de contrato.'
      USING ERRCODE = '42501';
  END IF;

  v_template := jsonb_build_object(
    'id',   _id,
    'name', _name,
    'html', _html,
    'updated_at', to_jsonb(now())
  );

  -- Validate single item by wrapping in an array
  PERFORM public.validate_contract_templates(jsonb_build_array(
    jsonb_build_object('id', _id, 'name', _name, 'html', _html)
  ));

  SELECT value INTO v_current
    FROM public.system_settings
   WHERE key = 'contract_templates'
   FOR UPDATE;

  IF v_current IS NULL THEN
    v_new_list := jsonb_build_array(v_template);
    INSERT INTO public.system_settings (key, value, description, updated_by)
    VALUES ('contract_templates', v_new_list, 'Templates de contrato disponíveis', auth.uid());
  ELSE
    -- Replace if id exists, else append
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_current) LOOP
      IF (v_item->>'id') = _id THEN
        v_acc := v_acc || jsonb_build_array(v_template);
        v_found := true;
      ELSE
        v_acc := v_acc || jsonb_build_array(v_item);
      END IF;
    END LOOP;

    IF NOT v_found THEN
      v_acc := v_acc || jsonb_build_array(v_template);
    END IF;

    -- Final list will be re-validated by trigger (catches duplicates / format)
    UPDATE public.system_settings
       SET value = v_acc,
           updated_by = auth.uid(),
           updated_at = now()
     WHERE key = 'contract_templates';

    v_new_list := v_acc;
  END IF;

  RETURN v_new_list;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_contract_template(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_contract_template(text, text, text) TO authenticated;