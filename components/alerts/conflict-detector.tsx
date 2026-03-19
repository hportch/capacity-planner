"use client"

import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle } from 'lucide-react'

interface ConflictEntry {
  date: string
  team_name: string
  team_id: number
  unavailable_staff: string[]
  total_staff: number
}

interface ConflictDetectorProps {
  conflicts: ConflictEntry[]
}

export function ConflictDetector({ conflicts }: ConflictDetectorProps) {
  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-teal-500">No upcoming leave conflicts detected in the next 6 weeks.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-400" />
        <h3 className="text-sm font-medium">Upcoming Leave Conflicts</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Next 6 weeks
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Team</TableHead>
            <TableHead className="text-xs">Staff on Leave</TableHead>
            <TableHead className="text-xs text-right">Unavailable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conflicts.map((conflict, i) => {
            const pct = conflict.unavailable_staff.length / conflict.total_staff
            const isHighConflict = pct > 0.5
            return (
              <TableRow
                key={`${conflict.date}-${conflict.team_id}-${i}`}
                className={cn(isHighConflict && 'bg-red-950/20')}
              >
                <TableCell className="text-xs font-mono py-1.5">
                  {formatDate(conflict.date)}
                </TableCell>
                <TableCell className="text-xs font-medium py-1.5">
                  {conflict.team_name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">
                  {conflict.unavailable_staff.join(', ')}
                </TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <span
                    className={cn(
                      'font-mono tabular-nums font-medium',
                      isHighConflict ? 'text-red-400' : 'text-teal-400'
                    )}
                  >
                    {conflict.unavailable_staff.length}/{conflict.total_staff}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({Math.round(pct * 100)}%)
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
