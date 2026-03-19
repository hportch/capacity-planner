'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { UtilisationResult } from '@/lib/types';
import { UTILISATION_THRESHOLDS } from '@/lib/constants';
import { getThresholdElements } from './threshold-reference';

// Distinct colors for each team line, dark-mode friendly
const TEAM_COLORS: Record<string, string> = {
  'Service Desk': '#14b8a6', // teal (primary)
  OST: '#8b5cf6', // violet
  'OST BaB': '#ec4899', // pink
  Projects: '#06b6d4', // cyan
  MGMT: '#f97316', // orange
};

const DEFAULT_COLORS = [
  '#14b8a6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#2dd4bf',
  '#eab308',
  '#64748b',
];

interface UtilisationLineChartProps {
  data: UtilisationResult[];
  granularity: 'monthly' | 'quarterly';
}

/**
 * Recharts LineChart showing utilisation over time.
 * One line per team, color-coded, with threshold reference areas and lines.
 */
export function UtilisationLineChart({
  data,
  granularity,
}: UtilisationLineChartProps) {
  // Determine periods and teams from the data
  const periods = granularity === 'monthly'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Q1', 'Q2', 'Q3', 'Q4'];

  // Get unique team names preserving order from data
  const teamNames: string[] = [];
  const seenTeams = new Set<string>();
  for (const item of data) {
    if (!seenTeams.has(item.team_name)) {
      seenTeams.add(item.team_name);
      teamNames.push(item.team_name);
    }
  }

  // Transform data into chart format: one object per period with team values
  const chartData = periods.map((period) => {
    const entry: Record<string, string | number> = { period };
    for (const teamName of teamNames) {
      const match = data.find(
        (d) => d.period === period && d.team_name === teamName
      );
      if (match && match.headcount > 0) {
        entry[teamName] = match.value;
      }
    }
    return entry;
  });

  const thresholds = getThresholdElements({
    min: UTILISATION_THRESHOLDS.under,
    ideal: UTILISATION_THRESHOLDS.ideal,
    max: UTILISATION_THRESHOLDS.over,
  });

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart
        data={chartData}
        margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />

        {/* Threshold reference areas (behind everything) */}
        {thresholds.areas}

        <XAxis
          dataKey="period"
          stroke="rgba(255,255,255,0.5)"
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
          tickLine={false}
        />

        <YAxis
          domain={[0, 1.5]}
          ticks={[0, 0.25, 0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5]}
          tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
          stroke="rgba(255,255,255,0.5)"
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
          tickLine={false}
          width={48}
        />

        {/* Threshold reference lines */}
        {thresholds.lines}

        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(24, 24, 27, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            color: '#f4f4f5',
            fontSize: 13,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
          labelStyle={{ color: '#a1a1aa', fontWeight: 600, marginBottom: 4 }}
          formatter={(value) => {
            const num = typeof value === 'number' ? value : Number(value);
            return `${(num * 100).toFixed(1)}%`;
          }}
        />

        <Legend
          wrapperStyle={{ color: '#d4d4d8', fontSize: 13, paddingTop: 8 }}
        />

        {/* One line per team */}
        {teamNames.map((teamName, index) => {
          const color =
            TEAM_COLORS[teamName] ??
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <Line
              key={teamName}
              type="monotone"
              dataKey={teamName}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
              animationDuration={800}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
