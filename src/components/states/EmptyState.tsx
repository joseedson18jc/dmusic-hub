import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border/50 bg-card/20">
      <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
