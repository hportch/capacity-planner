import { NextRequest, NextResponse } from 'next/server'
import { dbAll, dbGet, dbRun } from '@/lib/db'
import type { CapacityThreshold } from '@/lib/types'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const thresholds = await dbAll<CapacityThreshold & { team_name: string }>(
    `SELECT ct.*, t.name as team_name
     FROM capacity_thresholds ct
     JOIN teams t ON t.id = ct.team_id
     WHERE ct.effective_to IS NULL OR ct.effective_to >= ?
     ORDER BY t.display_order`,
    [today]
  )

  return NextResponse.json(thresholds)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const {
    team_id,
    min_headcount,
    min_utilisation,
    ideal_utilisation,
    max_utilisation,
    effective_from,
  } = body

  if (!team_id || !effective_from) {
    return NextResponse.json(
      { error: 'team_id and effective_from are required' },
      { status: 400 }
    )
  }

  const result = await dbRun(
    `INSERT INTO capacity_thresholds (team_id, min_headcount, min_utilisation, ideal_utilisation, max_utilisation, effective_from)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      team_id,
      min_headcount ?? null,
      min_utilisation ?? 0.9,
      ideal_utilisation ?? 1.0,
      max_utilisation ?? 1.1,
      effective_from,
    ]
  )

  return NextResponse.json({ id: result.insertId }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()

  const {
    id,
    min_headcount,
    min_utilisation,
    ideal_utilisation,
    max_utilisation,
    effective_from,
    effective_to,
  } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const existing = await dbGet<{ id: number }>(
    'SELECT id FROM capacity_thresholds WHERE id = ?',
    [id]
  )

  if (!existing) {
    return NextResponse.json({ error: 'Threshold not found' }, { status: 404 })
  }

  await dbRun(
    `UPDATE capacity_thresholds
     SET min_headcount = ?,
         min_utilisation = ?,
         ideal_utilisation = ?,
         max_utilisation = ?,
         effective_from = COALESCE(?, effective_from),
         effective_to = ?
     WHERE id = ?`,
    [
      min_headcount ?? null,
      min_utilisation ?? 0.9,
      ideal_utilisation ?? 1.0,
      max_utilisation ?? 1.1,
      effective_from ?? null,
      effective_to ?? null,
      id,
    ]
  )

  return NextResponse.json({ success: true })
}
