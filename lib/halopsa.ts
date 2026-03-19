const HALOPSA_BASE_URL = process.env.HALOPSA_BASE_URL!;
const HALOPSA_CLIENT_ID = process.env.HALOPSA_CLIENT_ID!;
const HALOPSA_CLIENT_SECRET = process.env.HALOPSA_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${HALOPSA_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: HALOPSA_CLIENT_ID,
      client_secret: HALOPSA_CLIENT_SECRET,
      scope: 'all',
    }),
  });

  if (!res.ok) {
    throw new Error(`HaloPSA auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function haloGet(path: string, params: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(`${HALOPSA_BASE_URL}/api${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`HaloPSA API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface MonthlyTicketCounts {
  year: number;
  month: number;
  tickets_opened: number;
  tickets_closed: number;
}

export async function getTicketCountsForMonth(
  year: number,
  month: number
): Promise<MonthlyTicketCounts> {
  const startdate = `${year}-${String(month).padStart(2, '0')}-01`;
  const enddate = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth(year, month)}`;

  const baseParams = {
    pageinate: 'true',
    page_size: '1',
    page_no: '1',
    startdate,
    enddate,
  };

  const [opened, closed] = await Promise.all([
    haloGet('/tickets', { ...baseParams, datesearch: 'dateoccured' }),
    haloGet('/tickets', { ...baseParams, datesearch: 'dateclosed' }),
  ]);

  return {
    year,
    month,
    tickets_opened: opened.record_count,
    tickets_closed: closed.record_count,
  };
}

export async function getTicketCountsForRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<MonthlyTicketCounts[]> {
  const months: { year: number; month: number }[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return Promise.all(
    months.map(({ year, month }) => getTicketCountsForMonth(year, month))
  );
}
