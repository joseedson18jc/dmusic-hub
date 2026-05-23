import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative gradient mesh */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(40% 40% at 30% 20%, hsl(var(--primary) / 0.4), transparent), radial-gradient(50% 50% at 70% 80%, hsl(var(--info) / 0.3), transparent)',
        }}
      />

      <div className="relative text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Compass className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1
            className="text-7xl font-bold tracking-tighter tabular-nums"
            style={{ fontFamily: 'Geist, Inter, sans-serif' }}
          >
            <span className="text-primary">4</span>
            <span className="text-foreground/30">0</span>
            <span className="text-primary">4</span>
          </h1>
          <p className="text-xl font-semibold tracking-tight">Página não encontrada</p>
          <p className="text-sm text-muted-foreground">
            A rota{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/90 font-mono text-xs">
              {location.pathname}
            </code>{' '}
            não existe ou foi removida.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            Ir para o início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
