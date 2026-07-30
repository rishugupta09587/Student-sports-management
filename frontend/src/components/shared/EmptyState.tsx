import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-6" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
