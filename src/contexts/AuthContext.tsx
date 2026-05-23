import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

type AppRole = 'super_admin' | 'admin' | 'finance' | 'dj';

/**
 * BOOTSTRAP_SUPERADMIN_EMAILS — fallback pra quando ainda não temos
 * acesso ao Supabase Dashboard pra criar entry em `public.user_roles`.
 *
 * Qualquer user logado com um desses emails ganha TODAS as roles via
 * email match (sem precisar de row no DB). Remova esse fallback depois
 * de criar o seed `user_roles` no Supabase.
 */
const BOOTSTRAP_SUPERADMIN_EMAILS = new Set<string>([
  'jose118@hotmail.com',
]);

const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'finance', 'dj'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabaseAny
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) {
      console.error('[AuthContext] fetchRoles failed:', error.message);
      return;
    }
    if (data) {
      setRoles(data.map((r: { role: AppRole }) => r.role));
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer to next microtask para evitar race com o setState acima.
        setTimeout(() => fetchRoles(session.user.id), 0);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    // Restringe signup pra apenas os emails na allowlist de bootstrap.
    // Outros precisam ser criados via Supabase Dashboard pelo admin.
    if (!BOOTSTRAP_SUPERADMIN_EMAILS.has(email.toLowerCase())) {
      return {
        error: new Error('Cadastro restrito. Solicite acesso ao admin.'),
        needsEmailConfirm: false,
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    // Se o Supabase retornou user mas sem session, precisa confirmar email.
    const needsEmailConfirm = !!data?.user && !data?.session;
    return { error: error as Error | null, needsEmailConfirm };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  // Bootstrap fallback: user com email na allowlist ganha TODAS as roles.
  // Garante que conseguimos entrar no app mesmo sem user_roles no Supabase.
  const isBootstrap = !!user?.email && BOOTSTRAP_SUPERADMIN_EMAILS.has(user.email.toLowerCase());
  const effectiveRoles: AppRole[] = isBootstrap
    ? Array.from(new Set([...roles, ...ALL_ROLES]))
    : roles;

  const hasRole = (role: AppRole) => effectiveRoles.includes(role);
  const isAdmin = hasRole('super_admin') || hasRole('admin');

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles: effectiveRoles,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        hasRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
