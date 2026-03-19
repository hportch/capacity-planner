import { getAllTeamsUtilisation } from '@/lib/calculations';
import { UTILISATION_THRESHOLDS } from '@/lib/constants';
import { UtilisationLineChart } from '@/components/charts/utilisation-line-chart';
import { UtilisationControls } from './controls';
import type { UtilisationResult } from '@/lib/types';

function getUtilColor(value: number): string {
  if (value === 0) return 'bg-zinc-800 text-zinc-500';
  if (value < 0.7) return 'bg-red-950 text-red-300';
  if (value < UTILISATION_THRESHOLDS.under)
    return 'bg-amber-950 text-amber-300';
  if (value <= UTILISATION_THRESHOLDS.over)
    return 'bg-teal-950 text-teal-300';
  return 'bg-sky-950 text-sky-300';
}

export default async function UtilisationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const year =
    typeof params.year === 'string' ? parseInt(params.year, 10) : 2026;
  const granularity =
    params.granularity === 'quarterly'
      ? 'quarterly'
      : params.granularity === 'annual'
        ? 'annual'
        : 'monthly';

  const data = await getAllTeamsUtilisation(year, granularity);

  // Build pivot structure: { teamName -> { period -> result } }
  const teamNames: string[] = [];
  const seenTeams = new Set<string>();
  const periods: string[] = [];
  const seenPeriods = new Set<string>();

  for (const row of data) {
    if (!seenTeams.has(row.team_name)) {
      seenTeams.add(row.team_name);
      teamNames.push(row.team_name);
    }
    if (!seenPeriods.has(row.period)) {
      seenPeriods.add(row.period);
      periods.push(row.period);
    }
  }

  const pivot = new Map<string, Map<string, UtilisationResult>>();
  for (const row of data) {
    if (!pivot.has(row.team_name)) {
      pivot.set(row.team_name, new Map());
    }
    pivot.get(row.team_name)!.set(row.period, row);
  }

  // Compute cross-team totals per period (weighted by headcount)
  const totals = new Map<string, UtilisationResult>();
  for (const period of periods) {
    let totalHeadcount = 0;
    let totalAvailable = 0;
    for (const teamName of teamNames) {
      const row = pivot.get(teamName)?.get(period);
      if (row && row.headcount > 0) {
        totalHeadcount += row.headcount;
        totalAvailable += row.available_count;
      }
    }
    const value = totalHeadcount > 0 ? totalAvailable / totalHeadcount : 0;
    totals.set(period, {
      team_id: 0,
      team_name: 'All Teams',
      period,
      value: Math.round(value * 1000) / 1000,
      headcount: totalHeadcount,
      available_count: totalAvailable,
    });
  }

  // Compute year average per team (for non-annual views)
  const yearAvg = new Map<string, UtilisationResult>();
  if (granularity !== 'annual') {
    for (const teamName of teamNames) {
      const teamPeriods = pivot.get(teamName);
      if (!teamPeriods) continue;
      const valid = Array.from(teamPeriods.values()).filter(
        (r) => r.headcount > 0
      );
      if (valid.length === 0) continue;
      const avgValue =
        valid.reduce((s, r) => s + r.value, 0) / valid.length;
      const avgHeadcount = Math.round(
        valid.reduce((s, r) => s + r.headcount, 0) / valid.length
      );
      const avgAvailable = Math.round(
        valid.reduce((s, r) => s + r.available_count, 0) / valid.length
      );
      yearAvg.set(teamName, {
        team_id: valid[0].team_id,
        team_name: teamName,
        period: 'Year',
        value: Math.round(avgValue * 1000) / 1000,
        headcount: avgHeadcount,
        available_count: avgAvailable,
      });
    }
    // Total year average
    const totalValid = Array.from(totals.values()).filter(
      (r) => r.headcount > 0
    );
    if (totalValid.length > 0) {
      const avgValue =
        totalValid.reduce((s, r) => s + r.value, 0) / totalValid.length;
      yearAvg.set('All Teams', {
        team_id: 0,
        team_name: 'All Teams',
        period: 'Year',
        value: Math.round(avgValue * 1000) / 1000,
        headcount: Math.round(
          totalValid.reduce((s, r) => s + r.headcount, 0) / totalValid.length
        ),
        available_count: Math.round(
          totalValid.reduce((s, r) => s + r.available_count, 0) /
            totalValid.length
        ),
      });
    }
  }

  const granularityLabel =
    granularity === 'monthly'
      ? 'Monthly'
      : granularity === 'quarterly'
        ? 'Quarterly'
        : 'Annual';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Team Utilisation
        </h2>
        <p className="text-sm text-muted-foreground">
          Track how team capacity is being used across the year. The green zone
          ({Math.round(UTILISATION_THRESHOLDS.under * 100)}% &ndash;{' '}
          {Math.round(UTILISATION_THRESHOLDS.over * 100)}%) represents ideal
          utilisation.
        </p>
      </div>

      <UtilisationControls year={year} granularity={granularity} />

      {/* Chart (not shown for annual - single data point per team) */}
      {granularity !== 'annual' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-base font-medium text-card-foreground">
            {granularityLabel} Utilisation &mdash; {year}
          </h3>
          <UtilisationLineChart data={data} granularity={granularity} />
        </div>
      )}

      {/* Pivot summary table */}
      <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
        <h3 className="mb-4 text-base font-medium text-card-foreground">
          {granularityLabel} Summary &mdash; {year}
        </h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card pb-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="pb-2 px-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {period}
                </th>
              ))}
              {granularity !== 'annual' && (
                <th className="pb-2 px-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-l border-border">
                  Year
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {teamNames.map((teamName) => (
              <tr
                key={teamName}
                className="border-b border-border/50 last:border-0"
              >
                <td className="sticky left-0 z-10 bg-card py-1.5 pr-3 text-sm font-medium whitespace-nowrap">
                  {teamName}
                </td>
                {periods.map((period) => {
                  const row = pivot.get(teamName)?.get(period);
                  if (!row || row.headcount === 0) {
                    return (
                      <td key={period} className="px-1 py-1.5">
                        <div className="rounded-md bg-zinc-800 px-2 py-1.5 text-center text-xs font-mono text-zinc-500">
                          &mdash;
                        </div>
                      </td>
                    );
                  }
                  const pct = (row.value * 100).toFixed(0);
                  return (
                    <td key={period} className="px-1 py-1.5">
                      <div
                        className={`rounded-md px-2 py-1.5 text-center text-xs font-mono font-semibold ${getUtilColor(row.value)}`}
                        title={`${row.available_count}/${row.headcount} available`}
                      >
                        {pct}%
                      </div>
                    </td>
                  );
                })}
                {granularity !== 'annual' && (
                  <td className="px-1 py-1.5 border-l border-border">
                    {yearAvg.has(teamName) ? (
                      <div
                        className={`rounded-md px-2 py-1.5 text-center text-xs font-mono font-bold ${getUtilColor(yearAvg.get(teamName)!.value)}`}
                      >
                        {(yearAvg.get(teamName)!.value * 100).toFixed(0)}%
                      </div>
                    ) : (
                      <div className="rounded-md bg-zinc-800 px-2 py-1.5 text-center text-xs font-mono text-zinc-500">
                        &mdash;
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {/* All Teams total row */}
            <tr className="border-t-2 border-border">
              <td className="sticky left-0 z-10 bg-card py-1.5 pr-3 text-sm font-bold whitespace-nowrap">
                All Teams
              </td>
              {periods.map((period) => {
                const row = totals.get(period);
                if (!row || row.headcount === 0) {
                  return (
                    <td key={period} className="px-1 py-1.5">
                      <div className="rounded-md bg-zinc-800 px-2 py-1.5 text-center text-xs font-mono text-zinc-500">
                        &mdash;
                      </div>
                    </td>
                  );
                }
                const pct = (row.value * 100).toFixed(0);
                return (
                  <td key={period} className="px-1 py-1.5">
                    <div
                      className={`rounded-md px-2 py-1.5 text-center text-xs font-mono font-bold ${getUtilColor(row.value)}`}
                      title={`${row.available_count}/${row.headcount} available`}
                    >
                      {pct}%
                    </div>
                  </td>
                );
              })}
              {granularity !== 'annual' && (
                <td className="px-1 py-1.5 border-l border-border">
                  {yearAvg.has('All Teams') ? (
                    <div
                      className={`rounded-md px-2 py-1.5 text-center text-xs font-mono font-bold ${getUtilColor(yearAvg.get('All Teams')!.value)}`}
                    >
                      {(yearAvg.get('All Teams')!.value * 100).toFixed(0)}%
                    </div>
                  ) : (
                    <div className="rounded-md bg-zinc-800 px-2 py-1.5 text-center text-xs font-mono text-zinc-500">
                      &mdash;
                    </div>
                  )}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Annual view: team summary cards */}
      {granularity === 'annual' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data
            .filter((r) => r.headcount > 0)
            .map((row) => {
              const pct = (row.value * 100).toFixed(1);
              const status =
                row.value < 0.7
                  ? { label: 'Critical', color: 'text-red-400 border-red-500' }
                  : row.value < UTILISATION_THRESHOLDS.under
                    ? { label: 'Below Target', color: 'text-amber-400 border-amber-500' }
                    : row.value <= UTILISATION_THRESHOLDS.over
                      ? { label: 'On Target', color: 'text-teal-400 border-teal-500' }
                      : { label: 'Over', color: 'text-sky-400 border-sky-500' };
              return (
                <div
                  key={row.team_id}
                  className={`rounded-xl border-t-2 ${status.color.split(' ')[1]} border bg-card p-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{row.team_name}</span>
                    <span className={`text-xs font-semibold ${status.color.split(' ')[0]}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className={`mt-2 text-3xl font-bold tabular-nums ${status.color.split(' ')[0]}`}>
                    {pct}%
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.available_count}/{row.headcount} available (avg)
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
