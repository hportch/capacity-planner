import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import type { StaffWithDetails } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const staff = await dbGet<StaffWithDetails>(
    `SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?`,
    [Number(id)]
  );

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json(staff);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await dbGet<{ id: number }>(
    'SELECT id FROM staff WHERE id = ?',
    [Number(id)]
  );
  if (!existing) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const allowedFields = ['name', 'team_id', 'role_id', 'start_date', 'end_date', 'contracted_hours', 'is_active', 'is_vacancy', 'notes'];
  for (const field of allowedFields) {
    if (field in body) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  fields.push('updated_at = NOW()');
  values.push(Number(id));

  await dbRun(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`, values);

  const updated = await dbGet<StaffWithDetails>(
    `SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?`,
    [Number(id)]
  );

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await dbGet<{ id: number }>(
    'SELECT id FROM staff WHERE id = ?',
    [Number(id)]
  );
  if (!existing) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  const today = new Date().toISOString().split('T')[0];
  await dbRun(
    `UPDATE staff SET end_date = ?, is_active = 0, updated_at = NOW() WHERE id = ?`,
    [today, Number(id)]
  );

  return NextResponse.json({ success: true });
}
