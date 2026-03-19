import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initSchema } from './schema';
import { seedData } from './seed';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
  const dataDir = path.join(baseDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'capacity.db');
  _db = new Database(dbPath);

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  seedData(_db);

  return _db;
}
