import { getDb } from '@/lib/db';
import { getAllTeamsUtilisation } from '@/lib/calculations';
import { UTILISATION_THRESHOLDS } from '@/lib/constants';
import { UtilisationLineChart } from '@/components/charts/utilisation-line-chart';
import { UtilisationControls } from './controls';

export default async function UtilisationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const year = typeof params.year === 'string' ? parseInt(params.year, 10) : 2026;
  const granularity =
    params.granularity === 'quarterly' ? 'quarterly' : 'monthly';

  const db = getDb();
  const data = getAllTeamsUtilisation(db, year, granularity);

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

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 text-base font-medium text-card-foreground">
          {granularity === 'monthly' ? 'Monthly' : 'Quarterly'} Utilisation
          &mdash; {year}
        </h3>
        <UtilisationLineChart data={data} granularity={granularity} />
      </div>

      {/* Summary table */}
      <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
        <h3 className="mb-4 text-base font-medium text-card-foreground">
          Summary
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">
                Team
              </th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">
                Period
              </th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                Utilisation
              </th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                Headcount
              </th>
              <th className="pb-2 font-medium text-muted-foreground text-right">
                Available
              </th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((row) => row.headcount > 0)
              .map((row, i) => {
                const pct = (row.value * 100).toFixed(1);
                let statusColor = 'text-green-400';
                if (row.value < UTILISATION_THRESHOLDS.under) {
                  statusColor = 'text-red-400';
                } else if (row.value > UTILISATION_THRESHOLDS.over) {
                  statusColor = 'text-amber-400';
                }

                return (
                  <tr
                    key={`${row.team_id}-${row.period}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium">{row.team_name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.period}
                    </td>
                    <td className={`py-2 pr-4 text-right font-mono ${statusColor}`}>
                      {pct}%
                    </td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">
                      {row.headcount}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {row.available_count}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
