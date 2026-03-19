import { dbAll } from '@/lib/db';
import type { UtilisationResult, Team } from '@/lib/types';
import {
  getWorkingDays,
  getMonthRange,
  getMonthName,
  isWorkingDay,
} from '@/lib/utils';

const FULL_TIME_HOURS = 37.5;

// Simple TTL cache for expensive utilisation computations
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return undefined;
}

function setCache<T>(key: string, data: T): T {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

/** Clear the utilisation cache (call after saving allocations) */
export function invalidateUtilisationCache(): void {
  cache.clear();
}

/**
 * Calculate daily utilisation for a team on a specific date.
 * Uses a single query to get staff + allocations together.
 */
export async function getDailyUtilisation(
  teamId: number,
  date: string
): Promise<UtilisationResult> {
  const team = await dbAll<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team[0]?.name ?? 'Unknown';

  // Single query: get all active staff with their allocation for this date
  const rows = await dbAll<{ id: number; contracted_hours: number; availability_weight: number | null }>(
    `SELECT s.id, s.contracted_hours, da_st.availability_weight
     FROM staff s
     LEFT JOIN daily_allocations da ON da.staff_id = s.id AND da.date = ?
     LEFT JOIN statuses da_st ON da_st.id = da.status_id
     WHERE s.team_id = ?
       AND s.is_vacancy = 0
       AND s.start_date <= ?
       AND (s.end_date IS NULL OR s.end_date >= ?)`,
    [date, teamId, date, date]
  );

  const headcount = rows.reduce((sum, s) => sum + (s.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS, 0);
  if (headcount === 0) {
    return { team_id: teamId, team_name: teamName, period: date, value: 0, headcount: 0, available_count: 0 };
  }

  let totalWeight = 0;
  let availableCount = 0;
  for (const s of rows) {
    const fte = (s.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS;
    const weight = s.availability_weight ?? 1.0; // null = no allocation = normal work
    totalWeight += weight * fte;
    if (weight > 0) availableCount += weight * fte;
  }

  return {
    team_id: teamId,
    team_name: teamName,
    period: date,
    value: totalWeight / headcount,
    headcount: Math.round(headcount * 10) / 10,
    available_count: Math.round(availableCount * 10) / 10,
  };
}

/**
 * Calculate monthly utilisation for a team using BULK queries.
 * Fetches all data for the month in 2 queries instead of N*days.
 */
export async function getMonthlyUtilisation(
  teamId: number,
  year: number,
  month: number
): Promise<UtilisationResult> {
  const cacheKey = `monthly:${teamId}:${year}:${month}`;
  const cached = getCached<UtilisationResult>(cacheKey);
  if (cached) return cached;

  const team = await dbAll<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team[0]?.name ?? 'Unknown';
  const { from, to } = getMonthRange(year, month);
  const workingDays = getWorkingDays(from, to);

  if (workingDays.length === 0) {
    return { team_id: teamId, team_name: teamName, period: getMonthName(month), value: 0, headcount: 0, available_count: 0 };
  }

  // Query 1: Get all active staff for the entire month range
  const staffRows = await dbAll<{ id: number; contracted_hours: number; start_date: string; end_date: string | null }>(
    `SELECT id, contracted_hours, start_date, end_date FROM staff
     WHERE team_id = ? AND is_vacancy = 0
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)`,
    [teamId, to, from]
  );

  if (staffRows.length === 0) {
    return { team_id: teamId, team_name: teamName, period: getMonthName(month), value: 0, headcount: 0, available_count: 0 };
  }

  // Query 2: Get ALL allocations for these staff in this date range (single bulk query)
  const staffIds = staffRows.map((s) => s.id);
  const placeholders = staffIds.map(() => '?').join(',');
  const allocations = await dbAll<{ staff_id: number; date: string; availability_weight: number }>(
    `SELECT da.staff_id, da.date, st.availability_weight
     FROM daily_allocations da
     JOIN statuses st ON st.id = da.status_id
     WHERE da.staff_id IN (${placeholders})
       AND da.date >= ? AND da.date <= ?`,
    [...staffIds, from, to]
  );

  // Index allocations by staff_id+date for O(1) lookup
  const allocMap = new Map<string, number>();
  for (const a of allocations) {
    allocMap.set(`${a.staff_id}_${a.date}`, a.availability_weight);
  }

  let totalValue = 0;
  let totalHeadcount = 0;
  let totalAvailable = 0;

  for (const day of workingDays) {
    let dayHeadcount = 0;
    let dayWeight = 0;
    let dayAvailable = 0;

    for (const s of staffRows) {
      // Check if staff was active on this specific day
      if (s.start_date > day) continue;
      if (s.end_date && s.end_date < day) continue;

      const fte = (s.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS;
      dayHeadcount += fte;

      const weight = allocMap.get(`${s.id}_${day}`) ?? 1.0;
      dayWeight += weight * fte;
      if (weight > 0) dayAvailable += weight * fte;
    }

    if (dayHeadcount > 0) {
      totalValue += dayWeight / dayHeadcount;
      totalHeadcount += dayHeadcount;
      totalAvailable += dayAvailable;
    }
  }

  const avgValue = totalValue / workingDays.length;
  const avgHeadcount = Math.round(totalHeadcount / workingDays.length);
  const avgAvailable = Math.round(totalAvailable / workingDays.length);

  return setCache(cacheKey, {
    team_id: teamId,
    team_name: teamName,
    period: getMonthName(month),
    value: Math.round(avgValue * 1000) / 1000,
    headcount: avgHeadcount,
    available_count: avgAvailable,
  });
}

/**
 * Calculate quarterly utilisation for a team.
 */
export async function getQuarterlyUtilisation(
  teamId: number,
  year: number,
  quarter: number
): Promise<UtilisationResult> {
  const team = await dbAll<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team[0]?.name ?? 'Unknown';
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
    team_id: teamId, team_name: teamName, period: `Q${quarter}`,
    value: Math.round(avgValue * 1000) / 1000, headcount: avgHeadcount, available_count: avgAvailable,
  };
}

/**
 * Calculate annual utilisation for a team.
 */
export async function getAnnualUtilisation(
  teamId: number,
  year: number
): Promise<UtilisationResult> {
  const team = await dbAll<Team>('SELECT id, name FROM teams WHERE id = ?', [teamId]);
  const teamName = team[0]?.name ?? 'Unknown';

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
    team_id: teamId, team_name: teamName, period: String(year),
    value: Math.round(avgValue * 1000) / 1000, headcount: avgHeadcount, available_count: avgAvailable,
  };
}

/**
 * Get utilisation for all teams across a period.
 * Runs all team calculations in parallel for speed.
 */
export async function getAllTeamsUtilisation(
  year: number,
  granularity: 'monthly' | 'quarterly' | 'annual'
): Promise<UtilisationResult[]> {
  const teams = await dbAll<Team>('SELECT id, name, display_order FROM teams ORDER BY display_order');

  if (granularity === 'monthly') {
    // Run all 12 months × all teams in parallel
    const promises: Promise<UtilisationResult>[] = [];
    for (let month = 1; month <= 12; month++) {
      for (const team of teams) {
        promises.push(getMonthlyUtilisation(team.id, year, month));
      }
    }
    return Promise.all(promises);
  } else if (granularity === 'quarterly') {
    const promises: Promise<UtilisationResult>[] = [];
    for (let quarter = 1; quarter <= 4; quarter++) {
      for (const team of teams) {
        promises.push(getQuarterlyUtilisation(team.id, year, quarter));
      }
    }
    return Promise.all(promises);
  } else {
    return Promise.all(teams.map((team) => getAnnualUtilisation(team.id, year)));
  }
}
