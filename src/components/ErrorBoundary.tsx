import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

/**
 * App-level boundary. Catches render errors that would otherwise unmount the
 * whole tree (a single broken page should not blank the entire app).
 *
 * In dev we show the error message; in production we show a generic recovery
 * card. Reload is the only escape hatch — recovering in-place would require
 * resetting all in-flight queries, and a fresh load is simpler and safer.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isDev = import.meta.env.DEV;
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-background p-6"
      >
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8">
          <div className="h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold mb-1">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Recarregue a página para continuar. Se o problema persistir, contate o suporte.
            </p>
          </div>
          {isDev && (
            <pre className="text-micro text-destructive/70 max-h-40 overflow-auto px-3 py-2 rounded bg-destructive/5 border border-destructive/20 text-left">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar
          </Button>
        </div>
      </div>
    );
  }
}
