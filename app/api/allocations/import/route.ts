import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * POST /api/allocations/import
 *
 * Accepts a JSON body with an array of allocation records:
 * { allocations: [{ staff_name, date, status_name, notes? }] }
 *
 * Matches staff by name and status by name (case-insensitive).
 * Skips rows that don't match and reports them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: {
      staff_name: string;
      date: string;
      status_name: string;
      notes?: string;
    }[] = body.allocations;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No allocation rows provided' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Build lookup maps
    const staffRows = db
      .prepare('SELECT id, name FROM staff')
      .all() as { id: number; name: string }[];
    const staffByName = new Map<string, number>();
    for (const s of staffRows) {
      staffByName.set(s.name.toLowerCase().trim(), s.id);
    }

    const statusRows = db
      .prepare('SELECT id, name FROM statuses')
      .all() as { id: number; name: string }[];
    const statusByName = new Map<string, number>();
    for (const s of statusRows) {
      statusByName.set(s.name.toLowerCase().trim(), s.id);
    }

    const upsert = db.prepare(`
      INSERT INTO daily_allocations (staff_id, date, status_id, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(staff_id, date) DO UPDATE SET
        status_id = excluded.status_id,
        notes = excluded.notes,
        updated_at = datetime('now')
    `);

    let imported = 0;
    const skipped: { row: number; reason: string }[] = [];

    const insertMany = db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Validate date format
        if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
          skipped.push({ row: i + 1, reason: `Invalid date: "${row.date}"` });
          continue;
        }

        const staffId = staffByName.get((row.staff_name || '').toLowerCase().trim());
        if (!staffId) {
          skipped.push({ row: i + 1, reason: `Unknown staff: "${row.staff_name}"` });
          continue;
        }

        const statusId = statusByName.get((row.status_name || '').toLowerCase().trim());
        if (!statusId) {
          skipped.push({ row: i + 1, reason: `Unknown status: "${row.status_name}"` });
          continue;
        }

        upsert.run(staffId, row.date, statusId, row.notes || null);
        imported++;
      }
    });

    insertMany();

    return NextResponse.json({
      imported,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 50), // Limit to first 50 to avoid huge responses
      total: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
