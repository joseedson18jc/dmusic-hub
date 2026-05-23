import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sistema de Ícones — Neon Syndicate
 * --------------------------------------------------------------
 * Tokens canônicos de tamanho e stroke. Use SEMPRE este wrapper
 * em telas novas para manter coerência visual em todo o app.
 *
 * Tamanhos (px):
 *   xs = 12  (badges, chips densos)
 *   sm = 14  (inline em texto pequeno)
 *   md = 16  (DEFAULT — botões, listas, formulários)
 *   lg = 20  (cabeçalhos de cards)
 *   xl = 24  (heros, estados vazios)
 *   2xl= 32  (ilustrações)
 *
 * Stroke padrão: 1.75 (alinhado com a tipografia cyberpunk fina).
 * Cor padrão: currentColor — herda do contexto (texto/foreground).
 */

export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

export const ICON_STROKE_DEFAULT = 1.75;
export const ICON_STROKE_BOLD = 2.25;

export interface IconProps extends Omit<LucideProps, "size" | "ref"> {
  icon: LucideIcon;
  size?: IconSize;
  /** true = stroke 2.25 (estado ativo/destaque) */
  bold?: boolean;
}

/**
 * Wrapper canônico para qualquer ícone Lucide.
 *
 * @example
 * <Icon icon={Calendar} />              // 16px, stroke 1.75
 * <Icon icon={Calendar} size="lg" />    // 20px
 * <Icon icon={Calendar} bold />         // stroke 2.25
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideIconComponent, size = "md", bold, className, strokeWidth, ...props }, ref) => {
    const px = ICON_SIZES[size];
    const stroke = strokeWidth ?? (bold ? ICON_STROKE_BOLD : ICON_STROKE_DEFAULT);
    return (
      <LucideIconComponent
        ref={ref}
        width={px}
        height={px}
        strokeWidth={stroke}
        className={cn("shrink-0", className)}
        aria-hidden={props["aria-label"] ? undefined : true}
        {...props}
      />
    );
  }
);
Icon.displayName = "Icon";