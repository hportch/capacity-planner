import { getDb } from '@/lib/db';
import type { Team, StaffWithDetails } from '@/lib/types';
import { isWeekend, isBankHoliday, getMonthName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

interface AllocationRow {
  staff_id: number;
  staff_name: string;
  team_id: number;
  team_name: string;
  date: string;
  status_name: string;
  status_category: string;
  status_color: string;
  notes: string | null;
}

function getWeekRange(dateStr?: string): { from: string; to: string } {
  const now = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  return {
    from: monday.toISOString().split('T')[0],
    to: friday.toISOString().split('T')[0],
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getWeekLabel(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to + 'T00:00:00');
  const fmtFrom = f.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const fmtTo = t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmtFrom} — ${fmtTo}`;
}

function getAdjacentWeek(from: string, direction: number): string {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + direction * 7);
  return d.toISOString().split('T')[0];
}

export default async function AllocationSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const weekOf = typeof params.week === 'string' ? params.week : undefined;
  const { from, to } = getWeekRange(weekOf);

  const db = getDb();

  const teams = db
    .prepare('SELECT id, name, display_order FROM teams ORDER BY display_order')
    .all() as Team[];

  // Get all allocations for this week that are NOT normal work (have a status set)
  const allocations = db
    .prepare(
      `SELECT
         da.staff_id,
         s.name AS staff_name,
         s.team_id,
         t.name AS team_name,
         da.date,
         st.name AS status_name,
         st.category AS status_category,
         st.color AS status_color,
         da.notes
       FROM daily_allocations da
       JOIN staff s ON da.staff_id = s.id
       JOIN teams t ON s.team_id = t.id
       JOIN statuses st ON da.status_id = st.id
       WHERE da.date >= ? AND da.date <= ?
         AND s.is_active = 1
       ORDER BY t.display_order, s.name, da.date`
    )
    .all(from, to) as AllocationRow[];

  // Group by team, then staff
  const teamGroups = new Map<number, { team: Team; staffMap: Map<number, { name: string; entries: AllocationRow[] }> }>();
  for (const team of teams) {
    teamGroups.set(team.id, { team, staffMap: new Map() });
  }
  for (const row of allocations) {
    const group = teamGroups.get(row.team_id);
    if (!group) continue;
    if (!group.staffMap.has(row.staff_id)) {
      group.staffMap.set(row.staff_id, { name: row.staff_name, entries: [] });
    }
    group.staffMap.get(row.staff_id)!.entries.push(row);
  }

  const prevWeek = getAdjacentWeek(from, -1);
  const nextWeek = getAdjacentWeek(from, 1);

  // Count non-available allocations (people not on normal work)
  const notAvailableCount = allocations.filter(
    (a) => a.status_category !== 'available'
  ).length;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/allocations"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Grid
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Weekly Summary
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/allocations/summary?week=${prevWeek}`}
            className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
          >
            Prev
          </Link>
          <span className="text-sm font-medium">{getWeekLabel(from, to)}</span>
          <Link
            href={`/allocations/summary?week=${nextWeek}`}
            className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
          >
            Next
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {notAvailableCount} non-standard allocation{notAvailableCount !== 1 ? 's' : ''} this week across {teams.length} teams.
        Showing all staff with allocations set.
      </p>

      {Array.from(teamGroups.values())
        .filter((g) => g.staffMap.size > 0)
        .map(({ team, staffMap }) => (
          <Card key={team.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{team.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Staff</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Day</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(staffMap.values()).map(({ name, entries }) =>
                      entries.map((entry, i) => (
                        <tr
                          key={`${entry.staff_id}-${entry.date}`}
                          className="border-b border-border/30"
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {i === 0 ? name : ''}
                          </td>
                          <td className="py-1.5 pr-4 text-muted-foreground">
                            {formatDate(entry.date)}
                          </td>
                          <td className="py-1.5 pr-4">
                            <Badge
                              variant="secondary"
                              className="text-[11px]"
                              style={{
                                backgroundColor: entry.status_color + '20',
                                color: entry.status_color,
                                borderColor: entry.status_color + '40',
                              }}
                            >
                              {entry.status_name}
                            </Badge>
                          </td>
                          <td className="py-1.5 text-muted-foreground">
                            {entry.notes || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

      {Array.from(teamGroups.values()).every((g) => g.staffMap.size === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No allocations set for this week. Staff without explicit allocations default to Normal Work.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
