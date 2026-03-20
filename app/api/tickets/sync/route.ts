import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/db';
import { getTicketCountsForMonth, getTicketCountsForRange } from '@/lib/halopsa';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { year, month, capacity_baseline } = body;

  if (!year) {
    return NextResponse.json(
      { error: 'Missing required field: year' },
      { status: 400 }
    );
  }

  const baseline = capacity_baseline ?? 2300;

  try {
    let results;

    if (month) {
      // Sync a single month
      const counts = await getTicketCountsForMonth(Number(year), Number(month));
      results = [counts];
    } else {
      // Sync entire year up to current month
      const now = new Date();
      const endMonth = Number(year) === now.getFullYear()
        ? now.getMonth() + 1
        : 12;
      results = await getTicketCountsForRange(Number(year), 1, Number(year), endMonth);
    }

    const synced = [];
    for (const r of results) {
      await dbRun(
        `INSERT INTO ticket_metrics (year, month, capacity_baseline, tickets_opened, tickets_closed, ticket_system, notes)
      VALUES (?, ?, ?, ?, ?, 'HaloPSA', 'Synced from HaloPSA API')
      ON DUPLICATE KEY UPDATE
        tickets_opened = VALUES(tickets_opened),
        tickets_closed = VALUES(tickets_closed),
        ticket_system = VALUES(ticket_system),
        notes = VALUES(notes)`,
        [r.year, r.month, baseline, r.tickets_opened, r.tickets_closed]
      );
      synced.push(r);
    }

    return NextResponse.json({
      message: `Synced ${synced.length} month(s) from HaloPSA`,
      data: synced,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `HaloPSA sync failed: ${err.message}` },
      { status: 502 }
    );
  }
}
