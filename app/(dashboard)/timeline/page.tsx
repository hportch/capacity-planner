import { dbAll } from '@/lib/db';
import type {
  StaffWithDetails,
  DailyAllocationWithDetails,
  Status,
  Team,
} from '@/lib/types';
import { getMonthRange } from '@/lib/utils';
import { GanttChart } from '@/components/timeline/gantt-chart';

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  // --- Resolve date range (default: current month) ---
  const now = new Date();
  let from: string;
  let to: string;

  if (typeof sp.from === 'string' && typeof sp.to === 'string') {
    from = sp.from;
    to = sp.to;
  } else {
    const range = getMonthRange(now.getFullYear(), now.getMonth() + 1);
    from = range.from;
    to = range.to;
  }

  const teamIdFilter =
    typeof sp.team_id === 'string' ? parseInt(sp.team_id, 10) : null;

  // --- Fetch teams ---
  const teams = await dbAll<Team>(
    'SELECT id, name, display_order FROM teams ORDER BY display_order',
    []
  );

  // --- Fetch active staff (with team & role names) ---
  let staffQuery = `
    SELECT
      s.id, s.name, s.team_id, s.role_id,
      s.start_date, s.end_date, s.contracted_hours,
      s.is_active, s.notes, s.created_at, s.updated_at,
      t.name AS team_name,
      r.name AS role_name
    FROM staff s
    JOIN teams t ON t.id = s.team_id
    JOIN roles r ON r.id = s.role_id
    WHERE s.start_date <= ?
      AND (s.end_date IS NULL OR s.end_date >= ?)
  `;
  const staffParams: (string | number)[] = [to, from];

  if (teamIdFilter !== null && !isNaN(teamIdFilter)) {
    staffQuery += ' AND s.team_id = ?';
    staffParams.push(teamIdFilter);
  }

  staffQuery += ' ORDER BY t.display_order, s.name';

  const staff = await dbAll<StaffWithDetails>(staffQuery, staffParams);

  // --- Fetch statuses ---
  const statuses = await dbAll<Status>(
    'SELECT id, name, category, availability_weight, color, display_order FROM statuses ORDER BY display_order',
    []
  );

  // --- Fetch allocations in date range ---
  let allocQuery = `
    SELECT
      da.id, da.staff_id, da.date, da.status_id, da.notes,
      da.created_at, da.updated_at,
      s.name    AS staff_name,
      s.team_id,
      t.name    AS team_name,
      sts.name  AS status_name,
      sts.category AS status_category,
      sts.availability_weight,
      sts.color AS status_color
    FROM daily_allocations da
    JOIN staff s     ON s.id   = da.staff_id
    JOIN teams t     ON t.id   = s.team_id
    JOIN statuses sts ON sts.id = da.status_id
    WHERE da.date >= ? AND da.date <= ?
  `;
  const allocParams: (string | number)[] = [from, to];

  if (teamIdFilter !== null && !isNaN(teamIdFilter)) {
    allocQuery += ' AND s.team_id = ?';
    allocParams.push(teamIdFilter);
  }

  allocQuery += ' ORDER BY da.date';

  const allocations = await dbAll<DailyAllocationWithDetails>(allocQuery, allocParams);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Visual overview of team allocations
        </p>
      </div>

      <GanttChart
        staff={staff}
        allocations={allocations}
        statuses={statuses}
        dateRange={{ from, to }}
        teams={teams}
        teamIdFilter={teamIdFilter}
      />
    </div>
  );
}
