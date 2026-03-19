"use client"

import type { Alert } from '@/lib/types'
import {
  Alert as AlertComponent,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface AlertBannerProps {
  alerts: Alert[]
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        className: 'border-red-800 bg-red-950/50 text-red-300',
        icon: AlertCircle,
      }
    case 'warning':
      return {
        className: 'border-amber-800 bg-amber-950/50 text-amber-300',
        icon: AlertTriangle,
      }
    case 'info':
      return {
        className: 'border-teal-800 bg-teal-950/50 text-teal-300',
        icon: Info,
      }
    default:
      return {
        className: 'border-teal-800 bg-teal-950/50 text-teal-300',
        icon: Info,
      }
  }
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null

  // Sort: critical first, then warning, then info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  // Show max 5 alerts in the banner
  const displayAlerts = sortedAlerts.slice(0, 5)
  const remaining = sortedAlerts.length - displayAlerts.length

  return (
    <div className="flex flex-col gap-2">
      {displayAlerts.map((alert, i) => {
        const { className, icon: Icon } = getSeverityStyles(alert.severity)
        return (
          <AlertComponent key={`${alert.type}-${alert.team_id}-${i}`} className={cn(className)}>
            <Icon className="size-4" />
            <AlertTitle className="text-xs font-semibold">
              {alert.team_name} — {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
            </AlertTitle>
            <AlertDescription className="text-xs opacity-90">
              {alert.message}
            </AlertDescription>
          </AlertComponent>
        )
      })}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-1">
          + {remaining} more alert{remaining > 1 ? 's' : ''}. <a href="/alerts" className="underline hover:text-foreground">View all</a>
        </p>
      )}
    </div>
  )
}
