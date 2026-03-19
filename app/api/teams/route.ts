import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Team } from '@/lib/types';

export async function GET() {
  const db = getDb();
  const teams = db.prepare('SELECT id, name, display_order FROM teams ORDER BY display_order').all() as Team[];
  return NextResponse.json(teams);
}
