import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Check, ShieldCheck, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/login');
    }
  }, [navigate]);

  // Password strength
  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const meta = [
    { label: 'Fraca', color: 'bg-destructive', text: 'text-destructive' },
    { label: 'Fraca', color: 'bg-destructive', text: 'text-destructive' },
    { label: 'Média', color: 'bg-[hsl(var(--warning))]', text: 'text-[hsl(var(--warning))]' },
    { label: 'Boa', color: 'bg-info', text: 'text-info' },
    { label: 'Forte', color: 'bg-[hsl(var(--success))]', text: 'text-[hsl(var(--success))]' },
  ][strength];

  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!matches) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error('Erro ao atualizar senha. Tente novamente.');
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Mesh background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(40% 40% at 30% 20%, hsl(var(--primary) / 0.4), transparent), radial-gradient(50% 50% at 70% 80%, hsl(var(--info) / 0.3), transparent)',
        }}
      />

      <Card className="relative w-full max-w-md glass-card">
        <CardContent className="p-7 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Nova Senha</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina uma nova senha para sua conta
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i < strength ? meta.color : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn('text-micro font-medium', meta.text)}>
                    Força: {meta.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm field */}
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={cn(
                    'pr-10',
                    confirm.length > 0 && !matches && 'border-destructive focus-visible:ring-destructive/40',
                    matches && 'border-[hsl(var(--success))]/50',
                  )}
                />
                {matches && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--success))]" />
                )}
              </div>
              {confirm.length > 0 && !matches && (
                <p className="text-micro text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            {/* Requirements checklist */}
            <ul className="space-y-1 text-mini text-muted-foreground">
              <li className={cn('flex items-center gap-1.5', password.length >= 8 && 'text-[hsl(var(--success))]')}>
                <Check className={cn('h-3 w-3', password.length < 8 && 'opacity-30')} />
                Pelo menos 8 caracteres
              </li>
              <li className={cn('flex items-center gap-1.5', /[A-Z]/.test(password) && 'text-[hsl(var(--success))]')}>
                <Check className={cn('h-3 w-3', !/[A-Z]/.test(password) && 'opacity-30')} />
                Uma letra maiúscula
              </li>
              <li className={cn('flex items-center gap-1.5', /[0-9]/.test(password) && 'text-[hsl(var(--success))]')}>
                <Check className={cn('h-3 w-3', !/[0-9]/.test(password) && 'opacity-30')} />
                Um número
              </li>
            </ul>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || !matches || password.length < 8}
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Atualizando…' : 'Atualizar senha'}
            </Button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
