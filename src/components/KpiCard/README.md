# KpiCard + KpiStat

> Primitivas de "tile de KPI" usadas no Dashboard, Financeiro, Profile pages
> e Portals. Dois shapes coexistem:
>
> 1. **`KpiStat`** — o atalho do dia-a-dia (icon + label + value)
> 2. **`KpiCard`** — composable com `Header / Value / Sparkline / Progress / Footer / Cta`

## Problem

A plataforma reimplementava "tile de métrica" em pelo menos 4 lugares com:
- Tipografia inconsistente (`text-[26px]`, `text-2xl`, `text-3xl` — três tamanhos para o mesmo papel)
- Spacing diferente (p-3, p-4, p-5)
- Deltas com cores hardcoded em cada local (uma das violações de token enforcement)
- Sparklines ausentes ou implementadas inline com SVG cru

Resultado: cada novo dashboard reinventava o tile, 26px-em-tudo poluía a hierarquia, e a brand cor laranja não vazava para os deltas.

---

## When to use which

### Use **`KpiStat`** quando:
- Você só quer **icon + label + value** num card pequeno
- Layout horizontal (icon à esquerda, label/value à direita)
- Quer animação automática via `<CountUp>` (compose junto)
- Caso 90% das vezes (Tarefas, Agenda, Cobranças, DJs, Produtores, Portals, Contratos)

### Use **`KpiCard`** (composable) quando:
- Precisa de **sparkline** sob o valor
- Precisa de **delta com sign-flip** (despesa subir = vermelho)
- Precisa de **CTA inline** (Vencidos → "Cobrar agora")
- Precisa de **progress bar** (meta atingida X%)
- Casos avançados — Dashboard hero, Financeiro analytics

---

## `KpiStat` — API

| Property | Type | Default | Description |
|---|---|---|---|
| `icon` | `LucideIcon` | (obrigatório) | Componente lucide-react |
| `label` | `string` | (obrigatório) | Texto do título do KPI |
| `value` | `ReactNode` | (obrigatório) | Número ou string formatada. Pode ser `<CountUp>` |
| `tone` | `'primary' \| 'success' \| 'warning' \| 'destructive' \| 'info' \| 'violet' \| 'slate' \| 'neutral'` | `'primary'` | Cor do ícone-badge à esquerda |
| `hint` | `ReactNode` | — | Texto auxiliar abaixo do valor ("↑ 12% vs ontem") |
| `emphasizeValue` | `boolean` | `false` | Aplica `tone` ao valor (usado em "Atrasadas: 3" destructive) |

```tsx
import { KpiStat } from '@/components/KpiCard';
import { Headphones } from 'lucide-react';

<KpiStat icon={Headphones} label="DJs disponíveis" value={12} tone="success" />
<KpiStat
  icon={Flame}
  label="Atrasadas"
  value={stats.overdue}
  tone="destructive"
  emphasizeValue={stats.overdue > 0}
/>
```

---

## `KpiCard` — composable API

### Root
| Property | Type | Default | Description |
|---|---|---|---|
| `tone` | `'default' \| 'success' \| 'warning' \| 'destructive' \| 'info' \| 'brand'` | `'default'` | Cor da borda (+ bg sutil em destructive) |
| `density` | `'compact' \| 'default' \| 'comfortable'` | `'default'` | `p-3` / `p-4` / `p-5` |
| `interactive` | `boolean` | `false` | Hover + focus visuais |
| `asLink` | `string` | — | Renderiza como `<a href>` (KPI clicável → drill-down) |

### Subcomponents
| Subcomponent | Props | Use |
|---|---|---|
| `<KpiCard.Header>` | `label`, `delta?`, `deltaUnit?`, `invertSign?`, `icon?` | Label uppercase + delta com seta |
| `<KpiCard.Value>` | (children) | Número grande (26px font-semibold tabular-nums) |
| `<KpiCard.Sparkline>` | `data: number[]`, `tone?`, `dashed?`, `height?` | Mini-line chart 32px |
| `<KpiCard.Progress>` | `value: 0-100`, `tone?` | Barra horizontal de meta |
| `<KpiCard.Footer>` | (children) | Texto pequeno mono-font em muted |
| `<KpiCard.Cta>` | `tone?`, `icon?` | Botão de ação inline ("Cobrar agora") |

---

## Composition recipes

