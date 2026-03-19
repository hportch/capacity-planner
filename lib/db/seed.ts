import type Database from 'better-sqlite3';
import { STATUS_COLORS } from '../constants';

export function seedData(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM teams').get() as { c: number };
  if (count.c > 0) return; // Already seeded

  const tx = db.transaction(() => {
    // Teams
    const insertTeam = db.prepare(
      'INSERT INTO teams (name, display_order) VALUES (?, ?)'
    );
    insertTeam.run('Service Desk', 1);
    insertTeam.run('OST', 2);
    insertTeam.run('OST BaB', 3);
    insertTeam.run('Projects', 4);
    insertTeam.run('MGMT', 5);

    // Roles
    const insertRole = db.prepare('INSERT INTO roles (name) VALUES (?)');
    insertRole.run('Support Engineer');
    insertRole.run('Senior Support');
    insertRole.run('OST');
    insertRole.run('Engineer');
    insertRole.run('MGMT');
    insertRole.run('SE');
    insertRole.run('Service');

    // Statuses
    const insertStatus = db.prepare(
      'INSERT INTO statuses (name, category, availability_weight, color, display_order) VALUES (?, ?, ?, ?, ?)'
    );

    // Available statuses (weight 1.0)
    const available: [string, number][] = [
      ['Normal Work', 1],
      ['Service Desk', 2],
      ['SD', 3],
      ['Projects', 4],
      ['VSOC', 5],
      ['DWP', 6],
      ['Argus', 7],
      ['BaB', 8],
      ['On-site', 9],
      ['Office', 10],
    ];
    for (const [name, order] of available) {
      insertStatus.run(name, 'available', 1.0, STATUS_COLORS[name] || '#22c55e', order);
    }

    // Unavailable statuses (weight 0.0)
    const unavailable: [string, number][] = [
      ['Annual Leave', 20],
      ['Leave', 21],
      ['A/L', 22],
      ['Bank Holiday', 23],
      ['Sickness', 24],
      ['Sick Leave', 25],
      ['Compassionate Leave', 26],
      ['Maternity Leave', 27],
      ['Training', 30],
      ['Study', 31],
      ['Revision', 32],
      ['Exam', 33],
      ['Left', 40],
    ];
    for (const [name, order] of unavailable) {
      insertStatus.run(name, 'unavailable', 0.0, STATUS_COLORS[name] || '#ef4444', order);
    }

    // Partial statuses (weight 0.5)
    const partial: [string, number][] = [
      ['WFH', 50],
      ['Half Day', 51],
      ['On-Call', 52],
      ['Admin', 53],
      ['Induction', 54],
    ];
    for (const [name, order] of partial) {
      insertStatus.run(name, 'partial', 0.5, STATUS_COLORS[name] || '#f59e0b', order);
    }

    // Helper to get IDs
    const getTeamId = (name: string) =>
      (db.prepare('SELECT id FROM teams WHERE name = ?').get(name) as { id: number }).id;
    const getRoleId = (name: string) =>
      (db.prepare('SELECT id FROM roles WHERE name = ?').get(name) as { id: number }).id;

    // Staff — 2026 current roster
    const insertStaff = db.prepare(
      `INSERT INTO staff (name, team_id, role_id, start_date, end_date, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const sd = getTeamId('Service Desk');
    const ost = getTeamId('OST');
    const ostBab = getTeamId('OST BaB');
    const projects = getTeamId('Projects');
    const mgmt = getTeamId('MGMT');

    const supportEng = getRoleId('Support Engineer');
    const seniorSupport = getRoleId('Senior Support');
    const ostRole = getRoleId('OST');
    const engineer = getRoleId('Engineer');
    const mgmtRole = getRoleId('MGMT');
    const se = getRoleId('SE');
    const service = getRoleId('Service');

    // Active Service Desk staff
    insertStaff.run('Sarah Watkins', sd, supportEng, '2024-01-01', null, 1, null);
    insertStaff.run('Jacob Martin', sd, supportEng, '2024-01-01', null, 1, null);
    insertStaff.run('Dan Carter', sd, supportEng, '2024-01-01', null, 1, null);
    insertStaff.run('James Norman', sd, supportEng, '2024-01-01', null, 1, null);
    insertStaff.run('Tom Harber', sd, supportEng, '2024-01-01', null, 1, null);
    insertStaff.run('Luke Rothwell', sd, seniorSupport, '2024-01-01', null, 1, null);
    insertStaff.run('James Mapes', sd, seniorSupport, '2025-01-01', null, 1, null);
    insertStaff.run('Ben Lockhart', sd, seniorSupport, '2024-01-01', null, 1, null);

    // Active OST BaB staff
    insertStaff.run('Eddie Beebee', ostBab, ostRole, '2024-01-01', null, 1, null);
    insertStaff.run('Alex Walton', ostBab, ostRole, '2024-01-01', null, 1, null);

    // Active OST staff
    insertStaff.run('Udit Patel', ost, ostRole, '2024-01-01', null, 1, null);
    insertStaff.run('Ray Chitekwe', ost, ostRole, '2024-01-01', null, 1, null);

    // Active Projects staff
    insertStaff.run('Nayan Kolhar', projects, engineer, '2024-01-01', null, 1, null);
    insertStaff.run('Sean Fenton', projects, engineer, '2024-01-01', null, 1, null);
    insertStaff.run('Andrew Lord', projects, engineer, '2024-01-01', null, 1, 'Also SD Team Lead from 2026');

    // Active MGMT staff
    insertStaff.run('Heide Stanley', mgmt, service, '2025-01-01', null, 1, null);
    insertStaff.run('Amber Baker', mgmt, service, '2024-01-01', null, 1, null);
    insertStaff.run('Alex Lawson', mgmt, mgmtRole, '2024-01-01', null, 1, null);
    insertStaff.run('Amy Rawle', mgmt, mgmtRole, '2024-01-01', null, 1, null);
    insertStaff.run('Rebecca Smith', mgmt, mgmtRole, '2025-01-01', null, 1, null);

    // Henry & apprentice
    insertStaff.run('Henry Portch', sd, se, '2025-01-01', null, 1, null);

    // Historical leavers (is_active = 0)
    insertStaff.run('Jack Mumford', mgmt, service, '2024-01-01', '2025-06-30', 0, 'Left June 2025');
    insertStaff.run('Will Workman', sd, supportEng, '2024-01-01', '2024-12-31', 0, 'Left end of 2024');
    insertStaff.run('Shane Visagie', mgmt, service, '2024-01-01', '2024-12-31', 0, 'Left end of 2024');
    insertStaff.run('Karl Smith', mgmt, mgmtRole, '2024-01-01', '2024-12-31', 0, 'Left end of 2024');
    insertStaff.run('Jake Vardy', ostBab, ostRole, '2024-01-01', '2024-12-31', 0, 'Left end of 2024');

    // Capacity thresholds
    const insertThreshold = db.prepare(
      `INSERT INTO capacity_thresholds (team_id, min_headcount, min_utilisation, ideal_utilisation, max_utilisation, effective_from)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertThreshold.run(sd, 5, 0.6, 1.0, 1.1, '2024-01-01');
    insertThreshold.run(ost, 1, 0.5, 1.0, 1.1, '2024-01-01');
    insertThreshold.run(ostBab, 1, 0.5, 1.0, 1.1, '2024-01-01');
    insertThreshold.run(projects, 2, 0.6, 1.0, 1.1, '2024-01-01');
    insertThreshold.run(mgmt, 2, 0.5, 1.0, 1.1, '2024-01-01');

    // Ticket metrics — 2024
    const insertTicket = db.prepare(
      `INSERT INTO ticket_metrics (year, month, capacity_baseline, tickets_opened, tickets_closed, ticket_system, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const tickets2024 = [
      [1, 1587, 1076], [2, 1370, 900], [3, 1400, 1150], [4, 1256, 1175],
      [5, 1008, 1111], [6, 1211, 1063], [7, 1107, 1076], [8, 912, 925],
      [9, 1290, 1270], [10, 1114, 1117], [11, 1030, 1010], [12, 698, 711],
    ];
    for (const [month, opened, closed] of tickets2024) {
      insertTicket.run(2024, month, 1312, opened, closed, 'Connectwise', 'Exc Alerts');
    }

    // Ticket metrics — 2025
    const tickets2025: [number, number, number, number][] = [
      [1, 1312, 1075, 910], [2, 1312, 1040, 1040], [3, 1312, 991, 1000],
      [4, 2500, 1795, 1773], [5, 2500, 2447, 2620], [6, 2500, 3702, 3687],
      [7, 2500, 3702, 3678], [8, 2500, 2555, 2451], [9, 2500, 2121, 2235],
      [10, 2500, 2005, 2068], [11, 2500, 2226, 2183], [12, 2500, 1487, 1548],
    ];
    for (const [month, baseline, opened, closed] of tickets2025) {
      insertTicket.run(2025, month, baseline, opened, closed, 'HaloPSA',
        month <= 3 ? 'Connectwise - migrating to HALO' : null);
    }

    // Ticket metrics — 2026 (partial year data)
    const tickets2026: [number, number, number][] = [
      [1, 38, 44], [2, 70, 69], [3, 57, 56],
    ];
    for (const [month, opened, closed] of tickets2026) {
      insertTicket.run(2026, month, 2300, opened, closed, 'HaloPSA', null);
    }
  });

  tx();
}
