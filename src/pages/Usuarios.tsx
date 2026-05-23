import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserCog, Plus, Trash2, ShieldCheck, Shield, DollarSign, Music, Mail,
  KeyRound, Copy, Check, Loader2, Pencil,
} from 'lucide-react';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { ListSkeleton, EmptyState, ErrorState } from '@/components/states';
import { cn } from '@/lib/utils';

const sb = supabase as any;

type AppRole = 'super_admin' | 'admin' | 'finance' | 'dj';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  email_confirmed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_META: Record<AppRole, { label: string; icon: typeof ShieldCheck; color: string; description: string }> = {
  super_admin: { label: 'Super Admin', icon: ShieldCheck, color: 'hsl(var(--destructive))', description: 'Acesso total · audit logs · system' },
  admin:       { label: 'Admin',       icon: Shield,      color: 'hsl(var(--primary))',     description: 'Gestão completa (bookings, DJs, produtores, financeiro)' },
  finance:     { label: 'Finance',     icon: DollarSign,  color: 'hsl(var(--success))',     description: 'Só financeiro + relatórios' },
  dj:          { label: 'DJ',          icon: Music,       color: 'hsl(var(--info))',        description: 'Portal do DJ (próprios eventos)' },
};

function generateTempPassword(): string {
  // 16 chars alfanumérico + símbolo (forte mas digitável)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function Usuarios() {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole('super_admin');

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);

  /* ──────────────────── Query: list users ──────────────────── */
  const { data: users, isLoading, error, refetch } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await sb.rpc('list_users_admin');
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ──────────────────── Mutations ──────────────────── */
  const createMutation = useMutation({
    mutationFn: async (input: { email: string; password: string; role: AppRole; full_name: string }) => {
      const { data, error } = await sb.rpc('create_user_with_role', {
        p_email: input.email,
        p_password: input.password,
        p_role: input.role,
        p_full_name: input.full_name || null,
      });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (_data, input) => {
      toast.success('Usuário criado.');
      setCreateOpen(false);
      setCredentialsModal({ email: input.email, password: input.password });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao criar usuário.'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (input: { user_id: string; role: AppRole }) => {
      const { error } = await sb.rpc('update_user_role', {
        p_user_id: input.user_id,
        p_role: input.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role atualizado.');
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao atualizar role.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await sb.rpc('delete_user_admin', { p_user_id: user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Usuário deletado.');
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao deletar.'),
  });

  /* ──────────────────── Stats ──────────────────── */
  const stats = {
    total: users?.length ?? 0,
    super_admins: users?.filter((u) => u.roles.includes('super_admin')).length ?? 0,
    admins: users?.filter((u) => u.roles.includes('admin')).length ?? 0,
    djs: users?.filter((u) => u.roles.includes('dj')).length ?? 0,
  };

  const copyToClipboard = async (text: string, kind: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <EditorialHero
        title="USUÁRIOS"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'IAM · LIVE', tone: 'live' },
          { label: `▸ ${stats.total} usuários`, tone: 'muted' },
          ...(stats.super_admins === 1 ? [{ label: '⚠ apenas 1 super_admin', tone: 'warn' as const }] : []),
        ]}
        ticker={[
          { label: 'super_admin', value: String(stats.super_admins), valueColor: 'hsl(var(--destructive))' },
          { label: 'admin', value: String(stats.admins), valueColor: 'hsl(var(--primary))' },
          { label: 'dj', value: String(stats.djs), valueColor: 'hsl(var(--info))' },
        ]}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Plus className="h-4 w-4" /> Novo Usuário
          </Button>
        }
      />

      {/* Tabela de usuários */}
      {isLoading ? (
        <ListSkeleton rows={6} cols={1} />
      ) : error ? (
        <ErrorState title="Erro ao carregar usuários" error={error} onRetry={() => refetch()} />
      ) : !users?.length ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum usuário ainda"
          description="Crie o primeiro usuário do sistema."
          action={{ label: 'Criar usuário', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3">
          {users.map((u) => {
            const primaryRole = (u.roles[0] as AppRole) ?? 'dj';
            const meta = ROLE_META[primaryRole] ?? ROLE_META.dj;
            const Icon = meta.icon;
            const isCurrent = u.id === currentUser?.id;
            const canDelete = isSuperAdmin && !isCurrent;
            const canEditRole = isSuperAdmin;
            return (
              <Card key={u.id} className="border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar inicial */}
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2"
                      style={{
                        background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}80 100%)`,
                        color: 'white',
                        boxShadow: `0 0 16px ${meta.color}40`,
                      }}
                    >
                      {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                    </div>

                    {/* Email + name + roles */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">
                          {u.email}
                        </p>
                        {isCurrent && (
                          <span className="text-mini font-mono uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded-full border border-primary/30">
                            você
                          </span>
                        )}
                      </div>
                      <p className="text-mini text-muted-foreground mt-0.5">
                        {u.full_name || '—'}
                        {u.last_sign_in_at && (
                          <> · último login {new Date(u.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Roles badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {u.roles.length === 0 ? (
                      <Badge variant="outline" className="text-mini text-muted-foreground">
                        sem role
                      </Badge>
                    ) : (
                      u.roles.map((r) => {
                        const rm = ROLE_META[r as AppRole] ?? ROLE_META.dj;
                        const RIcon = rm.icon;
                        return (
                          <Badge
                            key={r}
                            variant="outline"
                            className="text-mini font-mono uppercase tracking-wider gap-1 border"
                            style={{ background: `${rm.color}15`, color: rm.color, borderColor: `${rm.color}40` }}
                          >
                            <RIcon className="h-3 w-3" />
                            {rm.label}
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {canEditRole && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Editar role"
                        onClick={() => setEditingUser(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Deletar usuário"
                        onClick={() => setDeleteUser(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════════ Dialog: criar novo usuário ════════ */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSuperAdmin={isSuperAdmin}
        onSubmit={(input) => createMutation.mutate(input)}
        loading={createMutation.isPending}
      />

      {/* ════════ Dialog: editar role ════════ */}
      <EditRoleDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        isSuperAdmin={isSuperAdmin}
        onSubmit={(role) => editingUser && updateRoleMutation.mutate({ user_id: editingUser.id, role })}
        loading={updateRoleMutation.isPending}
      />

      {/* ════════ Confirmação: deletar ════════ */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. O usuário <strong className="text-foreground">{deleteUser?.email}</strong> perderá acesso imediatamente
              e todos os dados pessoais serão removidos. Dados relacionados (DJs/bookings/etc.) ficam preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ Modal: credenciais geradas após criar ════════ */}
      <Dialog open={!!credentialsModal} onOpenChange={(open) => !open && setCredentialsModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" /> Usuário criado
            </DialogTitle>
            <DialogDescription>
              Compartilhe estas credenciais com o novo usuário <strong>por canal seguro</strong>.
              Ele deve trocar a senha no primeiro login.
            </DialogDescription>
          </DialogHeader>
          {credentialsModal && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-mini font-mono uppercase tracking-wider text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border font-mono text-sm select-all break-all">
                    {credentialsModal.email}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(credentialsModal.email, 'email')} className="shrink-0">
                    {copied === 'email' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-mini font-mono uppercase tracking-wider text-muted-foreground">Senha temporária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border font-mono text-sm select-all break-all">
                    {credentialsModal.password}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(credentialsModal.password, 'password')} className="shrink-0">
                    {copied === 'password' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <p className="text-mini text-warning flex items-start gap-1.5 mt-2">
                <KeyRound className="h-3 w-3 mt-0.5 shrink-0" />
                Esta senha não será exibida novamente. Anote ou copie agora.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsModal(null)}>OK, anotei</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Dialog: criar usuário
   ════════════════════════════════════════════════════════════════════ */
function CreateUserDialog({
  open, onOpenChange, isSuperAdmin, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  onSubmit: (input: { email: string; password: string; role: AppRole; full_name: string }) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('admin');
  const [password, setPassword] = useState(() => generateTempPassword());
  const [autoPassword, setAutoPassword] = useState(true);

  const reset = () => {
    setEmail(''); setFullName(''); setRole('admin');
    setPassword(generateTempPassword()); setAutoPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('Email inválido.');
      return;
    }
    if (password.length < 8) {
      toast.error('Senha deve ter pelo menos 8 caracteres.');
      return;
    }
    onSubmit({ email: email.trim().toLowerCase(), password, role, full_name: fullName.trim() });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Cria conta + atribui role. Email é auto-confirmado (não precisa de email verification).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="u-email">Email *</Label>
            <Input
              id="u-email" type="email" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@dmusichub.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="u-name">Nome completo</Label>
            <Input
              id="u-name" type="text"
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="João Silva"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="u-role">Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin · acesso total</SelectItem>}
                <SelectItem value="admin">Admin · gestão completa</SelectItem>
                <SelectItem value="finance">Finance · só financeiro</SelectItem>
                <SelectItem value="dj">DJ · portal do DJ</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-mini text-muted-foreground mt-1">{ROLE_META[role]?.description}</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="u-password">Senha temporária *</Label>
              <button
                type="button"
                onClick={() => { setPassword(generateTempPassword()); setAutoPassword(true); }}
                className="text-mini text-primary hover:underline"
              >
                Gerar nova
              </button>
            </div>
            <Input
              id="u-password"
              type="text"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAutoPassword(false); }}
              className={cn('mt-1 font-mono text-sm', autoPassword && 'text-primary')}
            />
            <p className="text-mini text-muted-foreground mt-1">
              O usuário deve trocar a senha no primeiro login.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Dialog: editar role
   ════════════════════════════════════════════════════════════════════ */
function EditRoleDialog({
  user, onOpenChange, isSuperAdmin, onSubmit, loading,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  onSubmit: (role: AppRole) => void;
  loading: boolean;
}) {
  const [role, setRole] = useState<AppRole>('admin');

  // Sync quando o user muda
  if (user && role !== ((user.roles[0] as AppRole) ?? 'admin')) {
    setRole((user.roles[0] as AppRole) ?? 'admin');
  }

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar role</DialogTitle>
          <DialogDescription>
            Alterando o role de <strong>{user?.email}</strong>. O role atual será substituído.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="edit-role">Novo role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              {isSuperAdmin && <SelectItem value="super_admin">Super Admin · acesso total</SelectItem>}
              <SelectItem value="admin">Admin · gestão completa</SelectItem>
              <SelectItem value="finance">Finance · só financeiro</SelectItem>
              <SelectItem value="dj">DJ · portal do DJ</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-mini text-muted-foreground">{ROLE_META[role]?.description}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit(role)} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
