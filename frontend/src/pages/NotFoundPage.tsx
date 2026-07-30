import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <CompassIcon className="text-muted-foreground size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-1 text-sm">The page you're looking for doesn't exist or has been moved.</p>
      </div>
      <Button asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
