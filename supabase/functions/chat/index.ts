import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa no sistema. Use quando o usuário pedir para criar, adicionar ou registrar uma tarefa.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título da tarefa" },
          descricao: { type: "string", description: "Descrição detalhada da tarefa" },
          prioridade: { type: "string", enum: ["baixa", "media", "alta"], description: "Prioridade" },
          prazo: { type: "string", description: "Data limite no formato YYYY-MM-DD (opcional)" },
          dj_nome: { type: "string", description: "Nome artístico do DJ para vincular (opcional)" },
          producer_nome: { type: "string", description: "Nome do produtor para vincular (opcional)" },
        },
        required: ["titulo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Cria um novo booking/evento no sistema. Use quando o usuário pedir para criar um booking, agendar um evento ou show.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título do booking" },
          venue: { type: "string", description: "Local/venue do evento" },
          cidade: { type: "string", description: "Cidade do evento" },
          data_evento: { type: "string", description: "Data do evento no formato YYYY-MM-DD" },
          hora_inicio: { type: "string", description: "Hora de início no formato HH:MM" },
          hora_fim: { type: "string", description: "Hora de fim no formato HH:MM" },
          fee_acordado: { type: "number", description: "Cachê acordado em BRL" },
          dj_nome: { type: "string", description: "Nome artístico do DJ" },
          producer_nome: { type: "string", description: "Nome do produtor/contratante" },
          evento_nome: { type: "string", description: "Nome da festa/evento" },
          transporte: { type: "string", description: "Detalhes de transporte" },
          alimentacao: { type: "string", description: "Detalhes de alimentação" },
        },
        required: ["titulo", "producer_nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_producer",
      description: "Adiciona um novo produtor/contratante no sistema.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do produtor" },
          empresa: { type: "string", description: "Nome da empresa (opcional)" },
          email: { type: "string", description: "Email do produtor" },
          telefone: { type: "string", description: "Telefone do produtor" },
          whatsapp: { type: "string", description: "WhatsApp do produtor" },
          cidade: { type: "string", description: "Cidade" },
          tipo_produtor: { type: "string", description: "Tipo: promoter, agencia, festival, club, etc." },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Envia uma notificação in-app para um DJ ou usuário do sistema.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título da notificação" },
          mensagem: { type: "string", description: "Mensagem da notificação" },
          dj_nome: { type: "string", description: "Nome artístico do DJ para notificar" },
          tipo: { type: "string", enum: ["info", "alerta", "urgente", "financeiro"], description: "Tipo da notificação" },
        },
        required: ["titulo", "mensagem", "dj_nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Atualiza o status de uma tarefa existente. Use quando o usuário pedir para marcar tarefa como concluída, cancelar, etc.",
      parameters: {
        type: "object",
        properties: {
          titulo_busca: { type: "string", description: "Título ou parte do título da tarefa para buscar" },
          novo_status: { type: "string", enum: ["a_fazer", "em_andamento", "aguardando_terceiro", "concluida", "cancelada"], description: "Novo status" },
        },
        required: ["titulo_busca", "novo_status"],
      },
    },
  },
];

// --- Tool executors ---

// Sanitize tool arguments before composing PostgREST filters. The LLM is
// indirectly steerable by user-controlled fields (notas_internas, contract
// form data, etc.) that get interpolated into `contextStr`. Strip the
// PostgREST filter delimiters and ilike wildcards so injected text cannot
// widen or pivot a query.
function safeIlike(input: string | undefined | null, maxLen = 80): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim()
    .slice(0, maxLen);
}

