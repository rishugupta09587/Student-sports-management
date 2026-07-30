import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total, limit } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-muted-foreground px-2 text-sm">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
