import { getDb } from '@/lib/db';
import type { TicketMetric } from '@/lib/types';
import { getMonthName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketBarChart } from '@/components/charts/ticket-bar-chart';
import { TicketForm } from './ticket-form';
import { HaloSyncButton } from './halo-sync-button';
import { YearTabs } from './year-tabs';

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const db = getDb();

  // Get available years
  const yearRows = db
    .prepare('SELECT DISTINCT year FROM ticket_metrics ORDER BY year')
    .all() as { year: number }[];
  const availableYears = yearRows.map((r) => r.year);

  const selectedYear = sp.year ? Number(sp.year) : availableYears[availableYears.length - 1] ?? 2026;

  // Get ticket data for selected year
  const metrics = db
    .prepare('SELECT * FROM ticket_metrics WHERE year = ? ORDER BY month')
    .all(selectedYear) as TicketMetric[];

  // Calculate summary stats
  const totalOpened = metrics.reduce((sum, m) => sum + m.tickets_opened, 0);
  const totalClosed = metrics.reduce((sum, m) => sum + m.tickets_closed, 0);
  const netDeficit = totalOpened - totalClosed;
  const avgMonthly = metrics.length > 0 ? Math.round(totalOpened / metrics.length) : 0;

  // Determine ticket system used
  const ticketSystems = [...new Set(metrics.map((m) => m.ticket_system).filter(Boolean))];
  const primarySystem = ticketSystems[ticketSystems.length - 1] ?? 'Unknown';

  // Get months that already have data (for the form)
  const existingMonths = new Set(metrics.map((m) => m.month));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ticket Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Track tickets opened and closed against capacity baselines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HaloSyncButton
            year={selectedYear}
            lastBaseline={metrics[metrics.length - 1]?.capacity_baseline ?? 2300}
          />
          {ticketSystems.map((sys) => (
            <Badge key={sys} variant="secondary">
              {sys}
            </Badge>
          ))}
        </div>
      </div>

      {/* Year tabs */}
      <YearTabs years={availableYears} selectedYear={selectedYear} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{totalOpened.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{totalClosed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Net Deficit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                netDeficit > 0
                  ? 'text-destructive'
                  : netDeficit < 0
                    ? 'text-green-500'
                    : ''
              }`}
            >
              {netDeficit > 0 ? '+' : ''}
              {netDeficit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Monthly Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{avgMonthly.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets Opened vs Closed — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketBarChart data={metrics} />
        </CardContent>
      </Card>

      {/* Data table + form */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Data</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Month</th>
                    <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Baseline</th>
                    <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Opened</th>
                    <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Closed</th>
                    <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Deficit</th>
                    <th className="pb-2 font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => {
                    const deficit = m.tickets_opened - m.tickets_closed;
                    return (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{getMonthName(m.month)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {m.capacity_baseline.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {m.tickets_opened.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {m.tickets_closed.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 pr-4 text-right tabular-nums ${
                            deficit > 0
                              ? 'text-destructive'
                              : deficit < 0
                                ? 'text-green-500'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {deficit > 0 ? '+' : ''}
                          {deficit.toLocaleString()}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {m.notes ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No data recorded for {selectedYear}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>Add / Update Monthly Record</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketForm
            year={selectedYear}
            existingMonths={Array.from(existingMonths)}
            lastBaseline={metrics[metrics.length - 1]?.capacity_baseline ?? 2300}
            lastSystem={primarySystem}
          />
        </CardContent>
      </Card>
    </div>
  );
}
