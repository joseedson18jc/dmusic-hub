import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  FileSignature,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { BrandStrip, BrandFooter } from '@/components/BrandStrip';

const logoDmusic = '/logo-dmusic-white.webp';

const sb = supabase as any;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login — split-screen luxury SaaS pattern.
 * Brand panel (esquerda, oculto em mobile) com mesh gradient animado +
 * features + testimonial. Form (direita) com OAuth, validação live de email,
 * password visibility toggle, trust badges. Toda a lógica de auth — signIn,
 * resetPassword, role-based redirect (dj-only → /dj) — preservada do source.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [mode, setMode] = useState<'login' | 'reset' | 'signup'>('login');
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const emailValidity = useMemo<'empty' | 'invalid' | 'valid'>(() => {
    if (email.trim().length === 0) return 'empty';
    return EMAIL_RE.test(email.trim()) ? 'valid' : 'invalid';
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast.error('Credenciais inválidas. Verifique email e senha.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await sb.from('user_roles').select('role').eq('user_id', user.id);
      const isDJOnly = roles && roles.length > 0 && roles.every((r: any) => r.role === 'dj');
      setLoading(false);
      navigate(isDJOnly ? '/dj' : '/');
    } else {
      setLoading(false);
      navigate('/');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error('Erro ao enviar email de recuperação.');
    } else {
      toast.success('Email de recuperação enviado!');
      setMode('login');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      toast.error('Senha precisa de no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    const { error, needsEmailConfirm } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro no cadastro.');
      return;
    }
    if (needsEmailConfirm) {
      toast.success('Conta criada! Confirme via link no email para entrar.');
      setMode('login');
    } else {
      toast.success('Conta criada! Redirecionando…');
      navigate('/');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (oauthLoading) return;
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setOauthLoading(null);
      toast.error(
        `${provider === 'google' ? 'Google' : 'Apple'} não está configurado. Ative o provedor no painel do Supabase.`,
      );
    }
    // sucesso: o navegador vai redirecionar para o provedor — não limpa loading
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <BrandStrip />
      <div className="flex-1 grid lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.25fr_1fr]">

      {/* ════════════ BRAND PANEL (esquerda) ════════════ */}
      <aside className="relative overflow-hidden hidden lg:flex flex-col p-10 xl:p-14">
        {/* mesh radial · gira lentamente */}
        <div
          aria-hidden="true"
          className="absolute -inset-[20%] z-0 animate-[mesh_24s_linear_infinite]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.35), transparent 35%),
              radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.22), transparent 35%),
              radial-gradient(circle at 50% 90%, hsl(var(--primary) / 0.18), transparent 40%)
            `,
            filter: 'blur(40px)',
          }}
        />
        {/* fine grid overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground) / .04) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / .04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
        {/* scanline */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 2px, hsl(var(--foreground) / .025) 2px 3px)',
          }}
        />

        <style>{`
          @keyframes mesh {
            0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
            33%  { transform: translate(4%, -3%) rotate(120deg) scale(1.05); }
            66%  { transform: translate(-3%, 5%) rotate(240deg) scale(.95); }
            100% { transform: translate(0, 0) rotate(360deg) scale(1); }
          }
          @keyframes float-y {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[mesh_24s_linear_infinite\\],
            .animate-\\[float-y_6s_ease-in-out_infinite\\] { animation: none !important; }
          }
        `}</style>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span
            className="animate-[float-y_6s_ease-in-out_infinite] inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
            style={{ boxShadow: '0 12px 32px -8px hsl(var(--primary) / 0.6)' }}
          >
            <img
              src={logoDmusic}
              alt="DMusic"
              className="h-7 w-7 object-contain"
              fetchPriority="high"
              width={28}
              height={28}
            />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight heading-cyber">DMusic Hub</div>
            <div className="font-mono-cyber text-micro uppercase tracking-[0.3em] text-muted-foreground">
              Neon Syndicate
            </div>
          </div>
        </div>

        {/* Headline + features + testimonial */}
        <div className="relative z-10 mt-auto">
          <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05] heading-cyber">
            Gestão premium <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            >
              para DJs e produtoras.
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-md">
            Bookings, contratos, financeiro e portais — em uma plataforma que entende a operação de
            quem vive de música.
          </p>

          {/* Feature pills */}
          <ul className="mt-7 grid grid-cols-2 gap-2 max-w-md">
            <li className="flex items-center gap-2 text-sm">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              Pipeline 17 status
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-accent/15 text-accent-foreground" style={{ color: 'hsl(var(--accent))' }}>
                <FileSignature className="h-3.5 w-3.5" />
              </span>
              Contratos digitais
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--success) / .15)', color: 'hsl(var(--success))' }}>
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              Financeiro &amp; repasses
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--info) / .15)', color: 'hsl(var(--info))' }}>
                <MessageSquare className="h-3.5 w-3.5" />
              </span>
              WhatsApp integrado
            </li>
          </ul>

          {/* Testimonial */}
          <figure className="mt-10 max-w-lg p-5 rounded-2xl border border-border bg-card/50 backdrop-blur-xl">
            <blockquote className="text-[15px] leading-relaxed text-foreground/85">
              "Saímos de planilhas + WhatsApp para a DMusic e o time inteiro entendeu o pipeline em
              uma semana. Hoje fechamos contratos no mesmo dia."
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center font-semibold"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%)',
                }}
              >
                MC
              </div>
              <div>
                <div className="text-sm font-medium">Marina Castro</div>
                <div className="font-mono-cyber text-micro uppercase tracking-widest text-muted-foreground">
                  Festas Brasil · São Paulo
                </div>
              </div>
            </figcaption>
          </figure>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg pt-6 border-t border-border">
            <div>
              <div className="text-display-sm font-semibold tracking-tight tabular-nums">42</div>
              <div className="font-mono-cyber text-micro uppercase tracking-widest text-muted-foreground">
                artistas ativos
              </div>
            </div>
            <div>
              <div className="text-display-sm font-semibold tracking-tight tabular-nums">38</div>
              <div className="font-mono-cyber text-micro uppercase tracking-widest text-muted-foreground">
                produtoras
              </div>
            </div>
            <div>
              <div className="text-display-sm font-semibold tracking-tight tabular-nums">6</div>
              <div className="font-mono-cyber text-micro uppercase tracking-widest text-muted-foreground">
                países
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════ FORM PANEL (direita) ════════════ */}
      <main className="flex flex-col items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-[400px] animate-[rise_.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <style>{`@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <img src={logoDmusic} alt="DMusic" className="h-5 w-5 object-contain" width={20} height={20} />
            </span>
            <span className="font-semibold tracking-tight">DMusic Hub</span>
          </div>

          {/* Heading */}
          <header className="mb-7">
            <h2 className="text-2xl font-semibold tracking-tight heading-cyber">
              {mode === 'login' ? 'Entre na sua conta'
                : mode === 'signup' ? 'Criar conta admin'
                : 'Recuperar acesso'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'login' ? 'Acesse seu painel de gestão'
                : mode === 'signup' ? 'Cadastro restrito — só emails autorizados'
                : 'Enviaremos um link para seu email'}
            </p>
          </header>

          {/* OAuth — só no modo login */}
          {mode === 'login' && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 rounded-xl text-sm font-medium gap-2"
                  onClick={() => handleOAuth('google')}
                  disabled={!!oauthLoading || loading}
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M5.27 9.76a7.08 7.08 0 0 1 0-3.52L1.28 3.18a12 12 0 0 0 0 9.65l3.99-3.07Z"/>
                      <path fill="#34A853" d="M12 4.75c1.78 0 3.37.61 4.62 1.8l3.43-3.43A11.95 11.95 0 0 0 12 0C7.39 0 3.4 2.61 1.28 6.43l3.99 3.07A7.16 7.16 0 0 1 12 4.75Z"/>
                      <path fill="#FBBC05" d="M12 19.25a7.16 7.16 0 0 1-6.73-4.75L1.28 17.57A11.95 11.95 0 0 0 12 24c2.99 0 5.7-1.01 7.65-2.92l-3.71-2.88a7.18 7.18 0 0 1-3.94 1.05Z"/>
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45a5.55 5.55 0 0 1-2.4 3.66l3.71 2.88c2.16-2 3.73-4.95 3.73-8.78Z"/>
                    </svg>
                  )}
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 rounded-xl text-sm font-medium gap-2"
                  onClick={() => handleOAuth('apple')}
                  disabled={!!oauthLoading || loading}
                >
                  {oauthLoading === 'apple' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.05 12.04c-.03-2.96 2.42-4.39 2.53-4.46-1.38-2.02-3.53-2.3-4.29-2.33-1.83-.18-3.57 1.07-4.5 1.07-.94 0-2.36-1.05-3.89-1.02-2 .03-3.85 1.16-4.88 2.95-2.08 3.6-.53 8.93 1.5 11.85.99 1.43 2.17 3.04 3.71 2.98 1.49-.06 2.05-.97 3.85-.97 1.79 0 2.31.97 3.88.94 1.6-.03 2.62-1.46 3.6-2.9 1.13-1.66 1.6-3.27 1.62-3.36-.04-.01-3.11-1.19-3.13-4.75ZM14.18 4.21c.83-1.01 1.39-2.41 1.23-3.81-1.19.05-2.65.79-3.51 1.79-.77.89-1.45 2.32-1.27 3.69 1.33.1 2.69-.67 3.55-1.67Z"/>
                    </svg>
                  )}
                  Apple
                </Button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="grow h-px bg-border" />
                <span className="font-mono-cyber text-mini uppercase tracking-widest text-muted-foreground">
                  ou com email
                </span>
                <div className="grow h-px bg-border" />
              </div>
            </>
          )}

          {/* Form */}
          <form
            onSubmit={
              mode === 'login' ? handleLogin
              : mode === 'signup' ? handleSignup
              : handleReset
            }
            className="space-y-3.5"
            noValidate
          >
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <div
                className="mt-1.5 relative flex items-center h-11 px-3 rounded-xl border bg-muted/30 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15"
                style={{
                  borderColor:
                    emailValidity === 'invalid'
                      ? 'hsl(var(--destructive))'
                      : emailValidity === 'valid'
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--border))',
                }}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="text-sm h-full !bg-transparent border-0 focus-visible:ring-0 px-0"
                />
                {emailValidity === 'valid' && (
                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--success))' }} />
                )}
              </div>
              {emailValidity === 'invalid' && (
                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
                  Email inválido.
                </p>
              )}
            </div>

            {/* Senha (no modo login OU signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">
                    {mode === 'signup' ? 'Crie uma senha (mín. 8 caracteres)' : 'Senha'}
                  </Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                      onClick={() => setMode('reset')}
                      disabled={loading}
                    >
                      Esqueci a senha →
                    </button>
                  )}
                </div>
                <div className="relative flex items-center h-11 px-3 rounded-xl border border-border bg-muted/30 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={8}
                    className="text-sm h-full !bg-transparent border-0 focus-visible:ring-0 px-0"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 ml-2"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember (só no modo login) */}
            {mode === 'login' && (
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground select-none cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-muted/30"
                  style={{ accentColor: 'hsl(var(--primary))' }}
                />
                Manter conectado por 30 dias
              </label>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-semibold gap-2 mt-2"
              disabled={
                loading || !!oauthLoading
                || ((mode === 'login' || mode === 'signup') && (emailValidity !== 'valid' || password.length < 8))
              }
              style={{
                boxShadow:
                  '0 8px 24px -10px hsl(var(--primary) / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.15)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Entrando…' : mode === 'signup' ? 'Criando…' : 'Enviando…'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link de recuperação'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Voltar ao login (reset OU signup) */}
            {(mode === 'reset' || mode === 'signup') && (
              <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground hover:text-foreground text-xs"
                onClick={() => setMode('login')}
                disabled={loading}
              >
                ← Voltar ao login
              </Button>
            )}
          </form>

          {/* Footer */}
          {mode === 'login' && (
            <p className="mt-7 text-center text-[13px] text-muted-foreground">
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-primary hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Criar conta admin →
              </button>
            </p>
          )}

          {/* Trust bar */}
          <div className="mt-10 pt-5 border-t border-border flex items-center justify-center gap-5 font-mono-cyber text-mini uppercase tracking-widest text-muted-foreground/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              SSL TLS 1.3
            </span>
            <span aria-hidden="true">·</span>
            <span>SOC 2</span>
            <span aria-hidden="true">·</span>
            <span>LGPD</span>
          </div>
        </div>
      </main>
      </div>
      <BrandFooter />
    </div>
  );
}
