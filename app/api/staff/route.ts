import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/db';
import type { StaffWithDetails } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const teamId = searchParams.get('team_id');
  const active = searchParams.get('active');

  let sql = `
    SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (teamId) {
    conditions.push('s.team_id = ?');
    params.push(Number(teamId));
  }
  if (active !== null && active !== undefined && active !== '') {
    conditions.push('s.is_active = ?');
    params.push(Number(active));
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY t.display_order, s.name';

  const staff = await dbAll<StaffWithDetails>(sql, params);
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, team_id, role_id, start_date, contracted_hours, is_vacancy, notes } = body;

  if (!name || !team_id || !role_id || !start_date) {
    return NextResponse.json(
      { error: 'Missing required fields: name, team_id, role_id, start_date' },
      { status: 400 }
    );
  }

  const result = await dbRun(
    `INSERT INTO staff (name, team_id, role_id, start_date, contracted_hours, is_vacancy, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      Number(team_id),
      Number(role_id),
      start_date,
      contracted_hours ?? 37.5,
      is_vacancy ? 1 : 0,
      notes ?? null,
    ]
  );

  const newStaff = await dbGet<StaffWithDetails>(
    `SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?`,
    [result.insertId]
  );

  return NextResponse.json(newStaff, { status: 201 });
}
