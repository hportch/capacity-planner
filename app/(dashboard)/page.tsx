import { dbAll, dbGet } from '@/lib/db'
import {
  getMonthlyUtilisation,
  getAllTeamsUtilisation,
} from '@/lib/calculations'
import { isWorkingDay } from '@/lib/utils'
import type { Alert, CapacityThreshold, Team, TicketMetric } from '@/lib/types'

import { AlertBanner } from '@/components/dashboard/alert-banner'
import { TeamUtilisationCard } from '@/components/dashboard/team-utilisation-card'
import { CapacityHeatmap } from '@/components/dashboard/capacity-heatmap'
import { TicketSummaryCard } from '@/components/dashboard/ticket-summary-card'
import { QuarterlySummary } from '@/components/dashboard/quarterly-summary'

interface ThresholdWithTeam extends CapacityThreshold {
  team_name: string
}

async function computeAlerts(
  teams: Team[],
  thresholds: ThresholdWithTeam[],
  today: string,
  currentYear: number,
  currentMonth: number
): Promise<Alert[]> {
  const alerts: Alert[] = []
  const now = new Date()

  // 1. Threshold violations
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
    const activeStaff = await dbAll<{ id: number; name: string }>(
      `SELECT id, name FROM staff
       WHERE team_id = ?
         AND is_active = 1
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)`,
      [team.id, endDate, today]
    )

    if (activeStaff.length === 0) continue

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

    const byDate = new Map<string, string[]>()
    for (const alloc of unavailableAllocations) {
      if (!isWorkingDay(alloc.date)) continue
      const existing = byDate.get(alloc.date) || []
      existing.push(alloc.staff_name)
      byDate.set(alloc.date, existing)
    }

    for (const [date, unavailableNames] of byDate) {
      const pct = unavailableNames.length / activeStaff.length
      if (pct > 0.5) {
        alerts.push({
          type: 'leave_conflict',
          severity: pct >= 0.75 ? 'critical' : 'warning',
          team_id: team.id,
          team_name: team.name,
          message: `On ${date}, ${team.name} has ${unavailableNames.length} of ${activeStaff.length} staff unavailable.`,
          date,
        })
      }
    }
  }

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return alerts
}

export default async function DashboardPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const today = now.toISOString().split('T')[0]

  // Get teams
  const teams = await dbAll<Team>(
    'SELECT id, name, display_order FROM teams ORDER BY display_order',
    []
  )

  // Get thresholds
  const thresholds = await dbAll<ThresholdWithTeam>(
    `SELECT ct.*, t.name as team_name
     FROM capacity_thresholds ct
     JOIN teams t ON t.id = ct.team_id
     WHERE ct.effective_to IS NULL OR ct.effective_to >= ?
     ORDER BY t.display_order`,
    [today]
  )

  // Run ALL major data fetches in parallel
  const [teamCards, monthlyData, quarterlyData, ticketMetric, alerts] = await Promise.all([
    // Team utilisation cards (current + previous month per team)
    Promise.all(
      teams.map(async (team) => {
        const [current, previous] = await Promise.all([
          getMonthlyUtilisation(team.id, currentYear, currentMonth),
          getMonthlyUtilisation(team.id, previousMonthYear, previousMonth),
        ])
        return {
          teamName: team.name,
          currentUtil: current.value,
          previousUtil: previous.value,
          headcount: current.headcount,
          available: current.available_count,
        }
      })
    ),
    // Monthly heatmap data for full year
    getAllTeamsUtilisation(currentYear, 'monthly'),
    // Quarterly data
    getAllTeamsUtilisation(currentYear, 'quarterly'),
    // Ticket metrics for current month
    dbGet<TicketMetric>(
      'SELECT * FROM ticket_metrics WHERE year = ? AND month = ?',
      [currentYear, currentMonth]
    ),
    // Alerts
    computeAlerts(teams, thresholds, today, currentYear, currentMonth),
  ])

  const ticketOpened = ticketMetric?.tickets_opened ?? 0
  const ticketClosed = ticketMetric?.tickets_closed ?? 0
  const ticketDeficit = ticketOpened - ticketClosed
  const ticketBaseline = ticketMetric?.capacity_baseline ?? 0

  return (
    <div className="space-y-8">
      {/* Alert banners */}
      <AlertBanner alerts={alerts} />

      {/* Team utilisation cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Team Utilisation — Current Month</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {teamCards.map((card) => (
            <TeamUtilisationCard key={card.teamName} {...card} />
          ))}
        </div>
      </div>

      {/* Capacity heatmap */}
      <CapacityHeatmap data={monthlyData} year={currentYear} />

      {/* Ticket summary + Quarterly summary side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TicketSummaryCard
            opened={ticketOpened}
            closed={ticketClosed}
            deficit={ticketDeficit}
            baseline={ticketBaseline}
          />
        </div>
        <div className="lg:col-span-2">
          <QuarterlySummary data={quarterlyData} year={currentYear} />
        </div>
      </div>
    </div>
  )
}
