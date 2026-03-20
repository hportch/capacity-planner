import type mysql from 'mysql2/promise';

async function getSchemaVersion(pool: mysql.Pool): Promise<number> {
  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT version FROM _schema_version LIMIT 1');
    return (rows[0] as Record<string, number>)?.version ?? 0;
  } catch {
    // Table doesn't exist yet — version 0
    return 0;
  }
}

async function setSchemaVersion(pool: mysql.Pool, version: number): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _schema_version (version INT NOT NULL)
  `);
  await pool.execute('DELETE FROM _schema_version');
  await pool.execute('INSERT INTO _schema_version (version) VALUES (?)', [version]);
}

export async function initSchema(pool: mysql.Pool): Promise<void> {
  const version = await getSchemaVersion(pool);

  if (version < 1) {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id            INT NOT NULL AUTO_INCREMENT,
        name          VARCHAR(255) NOT NULL,
        display_order INT NOT NULL DEFAULT 0,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_teams_name (name)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id         INT NOT NULL AUTO_INCREMENT,
        name       VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_roles_name (name)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS statuses (
        id                  INT NOT NULL AUTO_INCREMENT,
        name                VARCHAR(255) NOT NULL,
        category            ENUM('available', 'unavailable', 'partial', 'loaned') NOT NULL,
        availability_weight DOUBLE NOT NULL DEFAULT 1.0,
        color               VARCHAR(20) NOT NULL DEFAULT '#64748b',
        display_order       INT NOT NULL DEFAULT 0,
        created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_statuses_name (name)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff (
        id               INT NOT NULL AUTO_INCREMENT,
        name             VARCHAR(255) NOT NULL,
        team_id          INT NOT NULL,
        role_id          INT NOT NULL,
        start_date       DATE NOT NULL,
        end_date         DATE,
        contracted_hours DOUBLE NOT NULL DEFAULT 37.5,
        is_active        TINYINT(1) NOT NULL DEFAULT 1,
        is_vacancy       TINYINT(1) NOT NULL DEFAULT 0,
        notes            TEXT,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_staff_team (team_id),
        KEY idx_staff_active (is_active),
        CONSTRAINT fk_staff_team FOREIGN KEY (team_id) REFERENCES teams(id),
        CONSTRAINT fk_staff_role FOREIGN KEY (role_id) REFERENCES roles(id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS daily_allocations (
        id         INT NOT NULL AUTO_INCREMENT,
        staff_id   INT NOT NULL,
        date       DATE NOT NULL,
        status_id  INT NOT NULL,
        notes      TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_alloc_staff_date (staff_id, date),
        KEY idx_alloc_date (date),
        CONSTRAINT fk_alloc_staff FOREIGN KEY (staff_id) REFERENCES staff(id),
        CONSTRAINT fk_alloc_status FOREIGN KEY (status_id) REFERENCES statuses(id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS capacity_thresholds (
        id                INT NOT NULL AUTO_INCREMENT,
        team_id           INT NOT NULL,
        min_headcount     INT,
        min_utilisation   DOUBLE NOT NULL DEFAULT 0.9,
        ideal_utilisation DOUBLE NOT NULL DEFAULT 1.0,
        max_utilisation   DOUBLE NOT NULL DEFAULT 1.1,
        effective_from    DATE NOT NULL,
        effective_to      DATE,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_threshold_team_from (team_id, effective_from),
        CONSTRAINT fk_threshold_team FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_metrics (
        id                INT NOT NULL AUTO_INCREMENT,
        year              INT NOT NULL,
        month             INT NOT NULL,
        capacity_baseline INT NOT NULL,
        tickets_opened    INT NOT NULL DEFAULT 0,
        tickets_closed    INT NOT NULL DEFAULT 0,
        ticket_system     VARCHAR(100),
        notes             TEXT,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_ticket_year_month (year, month),
        CHECK (month BETWEEN 1 AND 12)
      )
    `);

    await setSchemaVersion(pool, 3);
  }
}
