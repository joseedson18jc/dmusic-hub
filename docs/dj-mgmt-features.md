# DJ-mgmt agency features (sessão de implementação)

> Features específicas pra operação de agência de DJs, filtradas pra remover
> ruído de CRM genérico. Foco no que diferencia agência DJ de Pipedrive/HubSpot.

## ✅ Implementadas nesta sessão

### 1. Travel-time conflict detection
**Arquivo**: `src/lib/djConflicts.ts` · 11 testes (`djConflicts.test.ts`)

Detecta dois tipos de conflito de agenda do mesmo DJ:

- **`overlap`** — janelas de tempo se cruzam no mesmo dia
- **`travel`** — datas adjacentes onde o gap entre eventos é menor que o
  tempo necessário pra deslocamento entre cidades

**Heurística de travel time** (sem chamar API de mapas):

| Cenário | Buffer necessário |
|---|---|
| Mesma cidade | 1h |
| Mesma região metropolitana (proxy: 2 primeiras palavras coincidem) | 4h |
| Cidades distintas / desconhecidas | 8h (cobre voo doméstico + ground) |

Trata corretamente eventos atravessando meia-noite (23:00 → 01:30 = D+1).

**Uso**:
```ts
import { buildConflictMap } from '@/lib/djConflicts';

const conflicts = buildConflictMap(bookings);
const result = conflicts.get(booking.id);
if (result?.type === 'travel') {
  // result.message = "Tempo entre eventos: 3.5h. Necessário pelo menos 8h..."
}
```

**Integração sugerida**: substituir o `hasConflict` simples em `Bookings.tsx`
e `Agenda.tsx` por `buildConflictMap`. UI já tem badge "⚠ conflito DJ" —
basta usar `result.message` no tooltip.

---

### 2. Hospitality checklist auto-generator
**Arquivo**: `src/lib/hospitalityChecklist.ts`

Ao confirmar booking (status → `confirmado`), o operador clica "Gerar
checklist" e o sistema cria 8 tarefas pré-configuradas na tabela `tasks`
existente, com prazos relativos à `data_evento`:

| Item | Prazo | Prioridade |
|---|---:|---|
| Reservar hotel | D-14 | alta |
| Comprar transfer ida | D-7 | alta |
| Comprar transfer volta | D-7 | alta |
| Confirmar rider técnico com venue | D-7 | alta |
| Confirmar camarim + hospitality rider | D-3 | média |
| Enviar contato local de emergência ao DJ | D-2 | média |
| Lembrete final pro DJ (D-1) | D-1 | alta |
| Emitir NFSe + enviar ao produtor | D+3 | média |

**Idempotente**: marker `[hospitality:<booking_id>]` na descrição evita
duplicar tarefas em re-runs.

**Uso**:
```ts
import { generateHospitalityChecklist } from '@/lib/hospitalityChecklist';

await generateHospitalityChecklist({
  booking_id: booking.id,
  dj_id: booking.dj_id,
  producer_id: booking.producer_id,
  data_evento: booking.data_evento,
  created_by: user.id,
});
// → cria até 8 tasks vinculadas ao booking
```

**Helper auxiliar**: `getHospitalityProgress(booking_id)` retorna
`{total, done, overdue}` pra badge "3 itens pendentes".

**Integração sugerida**: botão "Gerar checklist" no detail do booking
(disponível só quando status === 'confirmado'). Badge de progresso na linha
do booking no kanban.

---

### 3. Cachê negotiation timeline
**Arquivo**: `src/lib/feeNegotiation.ts`

Histórico de propostas/contrapropostas do cachê, usando a tabela
`audit_logs` que JÁ EXISTE (zero schema change). Cada mudança registra:

- `from_amount` / `to_amount`
- `proposed_by`: `'agencia'` ou `'produtor'`
- `note`: explicação livre ("subiu por travel SP-Rio")
- `user_id`: quem registrou + nome via join no `profiles`

**Uso**:
```ts
import { recordFeeChange, fetchFeeHistory, summarizeFeeHistory } from '@/lib/feeNegotiation';

// Quando o produtor faz uma contraproposta:
await recordFeeChange({
  booking_id: booking.id,
  from_amount: 10000,
  to_amount: 8000,
  proposed_by: 'produtor',
  note: 'Produtor pediu desconto por evento beneficente',
  user_id: user.id,
});

// Mostrar timeline:
const history = await fetchFeeHistory(booking.id);
//  [
//    { at: '2026-05-01', from_amount: null, to_amount: 10000, proposed_by: 'agencia', ... },
//    { at: '2026-05-03', from_amount: 10000, to_amount: 8000,  proposed_by: 'produtor', ... },
//    { at: '2026-05-04', from_amount: 8000,  to_amount: 8500,  proposed_by: 'agencia', ... }
//  ]

// Resumo curto pra card:
summarizeFeeHistory(history)
// → "Inicial R$ 10.000 → fechado R$ 8.500 (1 contraproposta)"
```

