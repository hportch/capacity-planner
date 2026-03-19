import { type NextRequest, NextResponse } from 'next/server';
import { dbBatch } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { allocations } = body;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return NextResponse.json(
      { error: 'allocations array is required and must not be empty' },
      { status: 400 }
    );
  }

  const stmts: { sql: string; args: (string | number | null)[] }[] = [];

  for (const item of allocations) {
    if (!item.staff_id || !item.date || !item.status_id) continue;
    stmts.push({
      sql: `INSERT INTO daily_allocations (staff_id, date, status_id, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(staff_id, date) DO UPDATE SET
       status_id = excluded.status_id,
       notes = excluded.notes,
       updated_at = datetime('now')`,
      args: [item.staff_id, item.date, item.status_id, item.notes || null],
    });
  }

  await dbBatch(stmts);

  return NextResponse.json({ success: true, count: stmts.length });
}
