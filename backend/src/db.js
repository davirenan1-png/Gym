import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'ctm.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS aircraft (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    manufacturer TEXT,
    total_hours REAL NOT NULL DEFAULT 0,
    total_cycles INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativa',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    interval_type TEXT NOT NULL CHECK (interval_type IN ('horas', 'ciclos', 'calendario')),
    interval_hours REAL,
    interval_cycles INTEGER,
    interval_days INTEGER,
    last_done_hours REAL,
    last_done_cycles INTEGER,
    last_done_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    part_number TEXT,
    serial_number TEXT,
    install_date TEXT,
    install_hours REAL NOT NULL DEFAULT 0,
    install_cycles INTEGER NOT NULL DEFAULT 0,
    life_limit_hours REAL,
    life_limit_cycles INTEGER,
    life_limit_months INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    maintenance_schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    performed_by TEXT,
    performed_at_date TEXT NOT NULL,
    performed_at_hours REAL,
    performed_at_cycles INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
