import { createClient, type Client, type InValue, type InStatement } from '@libsql/client';
import { initSchema } from './schema';
import { seedData } from './seed';

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:data/capacity.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function ensureInit(): Promise<Client> {
  const client = getClient();
  if (!_initPromise) {
    _initPromise = (async () => {
      await initSchema(client);
      await seedData(client);
    })();
  }
  await _initPromise;
  return client;
}

/** Query a single row */
export async function dbGet<T>(sql: string, args?: InValue[]): Promise<T | undefined> {
  const client = await ensureInit();
  const result = await client.execute({ sql, args: args || [] });
  return result.rows[0] as T | undefined;
}

/** Query all rows */
export async function dbAll<T>(sql: string, args?: InValue[]): Promise<T[]> {
  const client = await ensureInit();
  const result = await client.execute({ sql, args: args || [] });
  return result.rows as T[];
}

/** Execute a statement (insert/update/delete). Returns rowsAffected and lastInsertRowid. */
export async function dbRun(sql: string, args?: InValue[]): Promise<{ rowsAffected: number; lastInsertRowid: bigint | undefined }> {
  const client = await ensureInit();
  const result = await client.execute({ sql, args: args || [] });
  return { rowsAffected: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}

/** Execute multiple statements in a transaction (batch) */
export async function dbBatch(stmts: InStatement[]): Promise<void> {
  const client = await ensureInit();
  await client.batch(stmts, 'write');
}

/** Execute raw multi-statement SQL (for schema DDL) — only used internally */
export async function dbExecRaw(sql: string): Promise<void> {
  const client = await ensureInit();
  await client.executeMultiple(sql);
}

/** Get raw client for advanced use */
export async function getDb(): Promise<Client> {
  return ensureInit();
}
