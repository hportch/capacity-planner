import { getDb } from '@/lib/db'
import { getDailyUtilisation } from '@/lib/calculations'
import { getMonthlyUtilisation } from '@/lib/calculations'
import { isWorkingDay } from '@/lib/utils'
import type { Alert, CapacityThreshold, Team, Status } from '@/lib/types'

import { AlertList } from '@/components/alerts/alert-list'
import { ConflictDetector } from '@/components/alerts/conflict-detector'
import { LoanSuggestions, type LoanSuggestion } from '@/components/alerts/loan-suggestions'

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

  // 3. Loan suggestions — for dates where a team is below threshold,
  // find available staff from other teams who could be loaned
  const loanSuggestions: LoanSuggestion[] = []

  // Get the "Loaned" status ID
  const loanedStatus = db
    .prepare(`SELECT id FROM statuses WHERE category = 'loaned' LIMIT 1`)
    .get() as { id: number } | undefined
  const loanedStatusId = loanedStatus?.id ?? null

  // Check next 2 weeks of working days for shortfalls
  const twoWeeksFromNow = new Date(now)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  for (let d = new Date(now); d <= twoWeeksFromNow; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    if (!isWorkingDay(dateStr)) continue

    for (const threshold of thresholds) {
      const util = getDailyUtilisation(db, threshold.team_id, dateStr)
      if (util.headcount === 0) continue
      if (util.value >= threshold.min_utilisation) continue

      // This team is below threshold on this date — find available staff from other teams
      for (const otherTeam of teams) {
        if (otherTeam.id === threshold.team_id) continue

        const candidates = db
          .prepare(
            `SELECT s.id, s.name, s.role_id, r.name AS role_name
             FROM staff s
             JOIN roles r ON r.id = s.role_id
             WHERE s.team_id = ?
               AND s.is_active = 1
               AND s.is_vacancy = 0
               AND s.start_date <= ?
               AND (s.end_date IS NULL OR s.end_date >= ?)`
          )
          .all(otherTeam.id, dateStr, dateStr) as { id: number; name: string; role_id: number; role_name: string }[]

        for (const candidate of candidates) {
          // Check if this person is available on this date (weight > 0)
          const alloc = db
            .prepare(
              `SELECT st.availability_weight
               FROM daily_allocations da
               JOIN statuses st ON st.id = da.status_id
               WHERE da.staff_id = ? AND da.date = ?`
            )
            .get(candidate.id, dateStr) as { availability_weight: number } | undefined

          const weight = alloc ? alloc.availability_weight : 1.0
          if (weight <= 0) continue // Already unavailable, can't loan

          // Only suggest if their own team stays above threshold after loaning
          const otherUtil = getDailyUtilisation(db, otherTeam.id, dateStr)
          const otherThreshold = thresholds.find((t) => t.team_id === otherTeam.id)
          if (otherThreshold && otherUtil.headcount > 0) {
            // Simulate removing this person: reduce available by their weight
            const fte = 1.0 // Simplified - just check if they can be spared
            const newUtil = otherUtil.headcount > 0
              ? (otherUtil.value * otherUtil.headcount - weight * fte) / (otherUtil.headcount)
              : 0
            if (newUtil < (otherThreshold.min_utilisation ?? 0)) continue // Would drop their team below threshold
          }

          loanSuggestions.push({
            date: dateStr,
            target_team_id: threshold.team_id,
            target_team_name: threshold.team_name,
            target_team_utilisation: util.value,
            target_team_threshold: threshold.min_utilisation,
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            candidate_team_name: otherTeam.name,
            candidate_role: candidate.role_name,
          })
        }
      }
    }
  }

  // Deduplicate: only show top 3 candidates per team per date
  const dedupedSuggestions: LoanSuggestion[] = []
  const seen = new Map<string, number>()
  for (const s of loanSuggestions) {
    const key = `${s.target_team_id}_${s.date}`
    const count = seen.get(key) ?? 0
    if (count < 3) {
      dedupedSuggestions.push(s)
      seen.set(key, count + 1)
    }
  }

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
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Loan Suggestions</h2>
        <p className="text-xs text-muted-foreground mb-4">
          When a team is below threshold, available staff from other teams are suggested as loan candidates.
          Apply to mark them as &quot;Loaned&quot; for that date.
        </p>
        <LoanSuggestions suggestions={dedupedSuggestions} loanedStatusId={loanedStatusId} />
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
