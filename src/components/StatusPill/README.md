# StatusPill

> Pill semântico de status. Único componente para exibir o estado de qualquer
> entidade do DMusic (booking, financeiro, contrato, DJ, produtor) usando uma
> paleta de **hues distintos** — nunca opacity ramps na mesma cor.

## Description

Substitui:
- `src/components/bookings/BookingBadges.tsx` (legado — mapeamento de 17 status com 3 verdes empilhados)
- Badges JSX inline em 9 páginas (`Financeiro`, `Tarefas`, `Contratos`, `Cobrancas`, `Eventos`, `DJs`, `Produtores`, `Bookings`, `dj/DJEventos`)

**Quando usar:**
- Mostrar estado discreto de uma entidade em listagens, cards, headers de detalhe ou drawers
- Sempre que houver um enum no banco que o usuário precisa "ver à primeira vista"

**Quando NÃO usar:**
- Para ações (use `<Button>`)
- Para tags arbitrárias do usuário (use `<Badge>` shadcn padrão)
- Para indicar progresso quantitativo (use `<Progress>`)

---

## Variants

23 variants em 5 famílias semânticas. Cada uma com hue distinto via tokens
de cor (`--slate`, `--warning`, `--primary`, `--violet`, `--success`,
`--destructive`, `--info`).

### Pipeline / Kanban (6)
| Variant | Use When | Token base |
|---|---|---|
| `lead` | Possível evento, qualificado, briefing recebido | `--slate` |
| `negociacao` | Proposta enviada, em negociação, aguardando aprovação | `--warning` |
| `confirmacao` | Contrato enviado, assinatura/sinal pendente | `--primary` (brand) |
| `realizacao` | Planejamento, pronto, em realização, evento realizado | `--violet` |
| `pos_evento` | Pagto. final pendente, repasse pendente, fechado ganho | `--success` |
| `perdido` | Fechado perdido, cancelado | `--destructive` |

### Financeiro (5)
`pago` · `pendente` · `vencido` · `parcial` · `cancelado`

### DJ (4)
`ativo` · `pausa` · `indisponivel` · `vip`

### Produtor (3 extras)
`prospeccao` · `inativo` · `bloqueado` (mais `ativo` reusado)

### Contrato (5)
`rascunho` · `enviado` · `aberto` · `assinado` · `expirado`

### Genérico (1)
`neutral` — fallback para status não mapeados

> **Reuso de hue por contexto:** o verde sucesso é compartilhado entre
> `pos_evento`, `pago`, `ativo`, `assinado`. Intencional — semanticamente
> todos significam "estado bom/finalizado". O consumidor lê o `variant`;
> o hue é consequência semântica.

---

## Props

| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | 1 de 23 | `'lead'` | Qual estado semântico exibir |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | sm = 10px, md = 11px, lg = 12px |
| `pulse` | `boolean` | `false` | Adiciona dot pulsante à esquerda (live indicator) |
| `interactive` | `boolean` | `false` | Aplica `cursor-pointer` + `hover:brightness-110` + `role="button"` + `tabIndex=0` + handler Enter/Espaço. Use junto com `onClick` para pills clicáveis sem envolver em `<button>` |
| `icon` | `ReactNode` | — | Ícone opcional à esquerda do label (recomendado: 12×12) |
| `children` | `ReactNode` | — | Label exibido. **Não** passe enum cru; use o helper apropriado |
| `className` | `string` | — | Override raro |

Estende `HTMLAttributes<HTMLSpanElement>` — qualquer prop nativo de `<span>` funciona.

---

## States

| State | Visual | Behavior |
|---|---|---|
| Default | Borda + bg a 15% + texto no hue | — |
| Hover | Sem mudança por padrão (display-only) | `cursor-pointer` se o consumer envolve em `<button>` |
| Focus | Outline padrão do `<span>`/`<button>` envolvente | Quando interativo |
| `pulse=true` | Dot pulsando antes do label (`::before` com `animate-pulse`) | Respeita `prefers-reduced-motion` |
| Disabled | N/A — pills não são desabilitáveis. Use `cancelado` variant. |

---

## Accessibility

- **Role**: nenhum por padrão (decorativo do texto adjacente). Pode setar `role="status"` quando comunica estado em tempo real (ex.: "ao vivo · Ativo").
- **`aria-label`**: opcional; útil quando o label é abreviado (`'VIP'` → `aria-label='DJ classificado como VIP'`).
- **Contraste**: todos os pares foreground/background testados a ≥ 4.5:1 contra `--card`.
- **Não use só cor**: o `children` (texto) sempre deve ser legível sozinho. "Pago" + verde = bom. Só círculo verde = ruim.
- **Screen reader**: anuncia o texto literal + `aria-label` se setado.

---

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use os helpers `*StatusToPill` para mapear enum → `{variant, label}` | Hardcodar `<StatusPill variant="confirmacao">novo_lead</StatusPill>` (mistura DB com UI) |
| Mantenha o label curto (1–3 palavras) | Frases longas tipo "Aguardando que o produtor abra o link e assine" |
| `pulse=true` no máximo 1 estado por tela | 5 pills pulsantes = caos visual |
| Combine ícone + texto para estados críticos | Só ícone — viola WCAG |
| Reuse a mesma variant para o mesmo conceito | Inventar variant local ("kindaPending") em uma página |

---

## Helpers de mapeamento

```ts
bookingStatusToPill(status: string)    → { variant, label }
financialStatusToPill(status: string)  → { variant, label }
contractStatusToPill(status: string)   → { variant, label }
djStatusToPill(status: string)         → { variant, label }
producerStatusToPill(status: string)   → { variant, label }
```

Cada helper recebe o enum cru do banco e retorna o par `{variant, label}` em
PT-BR. Mantenha-os sincronizados com `src/integrations/supabase/types.ts`.

---

## Code Examples

### Uso direto com variant
```tsx
import { StatusPill } from '@/components/StatusPill';

<StatusPill variant="confirmacao">Aguardando assinatura</StatusPill>
<StatusPill variant="vencido" pulse>Vencido há 12 dias</StatusPill>
<StatusPill variant="vip" size="sm">VIP</StatusPill>
```

### Com helper (recomendado para enums)
```tsx
import { StatusPill, bookingStatusToPill } from '@/components/StatusPill';

function BookingRow({ booking }: { booking: { status: string } }) {
  const { variant, label } = bookingStatusToPill(booking.status);
  return <StatusPill variant={variant}>{label}</StatusPill>;
}
```

### Com ícone
```tsx
import { CheckCircle } from 'lucide-react';

<StatusPill variant="pago" icon={<CheckCircle className="h-2.5 w-2.5" />}>
  Pago
</StatusPill>
```

### Interativo (filtro clicável)
```tsx
// Quando interactive=true, o pill vira role=button, recebe focus ring,
// e responde a Enter/Espaço. Use para chips de filtro / drill-down sem
// precisar envolver em <button>.
<StatusPill
  variant="pago"
  interactive
  onClick={() => setStatusFilter('pago')}
>
  Pago
</StatusPill>
```

---

## Open Questions

- **`em_disputa` → `vencido` (vermelho)** — mais crítico que `pendente`. Confirmar com finance lead.
- **Pluralização de contadores** — `'3 atrasadas'` vs `'Atrasadas · 3'`. Helpers usam o segundo.
- **`size="sm"` em mobile bottom-nav** — 18px de altura, 4px padding. Verificar legibilidade em telas < 360px.
