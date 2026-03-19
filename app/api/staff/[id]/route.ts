import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { StaffWithDetails } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const staff = db.prepare(`
    SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?
  `).get(Number(id)) as StaffWithDetails | undefined;

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
  const db = getDb();
  const body = await request.json();

  const existing = db.prepare('SELECT id FROM staff WHERE id = ?').get(Number(id));
  if (!existing) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const allowedFields = ['name', 'team_id', 'role_id', 'start_date', 'end_date', 'contracted_hours', 'is_active', 'notes'];
  for (const field of allowedFields) {
    if (field in body) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  fields.push("updated_at = datetime('now')");
  values.push(Number(id));

  db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?
  `).get(Number(id)) as StaffWithDetails;

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM staff WHERE id = ?').get(Number(id));
  if (!existing) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE staff SET end_date = ?, is_active = 0, updated_at = datetime('now') WHERE id = ?
  `).run(today, Number(id));

  return NextResponse.json({ success: true });
}
