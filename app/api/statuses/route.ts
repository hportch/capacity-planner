import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Status } from '@/lib/types';

export async function GET() {
  const db = getDb();
  const statuses = db
    .prepare(
      `SELECT id, name, category, availability_weight, color, display_order
       FROM statuses
       ORDER BY display_order`
    )
    .all() as Status[];
  return NextResponse.json(statuses);
}

export async function PUT(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, name, category, availability_weight, color } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const validCategories = ['available', 'unavailable', 'partial', 'loaned'];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const existing = db
    .prepare('SELECT id FROM statuses WHERE id = ?')
    .get(id) as { id: number } | undefined;

  if (!existing) {
    return NextResponse.json({ error: 'Status not found' }, { status: 404 });
  }

  db.prepare(
    `UPDATE statuses
     SET name = COALESCE(?, name),
         category = COALESCE(?, category),
         availability_weight = COALESCE(?, availability_weight),
         color = COALESCE(?, color)
     WHERE id = ?`
  ).run(name ?? null, category ?? null, availability_weight ?? null, color ?? null, id);

  return NextResponse.json({ success: true });
}
