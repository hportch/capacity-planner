import mysql from 'mysql2/promise';
import { initSchema } from './schema';
import { seedData } from './seed';

export type DbArgs = (string | number | boolean | null)[];
export interface DbStatement { sql: string; args: DbArgs; }

let _pool: mysql.Pool | null = null;
let _initPromise: Promise<void> | null = null;

function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'capacity_planner',
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return _pool;
}

async function ensureInit(): Promise<mysql.Pool> {
  const pool = getPool();
  if (!_initPromise) {
    _initPromise = (async () => {
      await initSchema(pool);
      await seedData(pool);
    })();
  }
  await _initPromise;
  return pool;
}

/** Query a single row */
export async function dbGet<T>(sql: string, args?: DbArgs): Promise<T | undefined> {
  const pool = await ensureInit();
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, args || []);
  return rows[0] as T | undefined;
}

/** Query all rows */
export async function dbAll<T>(sql: string, args?: DbArgs): Promise<T[]> {
  const pool = await ensureInit();
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, args || []);
  return rows as T[];
}

/** Execute a statement (insert/update/delete). Returns rowsAffected and insertId. */
export async function dbRun(sql: string, args?: DbArgs): Promise<{ rowsAffected: number; insertId: number }> {
  const pool = await ensureInit();
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, args || []);
  return { rowsAffected: result.affectedRows, insertId: result.insertId };
}

/** Execute multiple statements in a transaction */
export async function dbBatch(stmts: DbStatement[]): Promise<void> {
  const pool = await ensureInit();
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    for (const stmt of stmts) {
      await conn.execute(stmt.sql, stmt.args);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Get raw pool for advanced use */
export async function getDb(): Promise<mysql.Pool> {
  return ensureInit();
}
