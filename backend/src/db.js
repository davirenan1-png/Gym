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
  CREATE TABLE IF NOT EXISTS aircraft_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manufacturer TEXT,
    engine_count INTEGER NOT NULL DEFAULT 1 CHECK (engine_count IN (1, 2)),
    has_propellers INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS model_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL REFERENCES aircraft_models(id) ON DELETE CASCADE,
    zona TEXT,
    nomenclatura TEXT NOT NULL,
    referencia_mm TEXT,
    applies_to TEXT NOT NULL CHECK (applies_to IN ('celula', 'motor', 'helice')),
    interval_hours REAL,
    interval_days REAL,
    interval_cycles REAL,
    tolerance_percent REAL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS aircraft (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL REFERENCES aircraft_models(id),
    registration TEXT NOT NULL UNIQUE,
    cell_serial_number TEXT,
    manufacture_date TEXT,
    cell_hours REAL NOT NULL DEFAULT 0,
    cell_cycles REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativa',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS aircraft_engines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('unico', 'lh', 'rh')),
    model TEXT,
    serial_number TEXT,
    hours REAL NOT NULL DEFAULT 0,
    cycles REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS aircraft_propellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('unico', 'lh', 'rh')),
    model TEXT,
    serial_number TEXT,
    hours REAL NOT NULL DEFAULT 0,
    cycles REAL
  );

  CREATE TABLE IF NOT EXISTS aircraft_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    source_model_item_id INTEGER REFERENCES model_items(id) ON DELETE SET NULL,
    zona TEXT,
    nomenclatura TEXT NOT NULL,
    referencia_mm TEXT,
    ref_type TEXT NOT NULL CHECK (ref_type IN ('celula', 'motor', 'helice')),
    ref_id INTEGER,
    interval_hours REAL,
    interval_days REAL,
    interval_cycles REAL,
    tolerance_percent REAL,
    last_done_hours REAL,
    last_done_cycles REAL,
    last_done_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_model_items_model ON model_items(model_id);
  CREATE INDEX IF NOT EXISTS idx_aircraft_items_aircraft ON aircraft_items(aircraft_id);
  CREATE INDEX IF NOT EXISTS idx_engines_aircraft ON aircraft_engines(aircraft_id);
  CREATE INDEX IF NOT EXISTS idx_propellers_aircraft ON aircraft_propellers(aircraft_id);
`);
