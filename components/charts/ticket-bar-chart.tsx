'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { TicketMetric } from '@/lib/types';
import { getMonthName } from '@/lib/utils';

interface TicketBarChartProps {
  data: TicketMetric[];
}

interface ChartDataPoint {
  month: string;
  opened: number;
  closed: number;
  deficit: number;
  baseline: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/92 p-3 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TicketBarChart({ data }: TicketBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No ticket data available for this year.
      </div>
    );
  }

  const baseline = data[0]?.capacity_baseline ?? 0;
  const hasVaryingBaseline = data.some((d) => d.capacity_baseline !== baseline);

  const chartData: ChartDataPoint[] = data.map((d) => ({
    month: getMonthName(d.month),
    opened: d.tickets_opened,
    closed: d.tickets_closed,
    deficit: d.tickets_opened - d.tickets_closed,
    baseline: d.capacity_baseline,
  }));

  const allValues = data.flatMap((d) => [
    d.tickets_opened,
    d.tickets_closed,
    d.capacity_baseline,
  ]);
  const maxValue = Math.max(...allValues);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--muted-foreground) / 0.07)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--muted-foreground) / 0.2)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--muted-foreground) / 0.2)' }}
          tickLine={false}
          domain={[0, Math.ceil(maxValue * 1.1)]}
          tickFormatter={(value: number) => value.toLocaleString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 12 }}
          formatter={(value: string) => (
            <span className="text-sm text-muted-foreground">{value}</span>
          )}
        />
        {!hasVaryingBaseline && (
          <ReferenceLine
            y={baseline}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="8 4"
            strokeWidth={1.5}
            label={{
              value: `Capacity: ${baseline.toLocaleString()}`,
              position: 'insideTopRight',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 11,
            }}
          />
        )}
        <Bar
          dataKey="opened"
          name="Opened"
          fill="#14b8a6"
          radius={[4, 4, 0, 0]}
          barSize={20}
          animationDuration={800}
        />
        <Bar
          dataKey="closed"
          name="Closed"
          fill="#2dd4bf"
          radius={[4, 4, 0, 0]}
          barSize={20}
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="deficit"
          name="Deficit"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
          activeDot={{ fill: '#f97316', r: 5, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
