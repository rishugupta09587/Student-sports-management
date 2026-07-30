import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)'];

interface DistributionBarChartProps {
  title: string;
  data: { label: string; count: number }[];
}

export function DistributionBarChart({ title, data }: DistributionBarChartProps) {
  const chartData = data.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" description="Records will appear here once students are added." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 38)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--accent)' }}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--popover-foreground)',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
