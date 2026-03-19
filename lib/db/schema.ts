import type { Client } from '@libsql/client';

export async function initSchema(client: Client): Promise<void> {
  const versionResult = await client.execute('PRAGMA user_version');
  const version = (versionResult.rows[0] as Record<string, number>)?.user_version ?? 0;

  if (version < 1) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS teams (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL UNIQUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS roles (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS statuses (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT NOT NULL UNIQUE,
        category            TEXT NOT NULL CHECK (category IN ('available', 'unavailable', 'partial')),
        availability_weight REAL NOT NULL DEFAULT 1.0,
        color               TEXT NOT NULL DEFAULT '#64748b',
        display_order       INTEGER NOT NULL DEFAULT 0,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS staff (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT NOT NULL,
        team_id          INTEGER NOT NULL REFERENCES teams(id),
        role_id          INTEGER NOT NULL REFERENCES roles(id),
        start_date       TEXT NOT NULL,
        end_date         TEXT,
        contracted_hours REAL NOT NULL DEFAULT 37.5,
        is_active        INTEGER NOT NULL DEFAULT 1,
        notes            TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_staff_team ON staff(team_id);
      CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

      CREATE TABLE IF NOT EXISTS daily_allocations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id   INTEGER NOT NULL REFERENCES staff(id),
        date       TEXT NOT NULL,
        status_id  INTEGER NOT NULL REFERENCES statuses(id),
        notes      TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(staff_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_alloc_date ON daily_allocations(date);
      CREATE INDEX IF NOT EXISTS idx_alloc_staff_date ON daily_allocations(staff_id, date);

      CREATE TABLE IF NOT EXISTS capacity_thresholds (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id           INTEGER NOT NULL REFERENCES teams(id),
        min_headcount     INTEGER,
        min_utilisation   REAL NOT NULL DEFAULT 0.9,
        ideal_utilisation REAL NOT NULL DEFAULT 1.0,
        max_utilisation   REAL NOT NULL DEFAULT 1.1,
        effective_from    TEXT NOT NULL,
        effective_to      TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(team_id, effective_from)
      );

      CREATE TABLE IF NOT EXISTS ticket_metrics (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        year              INTEGER NOT NULL,
        month             INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        capacity_baseline INTEGER NOT NULL,
        tickets_opened    INTEGER NOT NULL DEFAULT 0,
        tickets_closed    INTEGER NOT NULL DEFAULT 0,
        ticket_system     TEXT,
        notes             TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(year, month)
      );

      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    await client.executeMultiple(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE IF NOT EXISTS statuses_new (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT NOT NULL UNIQUE,
        category            TEXT NOT NULL CHECK (category IN ('available', 'unavailable', 'partial', 'loaned')),
        availability_weight REAL NOT NULL DEFAULT 1.0,
        color               TEXT NOT NULL DEFAULT '#64748b',
        display_order       INTEGER NOT NULL DEFAULT 0,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO statuses_new SELECT * FROM statuses;
      DROP TABLE statuses;
      ALTER TABLE statuses_new RENAME TO statuses;

      PRAGMA foreign_keys = ON;
      PRAGMA user_version = 2;
    `);
  }

  if (version < 3) {
    await client.executeMultiple(`
      ALTER TABLE staff ADD COLUMN is_vacancy INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 3;
    `);
  }
}
