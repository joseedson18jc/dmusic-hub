

## Plano: Integração Real com Google Calendar e WhatsApp Business

### Contexto
O CRM D.MUSIC precisa de integração funcional com Google Calendar (sincronização de bookings) e WhatsApp Business (notificações automáticas). Email ficará para quando o domínio for adquirido.

---

### Pré-requisitos do Usuário

Ambas as integrações requerem credenciais externas:

1. **Google Calendar**: Credenciais OAuth2 do Google Cloud Console (Client ID + Client Secret) com a Calendar API habilitada
2. **WhatsApp**: O Lovable possui um conector **Twilio** disponível, que suporta WhatsApp via Twilio's WhatsApp API. Alternativamente, pode-se usar a API direta do WhatsApp Business (requer Meta Business account)

---

### Parte 1 — Google Calendar

**Tabela nova**: `google_calendar_tokens` para armazenar tokens OAuth2 por usuário

**Edge Functions**:
- `google-calendar-auth`: Inicia o fluxo OAuth2 e troca o code por tokens
- `google-calendar-sync`: Cria/atualiza/cancela eventos no Google Calendar quando bookings mudam

**Funcionalidades**:
- Conectar conta Google via OAuth2 na página de Integrações
- Criação automática de evento ao confirmar booking (status `confirmado`)
- Atualização de evento quando data/hora/venue mudam
- Cancelamento de evento quando booking é cancelado
- Exibição de status de conexão na página Integridade

**Arquivos modificados/criados**:
- `supabase/functions/google-calendar-auth/index.ts`
- `supabase/functions/google-calendar-sync/index.ts`
- Migration: tabela `google_calendar_tokens`
- `src/hooks/useGoogleCalendar.ts`
- `src/pages/Integracoes.tsx` — aba Google Calendar funcional
- `src/pages/Integridade.tsx` — status dinâmico

**Secrets necessários**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

### Parte 2 — WhatsApp via Twilio

Utilizando o conector **Twilio** disponível no Lovable, que suporta envio de WhatsApp.

**Tabela nova**: `whatsapp_messages` para log de mensagens enviadas

**Edge Function**:
- `send-whatsapp`: Envia mensagens WhatsApp via Twilio gateway

**Funcionalidades**:
- Envio automático por triggers (booking confirmado, lembrete de pagamento, contrato pendente)
- Templates com variáveis dinâmicas
- Log de mensagens enviadas/falhas
- Estatísticas na aba WhatsApp
- Opt-in por contato

**Arquivos modificados/criados**:
- `supabase/functions/send-whatsapp/index.ts`
- Migration: tabela `whatsapp_messages` + campo `whatsapp_opt_in` em `producers`/`djs`
- `src/hooks/useWhatsApp.ts`
- `src/pages/Integracoes.tsx` — aba WhatsApp funcional
- `src/pages/Integridade.tsx` — status dinâmico

---

### Parte 3 — Página Integridade Dinâmica

Atualizar `Integridade.tsx` para verificar status real das integrações:
- Google Calendar: verificar se existem tokens OAuth válidos
- WhatsApp/Twilio: verificar se conector está vinculado
- Stripe: já tem verificação dinâmica
- Email: manter como "Aguardando domínio"

---

### Ordem de Execução

1. Configurar secrets do Google (solicitar ao usuário)
2. Criar tabelas (migrations)
3. Criar edge functions
4. Criar hooks React
5. Atualizar UI (Integrações + Integridade)
6. Conectar Twilio (solicitar ao usuário)
7. Testar fluxos end-to-end

