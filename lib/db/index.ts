import Database from 'better-sqlite3';
import path from 'path';
import { initSchema } from './schema';
import { seedData } from './seed';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), 'data', 'capacity.db');
  _db = new Database(dbPath);

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  seedData(_db);

  return _db;
}