async function execCreateTask(supabase: any, args: any, userId: string, userDjId: string | null) {
  const data: any = {
    titulo: args.titulo,
    descricao: args.descricao || null,
    prioridade: args.prioridade || "media",
    status: "a_fazer",
    responsavel_id: userId,
  };
  if (args.prazo) data.prazo = args.prazo;
  if (userDjId) data.dj_id = userDjId;

  if (args.dj_nome) {
    const { data: dj } = await supabase.from("djs").select("id").ilike("nome_artistico", `%${safeIlike(args.dj_nome)}%`).maybeSingle();
    if (dj) data.dj_id = dj.id;
  }
  if (args.producer_nome) {
    const { data: p } = await supabase.from("producers").select("id").ilike("nome", `%${safeIlike(args.producer_nome)}%`).maybeSingle();
    if (p) data.producer_id = p.id;
  }

  const { error } = await supabase.from("tasks").insert(data);
  if (error) return `❌ Erro ao criar tarefa: ${error.message}`;
  return `✅ Tarefa "${args.titulo}" criada com sucesso!`;
}

async function execCreateBooking(supabase: any, args: any) {
  // Find or require producer
  let producerId: string | null = null;
  if (args.producer_nome) {
    const { data: p } = await supabase.from("producers").select("id").ilike("nome", `%${safeIlike(args.producer_nome)}%`).maybeSingle();
    if (p) {
      producerId = p.id;
    } else {
      // Auto-create producer
      const { data: np, error: pe } = await supabase.from("producers").insert({ nome: args.producer_nome }).select("id").single();
      if (pe) return `❌ Erro ao criar produtor: ${pe.message}`;
      producerId = np.id;
    }
  }
  if (!producerId) return "❌ É necessário informar o nome do produtor/contratante.";

  const booking: any = {
    titulo: args.titulo,
    producer_id: producerId,
    venue: args.venue || null,
    cidade: args.cidade || null,
    data_evento: args.data_evento || null,
    hora_inicio: args.hora_inicio || null,
    hora_fim: args.hora_fim || null,
    fee_acordado: args.fee_acordado || null,
    evento_nome: args.evento_nome || null,
    transporte: args.transporte || null,
    alimentacao: args.alimentacao || null,
    status: "novo_lead",
  };

  if (args.dj_nome) {
    const { data: dj } = await supabase.from("djs").select("id").ilike("nome_artistico", `%${safeIlike(args.dj_nome)}%`).maybeSingle();
    if (dj) booking.dj_id = dj.id;
  }

  const { error } = await supabase.from("bookings").insert(booking);
  if (error) return `❌ Erro ao criar booking: ${error.message}`;
  return `✅ Booking "${args.titulo}" criado com sucesso!`;
}

async function execAddProducer(supabase: any, args: any) {
  const producer: any = {
    nome: args.nome,
    empresa: args.empresa || null,
    email: args.email || null,
    telefone: args.telefone || null,
    whatsapp: args.whatsapp || null,
    cidade: args.cidade || null,
    tipo_produtor: args.tipo_produtor || null,
  };
  const { error } = await supabase.from("producers").insert(producer);
  if (error) return `❌ Erro ao adicionar produtor: ${error.message}`;
  return `✅ Produtor "${args.nome}" adicionado com sucesso!`;
}

async function execSendNotification(
  supabase: any,
  args: any,
  isAdmin: boolean,
) {
  // Sending a notification writes to *another* user's row in `notifications`,
  // which RLS will (and should) refuse for non-admins. We refuse early with
  // a clear message so the LLM doesn't loop on retry.
  if (!isAdmin) {
    return "❌ Apenas administradores podem enviar notificações para outros usuários.";
  }

  const { data: dj } = await supabase
    .from("djs")
    .select("id, user_id")
    .ilike("nome_artistico", `%${safeIlike(args.dj_nome)}%`)
    .maybeSingle();
  if (!dj || !dj.user_id) {
    return `❌ DJ "${args.dj_nome}" não encontrado ou sem conta vinculada.`;
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: dj.user_id,
    titulo: args.titulo,
    mensagem: args.mensagem,
    tipo: args.tipo || "info",
  });
  if (error) return `❌ Erro ao enviar notificação: ${error.message}`;
  return `✅ Notificação enviada para ${args.dj_nome}!`;
}

