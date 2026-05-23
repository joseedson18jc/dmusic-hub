import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Não autenticado");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Fetch checkout sessions, payment links, and charges in parallel
    const [sessions, paymentLinks, charges] = await Promise.all([
      stripe.checkout.sessions.list({ limit: 50, expand: ["data.customer"] }),
      stripe.paymentLinks.list({ limit: 50 }),
      stripe.charges.list({ limit: 50 }),
    ]);

    const items = [];

    const safeDate = (ts: number | undefined | null) => {
      if (!ts) return new Date().toISOString();
      try { return new Date(ts * 1000).toISOString(); } catch { return new Date().toISOString(); }
    };

    // Map checkout sessions
    for (const s of sessions.data) {
      items.push({
        id: s.id,
        tipo: "checkout",
        descricao: s.metadata?.description || "Checkout Session",
        customer_email: s.customer_details?.email || s.customer_email || null,
        valor: (s.amount_total || 0) / 100,
        moeda: s.currency?.toUpperCase() || "BRL",
        status: s.payment_status === "paid" ? "pago" : s.status === "expired" ? "vencido" : "pendente",
        url: s.url,
        created_at: safeDate(s.created),
        metadata: s.metadata,
      });
    }

    // Map payment links
    for (const pl of paymentLinks.data) {
      items.push({
        id: pl.id,
        tipo: "link",
        descricao: pl.metadata?.description || "Link de Pagamento",
        customer_email: null,
        valor: 0,
        moeda: "BRL",
        status: pl.active ? "ativo" : "inativo",
        url: pl.url,
        created_at: safeDate(pl.created),
        metadata: pl.metadata,
      });
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg, items: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
