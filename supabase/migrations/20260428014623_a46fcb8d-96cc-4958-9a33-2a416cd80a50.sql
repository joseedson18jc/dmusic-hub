REVOKE ALL ON FUNCTION public.upsert_contract_template(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_contract_template(text, text, text) TO authenticated;