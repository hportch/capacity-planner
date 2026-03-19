import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import type { Role } from '@/lib/types';

export async function GET() {
  const roles = await dbAll<Role>('SELECT id, name FROM roles ORDER BY name');
  return NextResponse.json(roles);
}
