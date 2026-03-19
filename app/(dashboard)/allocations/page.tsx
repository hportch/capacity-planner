import { getDb } from '@/lib/db';
import type {
  Status,
  StaffWithDetails,
  DailyAllocationWithDetails,
  Team,
} from '@/lib/types';
import { AllocationGrid } from '@/components/allocations/allocation-grid';
import { DateRangePicker } from '@/components/allocations/date-range-picker';
import { TeamFilter } from '@/components/allocations/team-filter';

function getDefaultWeekRange(): { from: string; to: string } {
  const now = new Date();
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

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const defaultRange = getDefaultWeekRange();
  const from =
    typeof params.from === 'string' ? params.from : defaultRange.from;
  const to = typeof params.to === 'string' ? params.to : defaultRange.to;
  const mode =
    typeof params.mode === 'string' &&
    (params.mode === 'week' || params.mode === 'month')
      ? params.mode
      : 'week';
  const teamId =
    typeof params.team_id === 'string' ? params.team_id : null;

  const db = getDb();

  // Fetch teams
  const teams = db
    .prepare('SELECT id, name, display_order FROM teams ORDER BY display_order')
    .all() as Team[];

  // Fetch statuses
  const statuses = db
    .prepare(
      `SELECT id, name, category, availability_weight, color, display_order
       FROM statuses ORDER BY display_order`
    )
    .all() as Status[];

  // Fetch active staff (optionally filtered by team)
  let staffQuery = `
    SELECT
      s.id, s.name, s.team_id, s.role_id, s.start_date, s.end_date,
      s.contracted_hours, s.is_active, s.notes, s.created_at, s.updated_at,
      t.name AS team_name,
      r.name AS role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.is_active = 1
  `;
  const staffParams: (string | number)[] = [];

  if (teamId) {
    staffQuery += ' AND s.team_id = ?';
    staffParams.push(Number(teamId));
  }

  staffQuery += ' ORDER BY t.display_order, s.name';

  const staff = db.prepare(staffQuery).all(...staffParams) as StaffWithDetails[];

  // Fetch allocations for the date range
  let allocQuery = `
    SELECT
      da.id, da.staff_id, da.date, da.status_id, da.notes,
      da.created_at, da.updated_at,
      s.name AS staff_name,
      s.team_id,
      t.name AS team_name,
      st.name AS status_name,
      st.category AS status_category,
      st.availability_weight,
      st.color AS status_color
    FROM daily_allocations da
    JOIN staff s ON da.staff_id = s.id
    JOIN teams t ON s.team_id = t.id
    JOIN statuses st ON da.status_id = st.id
    WHERE da.date >= ? AND da.date <= ?
  `;
  const allocParams: (string | number)[] = [from, to];

  if (teamId) {
    allocQuery += ' AND s.team_id = ?';
    allocParams.push(Number(teamId));
  }

  allocQuery += ' ORDER BY t.display_order, s.name, da.date';

  const allocations = db
    .prepare(allocQuery)
    .all(...allocParams) as DailyAllocationWithDetails[];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Staff Allocations
        </h1>
        <div className="flex items-center gap-3">
          <DateRangePicker from={from} to={to} mode={mode} />
          <TeamFilter teams={teams} currentTeamId={teamId} />
        </div>
      </div>

      {/* Allocation grid */}
      <AllocationGrid
        staff={staff}
        statuses={statuses}
        teams={teams}
        initialAllocations={allocations}
        dateRange={{ from, to }}
      />
    </div>
  );
}
