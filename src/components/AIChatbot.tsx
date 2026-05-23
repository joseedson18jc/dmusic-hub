import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Trash2, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  // Require a real session — never fall back to the public anon key.
  // Falling back lets unauthenticated callers burn LOVABLE_API_KEY credits.
  if (!session?.access_token) {
    toast.error('Faça login para usar o assistente.');
    onDone();
    return;
  }
  const token = session.access_token;

  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (resp.status === 429) {
    toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
    onDone();
    return;
  }
  if (resp.status === 402) {
    toast.error('Créditos de IA esgotados.');
    onDone();
    return;
  }
  if (!resp.ok || !resp.body) throw new Error('Falha ao conectar com IA');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }

      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Abort any in-flight stream when the panel closes or component unmounts.
  // Otherwise the SSE reader keeps running and the upstream burns tokens.
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setLoading(false),
        signal: controller.signal,
      });
    } catch (e) {
      // AbortError is expected when the user closes the panel mid-stream.
      if ((e as { name?: string })?.name !== 'AbortError') {
        console.error(e);
        toast.error('Erro ao se comunicar com a IA');
      }
      setLoading(false);
    }
  };

  // Suggested first prompts to seed the conversation. Cheap UX upgrade —
  // an empty chat panel with no entry points is a usability cliff.
  const suggestions = [
    'Quais bookings tenho confirmados este mês?',
    'Crie uma tarefa: revisar contrato do Vivo Open Air',
    'Quais pagamentos estão vencidos?',
    'Como anda o financeiro deste trimestre?',
  ];

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  const clearConversation = () => {
    stopStreaming();
    setMessages([]);
  };

  const sendSuggestion = (text: string) => {
    setInput(text);
    // Defer to next tick so the input value paints before submit.
    setTimeout(() => {
      const form = document.getElementById('aichatbot-form') as HTMLFormElement | null;
      form?.requestSubmit();
    }, 0);
  };

  return (
    <>
      {/* FAB — pulses gently when idle to suggest interaction. The neon-pulse
          class respects prefers-reduced-motion (defined in index.css). */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente IA'}
        aria-expanded={open}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-[0_8px_28px_-6px_hsl(var(--accent)/0.55)] hover:bg-accent/90 transition-all flex items-center justify-center ${open ? '' : 'neon-pulse'}`}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistente D.Music"
          className="fixed bottom-24 right-6 z-50 w-[min(24rem,calc(100vw-3rem))] max-h-[min(42rem,calc(100vh-8rem))] flex flex-col rounded-2xl border border-border/40 bg-card shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 bg-secondary/30">
            <div className="relative h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-accent" aria-hidden="true" />
              {!loading && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] ring-2 ring-card" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Assistente D.Music</p>
              <p className="text-micro font-mono-cyber tracking-widest uppercase text-muted-foreground">
                {loading ? 'Pensando…' : 'Online · Gemini'}
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={clearConversation}
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 p-4">
            {messages.length === 0 && (
              <div className="space-y-4 py-4">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium">Como posso ajudar?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pergunte sobre bookings, financeiro, eventos ou peça uma ação.
                  </p>
                </div>
                <div className="grid gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendSuggestion(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border border-border/40 bg-secondary/30 hover:bg-secondary/60 hover:border-accent/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Bot className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'bg-accent text-accent-foreground rounded-br-md'
                        : 'bg-secondary/60 text-foreground rounded-bl-md'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                  <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border/30 bg-secondary/20">
            <form
              id="aichatbot-form"
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                aria-label="Mensagem para o assistente"
                className="flex-1 bg-secondary/50 border-border/30 h-10"
                disabled={loading}
              />
              {loading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={stopStreaming}
                  aria-label="Parar resposta"
                  title="Parar"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 bg-accent hover:bg-accent/90"
                  disabled={loading || !input.trim()}
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
