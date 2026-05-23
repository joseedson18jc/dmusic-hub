import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

type AppRole = 'super_admin' | 'admin' | 'finance' | 'dj';

interface Props {
  children: React.ReactNode;
  /**
   * Se passado, o usuário precisa ter pelo menos uma destas roles. Caso contrário
   * a rota apenas exige sessão. Sidebar visibility era o único gate anterior;
   * isto é a 2ª camada (RLS é a 3ª).
   */
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: Props) {
  const { session, roles, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background"
        aria-busy="true"
        aria-live="polite"
      >
        {/* Loading state: rings concêntricos com glow neon — leans nos tokens
            primary + accent + neon glow shadow. */}
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
          <span className="absolute inset-2 rounded-full border border-accent/40 animate-pulse" />
          <span className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-primary shadow-[0_0_18px_2px_hsl(var(--primary)/0.6)]" />
        </div>
        <p className="font-mono-cyber text-micro tracking-[0.3em] uppercase text-muted-foreground">
          Verificando sessão…
        </p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const allowed = requiredRoles.some((r) => roles.includes(r));
    if (!allowed) {
      // DJs vão para o portal deles; todo mundo mais pro dashboard de manager.
      const fallback = roles.includes('dj') ? '/dj' : '/';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
}
