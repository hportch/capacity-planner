import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { DailyAllocationWithDetails } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status_id, notes } = body;

  if (!status_id) {
    return NextResponse.json(
      { error: 'status_id is required' },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM daily_allocations WHERE id = ?')
    .get(Number(id));

  if (!existing) {
    return NextResponse.json(
      { error: 'Allocation not found' },
      { status: 404 }
    );
  }

  db.prepare(
    `UPDATE daily_allocations
     SET status_id = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(status_id, notes ?? null, Number(id));

  const allocation = db
    .prepare(
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
      WHERE da.id = ?`
    )
    .get(Number(id)) as DailyAllocationWithDetails;

  return NextResponse.json(allocation);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM daily_allocations WHERE id = ?')
    .get(Number(id));

  if (!existing) {
    return NextResponse.json(
      { error: 'Allocation not found' },
      { status: 404 }
    );
  }

  db.prepare('DELETE FROM daily_allocations WHERE id = ?').run(Number(id));

  return NextResponse.json({ success: true });
}
