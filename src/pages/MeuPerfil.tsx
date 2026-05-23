import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, Copy, Check, LogOut, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EditorialHero } from '@/components/ui/EditorialHero';

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-destructive/15 text-destructive border-destructive/30',
  manager: 'bg-primary/15 text-primary border-primary/30',
  dj: 'bg-info/15 text-info border-info/30',
  producer: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
};

export default function MeuPerfil() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const initials = (user?.email ?? '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const copyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    toast.success('ID copiado para a área de transferência');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="MEU PERFIL"
        accentHueA="hsl(var(--primary))"
        accentHueB="hsl(var(--magenta, 320 70% 65%))"
        status={[
          { label: 'ACCOUNT · LIVE', tone: 'live' },
          { label: `▸ ${roles.length} role${roles.length !== 1 ? 's' : ''}`, tone: 'muted' },
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            informações da conta · papéis ativos · preferências
          </p>
        }
      />

      {/* Identity card */}
      <Card className="glass-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="pt-0 -mt-10">
          <div className="flex items-end gap-4 flex-wrap">
            <Avatar className="h-20 w-20 ring-4 ring-card">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-lg font-bold tracking-tight truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className={`text-micro capitalize ${ROLE_COLOR[role] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      <Shield className="h-2.5 w-2.5 mr-1" />
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Nenhum papel atribuído</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/configuracoes')}>
                <Settings className="h-3.5 w-3.5" />
                Configurações
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Conta</h3>
            </div>
            <div>
              <p className="text-micro text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-micro text-muted-foreground uppercase tracking-wider">User ID</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-mono text-muted-foreground truncate">{user?.id}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={copyId}
                  aria-label="Copiar ID"
                >
                  {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-micro text-muted-foreground uppercase tracking-wider">Último login</p>
              <p className="text-sm mt-0.5">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString('pt-BR')
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Permissões</h3>
            </div>
            {roles.length > 0 ? (
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-7 w-7 rounded-md border flex items-center justify-center ${
                          ROLE_COLOR[role] ?? 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-medium capitalize">{role}</span>
                    </div>
                    <Badge variant="outline" className="text-micro">ativo</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você não possui papéis atribuídos. Solicite acesso ao administrador.
              </p>
            )}
            <p className="text-mini text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
              Os papéis determinam o que você pode ver e fazer no sistema. Alterações devem ser
              solicitadas a um administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
