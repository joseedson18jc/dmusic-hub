import { cn } from '@/lib/utils';

/**
 * BankLogo — badges estilizados (custom) para bancos brasileiros + Banco Azteca (MX).
 *
 * Padrão: círculo colorido (cor signature do banco) com iniciais brancas.
 * Esse é o padrão usado por fintechs modernas (Nubank, Inter, etc) — clean,
 * sem violar trademark, e funciona em qualquer tamanho.
 */

export type BankKey =
  | 'azteca'
  | 'nubank'
  | 'itau'
  | 'bradesco'
  | 'santander'
  | 'bb'
  | 'caixa'
  | 'inter'
  | 'c6'
  | 'btg'
  | 'sicredi'
  | 'safra';

interface BankConfig {
  /** Cor principal do banco (hex) */
  color: string;
  /** Cor de gradiente secundária */
  gradientTo: string;
  /** Iniciais a exibir (1–3 chars) */
  initials: string;
  /** Cor do texto (white ou black, depende do contraste) */
  text: 'white' | 'black';
  /** Nome completo pra aria-label */
  name: string;
  /** Tag opcional (BR / MX / Coop) */
  region: string;
}

export const BANK_CONFIGS: Record<BankKey, BankConfig> = {
  azteca:    { color: '#E30613', gradientTo: '#8B0000', initials: 'BA',  text: 'white', name: 'Banco Azteca',     region: 'MX' },
  nubank:    { color: '#8A05BE', gradientTo: '#5E0488', initials: 'Nu',  text: 'white', name: 'Nubank',            region: 'BR' },
  itau:      { color: '#EC7000', gradientTo: '#003399', initials: 'Itaú',text: 'white', name: 'Itaú Unibanco',     region: 'BR' },
  bradesco:  { color: '#CC092F', gradientTo: '#7F0023', initials: 'Br',  text: 'white', name: 'Bradesco',          region: 'BR' },
  santander: { color: '#EC0000', gradientTo: '#990000', initials: 'St',  text: 'white', name: 'Santander Brasil',  region: 'BR' },
  bb:        { color: '#FAE128', gradientTo: '#0033A0', initials: 'BB',  text: 'black', name: 'Banco do Brasil',   region: 'BR' },
  caixa:     { color: '#0070AF', gradientTo: '#005590', initials: 'CX',  text: 'white', name: 'Caixa Econômica',   region: 'BR' },
  inter:     { color: '#FF7A00', gradientTo: '#CC5500', initials: 'In',  text: 'white', name: 'Banco Inter',       region: 'BR' },
  c6:        { color: '#242424', gradientTo: '#FFD700', initials: 'C6',  text: 'white', name: 'C6 Bank',           region: 'BR' },
  btg:       { color: '#001E50', gradientTo: '#003A8C', initials: 'BTG', text: 'white', name: 'BTG Pactual',       region: 'BR' },
  sicredi:   { color: '#3FA535', gradientTo: '#1F6B1A', initials: 'Sc',  text: 'white', name: 'Sicredi',           region: 'Coop' },
  safra:     { color: '#003DA5', gradientTo: '#001E5F', initials: 'Sf',  text: 'white', name: 'Banco Safra',       region: 'BR' },
};

interface BankLogoProps {
  bank: BankKey;
  size?: number;
  className?: string;
  /** Mostrar tag de região (MX, BR, Coop) no canto */
  showRegion?: boolean;
}

export function BankLogo({ bank, size = 40, className, showRegion = false }: BankLogoProps) {
  const cfg = BANK_CONFIGS[bank];
  if (!cfg) return null;

  // Tamanho da fonte calculado pra caber as iniciais
  const fontSize = cfg.initials.length <= 2 ? size * 0.42 : size * 0.32;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-black tracking-tight shadow-lg select-none',
        'ring-1 ring-black/10 dark:ring-white/10',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${cfg.color} 0%, ${cfg.gradientTo} 100%)`,
        color: cfg.text === 'white' ? '#FFFFFF' : '#000000',
        fontSize: `${fontSize}px`,
        lineHeight: 1,
      }}
      aria-label={cfg.name}
      title={cfg.name}
    >
      {/* Inner highlight pra dar profundidade */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%)',
        }}
      />
      <span className="relative z-10">{cfg.initials}</span>
      {showRegion && (
        <span
          className="absolute -bottom-1 -right-1 text-[8px] font-bold px-1 py-px rounded-full bg-background text-foreground ring-1 ring-border tabular-nums"
          style={{ minWidth: size * 0.36, textAlign: 'center', lineHeight: 1.1 }}
        >
          {cfg.region}
        </span>
      )}
    </div>
  );
}

/** Grid showcase de todos os bancos suportados — útil pra section "Bancos aceitos". */
export function BankShowcase({ size = 48 }: { size?: number }) {
  const banks = Object.keys(BANK_CONFIGS) as BankKey[];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {banks.map((b) => (
        <div key={b} className="flex flex-col items-center gap-1.5 group">
          <BankLogo bank={b} size={size} className="transition-transform group-hover:scale-110 group-hover:rotate-3" />
          <span className="text-mini text-muted-foreground/80 text-center leading-tight">
            {BANK_CONFIGS[b].name.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
}
