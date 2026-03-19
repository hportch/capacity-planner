import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Role } from '@/lib/types';

export async function GET() {
  const db = getDb();
  const roles = db.prepare('SELECT id, name FROM roles ORDER BY name').all() as Role[];
  return NextResponse.json(roles);
}
