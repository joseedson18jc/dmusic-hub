import { Loader2 } from 'lucide-react';

/**
 * Lightweight inline fallback for `<Suspense>` during route chunk loading.
 * Keeps the layout stable instead of going blank.
 */
export function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
    </div>
  );
}
