import type Database from 'better-sqlite3';
import type { UtilisationResult, Team } from '@/lib/types';
import {
  getWorkingDays,
  getMonthRange,
  getQuarterRange,
  getMonthName,
  isWorkingDay,
} from '@/lib/utils';

/**
 * Calculate daily utilisation for a team on a specific date.
 *
 * daily_util = SUM(availability_weight for each active team member) / COUNT(active team members)
 *
 * If a team member has no allocation for a day, they count as available (weight 1.0)
 * — "Normal Work" is the default assumption.
 */
export function getDailyUtilisation(
  db: Database.Database,
  teamId: number,
  date: string
): UtilisationResult {
  // Get team name
  const team = db
    .prepare('SELECT id, name FROM teams WHERE id = ?')
    .get(teamId) as Team | undefined;

  const teamName = team?.name ?? 'Unknown';

  // Find all active staff members for this team on this date
  const activeStaff = db
    .prepare(
      `SELECT id FROM staff
       WHERE team_id = ?
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)`
    )
    .all(teamId, date, date) as { id: number }[];

  const headcount = activeStaff.length;

  if (headcount === 0) {
    return {
      team_id: teamId,
      team_name: teamName,
      period: date,
      value: 0,
      headcount: 0,
      available_count: 0,
    };
  }

  // For each staff member, look up their daily_allocation for that date
  let totalWeight = 0;
  let availableCount = 0;

  const allocationStmt = db.prepare(
    `SELECT s.availability_weight
     FROM daily_allocations da
     JOIN statuses s ON s.id = da.status_id
     WHERE da.staff_id = ?
       AND da.date = ?`
  );

  for (const staff of activeStaff) {
    const allocation = allocationStmt.get(staff.id, date) as
      | { availability_weight: number }
      | undefined;

    // If no allocation exists, assume normal work (weight = 1.0)
    const weight = allocation ? allocation.availability_weight : 1.0;
    totalWeight += weight;

    if (weight > 0) {
      availableCount += weight;
    }
  }

  const value = totalWeight / headcount;

  return {
    team_id: teamId,
    team_name: teamName,
    period: date,
    value,
    headcount,
    available_count: Math.round(availableCount),
  };
}

/**
 * Calculate monthly utilisation for a team.
 *
 * monthly_util = AVG(daily_util for each working day in the month)
 */
export function getMonthlyUtilisation(
  db: Database.Database,
  teamId: number,
  year: number,
  month: number
): UtilisationResult {
  const team = db
    .prepare('SELECT id, name FROM teams WHERE id = ?')
    .get(teamId) as Team | undefined;

  const teamName = team?.name ?? 'Unknown';
  const { from, to } = getMonthRange(year, month);
  const workingDays = getWorkingDays(from, to);

  if (workingDays.length === 0) {
    return {
      team_id: teamId,
      team_name: teamName,
      period: getMonthName(month),
      value: 0,
      headcount: 0,
      available_count: 0,
    };
  }

  let totalValue = 0;
  let totalHeadcount = 0;
  let totalAvailable = 0;

  for (const day of workingDays) {
    const daily = getDailyUtilisation(db, teamId, day);
    totalValue += daily.value;
    totalHeadcount += daily.headcount;
    totalAvailable += daily.available_count;
  }

  const avgValue = totalValue / workingDays.length;
  const avgHeadcount = Math.round(totalHeadcount / workingDays.length);
  const avgAvailable = Math.round(totalAvailable / workingDays.length);

  return {
    team_id: teamId,
    team_name: teamName,
    period: getMonthName(month),
    value: Math.round(avgValue * 1000) / 1000,
    headcount: avgHeadcount,
    available_count: avgAvailable,
  };
}

/**
 * Calculate quarterly utilisation for a team.
 *
 * quarterly_util = AVG(3 monthly values)
 */
export function getQuarterlyUtilisation(
  db: Database.Database,
  teamId: number,
  year: number,
  quarter: number
): UtilisationResult {
  const team = db
    .prepare('SELECT id, name FROM teams WHERE id = ?')
    .get(teamId) as Team | undefined;

  const teamName = team?.name ?? 'Unknown';
  const startMonth = (quarter - 1) * 3 + 1;

  const monthlyResults: UtilisationResult[] = [];

  for (let m = startMonth; m < startMonth + 3; m++) {
    monthlyResults.push(getMonthlyUtilisation(db, teamId, year, m));
  }

  // Only average months that have data (headcount > 0)
  const validMonths = monthlyResults.filter((r) => r.headcount > 0);

  if (validMonths.length === 0) {
    return {
      team_id: teamId,
      team_name: teamName,
      period: `Q${quarter}`,
      value: 0,
      headcount: 0,
      available_count: 0,
    };
  }

  const avgValue =
    validMonths.reduce((sum, r) => sum + r.value, 0) / validMonths.length;
  const avgHeadcount = Math.round(
    validMonths.reduce((sum, r) => sum + r.headcount, 0) / validMonths.length
  );
  const avgAvailable = Math.round(
    validMonths.reduce((sum, r) => sum + r.available_count, 0) /
      validMonths.length
  );

  return {
    team_id: teamId,
    team_name: teamName,
    period: `Q${quarter}`,
    value: Math.round(avgValue * 1000) / 1000,
    headcount: avgHeadcount,
    available_count: avgAvailable,
  };
}

/**
 * Get utilisation for all teams across a period.
 *
 * Returns an array of UtilisationResult objects — one per team per period.
 */
export function getAllTeamsUtilisation(
  db: Database.Database,
  year: number,
  granularity: 'monthly' | 'quarterly'
): UtilisationResult[] {
  const teams = db
    .prepare('SELECT id, name, display_order FROM teams ORDER BY display_order')
    .all() as Team[];

  const results: UtilisationResult[] = [];

  if (granularity === 'monthly') {
    for (let month = 1; month <= 12; month++) {
      for (const team of teams) {
        results.push(getMonthlyUtilisation(db, team.id, year, month));
      }
    }
  } else {
    for (let quarter = 1; quarter <= 4; quarter++) {
      for (const team of teams) {
        results.push(getQuarterlyUtilisation(db, team.id, year, quarter));
      }
    }
  }

  return results;
}