### KPI básico (Receita do mês)
```tsx
<KpiCard>
  <KpiCard.Header label="Receita · Mai" delta={12} />
  <KpiCard.Value>R$ 124.380</KpiCard.Value>
  <KpiCard.Sparkline data={[18, 22, 14, 20, 12, 16, 8, 14]} tone="success" />
  <KpiCard.Footer>vs. R$ 110.940 · abr</KpiCard.Footer>
</KpiCard>
```

### KPI crítico com CTA (Vencidos)
```tsx
import { Phone } from 'lucide-react';

<KpiCard tone="destructive">
  <KpiCard.Header label="Vencidos" delta={2} deltaUnit="absolute" invertSign />
  <KpiCard.Value className="text-destructive">R$ 8.420</KpiCard.Value>
  <KpiCard.Footer>mais antigo: 12d · Produtora Z</KpiCard.Footer>
  <KpiCard.Cta tone="destructive" icon={Phone}>Cobrar agora</KpiCard.Cta>
</KpiCard>
```

### KPI com meta (Lucro)
```tsx
<KpiCard>
  <KpiCard.Header label="Lucro líquido" delta={8} />
  <KpiCard.Value>R$ 38.150</KpiCard.Value>
  <KpiCard.Progress value={64} tone="brand" />
  <KpiCard.Footer>meta R$ 60K · 64%</KpiCard.Footer>
</KpiCard>
```

### KPI clicável (drill-down)
```tsx
<KpiCard asLink="/bookings?phase=confirmacao" tone="brand">
  <KpiCard.Header label="Confirmação" />
  <KpiCard.Value>24</KpiCard.Value>
  <KpiCard.Footer>R$ 178.300 · ativa</KpiCard.Footer>
</KpiCard>
```

### Despesa com sign-flip (subir é ruim)
```tsx
<KpiCard>
  <KpiCard.Header label="Despesa · Mai" delta={4} invertSign />
  <KpiCard.Value>R$ 86.230</KpiCard.Value>
  <KpiCard.Sparkline data={[14, 18, 16, 20, 18, 24, 20, 22]} tone="destructive" dashed />
  <KpiCard.Footer>vs. R$ 83.020 · abr</KpiCard.Footer>
</KpiCard>
```

---

## States

| State | Behavior |
|---|---|
| Default | Borda neutra (`--border`), fundo `--card` |
| Hover (interactive/asLink) | Borda → `primary/45`, leve elevação |
| Focus (keyboard) | Outline `--primary` 2px offset 2px |
| Empty | Value renderiza "—" — responsabilidade do consumer |
| Error | `tone="destructive"` + Header com ícone alerta |

---

## Accessibility

- **Role**: nenhum quando estático. Vira `<a>` com `asLink` (keyboard-accessible nativamente)
- **Heading hierarchy**: `<KpiCard.Header label>` é `<div>`, não `<h2>`. Envolver em `<section aria-labelledby>` para SEO/semântica
- **`tabular-nums`**: garante alinhamento de dígitos (24 vs 124 vs 1.240 não dançam)
- **Delta sign-flip**: `invertSign` em métricas onde "subir é ruim". Sem isso, despesa subindo pinta verde — bug de UX
- **Reduced motion**: `Progress` e `Sparkline` respeitam `prefers-reduced-motion`

---

## Tokens used

- **Cores**: `--card`, `--border`, `--success`, `--warning`, `--destructive`, `--info`, `--primary`, `--violet`, `--slate`, `--muted-foreground`
- **Spacing**: `gap-1 / 1.5 / 2` (density-driven), `p-3 / 4 / 5`
- **Tipografia**: `text-[26px]` para Value, `text-[11px]` em headers, `font-mono tabular-nums` em números
- **Border radius**: `--radius` (10px)
- **Shadows**: tone="brand" usa `shadow-[0_8px_24px_-10px_hsl(var(--primary)/.45)]`

---

## Open Questions

- **Tabular-nums em BRL** — `R$ 1.240,50` tem ponto de milhar e vírgula decimal. `tabular-nums` alinha, mas o ponto pode parecer saltado. Validar com finance lead.
- **Sparkline com tooltip** — v1 não tem hover-tooltip. Adicionar em v2 quando user pedir contexto pontual.
- **`<KpiCard.Skeleton>`** — loading state padronizado ainda não implementado. Consumer hoje usa skeleton genérico.
- **Animação no mount** — fade+rise 200ms? Estático no v1. Adicionar prop `animateOnMount` se vier demanda.
