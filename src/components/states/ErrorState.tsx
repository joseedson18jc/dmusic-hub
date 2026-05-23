import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Tente novamente em alguns instantes.',
  error,
  onRetry,
}: Props) {
  const devMessage =
    import.meta.env.DEV && error
      ? error instanceof Error
        ? error.message
        : String(error)
      : null;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-destructive/30 bg-destructive/5"
    >
      <div className="h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      {devMessage && (
        <pre className="text-micro text-destructive/70 max-w-md overflow-x-auto mb-4 px-3 py-2 rounded bg-destructive/5 border border-destructive/20">
          {devMessage}
        </pre>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-2" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
