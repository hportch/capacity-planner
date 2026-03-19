import { NextResponse } from 'next/server'
import { dbAll, dbGet } from '@/lib/db'
import { getMonthlyUtilisation } from '@/lib/calculations'
import { getWorkingDays, isWorkingDay } from '@/lib/utils'
import type { Alert, CapacityThreshold, Team } from '@/lib/types'

interface ThresholdWithTeam extends CapacityThreshold {
  team_name: string
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const alerts: Alert[] = []

  // Get current thresholds
  const thresholds = await dbAll<ThresholdWithTeam>(
    `SELECT ct.*, t.name as team_name
     FROM capacity_thresholds ct
     JOIN teams t ON t.id = ct.team_id
     WHERE ct.effective_to IS NULL OR ct.effective_to >= ?
     ORDER BY t.display_order`,
    [today]
  )

  // Get all teams
  const teams = await dbAll<Team>(
    'SELECT id, name, display_order FROM teams ORDER BY display_order'
  )

  // 1. Threshold violations — current month utilisation vs thresholds
  for (const threshold of thresholds) {
    const util = await getMonthlyUtilisation(threshold.team_id, currentYear, currentMonth)

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

    // 4. Headcount alerts
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

  // 2. Leave conflicts — next 6 weeks, find days where >50% of team unavailable
  const sixWeeksFromNow = new Date(now)
  sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 42)
  const endDate = sixWeeksFromNow.toISOString().split('T')[0]

  for (const team of teams) {
    // Get active staff for this team
    const activeStaff = await dbAll<{ id: number; name: string }>(
      `SELECT id, name FROM staff
       WHERE team_id = ?
         AND is_active = 1
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)`,
      [team.id, endDate, today]
    )

    if (activeStaff.length === 0) continue

    // Get all unavailable allocations in the next 6 weeks for this team's staff
    const staffIds = activeStaff.map((s) => s.id)
    const placeholders = staffIds.map(() => '?').join(',')

    const unavailableAllocations = await dbAll<{ staff_id: number; date: string; staff_name: string }>(
      `SELECT da.staff_id, da.date, s.name as staff_name
       FROM daily_allocations da
       JOIN staff s ON s.id = da.staff_id
       JOIN statuses st ON st.id = da.status_id
       WHERE da.staff_id IN (${placeholders})
         AND da.date >= ?
         AND da.date <= ?
         AND st.availability_weight = 0.0`,
      [...staffIds, today, endDate]
    )

    // Group by date
    const byDate = new Map<string, string[]>()
    for (const alloc of unavailableAllocations) {
      if (!isWorkingDay(alloc.date)) continue
      const existing = byDate.get(alloc.date) || []
      existing.push(alloc.staff_name)
      byDate.set(alloc.date, existing)
    }

    // Check each date
    for (const [date, unavailableStaffNames] of byDate) {
      const pct = unavailableStaffNames.length / activeStaff.length
      if (pct > 0.5) {
        alerts.push({
          type: 'leave_conflict',
          severity: pct >= 0.75 ? 'critical' : 'warning',
          team_id: team.id,
          team_name: team.name,
          message: `On ${date}, ${team.name} has ${unavailableStaffNames.length} of ${activeStaff.length} staff unavailable (${unavailableStaffNames.join(', ')}).`,
          date,
        })
      }
    }
  }

  // 3. Forward-looking capacity gaps — next 6 weeks, weekly projected utilisation
  const thresholdMap = new Map<number, ThresholdWithTeam>()
  for (const t of thresholds) {
    thresholdMap.set(t.team_id, t)
  }

  // Check week by week
  for (let weekOffset = 0; weekOffset < 6; weekOffset++) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() + weekOffset * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]
    const workingDays = getWorkingDays(weekStartStr, weekEndStr)

    if (workingDays.length === 0) continue

    for (const team of teams) {
      const threshold = thresholdMap.get(team.id)
      if (!threshold) continue

      // Get active staff
      const activeStaff = await dbAll<{ id: number }>(
        `SELECT id FROM staff
         WHERE team_id = ?
           AND is_active = 1
           AND start_date <= ?
           AND (end_date IS NULL OR end_date >= ?)`,
        [team.id, weekEndStr, weekStartStr]
      )

      if (activeStaff.length === 0) continue

      // Calculate projected utilisation for this week
      let totalWeight = 0
      let totalSlots = 0

      for (const day of workingDays) {
        for (const staff of activeStaff) {
          const alloc = await dbGet<{ availability_weight: number }>(
            `SELECT s.availability_weight
             FROM daily_allocations da
             JOIN statuses s ON s.id = da.status_id
             WHERE da.staff_id = ?
               AND da.date = ?`,
            [staff.id, day]
          )
          totalWeight += alloc ? alloc.availability_weight : 1.0
          totalSlots++
        }
      }

      const weekUtil = totalSlots > 0 ? totalWeight / totalSlots : 0

      if (weekUtil > 0 && weekUtil < threshold.min_utilisation) {
        // Only add if not already flagged as threshold violation for current month
        const alreadyFlagged = alerts.some(
          (a) => a.type === 'threshold_violation' && a.team_id === team.id
        )
        if (!alreadyFlagged) {
          alerts.push({
            type: 'capacity_gap',
            severity: 'warning',
            team_id: team.id,
            team_name: team.name,
            message: `Projected utilisation for week of ${weekStartStr} is ${Math.round(weekUtil * 100)}%, below threshold of ${Math.round(threshold.min_utilisation * 100)}%.`,
            date: weekStartStr,
            date_range: { from: weekStartStr, to: weekEndStr },
          })
        }
      }
    }
  }

  // Sort: critical first, then warning, then info
  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return NextResponse.json(alerts)
}
