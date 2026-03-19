import { dbAll, dbGet } from '@/lib/db';
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
 */
export async function getDailyUtilisation(
  teamId: number,
  date: string
): Promise<UtilisationResult> {
  const team = await dbGet<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team?.name ?? 'Unknown';

  const activeStaff = await dbAll<{ id: number; contracted_hours: number }>(
    `SELECT id, contracted_hours FROM staff
     WHERE team_id = ?
       AND is_vacancy = 0
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)`,
    [teamId, date, date]
  );

  const headcount = activeStaff.reduce(
    (sum, s) => sum + (s.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS,
    0
  );

  if (headcount === 0) {
    return { team_id: teamId, team_name: teamName, period: date, value: 0, headcount: 0, available_count: 0 };
  }

  let totalWeight = 0;
  let availableCount = 0;

  for (const s of activeStaff) {
    const fte = (s.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS;
    const allocation = await dbGet<{ availability_weight: number }>(
      `SELECT s.availability_weight
       FROM daily_allocations da
       JOIN statuses s ON s.id = da.status_id
       WHERE da.staff_id = ? AND da.date = ?`,
      [s.id, date]
    );

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
 */
export async function getMonthlyUtilisation(
  teamId: number,
  year: number,
  month: number
): Promise<UtilisationResult> {
  const team = await dbGet<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team?.name ?? 'Unknown';
  const { from, to } = getMonthRange(year, month);
  const workingDays = getWorkingDays(from, to);

  if (workingDays.length === 0) {
    return { team_id: teamId, team_name: teamName, period: getMonthName(month), value: 0, headcount: 0, available_count: 0 };
  }

  let totalValue = 0;
  let totalHeadcount = 0;
  let totalAvailable = 0;

  for (const day of workingDays) {
    const daily = await getDailyUtilisation(teamId, day);
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
 */
export async function getQuarterlyUtilisation(
  teamId: number,
  year: number,
  quarter: number
): Promise<UtilisationResult> {
  const team = await dbGet<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team?.name ?? 'Unknown';
  const startMonth = (quarter - 1) * 3 + 1;

  const monthlyResults: UtilisationResult[] = [];
  for (let m = startMonth; m < startMonth + 3; m++) {
    monthlyResults.push(await getMonthlyUtilisation(teamId, year, m));
  }

  const validMonths = monthlyResults.filter((r) => r.headcount > 0);

  if (validMonths.length === 0) {
    return { team_id: teamId, team_name: teamName, period: `Q${quarter}`, value: 0, headcount: 0, available_count: 0 };
  }

  const avgValue = validMonths.reduce((sum, r) => sum + r.value, 0) / validMonths.length;
  const avgHeadcount = Math.round(validMonths.reduce((sum, r) => sum + r.headcount, 0) / validMonths.length);
  const avgAvailable = Math.round(validMonths.reduce((sum, r) => sum + r.available_count, 0) / validMonths.length);

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
 */
export async function getAnnualUtilisation(
  teamId: number,
  year: number
): Promise<UtilisationResult> {
  const team = await dbGet<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team?.name ?? 'Unknown';

  const monthlyResults: UtilisationResult[] = [];
  for (let month = 1; month <= 12; month++) {
    monthlyResults.push(await getMonthlyUtilisation(teamId, year, month));
  }

  const validMonths = monthlyResults.filter((r) => r.headcount > 0);

  if (validMonths.length === 0) {
    return { team_id: teamId, team_name: teamName, period: String(year), value: 0, headcount: 0, available_count: 0 };
  }

  const avgValue = validMonths.reduce((sum, r) => sum + r.value, 0) / validMonths.length;
  const avgHeadcount = Math.round(validMonths.reduce((sum, r) => sum + r.headcount, 0) / validMonths.length);
  const avgAvailable = Math.round(validMonths.reduce((sum, r) => sum + r.available_count, 0) / validMonths.length);

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
 */
export async function getAllTeamsUtilisation(
  year: number,
  granularity: 'monthly' | 'quarterly' | 'annual'
): Promise<UtilisationResult[]> {
  const teams = await dbAll<Team>('SELECT id, name, display_order FROM teams ORDER BY display_order');
  const results: UtilisationResult[] = [];

  if (granularity === 'monthly') {
    for (let month = 1; month <= 12; month++) {
      for (const team of teams) {
        results.push(await getMonthlyUtilisation(team.id, year, month));
      }
    }
  } else if (granularity === 'quarterly') {
    for (let quarter = 1; quarter <= 4; quarter++) {
      for (const team of teams) {
        results.push(await getQuarterlyUtilisation(team.id, year, quarter));
      }
    }
  } else {
    for (const team of teams) {
      results.push(await getAnnualUtilisation(team.id, year));
    }
  }

  return results;
}