async function execUpdateTaskStatus(supabase: any, args: any) {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, titulo")
    .ilike("titulo", `%${safeIlike(args.titulo_busca)}%`)
    .limit(1);

  if (!tasks?.length) return `❌ Tarefa "${args.titulo_busca}" não encontrada.`;

  const updates: any = { status: args.novo_status };
  if (args.novo_status === "concluida") updates.concluida_em = new Date().toISOString();

  const { error } = await supabase.from("tasks").update(updates).eq("id", tasks[0].id);
  if (error) return `❌ Erro ao atualizar tarefa: ${error.message}`;
  return `✅ Tarefa "${tasks[0].titulo}" atualizada para ${args.novo_status}!`;
}

async function executeToolCall(
  supabase: any,
  name: string,
  args: any,
  userId: string,
  userDjId: string | null,
  isAdmin: boolean,
): Promise<string> {
  switch (name) {
    case "create_task": return execCreateTask(supabase, args, userId, userDjId);
    case "create_booking": return execCreateBooking(supabase, args);
    case "add_producer": return execAddProducer(supabase, args);
    case "send_notification": return execSendNotification(supabase, args, isAdmin);
    case "update_task_status": return execUpdateTaskStatus(supabase, args);
    default: return `❌ Ação desconhecida: ${name}`;
  }
}

// --- Context fetcher (unchanged) ---

