import type Database from 'better-sqlite3';
import type { UtilisationResult, Team } from '@/lib/types';
import {
  getWorkingDays,
  getMonthRange,
  getQuarterRange,
  getMonthName,
  isWorkingDay,
} from '@/lib/utils';

const FULL_TIME_HOURS = 37.5;

/**
 * Calculate daily utilisation for a team on a specific date.
 *
 * Uses FTE-weighted headcount so part-time staff (e.g. 18.75h = 0.5 FTE)
 * count proportionally rather than as a full headcount.
 *
 * daily_util = SUM(availability_weight * fte) / SUM(fte)
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

  // Find all active staff members for this team on this date (exclude vacancies)
  const activeStaff = db
    .prepare(
      `SELECT id, contracted_hours FROM staff
       WHERE team_id = ?
         AND is_vacancy = 0
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)`
    )
    .all(teamId, date, date) as { id: number; contracted_hours: number }[];

  // FTE-weighted headcount (e.g. 37.5h = 1.0, 18.75h = 0.5)
  const headcount = activeStaff.reduce(
    (sum, s) => sum + s.contracted_hours / FULL_TIME_HOURS,
    0
  );

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

  for (const s of activeStaff) {
    const fte = s.contracted_hours / FULL_TIME_HOURS;
    const allocation = allocationStmt.get(s.id, date) as
      | { availability_weight: number }
      | undefined;

    // If no allocation exists, assume normal work (weight = 1.0)
    const weight = allocation ? allocation.availability_weight : 1.0;
    totalWeight += weight * fte;

    if (weight > 0) {
      availableCount += weight * fte;
    }
  }

  const value = totalWeight / headcount;

  return {
    team_id: teamId,
    team_name: teamName,
    period: date,
    value,
    headcount: Math.round(headcount * 10) / 10,
    available_count: Math.round(availableCount * 10) / 10,
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
 * Calculate annual utilisation for a team.
 *
 * annual_util = AVG(monthly values with headcount > 0)
 */
export function getAnnualUtilisation(
  db: Database.Database,
  teamId: number,
  year: number
): UtilisationResult {
  const team = db
    .prepare('SELECT id, name FROM teams WHERE id = ?')
    .get(teamId) as Team | undefined;

  const teamName = team?.name ?? 'Unknown';

  const monthlyResults: UtilisationResult[] = [];
  for (let month = 1; month <= 12; month++) {
    monthlyResults.push(getMonthlyUtilisation(db, teamId, year, month));
  }

  const validMonths = monthlyResults.filter((r) => r.headcount > 0);

  if (validMonths.length === 0) {
    return {
      team_id: teamId,
      team_name: teamName,
      period: String(year),
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
    period: String(year),
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
  granularity: 'monthly' | 'quarterly' | 'annual'
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
  } else if (granularity === 'quarterly') {
    for (let quarter = 1; quarter <= 4; quarter++) {
      for (const team of teams) {
        results.push(getQuarterlyUtilisation(db, team.id, year, quarter));
      }
    }
  } else {
    for (const team of teams) {
      results.push(getAnnualUtilisation(db, team.id, year));
    }
  }

  return results;
}
