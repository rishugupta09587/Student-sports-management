import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-5';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  'chart-1': 'bg-[var(--chart-1)]/10 text-[var(--chart-1)]',
  'chart-2': 'bg-[var(--chart-2)]/10 text-[var(--chart-2)]',
  'chart-3': 'bg-[var(--chart-3)]/10 text-[var(--chart-3)]',
  'chart-5': 'bg-[var(--chart-5)]/10 text-[var(--chart-5)]',
};

export function StatCard({ label, value, icon: Icon, accent = 'chart-1' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className={cn('flex size-11 items-center justify-center rounded-xl', ACCENT_CLASSES[accent])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
