import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  rows?: number;
  cols?: number;
  className?: string;
}

export function ListSkeleton({ rows = 6, cols = 4, className = '' }: Props) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card/30"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
