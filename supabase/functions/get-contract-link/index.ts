import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contract_id, expires_in } = await req.json();
    if (!contract_id || typeof contract_id !== "string") {
      return new Response(JSON.stringify({ error: "contract_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ttl = Math.min(
      Math.max(Number(expires_in) || 60 * 60 * 24 * 30, 60),
      60 * 60 * 24 * 365,
    );

    // User-scoped client to enforce RLS on contracts table read
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: contract, error: cErr } = await userClient
      .from("contracts")
      .select("id, file_path, template_name")
      .eq("id", contract_id)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!contract) {
      return new Response(JSON.stringify({ error: "not_found_or_forbidden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contract.file_path) {
      return new Response(JSON.stringify({ error: "no_file_attached" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role to sign URL (contracts bucket is private)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: signed, error: signErr } = await admin.storage
      .from("contracts")
      .createSignedUrl(contract.file_path, ttl);

    if (signErr) throw signErr;

    return new Response(
      JSON.stringify({
        url: signed?.signedUrl ?? null,
        path: contract.file_path,
        expires_in: ttl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});