import { dbAll } from '@/lib/db';
import type {
  Status,
  StaffWithDetails,
  DailyAllocationWithDetails,
  Team,
  CapacityThreshold,
} from '@/lib/types';
import Link from 'next/link';
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

  // Fetch teams
  const teams = await dbAll<Team>(
    'SELECT id, name, display_order FROM teams ORDER BY display_order',
    []
  );

  // Fetch statuses
  const statuses = await dbAll<Status>(
    `SELECT id, name, category, availability_weight, color, display_order
     FROM statuses ORDER BY display_order`,
    []
  );

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
    WHERE s.is_active = 1 AND s.is_vacancy = 0
  `;
  const staffParams: (string | number)[] = [];

  if (teamId) {
    staffQuery += ' AND s.team_id = ?';
    staffParams.push(Number(teamId));
  }

  staffQuery += ' ORDER BY t.display_order, s.name';

  const staff = await dbAll<StaffWithDetails>(staffQuery, staffParams);

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

  const allocations = await dbAll<DailyAllocationWithDetails>(allocQuery, allocParams);

  // Fetch thresholds for live utilisation indicators
  const today = new Date().toISOString().split('T')[0];
  const thresholds = await dbAll<Pick<CapacityThreshold, 'team_id' | 'min_utilisation'>>(
    `SELECT ct.team_id, ct.min_utilisation
     FROM capacity_thresholds ct
     WHERE ct.effective_to IS NULL OR ct.effective_to >= ?`,
    [today]
  );

  const thresholdMap: Record<number, number> = {};
  for (const t of thresholds) {
    thresholdMap[t.team_id] = t.min_utilisation;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Staff Allocations
          </h1>
          <Link
            href="/allocations/summary"
            className="inline-flex h-7 items-center rounded-md border border-border bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Weekly Summary
          </Link>
        </div>
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
        thresholds={thresholdMap}
      />
    </div>
  );
}
