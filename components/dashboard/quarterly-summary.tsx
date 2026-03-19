"use client"

import type { UtilisationResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface QuarterlySummaryProps {
  data: UtilisationResult[]
  year: number
}

function getUtilColor(value: number): string {
  if (value === 0) return 'text-zinc-500'
  if (value < 0.7) return 'text-red-400'
  if (value < 0.89) return 'text-amber-400'
  if (value < 0.95) return 'text-yellow-400'
  if (value <= 1.05) return 'text-teal-400'
  if (value <= 1.1) return 'text-teal-300'
  return 'text-sky-400'
}

export function QuarterlySummary({ data, year }: QuarterlySummaryProps) {
  // Get unique teams in order
  const teamNames: string[] = []
  const teamIds: number[] = []
  for (const d of data) {
    if (!teamIds.includes(d.team_id)) {
      teamIds.push(d.team_id)
      teamNames.push(d.team_name)
    }
  }

  // Build lookup: teamId -> quarter -> UtilisationResult
  const lookup = new Map<string, UtilisationResult>()
  for (const d of data) {
    lookup.set(`${d.team_id}-${d.period}`, d)
  }

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Quarterly Summary — {year}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-[120px]">Team</TableHead>
            {quarters.map((q) => (
              <TableHead key={q} className="text-center text-xs">{q}</TableHead>
            ))}
            <TableHead className="text-center text-xs font-semibold">Full Year</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamIds.map((teamId, idx) => {
            // Calculate full year average from quarters with data
            const quarterValues = quarters
              .map((q) => lookup.get(`${teamId}-${q}`)?.value ?? 0)
              .filter((v) => v > 0)
            const yearAvg = quarterValues.length > 0
              ? quarterValues.reduce((a, b) => a + b, 0) / quarterValues.length
              : 0

            return (
              <TableRow key={teamId} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-xs py-1.5">{teamNames[idx]}</TableCell>
                {quarters.map((q) => {
                  const result = lookup.get(`${teamId}-${q}`)
                  const value = result?.value ?? 0
                  return (
                    <TableCell
                      key={q}
                      className={cn(
                        'text-center text-xs font-mono tabular-nums py-1.5',
                        getUtilColor(value)
                      )}
                    >
                      {value > 0 ? `${Math.round(value * 100)}%` : '—'}
                    </TableCell>
                  )
                })}
                <TableCell
                  className={cn(
                    'text-center text-xs font-mono font-semibold tabular-nums py-1.5',
                    getUtilColor(yearAvg)
                  )}
                >
                  {yearAvg > 0 ? `${Math.round(yearAvg * 100)}%` : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
