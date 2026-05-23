/**
 * Vercel Serverless Function — health endpoint.
 *
 * URL pública: GET /api/health
 *
 * Output:
 *   {
 *     "status": "ok" | "degraded" | "down",
 *     "checks": { "supabase": "ok" | "down" },
 *     "version": "<git-sha>",
 *     "uptime_seconds": <serverless lambda warm time>,
 *     "timestamp": "<ISO>"
 *   }
 *
 * Status HTTP:
 *   - 200 quando tudo "ok"
 *   - 503 (Service Unavailable) quando algum check falha
 *
 * Use isto como endpoint do UptimeRobot/BetterStack:
 *   - URL: https://dmusichub-main.vercel.app/api/health
 *   - Method: GET
 *   - Alert condition: status != 200
 *   - Interval: 5 min (free tier típico)
 *
 * Vercel cobra ms de execução, então o handler é leve: 1 fetch + JSON.
 */

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.VITE_RELEASE ??
  'unknown';

const START_TIME = Date.now();

async function checkSupabase(): Promise<'ok' | 'down'> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 'down';
  try {
    // Hit `/auth/v1/settings` — endpoint público que aceita anon key (200 OK).
    // O endpoint `/rest/v1/` exige service_role e retorna 401 com anon key.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export default async function handler(_req: Request): Promise<Response> {
  const supabase = await checkSupabase();
  const allOk = supabase === 'ok';
  const status = allOk ? 'ok' : 'degraded';
  const body = {
    status,
    checks: { supabase },
    version: VERSION,
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: allOk ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