**Integração sugerida**:
- Substituir o input simples de `fee_acordado` no `BookingForm` por uma UI
  que pergunta "quem está propondo essa mudança?" + nota.
- Mostrar timeline expandível abaixo do campo no detail.

---

### 4. Hold dates com timer
**Arquivo**: `src/lib/holdDates.ts`

Reserva temporária de data por até 14 dias durante negociação. Quando
produtor pede "segura essa data por 7 dias", o operador clica "Hold por
7 dias" — booking ganha `hold_until` e UI mostra countdown.

**Requer migration SQL** (aplique antes de usar): coluna `hold_until` em
`bookings`. Ver `supabase/migrations/20260514_dj_mgmt_features.sql`.

**Uso**:
```ts
import { setHold, clearHold, describeHold } from '@/lib/holdDates';

// Marcar hold de 7 dias
await setHold({ booking_id: booking.id, days: 7, user_id: user.id });

// Renderizar countdown
const status = describeHold(booking.hold_until);
// { active: true, expired: false, msRemaining: 518400000, label: "expira em 6d 0h", tone: "success" }

// Liberar a data
await clearHold(booking.id, user.id);

// Dashboard de holds expirando em 24h
const expiringSoon = await listHoldsExpiringSoon(24);
```

**Integração sugerida**:
- Botão "Hold" no booking detail (visible quando status === 'aguardando_aprovacao')
- Badge no card kanban com cor da urgência (`describeHold().tone`)
- Section no Dashboard listando "Holds expirando em 24h"
- Edge function `expire-holds` rodando 1x/hora pra converter holds vencidos
  em `fechado_perdido` automaticamente

---

## 📋 Roadmap das próximas (não implementadas ainda)

### P0/P1 não implementadas — requerem provider externo

| Feature | Bloqueador | Estimativa |
|---|---|---:|
| **NFSe automática** | Conta Tecnospeed / NFE.io / Nota Carioca | 1-2 sem |
| **Email transacional** | Domínio próprio + Resend/Postmark + DKIM | 3 dias |
| **Stripe webhooks** | Webhook URL configurada no Stripe dashboard | 1 dia |
| **2FA admin** | Habilitar MFA no Supabase Auth + UI de enrolment | 2 dias |

### P2 não implementadas — schema pronto, falta UI

Já com migration SQL aplicada (`booking_djs`, `tracklists`, `rider_snapshot`),
falta:

| Feature | Pendência |
|---|---|
| **Multi-DJ bookings UI** | Edit form do booking que aceita múltiplos DJs |
| **Tracklist submit (DJ portal)** | Form no `/dj/eventos/:id` que envia músicas |
| **Tracklist export ECAD** | Botão "Exportar setlist ECAD" no booking detail |
| **Rider snapshot editor** | UI no booking pra editar a cópia do rider master |
| **Stage line-up + soundcheck** | Já tem `position` em `booking_djs` — falta UI |
| **EPK builder dinâmico** | Página `/djs/:id/epk?proposal=:id` com print CSS |
| **Blackout periods** | Tabela `dj_blackouts(dj_id, from, to, reason)` |
| **DJ portal event-specific** | `/dj/eventos/:id` com info completa do show |

---

## 🚀 Próximos passos práticos

### Pra usar o que acabou de ser implementado HOJE:

1. **Aplicar a migration SQL**:
   - Abra https://supabase.com/dashboard/project/ktmhxgiyvppvtmhvcerj/sql/new
   - Cole o conteúdo de `supabase/migrations/20260514_dj_mgmt_features.sql`
   - Run

2. **Regenerar `types.ts`** (depois da migration):
   ```bash
   bunx supabase gen types typescript --project-id ktmhxgiyvppvtmhvcerj > src/integrations/supabase/types.ts
   ```
   Ou via dashboard → Database → API → TypeScript types → copia/cola.

3. **Wireup das libs em UI** — atualmente as 4 libs novas são standalone
   (testadas + funcionais), mas falta plugar nos componentes existentes:
   - `BookingForm.tsx` → adicionar botão "Hold" + timeline de cachê
   - `Bookings.tsx` → substituir hasConflict por buildConflictMap
   - `Index.tsx` (Dashboard) → seção "Holds expirando"
   - Booking detail → botão "Gerar checklist hospitality"
