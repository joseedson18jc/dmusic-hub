import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Mint a contract signing token.
 *
 * Why this exists: previously the client (Contratos.tsx) generated the token
 * via crypto.randomUUID() and inserted the contract_signatures row directly.
 * That has three problems:
 *
 *  1. The client knows the token before the row is committed — so a malicious
 *     admin could pre-mint tokens and pivot them to other contracts.
 *  2. Token entropy and shape are entirely client-decided.
 *  3. There is no server-side audit point distinct from the row insert.
 *
 * This function moves the operation server-side: only authenticated admins
 * can call it, the token is generated using Deno's CSPRNG, and the
 * contract row is read with the user-scoped client first so RLS still
 * enforces "you can only mint for contracts you can read".
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_TTL_DAYS = 30;
const MAX_TTL_DAYS = 90;

function generateToken(): string {
  // 32 bytes = 256 bits, base64url-encoded → ~43 chars, URL-safe.
  // Plenty of entropy and short enough to fit in a sharable URL.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client — RLS applies. Used for the contract read so we
    // never let a caller mint a token for a contract they cannot see.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-only — minting a sign token is a privileged operation that
    // creates a public, unauthenticated entry point into contract data.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const contractId = body?.contract_id;
    if (!contractId || typeof contractId !== "string") {
      return new Response(JSON.stringify({ error: "contract_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TTL clamp — 1 day floor, 90 day ceiling. Default 30.
    const ttlDays = Math.min(
      Math.max(Number(body?.ttl_days) || DEFAULT_TTL_DAYS, 1),
      MAX_TTL_DAYS,
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      .toISOString();

    // RLS-gated read: if the caller cannot see this contract, they can't
    // mint a token for it (defense in depth on top of the admin check).
    const { data: contract, error: contractErr } = await userClient
      .from("contracts")
      .select("id, status")
      .eq("id", contractId)
      .maybeSingle();

    if (contractErr) {
      return new Response(JSON.stringify({ error: contractErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contract) {
      return new Response(JSON.stringify({ error: "contract_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contract.status === "assinado" || contract.status === "cancelado") {
      return new Response(JSON.stringify({
        error: "contract_terminal",
        message: "Contrato já está em estado final (assinado/cancelado).",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateToken();

    const { error: insertErr } = await admin.from("contract_signatures").insert({
      contract_id: contractId,
      token,
      expires_at: expiresAt,
      created_by: user.id,
    });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      token,
      expires_at: expiresAt,
      ttl_days: ttlDays,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
