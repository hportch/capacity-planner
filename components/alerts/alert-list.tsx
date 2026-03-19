"use client"

import type { Alert } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

interface AlertListProps {
  alerts: Alert[]
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    default:
      return Info
  }
}

function getSeverityBadge(severity: string): { variant: 'destructive' | 'secondary' | 'outline'; label: string } {
  switch (severity) {
    case 'critical':
      return { variant: 'destructive', label: 'Critical' }
    case 'warning':
      return { variant: 'secondary', label: 'Warning' }
    default:
      return { variant: 'outline', label: 'Info' }
  }
}

function getSeverityBorder(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'border-l-red-500 animate-pulse'
    case 'warning':
      return 'border-l-amber-500'
    default:
      return 'border-l-teal-500'
  }
}

function getSeverityIconColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500'
    case 'warning':
      return 'text-amber-500'
    default:
      return 'text-teal-500'
  }
}

export function AlertList({ alerts }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="size-8 mb-2 text-teal-500 opacity-80" />
        <p className="text-sm font-medium text-teal-500">All clear</p>
        <p className="text-xs text-muted-foreground mt-0.5">No alerts at this time</p>
      </div>
    )
  }

  // Group by severity
  const grouped = {
    critical: alerts.filter((a) => a.severity === 'critical'),
    warning: alerts.filter((a) => a.severity === 'warning'),
    info: alerts.filter((a) => a.severity === 'info'),
  }

  const sections = [
    { key: 'critical' as const, label: 'Critical Alerts', alerts: grouped.critical },
    { key: 'warning' as const, label: 'Warnings', alerts: grouped.warning },
    { key: 'info' as const, label: 'Information', alerts: grouped.info },
  ].filter((s) => s.alerts.length > 0)

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {section.label} ({section.alerts.length})
          </h3>
          <div className="space-y-2">
            {section.alerts.map((alert, i) => {
              const Icon = getSeverityIcon(alert.severity)
              const badge = getSeverityBadge(alert.severity)
              return (
                <Card
                  key={`${alert.type}-${alert.team_id}-${i}`}
                  className={cn('border-l-4', getSeverityBorder(alert.severity))}
                  size="sm"
                >
                  <CardContent className="flex items-start gap-3 pt-3">
                    <Icon className={cn("size-4 mt-0.5 shrink-0", getSeverityIconColor(alert.severity))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{alert.team_name}</span>
                        <Badge variant={badge.variant} className="text-[10px]">
                          {badge.label}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground font-mono">
                          {alert.date_range
                            ? `${formatDate(alert.date_range.from)} — ${formatDate(alert.date_range.to)}`
                            : formatDate(alert.date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
