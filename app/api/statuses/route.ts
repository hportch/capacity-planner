import { NextResponse } from 'next/server';
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
