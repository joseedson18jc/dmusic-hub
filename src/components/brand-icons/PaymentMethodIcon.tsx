import { cn } from '@/lib/utils';

/**
 * PaymentMethodIcon — ícones SVG estilizados (custom) para métodos de pagamento.
 *
 * Por que SVG inline em vez de PNG?
 *  • Não depende de carregar logos externos (sem CORS, sem 404, sem cache miss)
 *  • Escala perfeito em qualquer tamanho (Retina-ready)
 *  • Cores via design tokens — herda o tema escuro/claro
 *  • Sem violação de copyright — designs originais inspirados nos conceitos
 *
 * Cada ícone tem 24×24 viewBox base, mas usa `size` prop pra escalar.
 */

export type PaymentMethodKey =
  | 'pix'
  | 'boleto'
  | 'cartao'
  | 'stripe'
  | 'transferencia'
  | 'dinheiro'
  | 'iso20022';

interface IconProps {
  size?: number;
  className?: string;
}

/* ════════════════════════════════════════════════════════════════════
   PIX — diamante geométrico (4 triângulos) com gradiente turquesa/verde
   Inspirado na identidade visual oficial do PIX (BACEN), versão original.
   ════════════════════════════════════════════════════════════════════ */
export function PixIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="PIX"
    >
      <defs>
        <linearGradient id="pix-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BCD4" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
      </defs>
      {/* Outer rounded square */}
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#pix-grad)" />
      {/* 4 triangles forming PIX diamond — geometric, abstract */}
      <g fill="white">
        <path d="M12 5.5 L15.5 9 L12 12.5 L8.5 9 Z" opacity="0.95" />
        <path d="M12 11.5 L15.5 15 L12 18.5 L8.5 15 Z" opacity="0.85" />
        <path d="M6.5 9.5 L9 12 L6.5 14.5 L4 12 Z" opacity="0.7" />
        <path d="M17.5 9.5 L20 12 L17.5 14.5 L15 12 Z" opacity="0.7" />
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BOLETO — código de barras estilizado em bloco azul
   ════════════════════════════════════════════════════════════════════ */
export function BoletoIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="Boleto"
    >
      <defs>
        <linearGradient id="boleto-grad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="3" width="21" height="18" rx="3" fill="url(#boleto-grad)" />
      {/* Barcode lines */}
      <g fill="white">
        <rect x="4" y="7"  width="1" height="10" />
        <rect x="6" y="7"  width="2" height="10" />
        <rect x="9" y="7"  width="1" height="10" />
        <rect x="11" y="7" width="3" height="10" />
        <rect x="15" y="7" width="1" height="10" />
        <rect x="17" y="7" width="2" height="10" />
        <rect x="20" y="7" width="0.5" height="10" />
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   CARTÃO — gradient + chip + listra magnética
   ════════════════════════════════════════════════════════════════════ */
export function CartaoIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="Cartão"
    >
      <defs>
        <linearGradient id="card-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="4" width="21" height="16" rx="2.5" fill="url(#card-grad)" />
      {/* Magnetic stripe */}
      <rect x="1.5" y="7.5" width="21" height="2.5" fill="rgba(0,0,0,0.35)" />
      {/* Chip */}
      <rect x="4" y="12" width="3.5" height="2.5" rx="0.4" fill="#FCD34D" />
      <rect x="4" y="12" width="3.5" height="2.5" rx="0.4" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.25" />
      {/* Contactless icon */}
      <g stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M16 12 q1.5 2 0 4" />
        <path d="M18 11 q2.5 3 0 6" />
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STRIPE — gradiente roxo característico + "S" estilizado
   ════════════════════════════════════════════════════════════════════ */
export function StripeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="Stripe"
    >
      <defs>
        <linearGradient id="stripe-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#635BFF" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#stripe-grad)" />
      <path
        d="M13.5 9.2 c0-.7-.6-1-1.6-1-1.4 0-3.2.4-3.2 2.4 0 3.1 4.3 2.6 4.3 4 0 .5-.4.8-1.3.8-1.3 0-3-.5-4-1.1v2.4c1.1.4 2.3.6 3.5.6 2.4 0 4.1-1 4.1-2.9 0-3.4-4.3-2.8-4.3-4.1 0-.4.3-.7 1.1-.7 1.1 0 2.5.4 3.5 1V9.2z"
        fill="white"
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TRANSFERÊNCIA — duas setas opostas (banco → banco)
   ════════════════════════════════════════════════════════════════════ */
export function TransferenciaIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="Transferência"
    >
      <defs>
        <linearGradient id="ted-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#ted-grad)" />
      <g stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Top arrow → */}
        <path d="M6 8 H17" />
        <path d="M14 5 L17 8 L14 11" />
        {/* Bottom arrow ← */}
        <path d="M18 16 H7" />
        <path d="M10 19 L7 16 L10 13" />
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DINHEIRO — notas empilhadas em gradient verde
   ════════════════════════════════════════════════════════════════════ */
export function DinheiroIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="Dinheiro"
    >
      <defs>
        <linearGradient id="cash-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#cash-grad)" />
      <rect x="4.5" y="7" width="15" height="10" rx="1.5" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="2.4" fill="white" opacity="0.95" />
      <text x="12" y="13.6" textAnchor="middle" fontSize="3.2" fontWeight="800" fill="#059669" fontFamily="system-ui">R$</text>
      {/* Corner marks */}
      <circle cx="6.4" cy="9" r="0.55" fill="white" opacity="0.85" />
      <circle cx="17.6" cy="15" r="0.55" fill="white" opacity="0.85" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ISO 20022 — selo institucional (padrão financeiro global)
   ════════════════════════════════════════════════════════════════════ */
export function Iso20022Icon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="ISO 20022"
    >
      <defs>
        <linearGradient id="iso-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#iso-grad)" />
      {/* Concentric ring */}
      <circle cx="12" cy="12" r="8" stroke="#94A3B8" strokeWidth="0.6" fill="none" strokeDasharray="0.6 0.8" opacity="0.6" />
      {/* ISO text mark */}
      <text x="12" y="11.4" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="white" fontFamily="system-ui" letterSpacing="0.4">ISO</text>
      <text x="12" y="16.2" textAnchor="middle" fontSize="3" fontWeight="600" fill="#22D3EE" fontFamily="system-ui" letterSpacing="0.4">20022</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PaymentMethodIcon — dispatcher por key
   ════════════════════════════════════════════════════════════════════ */
export function PaymentMethodIcon({ method, size = 20, className }: { method: PaymentMethodKey; size?: number; className?: string }) {
  switch (method) {
    case 'pix':           return <PixIcon size={size} className={className} />;
    case 'boleto':        return <BoletoIcon size={size} className={className} />;
    case 'cartao':        return <CartaoIcon size={size} className={className} />;
    case 'stripe':        return <StripeIcon size={size} className={className} />;
    case 'transferencia': return <TransferenciaIcon size={size} className={className} />;
    case 'dinheiro':      return <DinheiroIcon size={size} className={className} />;
    case 'iso20022':      return <Iso20022Icon size={size} className={className} />;
    default:              return null;
  }
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  stripe: 'Stripe',
  transferencia: 'Transferência (TED/DOC)',
  dinheiro: 'Dinheiro',
  iso20022: 'ISO 20022',
};
