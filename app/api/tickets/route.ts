import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { TicketMetric } from '@/lib/types';

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = request.nextUrl;
  const year = searchParams.get('year');

  let sql = 'SELECT * FROM ticket_metrics';
  const params: number[] = [];

  if (year) {
    sql += ' WHERE year = ?';
    params.push(Number(year));
  }

  sql += ' ORDER BY year, month';

  const metrics = db.prepare(sql).all(...params) as TicketMetric[];
  return NextResponse.json(metrics);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { year, month, capacity_baseline, tickets_opened, tickets_closed, ticket_system, notes } = body;

  if (!year || !month || capacity_baseline == null || tickets_opened == null || tickets_closed == null) {
    return NextResponse.json(
      { error: 'Missing required fields: year, month, capacity_baseline, tickets_opened, tickets_closed' },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'Month must be between 1 and 12' },
      { status: 400 }
    );
  }

  const result = db.prepare(`
    INSERT INTO ticket_metrics (year, month, capacity_baseline, tickets_opened, tickets_closed, ticket_system, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(year, month) DO UPDATE SET
      capacity_baseline = excluded.capacity_baseline,
      tickets_opened = excluded.tickets_opened,
      tickets_closed = excluded.tickets_closed,
      ticket_system = excluded.ticket_system,
      notes = excluded.notes
  `).run(
    Number(year),
    Number(month),
    Number(capacity_baseline),
    Number(tickets_opened),
    Number(tickets_closed),
    ticket_system ?? null,
    notes ?? null
  );

  const metric = db.prepare(
    'SELECT * FROM ticket_metrics WHERE id = ?'
  ).get(result.lastInsertRowid) as TicketMetric;

  return NextResponse.json(metric, { status: 201 });
}
