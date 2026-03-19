'use client';

import { ReferenceLine, ReferenceArea } from 'recharts';

interface ThresholdReferenceProps {
  min: number;
  ideal: number;
  max: number;
}

/**
 * Composable threshold reference elements for Recharts charts.
 *
 * Returns an array of ReferenceLine and ReferenceArea elements
 * that can be spread inside any Recharts chart component.
 */
export function getThresholdElements({ min, ideal, max }: ThresholdReferenceProps) {
  return {
    areas: [
      // Red zone: below minimum threshold
      <ReferenceArea
        key="zone-under"
        y1={0}
        y2={min}
        fill="#ef4444"
        fillOpacity={0.06}
        ifOverflow="extendDomain"
      />,
      // Green zone: ideal range
      <ReferenceArea
        key="zone-ideal"
        y1={min}
        y2={max}
        fill="#22c55e"
        fillOpacity={0.06}
        ifOverflow="extendDomain"
      />,
      // Amber zone: over-resourced
      <ReferenceArea
        key="zone-over"
        y1={max}
        y2={1.5}
        fill="#f59e0b"
        fillOpacity={0.06}
        ifOverflow="extendDomain"
      />,
    ],
    lines: [
      // Under Resourced threshold — red dashed
      <ReferenceLine
        key="line-under"
        y={min}
        stroke="#ef4444"
        strokeDasharray="6 3"
        strokeWidth={1.5}
        label={{
          value: `Under (${Math.round(min * 100)}%)`,
          position: 'insideTopRight',
          fill: '#ef4444',
          fontSize: 11,
        }}
      />,
      // Ideal threshold — green solid
      <ReferenceLine
        key="line-ideal"
        y={ideal}
        stroke="#22c55e"
        strokeWidth={1.5}
        label={{
          value: `Ideal (${Math.round(ideal * 100)}%)`,
          position: 'insideTopRight',
          fill: '#22c55e',
          fontSize: 11,
        }}
      />,
      // Over Resourced threshold — amber dashed
      <ReferenceLine
        key="line-over"
        y={max}
        stroke="#f59e0b"
        strokeDasharray="6 3"
        strokeWidth={1.5}
        label={{
          value: `Over (${Math.round(max * 100)}%)`,
          position: 'insideBottomRight',
          fill: '#f59e0b',
          fontSize: 11,
        }}
      />,
    ],
  };
}
