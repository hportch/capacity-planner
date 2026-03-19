import type { Client } from '@libsql/client';
import { STATUS_COLORS } from '../constants';

export async function seedData(client: Client): Promise<void> {
  const countResult = await client.execute('SELECT COUNT(*) as c FROM teams');
  const count = (countResult.rows[0] as Record<string, number>)?.c ?? 0;
  if (count > 0) return; // Already seeded

  // Batch all seed inserts in a transaction
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];

  // Teams
  stmts.push({ sql: 'INSERT INTO teams (name, display_order) VALUES (?, ?)', args: ['Service Desk', 1] });
  stmts.push({ sql: 'INSERT INTO teams (name, display_order) VALUES (?, ?)', args: ['OST', 2] });
  stmts.push({ sql: 'INSERT INTO teams (name, display_order) VALUES (?, ?)', args: ['OST BaB', 3] });
  stmts.push({ sql: 'INSERT INTO teams (name, display_order) VALUES (?, ?)', args: ['Projects', 4] });
  stmts.push({ sql: 'INSERT INTO teams (name, display_order) VALUES (?, ?)', args: ['MGMT', 5] });

  // Roles
  for (const role of ['Support Engineer', 'Senior Support', 'OST', 'Engineer', 'MGMT', 'SE', 'Service']) {
    stmts.push({ sql: 'INSERT INTO roles (name) VALUES (?)', args: [role] });
  }

  // Statuses
  const statusSql = 'INSERT INTO statuses (name, category, availability_weight, color, display_order) VALUES (?, ?, ?, ?, ?)';

  const available: [string, number][] = [
    ['Normal Work', 1], ['Service Desk', 2], ['SD', 3], ['Projects', 4],
    ['VSOC', 5], ['DWP', 6], ['Argus', 7], ['BaB', 8], ['On-site', 9], ['Office', 10],
  ];
  for (const [name, order] of available) {
    stmts.push({ sql: statusSql, args: [name, 'available', 1.0, STATUS_COLORS[name] || '#22c55e', order] });
  }

  const unavailable: [string, number][] = [
    ['Annual Leave', 20], ['Leave', 21], ['A/L', 22], ['Bank Holiday', 23],
    ['Sickness', 24], ['Sick Leave', 25], ['Compassionate Leave', 26], ['Maternity Leave', 27],
    ['Training', 30], ['Study', 31], ['Revision', 32], ['Exam', 33], ['Left', 40],
  ];
  for (const [name, order] of unavailable) {
    stmts.push({ sql: statusSql, args: [name, 'unavailable', 0.0, STATUS_COLORS[name] || '#ef4444', order] });
  }

  const partial: [string, number][] = [
    ['WFH', 50], ['Half Day', 51], ['On-Call', 52], ['Admin', 53], ['Induction', 54],
  ];
  for (const [name, order] of partial) {
    stmts.push({ sql: statusSql, args: [name, 'partial', 0.5, STATUS_COLORS[name] || '#f59e0b', order] });
  }

  await client.batch(stmts, 'write');

  // Now look up IDs for staff inserts (need sequential execution after teams/roles are created)
  const getTeamId = async (name: string) => {
    const r = await client.execute({ sql: 'SELECT id FROM teams WHERE name = ?', args: [name] });
    return (r.rows[0] as Record<string, number>).id;
  };
  const getRoleId = async (name: string) => {
    const r = await client.execute({ sql: 'SELECT id FROM roles WHERE name = ?', args: [name] });
    return (r.rows[0] as Record<string, number>).id;
  };

  const sd = await getTeamId('Service Desk');
  const ost = await getTeamId('OST');
  const ostBab = await getTeamId('OST BaB');
  const projects = await getTeamId('Projects');
  const mgmt = await getTeamId('MGMT');

  const supportEng = await getRoleId('Support Engineer');
  const seniorSupport = await getRoleId('Senior Support');
  const ostRole = await getRoleId('OST');
  const engineer = await getRoleId('Engineer');
  const mgmtRole = await getRoleId('MGMT');
  const se = await getRoleId('SE');
  const service = await getRoleId('Service');

  const staffSql = `INSERT INTO staff (name, team_id, role_id, start_date, end_date, is_active, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const staffStmts: { sql: string; args: (string | number | null)[] }[] = [];

  // Active Service Desk staff
  staffStmts.push({ sql: staffSql, args: ['Sarah Watkins', sd, supportEng, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Jacob Martin', sd, supportEng, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Dan Carter', sd, supportEng, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['James Norman', sd, supportEng, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Tom Harber', sd, supportEng, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Luke Rothwell', sd, seniorSupport, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['James Mapes', sd, seniorSupport, '2025-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Ben Lockhart', sd, seniorSupport, '2024-01-01', null, 1, null] });

  // OST BaB
  staffStmts.push({ sql: staffSql, args: ['Eddie Beebee', ostBab, ostRole, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Alex Walton', ostBab, ostRole, '2024-01-01', null, 1, null] });

  // OST
  staffStmts.push({ sql: staffSql, args: ['Udit Patel', ost, ostRole, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Ray Chitekwe', ost, ostRole, '2024-01-01', null, 1, null] });

  // Projects
  staffStmts.push({ sql: staffSql, args: ['Nayan Kolhar', projects, engineer, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Sean Fenton', projects, engineer, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Andrew Lord', projects, engineer, '2024-01-01', null, 1, 'Also SD Team Lead from 2026'] });

  // MGMT
  staffStmts.push({ sql: staffSql, args: ['Heide Stanley', mgmt, service, '2025-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Amber Baker', mgmt, service, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Alex Lawson', mgmt, mgmtRole, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Amy Rawle', mgmt, mgmtRole, '2024-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Rebecca Smith', mgmt, mgmtRole, '2025-01-01', null, 1, null] });
  staffStmts.push({ sql: staffSql, args: ['Henry Portch', sd, se, '2025-01-01', null, 1, null] });

  // Historical leavers
  staffStmts.push({ sql: staffSql, args: ['Jack Mumford', mgmt, service, '2024-01-01', '2025-06-30', 0, 'Left June 2025'] });
  staffStmts.push({ sql: staffSql, args: ['Will Workman', sd, supportEng, '2024-01-01', '2024-12-31', 0, 'Left end of 2024'] });
  staffStmts.push({ sql: staffSql, args: ['Shane Visagie', mgmt, service, '2024-01-01', '2024-12-31', 0, 'Left end of 2024'] });
  staffStmts.push({ sql: staffSql, args: ['Karl Smith', mgmt, mgmtRole, '2024-01-01', '2024-12-31', 0, 'Left end of 2024'] });
  staffStmts.push({ sql: staffSql, args: ['Jake Vardy', ostBab, ostRole, '2024-01-01', '2024-12-31', 0, 'Left end of 2024'] });

  // Thresholds
  const thresholdSql = `INSERT INTO capacity_thresholds (team_id, min_headcount, min_utilisation, ideal_utilisation, max_utilisation, effective_from) VALUES (?, ?, ?, ?, ?, ?)`;
  staffStmts.push({ sql: thresholdSql, args: [sd, 5, 0.6, 1.0, 1.1, '2024-01-01'] });
  staffStmts.push({ sql: thresholdSql, args: [ost, 1, 0.5, 1.0, 1.1, '2024-01-01'] });
  staffStmts.push({ sql: thresholdSql, args: [ostBab, 1, 0.5, 1.0, 1.1, '2024-01-01'] });
  staffStmts.push({ sql: thresholdSql, args: [projects, 2, 0.6, 1.0, 1.1, '2024-01-01'] });
  staffStmts.push({ sql: thresholdSql, args: [mgmt, 2, 0.5, 1.0, 1.1, '2024-01-01'] });

  // Ticket metrics
  const ticketSql = `INSERT INTO ticket_metrics (year, month, capacity_baseline, tickets_opened, tickets_closed, ticket_system, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const tickets2024: [number, number, number][] = [
    [1, 1587, 1076], [2, 1370, 900], [3, 1400, 1150], [4, 1256, 1175],
    [5, 1008, 1111], [6, 1211, 1063], [7, 1107, 1076], [8, 912, 925],
    [9, 1290, 1270], [10, 1114, 1117], [11, 1030, 1010], [12, 698, 711],
  ];
  for (const [month, opened, closed] of tickets2024) {
    staffStmts.push({ sql: ticketSql, args: [2024, month, 1312, opened, closed, 'Connectwise', 'Exc Alerts'] });
  }

  const tickets2025: [number, number, number, number][] = [
    [1, 1312, 1075, 910], [2, 1312, 1040, 1040], [3, 1312, 991, 1000],
    [4, 2500, 1795, 1773], [5, 2500, 2447, 2620], [6, 2500, 3702, 3687],
    [7, 2500, 3702, 3678], [8, 2500, 2555, 2451], [9, 2500, 2121, 2235],
    [10, 2500, 2005, 2068], [11, 2500, 2226, 2183], [12, 2500, 1487, 1548],
  ];
  for (const [month, baseline, opened, closed] of tickets2025) {
    staffStmts.push({ sql: ticketSql, args: [2025, month, baseline, opened, closed, 'HaloPSA', month <= 3 ? 'Connectwise - migrating to HALO' : null] });
  }

  const tickets2026: [number, number, number][] = [[1, 38, 44], [2, 70, 69], [3, 57, 56]];
  for (const [month, opened, closed] of tickets2026) {
    staffStmts.push({ sql: ticketSql, args: [2026, month, 2300, opened, closed, 'HaloPSA', null] });
  }

  await client.batch(staffStmts, 'write');

  // Migration: add loaned status if missing
  const loanedResult = await client.execute("SELECT COUNT(*) as c FROM statuses WHERE category = 'loaned'");
  const loanedCount = (loanedResult.rows[0] as Record<string, number>)?.c ?? 0;
  if (loanedCount === 0) {
    await client.execute({
      sql: 'INSERT INTO statuses (name, category, availability_weight, color, display_order) VALUES (?, ?, ?, ?, ?)',
      args: ['Loaned', 'loaned', 0.0, '#f472b6', 60],
    });
  }
}
