import Link from 'next/link';
import { dbAll } from '@/lib/db';
import type { StaffWithDetails, Team } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { StaffRoster } from './staff-roster';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Staff Roster - Capacity Planner',
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const teamFilter = typeof params.team_id === 'string' ? params.team_id : '';
  const showArchived = params.show_archived === '1';

  const teams = await dbAll<Team>(
    'SELECT id, name, display_order FROM teams ORDER BY display_order',
    []
  );

  let sql = `
    SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
  `;
  const conditions: string[] = [];
  const sqlParams: (string | number)[] = [];

  if (teamFilter) {
    conditions.push('s.team_id = ?');
    sqlParams.push(Number(teamFilter));
  }
  if (!showArchived) {
    conditions.push('s.is_active = 1');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY t.display_order, s.name';

  const staff = await dbAll<StaffWithDetails>(sql, sqlParams);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff Roster</h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} team member{staff.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button render={<Link href="/staff/new" />}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Staff
        </Button>
      </div>

      <StaffRoster
        staff={staff}
        teams={teams}
        currentTeamFilter={teamFilter}
        showArchived={showArchived}
      />
    </div>
  );
}
