# bookingPhases — Pipeline phase taxonomy

> 17 status crus do banco agrupados em **5 fases visuais** + 1 fase residual.
> Source of truth pra qualquer visualização de pipeline (kanban, dashboard,
> resumos, filtros).

## Por que existem 5 fases (e não 17)?

O enum `app_role` no banco tem 17 booking statuses. Mostrar 17 colunas num
kanban é impraticável — e visualmente leitor não consegue distinguir mais
de 5–7 categorias por cor. O **agrupamento por fase**:

1. Reduz cognitive load (5 cores, não 17)
2. Mantém os enums crus no banco (queries, filtros, contratos)
3. Permite escalar — adicionar 5 status novos não rebenta o kanban
4. Resolve o "3 verdes empilhados" do legado `BookingBadges`

Cada fase tem **hue distinto** (slate / warning / brand / violet / success /
destructive), não opacity ramps numa única cor. Isso é a regra principal do
design system pra status semânticos.

---

## Tabela canônica · 17 → 5

### 🌫 Fase 1 — `lead` (Possível Evento)
**Hue**: `--slate` (cinza-azulado)
**Texto**: `--lead-text` (cinza mais claro)
**Significa**: Oportunidade qualificada, mas ainda sem proposta formal.

| DB status | Label PT-BR | Próximo passo típico |
|---|---|---|
| `novo_lead` | "Possível evento" | Qualificar produtor + dia |
| `qualificado` | "Qualificado" | Coletar briefing |
| `briefing_recebido` | "Briefing" | Montar proposta |

### 🟡 Fase 2 — `negoc` (Negociação)
**Hue**: `--warning` (âmbar)
**Texto**: `--warning-text` (âmbar mais claro)
**Significa**: Existe proposta no jogo, valor está sendo discutido.

| DB status | Label PT-BR | Próximo passo típico |
|---|---|---|
| `proposta_enviada` | "Proposta enviada" | Aguardar resposta |
| `negociacao` | "Em negociação" | Ajustar cachê/condições |
| `aguardando_aprovacao` | "Aguardando aprovação" | Decisão final do produtor |

### 🟧 Fase 3 — `conf` (Confirmação) — **destaque brand**
**Hue**: `--primary` (laranja brand DMusic)
**Texto**: `--primary-text`
**Significa**: Acordo verbal fechado, falta fechar burocracia + sinal.

| DB status | Label PT-BR | Próximo passo típico |
|---|---|---|
| `contrato_enviado` | "Contrato enviado" | Aguardar assinatura |
| `assinatura_pendente` | "Aguardando assinatura" | Cobrar produtor |
| `sinal_pendente` | "Sinal pendente" | Receber 50% sinal |

> Por que essa fase é destacada? Porque é onde o lifetime value se concretiza —
> e onde leads escorregam. O laranja brand chama atenção pra agir AGORA.

### 🟣 Fase 4 — `realiz` (Realização)
**Hue**: `--violet` (violeta)
**Texto**: `--violet-text` (violeta mais claro)
**Significa**: Booking confirmado, em preparação ou já rolando.

| DB status | Label PT-BR | Próximo passo típico |
|---|---|---|
| `confirmado` | "Confirmado" | Bloquear data |
| `planejamento` | "Planejamento" | Definir rider, logística |
| `pronto_para_evento` | "Pronto" | Confirmar transporte |
| `em_realizacao` | "Em realização" | (live state, no dia) |
| `evento_realizado` | "Evento realizado" | Coletar feedback |

> A fase `realiz` é a **união** dos dois supersets históricos: `BOOKING_STAGES`
> (no `useBookings`) usava `confirmado`, e `BookingStatus` (no `StatusPill`)
> usava `em_realizacao`. Aqui ambos convivem — pra não invisibilizar bookings
> que estão num branch ou no outro.

### 🟢 Fase 5 — `pos` (Pós-evento)
**Hue**: `--success` (verde)
**Significa**: Evento já aconteceu. Falta fechar o caixa.

| DB status | Label PT-BR | Próximo passo típico |
|---|---|---|
| `pagamento_final_pendente` | "Pagto. final pendente" | Cobrar 50% restante |
| `repasse_pendente` | "Repasse pendente" | Pagar DJ |
| `fechado_ganho` | "Fechado ✓" | Arquivar |

