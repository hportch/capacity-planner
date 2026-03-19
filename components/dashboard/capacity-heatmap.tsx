"use client"

import type { UtilisationResult } from '@/lib/types'
import { cn, getMonthName } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function getUtilColor(value: number): string {
  if (value === 0) return 'bg-zinc-800 text-zinc-500'
  if (value < 0.7) return 'bg-red-900/60 text-red-300'
  if (value < 0.89) return 'bg-amber-900/50 text-amber-300'
  if (value < 0.95) return 'bg-yellow-900/50 text-yellow-300'
  if (value <= 1.05) return 'bg-teal-900/50 text-teal-300'
  if (value <= 1.1) return 'bg-teal-800/50 text-teal-200'
  return 'bg-sky-900/50 text-sky-300'
}

interface CapacityHeatmapProps {
  data: UtilisationResult[]
  year: number
}

export function CapacityHeatmap({ data, year }: CapacityHeatmapProps) {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Get unique team names preserving order
  const teamNames: string[] = []
  const teamIds: number[] = []
  for (const d of data) {
    if (!teamIds.includes(d.team_id)) {
      teamIds.push(d.team_id)
      teamNames.push(d.team_name)
    }
  }

  // Build a lookup map: teamId -> monthName -> UtilisationResult
  const lookup = new Map<string, UtilisationResult>()
  for (const d of data) {
    lookup.set(`${d.team_id}-${d.period}`, d)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Capacity Heatmap — {year}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] text-xs">Team</TableHead>
            {months.map((m) => (
              <TableHead
                key={m}
                className={cn(
                  'text-center text-xs px-1 min-w-[60px]',
                  year === currentYear && m === currentMonth && 'bg-primary/10'
                )}
              >
                {getMonthName(m)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamIds.map((teamId, idx) => (
            <TableRow key={teamId} className="group hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-xs py-1.5">
                {teamNames[idx]}
              </TableCell>
              {months.map((m) => {
                const key = `${teamId}-${getMonthName(m)}`
                const result = lookup.get(key)
                const value = result?.value ?? 0
                const isCurrentMonth = year === currentYear && m === currentMonth

                return (
                  <TableCell
                    key={m}
                    className={cn(
                      'text-center text-xs font-mono tabular-nums py-1.5 px-1 transition-all duration-150 hover:scale-110 hover:shadow-md hover:z-10 relative',
                      getUtilColor(value),
                      isCurrentMonth && 'ring-2 ring-teal-400/70 ring-inset shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                    )}
                  >
                    {value > 0 ? `${Math.round(value * 100)}%` : '—'}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
