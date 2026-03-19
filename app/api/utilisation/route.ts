import { type NextRequest, NextResponse } from 'next/server';
import {
  getAllTeamsUtilisation,
  getMonthlyUtilisation,
  getQuarterlyUtilisation,
} from '@/lib/calculations';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const yearParam = searchParams.get('year');
  const granularity = searchParams.get('granularity') as
    | 'monthly'
    | 'quarterly'
    | 'annual'
    | null;
  const teamIdParam = searchParams.get('team_id');

  if (!yearParam || !granularity) {
    return NextResponse.json(
      { error: 'Missing required query parameters: year, granularity' },
      { status: 400 }
    );
  }

  const year = parseInt(yearParam, 10);

  if (isNaN(year) || year < 2020 || year > 2030) {
    return NextResponse.json(
      { error: 'Invalid year parameter' },
      { status: 400 }
    );
  }

  if (granularity !== 'monthly' && granularity !== 'quarterly') {
    return NextResponse.json(
      { error: 'granularity must be "monthly" or "quarterly"' },
      { status: 400 }
    );
  }

  // If a specific team is requested
  if (teamIdParam) {
    const teamId = parseInt(teamIdParam, 10);
    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team_id parameter' },
        { status: 400 }
      );
    }

    const results = [];
    if (granularity === 'monthly') {
      for (let month = 1; month <= 12; month++) {
        results.push(await getMonthlyUtilisation(teamId, year, month));
      }
    } else {
      for (let quarter = 1; quarter <= 4; quarter++) {
        results.push(await getQuarterlyUtilisation(teamId, year, quarter));
      }
    }

    return NextResponse.json(results);
  }

  // All teams
  const results = await getAllTeamsUtilisation(year, granularity);
  return NextResponse.json(results);
}
