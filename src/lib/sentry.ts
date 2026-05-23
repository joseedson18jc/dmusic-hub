import * as Sentry from '@sentry/react';

/**
 * Sentry — error tracking + performance monitoring para produção.
 *
 * Inicializado em `main.tsx` antes do render. Em DEV (`import.meta.env.DEV`)
 * fica desabilitado pra não poluir o dashboard com erros locais.
 *
 * Configurar:
 *   1. Cria projeto em https://sentry.io/
 *   2. Copia o DSN (formato https://<key>@<org>.ingest.sentry.io/<id>)
 *   3. Adiciona como secret no Vercel:
 *      bunx vercel env add VITE_SENTRY_DSN production <<< "<DSN-aqui>"
 *      bunx vercel env add VITE_SENTRY_DSN preview <<< "<DSN-aqui>"
 *   4. Re-deploy: `bun run deploy`
 *
 * Sem DSN setado, `initSentry()` é no-op (não erra, não envia nada).
 */

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Em DEV, ou quando DSN não está configurado, skipa o init.
  if (!dsn || import.meta.env.DEV) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[Sentry] desabilitado em DEV. Setar VITE_SENTRY_DSN ativa em prod.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE ?? 'unknown',

    /* ── Performance monitoring ── */
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Privacy: mascara texto e mídia em sessões replay por padrão.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    /* ── Sample rates (ajusta conforme volume) ── */
    tracesSampleRate: 0.1,            // 10% das transações (suficiente pra ver patterns)
    replaysSessionSampleRate: 0.05,   // 5% das sessões — visualizar UX errado
    replaysOnErrorSampleRate: 1.0,    // 100% das sessões COM erro — diagnóstico

    /* ── PII filter ── */
    sendDefaultPii: false,
    beforeSend(event) {
      // Remove user.email/ip se vier por engano em algum breadcrumb
      if (event.user) {
        const { email: _email, ip_address: _ip, ...rest } = event.user;
        event.user = rest;
      }
      return event;
    },

    /* ── Ignored errors (ruído conhecido) ── */
    ignoreErrors: [
      // Erros de extensão de browser (não são nossos)
      /ResizeObserver loop limit exceeded/,
      /Non-Error promise rejection captured/,
      // Network errors do Supabase quando user perde conexão
      /Failed to fetch/,
      /Load failed/,
      /NetworkError/,
      // Cancelamentos do react-query quando user muda de rota
      /AbortError/,
    ],

    /* ── Tag versão do design system pra correlacionar com regressões ── */
    initialScope: {
      tags: {
        'design-system-version': '97',
      },
    },
  });
}

/**
 * Wrapper conveniente pra reportar erros manualmente em try/catch onde
 * faria sentido ainda mostrar UI graceful.
 *
 * Uso:
 *   try { ... } catch (err) { reportError(err, { context: 'BookingForm.submit' }); }
 */
export function reportError(err: unknown, ctx?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.error('[reportError]', err, ctx);
  if (ctx) {
    Sentry.withScope((scope) => {
      Object.entries(ctx).forEach(([k, v]) => scope.setContext(k, { value: v }));
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

/** ErrorBoundary do Sentry, já tipado. Use no nível mais alto da app. */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
