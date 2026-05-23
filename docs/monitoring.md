# Monitoring & Observability

Setup das 3 camadas de observability:
1. **Error tracking** — Sentry (frontend errors, performance)
2. **Uptime monitoring** — UptimeRobot/BetterStack pingando `/api/health`
3. **Real User Monitoring** — Vercel Analytics (vem grátis com o plano Pro)

---

## 1. Sentry — error tracking + replay

### Setup (uma vez)

1. Cria projeto em https://sentry.io/ → tipo **React**
2. Copia o **DSN** (formato `https://<key>@<org>.ingest.sentry.io/<id>`)
3. Adiciona como env var no Vercel:
   ```bash
   bunx vercel env add VITE_SENTRY_DSN production   # cola o DSN
   bunx vercel env add VITE_SENTRY_DSN preview      # mesmo DSN (ou separar)
   ```
4. Re-deploy: `bun run deploy`

### O que captura (auto)

- ✅ Todos os erros JS não capturados (`window.onerror`, promise rejections)
- ✅ Erros dentro de `ErrorBoundary` (precisa envolver a app)
- ✅ Performance: LCP, INP, CLS, navegação por rota
- ✅ Session replay: 100% das sessões com erro, 5% das normais (configurável)

### O que NÃO captura por padrão

- ❌ Erros de extensão de browser (`ResizeObserver`, etc) — filtrados via `ignoreErrors`
- ❌ Cancelamentos de react-query (`AbortError`) — barulho conhecido
- ❌ User PII (email, IP) — `sendDefaultPii: false`

### Reportar erros manualmente

Em catch blocks onde o user pode continuar mas vale logar:

```ts
import { reportError } from '@/lib/sentry';

try {
  await someRiskyOperation();
} catch (err) {
  reportError(err, { context: 'BookingForm.submit', bookingId });
  toast.error('Não foi possível salvar. Tente de novo.');
}
```

### Ajustar volume

Em `src/lib/sentry.ts`:
- `tracesSampleRate: 0.1` — 10% das transações. Subir para 0.5 em dev. Diminuir pra 0.01 se for ficar caro.
- `replaysSessionSampleRate: 0.05` — 5% das sessões. **Replay é caro** — limita aqui se cobrarem.
- `replaysOnErrorSampleRate: 1.0` — 100% das sessões com erro. **Sempre 1.0** — esse é o ROI principal.

---

## 2. Uptime monitoring

Endpoint pronto: **https://dmusichub-main.vercel.app/api/health**

Retorna JSON:
```json
{
  "status": "ok",
  "checks": { "supabase": "ok" },
  "version": "abc1234",
  "uptime_seconds": 12345,
  "timestamp": "2026-05-14T10:30:00Z"
}
```

HTTP 200 quando tudo OK, **503** quando algum check falha. Esse é o sinal que o monitor usa.

### Opção A — UptimeRobot (free, 50 monitors)

🔗 https://uptimerobot.com/signup

1. **Add new monitor** → Type: **HTTP(s)**
2. **URL**: `https://dmusichub-main.vercel.app/api/health`
3. **Monitoring Interval**: 5 min (free tier máximo)
4. **HTTP Method**: GET
5. **Monitor Alert Contacts**: seu email
6. **Notifications**:
   - Down threshold: 1 ping falhou
   - Up notification: opcional

**Optional** — monitor extra do landing:
- URL: `https://dmusichub-main.vercel.app/login`
- Alert content match: page contém `DMusic` (detecta blank page bug)

### Opção B — BetterStack (free, 10 monitors, mais features)

🔗 https://betterstack.com/uptime

1. **New monitor** → HTTP
2. URL: `https://dmusichub-main.vercel.app/api/health`
3. **Check frequency**: 30s (mais agressivo que UptimeRobot)
4. **Expected status code**: 200
5. **Expected response body contains**: `"status":"ok"`
6. **Alert via**: email, Slack, PagerDuty, SMS

BetterStack tem o adicional de **status page pública** grátis — útil pra mostrar pros DJs/produtores quando algo está fora ("yeah, sabíamos, tá no nosso status page").

### O que monitorar

| URL | Por quê |
|---|---|
| `https://dmusichub-main.vercel.app/api/health` | Saúde geral (frontend serving + Supabase up) |
| `https://dmusichub-main.vercel.app/` | App carregando — pega blank page bug |
| `https://dmusichub-main.vercel.app/login` | Auth não quebrou |
| `https://ktmhxgiyvppvtmhvcerj.supabase.co/rest/v1/` | Supabase direto (independente da nossa app) |

---

## 3. Vercel Analytics (opcional, plano Pro)

Se você upgradar pro plano Pro do Vercel, ganha:
- **Web Analytics**: pageviews, top routes, devices
- **Speed Insights**: Web Vitals (LCP, INP, CLS) por rota

Setup:
```bash
bun add @vercel/analytics @vercel/speed-insights
```

E em `src/App.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// dentro do <App />:
<Analytics />
<SpeedInsights />
```

Sem o plano Pro, **Sentry** já dá Web Vitals via `browserTracingIntegration()` — não precisa duplicar.

---

## Checklist completo de observability

| Item | Status |
|---|---|
| Errors no client | ✅ Sentry instalado, init em `main.tsx` |
| Errors no server | N/A (não tem backend além de Vercel edge functions) |
| Performance Web Vitals | ✅ Via Sentry `browserTracingIntegration` |
| Session replay com erro | ✅ Via Sentry `replayIntegration` |
| Uptime check 5min | ⏳ Setar UptimeRobot/BetterStack no `/api/health` |
| Status page pública | ⏳ BetterStack free se quiser |
| Logs de Edge Functions | ✅ Vercel dashboard → Project → Logs |
| Alerts via Slack | ⏳ Configurar webhook em Sentry + UptimeRobot |

---

## Smoke test do endpoint /api/health

Depois do próximo deploy:

```bash
curl -s https://dmusichub-main.vercel.app/api/health | jq

# Esperado:
# {
#   "status": "ok",
#   "checks": { "supabase": "ok" },
#   ...
# }
```

Se retornar 404, o arquivo `api/health.ts` não foi deployado — confere se o `vercel.json` rewrites tem o lookahead `(?!api/...)`.
