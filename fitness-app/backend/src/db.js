import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'fitness.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    logged_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS body_weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('cafe', 'almoco', 'jantar', 'lanche', 'outro')),
    description TEXT NOT NULL,
    calories REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    logged_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    muscle_group TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL DEFAULT 1,
    reps INTEGER,
    weight_kg REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jiujitsu_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    gi INTEGER NOT NULL DEFAULT 1,
    focus TEXT NOT NULL DEFAULT 'aula' CHECK (focus IN ('aula', 'drilling', 'sparring', 'competicao')),
    duration_min INTEGER,
    rounds INTEGER,
    intensity INTEGER CHECK (intensity IS NULL OR (intensity BETWEEN 1 AND 5)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS belt_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    belt TEXT NOT NULL CHECK (belt IN ('branca', 'azul', 'roxa', 'marrom', 'preta')),
    stripes INTEGER NOT NULL DEFAULT 0 CHECK (stripes BETWEEN 0 AND 4),
    date_achieved TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
  CREATE INDEX IF NOT EXISTS idx_food_date ON food_logs(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_jiujitsu_date ON jiujitsu_sessions(date);
`);

const defaultSettings = {
  water_goal_ml: '3000',
  calorie_goal: '',
  protein_goal_g: '',
  carbs_goal_g: '',
  fat_goal_g: '',
  weight_goal_kg: '',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}
