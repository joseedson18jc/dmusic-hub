/**
 * BrandStrip — tagline editorial / cyberpunk persistente em todas as páginas.
 *
 * Aparece logo abaixo da topbar (em ambos AppLayout e DJLayout). Conteúdo é
 * o manifesto comercial da plataforma. Visualmente:
 *   • Fundo gradient sutil (orange → transparent)
 *   • Texto mono caps tracking alto
 *   • Palavras-chave (BIG, TALENTED) em gradient text + bold
 *   • Borda inferior fina
 *   • Decorações "//" estilo terminal nos cantos
 */
export function BrandStrip() {
  return (
    <div
      role="banner"
      aria-label="DMusic Hub tagline"
      className="relative overflow-hidden border-b border-border/40"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-violet-500/10" />
      <div className="pointer-events-none absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative px-3 md:px-6 py-2 flex items-center justify-center gap-3 text-center">
        <span className="font-mono text-mini md:text-xs uppercase tracking-[0.22em] text-primary/80 select-none hidden sm:inline">
          //
        </span>
        <p className="text-mini md:text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground leading-tight">
          Professional CRM for Managers who thinks{' '}
          <span
            className="font-black tracking-tight"
            style={{
              background: 'linear-gradient(115deg, hsl(var(--primary)) 0%, hsl(var(--magenta, 320 70% 65%)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            BIG
          </span>
          , and for{' '}
          <span
            className="font-black tracking-tight"
            style={{
              background: 'linear-gradient(115deg, hsl(var(--violet)) 0%, hsl(var(--info)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TALENTED&nbsp;DJ&rsquo;s
          </span>{' '}
          only.
        </p>
        <span className="font-mono text-mini md:text-xs uppercase tracking-[0.22em] text-violet-400/80 select-none hidden sm:inline">
          //
        </span>
      </div>
    </div>
  );
}

/**
 * BrandFooter — copyright footer institucional em todas as páginas.
 * Mono caps, tracking alto, decoração discreta com bullets coloridos.
 */
export function BrandFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      className="relative mt-8 border-t border-border/40 bg-background/60 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="px-3 md:px-6 py-3 flex items-center justify-center gap-3 flex-wrap text-center">
        <span className="h-1 w-1 rounded-full bg-primary/70 shrink-0" aria-hidden />
        <p className="font-mono text-mini uppercase tracking-[0.20em] text-muted-foreground/80 leading-none">
          DMusic Management{' '}
          <span className="text-foreground/90">©</span>{' '}
          <span className="text-foreground/90 font-semibold tabular-nums">COPYRIGHT&nbsp;{year}</span>
          {' '}&middot;{' '}
          <span className="text-foreground/70">All&nbsp;rights&nbsp;reserved</span>
        </p>
        <span className="h-1 w-1 rounded-full bg-violet-400/70 shrink-0" aria-hidden />
      </div>
    </footer>
  );
}
