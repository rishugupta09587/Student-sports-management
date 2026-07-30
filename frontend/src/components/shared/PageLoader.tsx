import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}
