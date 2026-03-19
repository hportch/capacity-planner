import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import type { Team } from '@/lib/types';

export async function GET() {
  const teams = await dbAll<Team>('SELECT id, name, display_order FROM teams ORDER BY display_order');
  return NextResponse.json(teams);
}
