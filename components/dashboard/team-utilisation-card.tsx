import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TeamUtilisationCardProps {
  teamName: string
  currentUtil: number
  previousUtil: number
  headcount: number
  available: number
}

function getStatusColor(value: number): string {
  if (value < 0.7) return 'text-red-400'
  if (value < 0.9) return 'text-amber-400'
  if (value <= 1.05) return 'text-teal-400'
  return 'text-sky-400'
}

function getStatusBadge(value: number): { label: string; className: string } {
  if (value < 0.7) return { label: 'Critical', className: 'bg-red-900/60 text-red-300 border-red-700/50' }
  if (value < 0.9) return { label: 'Below Target', className: 'bg-amber-900/60 text-amber-300 border-amber-700/50' }
  if (value <= 1.05) return { label: 'On Target', className: 'bg-teal-900/60 text-teal-300 border-teal-700/50' }
  return { label: 'Over', className: 'bg-sky-900/60 text-sky-300 border-sky-700/50' }
}

function getTopBorderColor(value: number): string {
  if (value < 0.7) return 'border-t-red-500'
  if (value < 0.9) return 'border-t-amber-500'
  if (value <= 1.05) return 'border-t-teal-500'
  return 'border-t-sky-500'
}

export function TeamUtilisationCard({
  teamName,
  currentUtil,
  previousUtil,
  headcount,
  available,
}: TeamUtilisationCardProps) {
  const diff = currentUtil - previousUtil
  const badge = getStatusBadge(currentUtil)

  const isNegativeTrend = diff < -0.01

  return (
    <Card size="sm" className={cn(
      'hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200 border-t-[3px]',
      getTopBorderColor(currentUtil)
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{teamName}</span>
          <Badge className={cn('shrink-0 text-[10px] border', badge.className)}>
            {badge.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className={cn('text-4xl font-bold font-mono tabular-nums', getStatusColor(currentUtil))}>
              {currentUtil > 0 ? `${Math.round(currentUtil * 100)}%` : '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              {available}/{headcount} available
            </div>
          </div>
          <div className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground',
            isNegativeTrend && 'animate-pulse'
          )}>
            {diff > 0.01 ? (
              <TrendingUp className="size-3.5 text-teal-400" />
            ) : diff < -0.01 ? (
              <TrendingDown className="size-3.5 text-red-400" />
            ) : (
              <Minus className="size-3.5 text-zinc-500" />
            )}
            <span className="font-mono tabular-nums">
              {diff > 0 ? '+' : ''}{Math.round(diff * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
