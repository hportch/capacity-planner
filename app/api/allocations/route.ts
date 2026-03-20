import { type NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/db';
import type { DailyAllocationWithDetails } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const teamId = searchParams.get('team_id');
  const staffId = searchParams.get('staff_id');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'from and to query parameters are required' },
      { status: 400 }
    );
  }

  let query = `
    SELECT
      da.id,
      da.staff_id,
      da.date,
      da.status_id,
      da.notes,
      da.created_at,
      da.updated_at,
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

  const params: (string | number)[] = [from, to];

  if (teamId) {
    query += ' AND s.team_id = ?';
    params.push(Number(teamId));
  }

  if (staffId) {
    query += ' AND da.staff_id = ?';
    params.push(Number(staffId));
  }

  query += ' ORDER BY t.display_order, s.name, da.date';

  const allocations = await dbAll<DailyAllocationWithDetails>(query, params);
  return NextResponse.json(allocations);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { staff_id, date, status_id, notes } = body;

  if (!staff_id || !date || !status_id) {
    return NextResponse.json(
      { error: 'staff_id, date, and status_id are required' },
      { status: 400 }
    );
  }

  await dbRun(
    `INSERT INTO daily_allocations (staff_id, date, status_id, notes)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status_id = VALUES(status_id),
       notes = VALUES(notes),
       updated_at = NOW()`,
    [staff_id, date, status_id, notes || null]
  );

  const allocation = await dbGet<DailyAllocationWithDetails>(
    `SELECT
      da.id,
      da.staff_id,
      da.date,
      da.status_id,
      da.notes,
      da.created_at,
      da.updated_at,
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
    WHERE da.staff_id = ? AND da.date = ?`,
    [staff_id, date]
  );

  return NextResponse.json(allocation, { status: 201 });
}