async function fetchContext(supabase: any, userId: string) {
  const { data: dj } = await supabase.from("djs").select("id, nome_artistico").eq("user_id", userId).maybeSingle();
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = roles?.some((r: any) => r.role === "super_admin" || r.role === "admin");
  const isDJ = !!dj;

  let bookings: any[] = [], financial: any[] = [], tasks: any[] = [];

  if (isDJ) {
    const { data: b } = await supabase.from("bookings")
      .select("titulo, venue, cidade, data_evento, hora_inicio, hora_fim, fee_acordado, sinal, saldo, status, evento_status, status_pagamento, transporte, alimentacao, reembolso_uber, responsavel_pagamento, producers:producer_id(nome)")
      .eq("dj_id", dj.id).order("data_evento", { ascending: false }).limit(20);
    bookings = b || [];
    const { data: f } = await supabase.from("financial_records")
      .select("descricao, tipo, valor_bruto, status, data_vencimento, bookings:booking_id(titulo)")
      .eq("dj_id", dj.id).order("created_at", { ascending: false }).limit(20);
    financial = f || [];
    const { data: t } = await supabase.from("tasks")
      .select("titulo, descricao, status, prioridade, prazo, bookings:booking_id(titulo), producers:producer_id(nome)")
      .eq("dj_id", dj.id).in("status", ["a_fazer", "em_andamento", "aguardando_terceiro", "atrasada"])
      .order("prazo", { ascending: true, nullsFirst: false }).limit(20);
    tasks = t || [];
  } else if (isAdmin) {
    const { data: b } = await supabase.from("bookings")
      .select("titulo, venue, cidade, data_evento, fee_acordado, status, evento_status, status_pagamento, djs:dj_id(nome_artistico), producers:producer_id(nome)")
      .order("data_evento", { ascending: false }).limit(30);
    bookings = b || [];
    const { data: f } = await supabase.from("financial_records")
      .select("descricao, tipo, valor_bruto, status, data_vencimento, djs:dj_id(nome_artistico), bookings:booking_id(titulo)")
      .order("created_at", { ascending: false }).limit(30);
    financial = f || [];
    const { data: t } = await supabase.from("tasks")
      .select("titulo, descricao, status, prioridade, prazo, djs:dj_id(nome_artistico), producers:producer_id(nome), bookings:booking_id(titulo)")
      .in("status", ["a_fazer", "em_andamento", "aguardando_terceiro", "atrasada"])
      .order("prazo", { ascending: true, nullsFirst: false }).limit(30);
    tasks = t || [];
  }

  // Also fetch DJs list and producers list for admin
  let djsList: any[] = [], producersList: any[] = [];
  if (isAdmin) {
    const { data: djs } = await supabase.from("djs").select("id, nome_artistico").eq("status", "ativo");
    djsList = djs || [];
    const { data: prods } = await supabase.from("producers").select("id, nome").limit(50);
    producersList = prods || [];
  }

  let ctx = "";
  if (isDJ) ctx += `\n\nO usuário logado é o DJ "${dj.nome_artistico}" (dj_id: ${dj.id}).`;
  if (isAdmin) ctx += `\n\nO usuário é um administrador/manager.`;
  if (djsList.length) ctx += `\n\n## DJs cadastrados:\n${JSON.stringify(djsList)}`;
  if (producersList.length) ctx += `\n\n## Produtores cadastrados:\n${JSON.stringify(producersList)}`;
  if (bookings.length) ctx += `\n\n## Bookings recentes:\n${JSON.stringify(bookings)}`;
  if (financial.length) ctx += `\n\n## Registros financeiros recentes:\n${JSON.stringify(financial)}`;
  if (tasks.length) ctx += `\n\n## Tarefas pendentes:\n${JSON.stringify(tasks)}`;
  if (!bookings.length && !financial.length && !tasks.length) ctx += `\n\nNenhum booking, registro financeiro ou tarefa encontrado.`;

  return { ctx, isAdmin, isDJ, djId: dj?.id || null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // The chat endpoint requires an authenticated user. Anonymous calls used
    // to fall through silently and burn LOVABLE_API_KEY credits — refuse them
    // explicitly. The frontend already enforces this in AIChatbot.tsx, this
    // is the server-side counterpart.
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client. RLS applies to every read & write made through it.
    // This is the source of truth for "what can this user see / change?" —
    // we deliberately do NOT use the service-role key for tool execution.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const result = await fetchContext(userClient, userId);
    const contextStr = result.ctx;
    const userDjId = result.djId;
    const isAdmin = result.isAdmin;

    const systemPrompt = `Você é o assistente virtual da D.Music, uma plataforma de gestão de DJs e eventos musicais.
Responda em português do Brasil. Seja conciso e útil.

Você pode:
- Responder dúvidas sobre bookings, eventos, contratos, financeiro e tarefas
- **CRIAR tarefas** quando o usuário pedir (use a ferramenta create_task)
- **CRIAR bookings/eventos** quando o usuário pedir (use a ferramenta create_booking)
- **ADICIONAR produtores** quando o usuário pedir (use a ferramenta add_producer)
- **ENVIAR notificações** para DJs (use a ferramenta send_notification)
- **ATUALIZAR status de tarefas** (use a ferramenta update_task_status)
- Dar dicas de gestão de carreira para DJs

Quando o usuário pedir para criar/adicionar algo, use as ferramentas disponíveis. Depois de executar, confirme a ação.
Formate valores em BRL. Se não houver dados, informe que não há registros.
Mantenha um tom profissional mas amigável.${contextStr}`;

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Step 1: Non-streaming call to check for tool calls
    const firstResponse = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await firstResponse.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const firstResult = await firstResponse.json();
    const choice = firstResult.choices?.[0];

    // If no tool calls, stream the response directly
    if (!choice?.message?.tool_calls?.length) {
      // Re-call with streaming for smooth UX
      const streamResp = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      });
      return new Response(streamResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Step 2: Execute tool calls under the user's JWT — RLS, not the service
    // role, decides what the LLM-driven tools can read/write. The previous
    // code used the service-role client here, which let any authenticated
    // user (or LLM prompt-injection vector) pivot through anyone's data.
    const toolResults: any[] = [];

    for (const tc of choice.message.tool_calls) {
      const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      const result = await executeToolCall(userClient, tc.function.name, args, userId, userDjId, isAdmin);
      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }

    // Step 3: Send tool results back and stream final response
    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
      choice.message,
      ...toolResults,
    ];

    const finalResp = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!finalResp.ok) {
      // Fallback: return tool results directly
      const summary = toolResults.map((r: any) => r.content).join("\n");
      const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: summary } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(fallbackSSE, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(finalResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
