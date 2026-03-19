import { getDb } from '@/lib/db'
import { getMonthlyUtilisation } from '@/lib/calculations'
import { isWorkingDay } from '@/lib/utils'
import type { Alert, CapacityThreshold, Team } from '@/lib/types'

import { AlertList } from '@/components/alerts/alert-list'
import { ConflictDetector } from '@/components/alerts/conflict-detector'

interface ThresholdWithTeam extends CapacityThreshold {
  team_name: string
}

interface ConflictEntry {
  date: string
  team_name: string
  team_id: number
  unavailable_staff: string[]
  total_staff: number
}

export default function AlertsPage() {
  const db = getDb()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const today = now.toISOString().split('T')[0]

  const alerts: Alert[] = []
  const conflicts: ConflictEntry[] = []

  // Get teams and thresholds
  const teams = db
    .prepare('SELECT id, name, display_order FROM teams ORDER BY display_order')
    .all() as Team[]

  const thresholds = db
    .prepare(
      `SELECT ct.*, t.name as team_name
       FROM capacity_thresholds ct
       JOIN teams t ON t.id = ct.team_id
       WHERE ct.effective_to IS NULL OR ct.effective_to >= ?
       ORDER BY t.display_order`
    )
    .all(today) as ThresholdWithTeam[]

  // 1. Threshold violations
  for (const threshold of thresholds) {
    const util = getMonthlyUtilisation(db, threshold.team_id, currentYear, currentMonth)

    if (util.headcount > 0 && util.value < threshold.min_utilisation) {
      const severity = util.value < threshold.min_utilisation * 0.8 ? 'critical' : 'warning'
      alerts.push({
        type: 'threshold_violation',
        severity,
        team_id: threshold.team_id,
        team_name: threshold.team_name,
        message: `Current utilisation is ${Math.round(util.value * 100)}%, below minimum threshold of ${Math.round(threshold.min_utilisation * 100)}%.`,
        date: today,
      })
    }

    // Headcount alerts
    if (threshold.min_headcount !== null && util.headcount < threshold.min_headcount) {
      alerts.push({
        type: 'capacity_gap',
        severity: 'critical',
        team_id: threshold.team_id,
        team_name: threshold.team_name,
        message: `Active headcount is ${util.headcount}, below minimum required headcount of ${threshold.min_headcount}.`,
        date: today,
      })
    }
  }

  // 2. Leave conflicts — next 6 weeks
  const sixWeeksFromNow = new Date(now)
  sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 42)
  const endDate = sixWeeksFromNow.toISOString().split('T')[0]

  for (const team of teams) {
    const activeStaff = db
      .prepare(
        `SELECT id, name FROM staff
         WHERE team_id = ?
           AND is_active = 1
           AND start_date <= ?
           AND (end_date IS NULL OR end_date >= ?)`
      )
      .all(team.id, endDate, today) as { id: number; name: string }[]

    if (activeStaff.length === 0) continue

    const staffIds = activeStaff.map((s) => s.id)
    const placeholders = staffIds.map(() => '?').join(',')

    const unavailableAllocations = db
      .prepare(
        `SELECT da.staff_id, da.date, s.name as staff_name
         FROM daily_allocations da
         JOIN staff s ON s.id = da.staff_id
         JOIN statuses st ON st.id = da.status_id
         WHERE da.staff_id IN (${placeholders})
           AND da.date >= ?
           AND da.date <= ?
           AND st.availability_weight = 0.0`
      )
      .all(...staffIds, today, endDate) as { staff_id: number; date: string; staff_name: string }[]

    // Group by date
    const byDate = new Map<string, string[]>()
    for (const alloc of unavailableAllocations) {
      if (!isWorkingDay(alloc.date)) continue
      const existing = byDate.get(alloc.date) || []
      existing.push(alloc.staff_name)
      byDate.set(alloc.date, existing)
    }

    for (const [date, unavailableNames] of byDate) {
      const pct = unavailableNames.length / activeStaff.length

      // Add to conflicts list (all leave overlaps, not just >50%)
      conflicts.push({
        date,
        team_name: team.name,
        team_id: team.id,
        unavailable_staff: unavailableNames,
        total_staff: activeStaff.length,
      })

      // Alert only when >50%
      if (pct > 0.5) {
        alerts.push({
          type: 'leave_conflict',
          severity: pct >= 0.75 ? 'critical' : 'warning',
          team_id: team.id,
          team_name: team.name,
          message: `On ${date}, ${team.name} has ${unavailableNames.length} of ${activeStaff.length} staff unavailable (${unavailableNames.join(', ')}).`,
          date,
        })
      }
    }
  }

  // Sort alerts by severity
  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  // Sort conflicts by date
  conflicts.sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Active Alerts</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} across {teams.length} teams
        </p>
        <AlertList alerts={alerts} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Leave Conflict Detector</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Showing all upcoming leave overlaps for the next 6 weeks
        </p>
        <ConflictDetector conflicts={conflicts} />
      </div>
    </div>
  )
}
