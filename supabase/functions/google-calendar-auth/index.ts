import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;
const SCOPES = "https://www.googleapis.com/auth/calendar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Step 1: Start OAuth flow — returns the Google auth URL
  if (req.method === "POST") {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub;

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", userId as string);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Step 2: Google OAuth callback — exchange code for tokens
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(`<html><body><h2>Erro: ${error}</h2><p>Feche esta janela.</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(`<html><body><h2>Parâmetros inválidos</h2></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(`<html><body><h2>Erro ao obter tokens</h2><pre>${JSON.stringify(tokens)}</pre></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert tokens
      const { error: dbError } = await supabaseAdmin
        .from("google_calendar_tokens")
        .upsert({
          user_id: state,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }, { onConflict: "user_id" });

      if (dbError) {
        return new Response(`<html><body><h2>Erro ao salvar tokens</h2><pre>${dbError.message}</pre></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response(
        `<html><body><h2>✅ Google Calendar conectado!</h2><p>Pode fechar esta janela.</p><script>window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (err) {
      return new Response(`<html><body><h2>Erro</h2><pre>${String(err)}</pre></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
