import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-6" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        {message && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
