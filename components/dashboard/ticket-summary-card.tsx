import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Ticket } from 'lucide-react'

interface TicketSummaryCardProps {
  opened: number
  closed: number
  deficit: number
  baseline: number
}

export function TicketSummaryCard({ opened, closed, deficit, baseline }: TicketSummaryCardProps) {
  const openedPct = baseline > 0 ? Math.min((opened / baseline) * 100, 100) : 0

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="size-4 text-muted-foreground" />
          Ticket Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Opened</div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="size-3.5 text-amber-400" />
              <span className="text-2xl font-bold font-mono tabular-nums">{opened.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Closed</div>
            <div className="flex items-center gap-1">
              <ArrowDownRight className="size-3.5 text-teal-400" />
              <span className="text-2xl font-bold font-mono tabular-nums">{closed.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Deficit</div>
            <div className={cn(
              'text-2xl font-bold font-mono tabular-nums',
              deficit > 0 ? 'text-red-400 animate-pulse' : deficit < 0 ? 'text-teal-400' : 'text-zinc-400'
            )}>
              {deficit > 0 ? '+' : ''}{deficit.toLocaleString()}
            </div>
          </div>
        </div>
        {baseline > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Opened vs baseline</span>
              <span className="font-mono tabular-nums">{opened} / {baseline}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  openedPct > 90 ? 'bg-red-500' : openedPct > 70 ? 'bg-amber-500' : 'bg-teal-500'
                )}
                style={{ width: `${openedPct}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Baseline capacity</span>
            <span className="font-mono tabular-nums">{baseline.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