### ⚫ Residual — `lost` (Perdido / Cancelado)
**Hue**: `--destructive` (vermelho)
**Não aparece nas 5 fases — exibido em seção colapsada separada.**

| DB status | Label PT-BR | Razão típica |
|---|---|---|
| `fechado_perdido` | "Perdido" | Cliente foi com concorrência |
| `cancelado` | "Cancelado" | Evento cancelado por força maior |

---

## API de consumo

```ts
import {
  PIPELINE_PHASES,
  LOST_PHASE,
  phaseForStatus,
  isLostStatus,
  groupByPhase,
} from '@/lib/bookingPhases';

// 1. Iterar pelas fases (kanban / summary tiles)
{PIPELINE_PHASES.map((phase) => (
  <PhaseKanbanColumn phase={phase} count={...}>
    ...
  </PhaseKanbanColumn>
))}

// 2. Mapear status → fase (1 lookup)
const phase = phaseForStatus(booking.status);
if (phase) console.log(phase.label);

// 3. Verificar se é perdido (para esconder em padrão)
if (isLostStatus(booking.status)) {
  hideFromActivePipeline(booking);
}

// 4. Agrupar bookings em fases de uma vez
const { byKey, lost } = groupByPhase(bookings);
byKey.conf       // → bookings na fase Confirmação
byKey.realiz     // → bookings na fase Realização
lost             // → fechado_perdido + cancelado
```

### Shape de `PipelinePhase`

```ts
interface PipelinePhase {
  key: 'lead' | 'negoc' | 'conf' | 'realiz' | 'pos';
  label: string;              // "Confirmação"
  short: string;              // "Confirm." — pra kanban headers
  statuses: readonly string[]; // status crus desta fase
  color: string;              // texto sobre o bg (hsl token)
  bg: string;                 // background tintado
  border: string;             // borda
  accent: string;             // acento sólido (border-top do kanban col)
}
```

---

## Quando adicionar um status novo ao banco

1. **Mapear pra uma fase existente** primeiro. Adicione ao array `statuses`
   da fase apropriada em `bookingPhases.ts`.
2. **Atualizar o helper `bookingStatusToPill`** em `src/components/StatusPill/index.tsx`
   pra retornar `{variant, label}` em PT-BR.
3. **Não criar fase nova** sem revisão de design — o limite de 5 cores é
   intencional.
4. **Atualizar este README** com a nova linha na tabela acima.
5. **Adicionar teste** em `bookingPhases.test.ts` (TODO: criar) verificando
   `phaseForStatus('novo_status') === expectedPhase`.

---

## Decisões de design já tomadas

- **Por que `lead` é cinza e não azul?** Cinza comunica "ainda não tem cor
  ainda" — perfeitamente neutro. Azul iria competir com `info` em outros
  contextos (financeiro parcial, prospecção).
- **Por que `conf` é o laranja brand?** É a fase onde a empresa "ganha o
  cliente". Faz sentido o branding piscar mais nesse momento.
- **Por que `pos_evento` é verde e não primary?** Verde = "concluído"
  universalmente. Reservar primary pra ações chamativas no `conf` é mais útil
  do que pra estado "feito".
- **Por que `lost` está fora das 5 fases?** Bookings perdidos não fazem parte
  do funil ativo — colocá-los como 6ª coluna no kanban poluía a vista.
  Exibimos numa seção colapsável separada (`<details>`).

---

## Open questions

- **`em_realizacao` é um status fantasma?** Está no enum mas raramente é setado
  na prática (o sistema pula direto de `pronto_para_evento` → `evento_realizado`
  ao final do show). Avaliar se faz sentido manter ou desprecar.
- **Reativar bookings perdidos** — Quando um produtor volta após meses,
  reabre o booking ou cria novo? Hoje a UI não tem fluxo claro. Documentar.
- **`fechado_ganho` vs `evento_realizado`** — qual é o terminal "verdadeiro"
  do funil? Atualmente:
   - `evento_realizado` = show aconteceu (mesmo se ainda tem pagamento pendente)
   - `fechado_ganho` = tudo pago, conta zerada
  Confirmar essa distinção com finance.
