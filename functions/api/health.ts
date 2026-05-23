/**
 * Cloudflare Pages Function — health endpoint (porte do Vercel Edge Function).
 *
 * URL pública: GET /api/health
 *
 * Output:
 *   {
 *     "status": "ok" | "degraded",
 *     "checks": { "supabase": "ok" | "down" },
 *     "version": "<git-sha>",
 *     "timestamp": "<ISO>"
 *   }
 *
 * Status HTTP:
 *   - 200 quando tudo "ok"
 *   - 503 (Service Unavailable) quando algum check falha
 *
 * Diferenças vs Vercel:
 *   - Cloudflare usa `onRequest` em vez de default export
 *   - Env vars vêm via `context.env` (não Deno/process)
 *   - Runtime padrão é Cloudflare Workers (Web APIs nativas)
 */

interface Env {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  CF_PAGES_COMMIT_SHA?: string;
}

async function checkSupabase(url?: string, key?: string): Promise<'ok' | 'down'> {
  if (!url || !key) return 'down';
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const supabase = await checkSupabase(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const allOk = supabase === 'ok';
  const status = allOk ? 'ok' : 'degraded';

  const body = {
    status,
    checks: { supabase },
    version: env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: allOk ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
};
