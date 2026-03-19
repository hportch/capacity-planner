import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { allocations } = body;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return NextResponse.json(
      { error: 'allocations array is required and must not be empty' },
      { status: 400 }
    );
  }

  const db = getDb();

  const upsert = db.prepare(
    `INSERT INTO daily_allocations (staff_id, date, status_id, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(staff_id, date) DO UPDATE SET
       status_id = excluded.status_id,
       notes = excluded.notes,
       updated_at = datetime('now')`
  );

  const tx = db.transaction(
    (items: { staff_id: number; date: string; status_id: number; notes?: string }[]) => {
      let count = 0;
      for (const item of items) {
        if (!item.staff_id || !item.date || !item.status_id) continue;
        upsert.run(item.staff_id, item.date, item.status_id, item.notes || null);
        count++;
      }
      return count;
    }
  );

  const count = tx(allocations);

  return NextResponse.json({ success: true, count });
}
