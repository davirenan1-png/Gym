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

  CREATE TABLE IF NOT EXISTS routine_days (
    weekday TEXT PRIMARY KEY CHECK (weekday IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
    title TEXT NOT NULL,
    is_training INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS routine_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekday TEXT NOT NULL REFERENCES routine_days(weekday) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    sets_reps TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
  CREATE INDEX IF NOT EXISTS idx_food_date ON food_logs(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_jiujitsu_date ON jiujitsu_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_routine_exercises_weekday ON routine_exercises(weekday);
`);

const defaultSettings = {
  water_goal_ml: '3000',
  calorie_goal: '',
  protein_goal_g: '',
  carbs_goal_g: '',
  fat_goal_g: '',
  weight_goal_kg: '',
  routine_general_note:
    'Fazer 1 a 2 séries de aquecimento subindo o peso antes da Top Set (não contam como séries de treino).',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

const routineSeed = [
  {
    weekday: 'segunda',
    title: 'Push (Peito / Ombro / Tríceps)',
    is_training: 1,
    note: null,
    exercises: [
      { name: 'Supino Inclinado (Smith ou Halter)', sets_reps: '1 Top Set (5-8) + 1 Back-off (12-15)', notes: null },
      { name: 'Crucifixo Reto (Halter ou Máquina)', sets_reps: '2x10-12', notes: null },
      { name: 'Supino Reto Articulado (Máquina)', sets_reps: '2x8-12', notes: null },
      { name: 'Desenvolvimento Militar (Smith ou Halter)', sets_reps: '2x8-12', notes: null },
      { name: 'Elevação Lateral (Polia ou Halter)', sets_reps: '3x12-15', notes: null },
      { name: 'Tríceps Testa (Barra W ou Halter)', sets_reps: '2x10-12', notes: null },
      { name: 'Tríceps Pulley (Corda ou Barra)', sets_reps: '2x12-15', notes: null },
    ],
  },
  {
    weekday: 'terca',
    title: 'Pull (Costas / Post. Ombro / Bíceps)',
    is_training: 1,
    note: null,
    exercises: [
      { name: 'Puxador Pronado (Aberto)', sets_reps: '1 Top Set (6-8) + 1 Back-off (12-15)', notes: null },
      { name: 'Remada Baixa com Triângulo (ou Máq.)', sets_reps: '2x8-12', notes: null },
      { name: 'Pulldown com Corda', sets_reps: '2x12-15', notes: null },
      { name: 'Crucifixo Inverso (Voador Dorsal)', sets_reps: '3x12-15', notes: null },
      { name: 'Rosca Scott (Unilateral ou Barra W)', sets_reps: '2x8-12', notes: null },
      { name: 'Rosca Martelo (Halteres)', sets_reps: '2x10-12', notes: null },
    ],
  },
  {
    weekday: 'quarta',
    title: 'Legs (Foco em Quadríceps)',
    is_training: 1,
    note: null,
    exercises: [
      { name: 'Cadeira Extensora', sets_reps: '2x15', notes: 'Aquecimento/ativação' },
      { name: 'Agachamento (Hack ou Smith)', sets_reps: '1 Top Set (6-8) + 1 Back-off (12)', notes: null },
      { name: 'Leg Press 45 (Tradicional ou Unilateral)', sets_reps: '2x10-12', notes: null },
      { name: 'Cadeira Flexora', sets_reps: '3x10-12', notes: null },
      { name: 'Panturrilha Sentado ou no Leg', sets_reps: '4x15', notes: '2s iso no pico' },
    ],
  },
  {
    weekday: 'quinta',
    title: 'Upper (Superior Completo - Força)',
    is_training: 1,
    note: null,
    exercises: [
      { name: 'Supino Inclinado (Barra ou Halter)', sets_reps: '2x6-8', notes: null },
      { name: 'Barra Fixa (ou Puxador)', sets_reps: '2x até a falha (ou 8-10 c/ carga)', notes: null },
      { name: 'Remada Cavalinho (ou Curvada Apoiada)', sets_reps: '2x8-10', notes: null },
      { name: 'Elevação Lateral no Cabo', sets_reps: '3x12', notes: null },
      { name: 'Rosca Direta W', sets_reps: '3x10-12', notes: 'Super-série com Tríceps Francês, sem descanso entre eles' },
      { name: 'Tríceps Francês na Polia', sets_reps: '3x10-12', notes: 'Super-série com Rosca Direta W, sem descanso entre eles' },
    ],
  },
  {
    weekday: 'sexta',
    title: 'Lower (Foco em Cadeia Posterior)',
    is_training: 1,
    note: null,
    exercises: [
      { name: 'Stiff (RDL) com Halteres ou Barra', sets_reps: '2x8-12', notes: null },
      { name: 'Mesa Flexora', sets_reps: '3x10-12', notes: null },
      { name: 'Leg Press 45 (Pés mais altos)', sets_reps: '2x12', notes: null },
      { name: 'Elevação Pélvica', sets_reps: '2x10-12', notes: null },
      { name: 'Panturrilha em Pé', sets_reps: '4x12-15', notes: null },
    ],
  },
  {
    weekday: 'sabado',
    title: 'Só Jiu-Jitsu',
    is_training: 0,
    note: 'Musculação descansa.',
    exercises: [],
  },
  {
    weekday: 'domingo',
    title: 'Descanso Total',
    is_training: 0,
    note: null,
    exercises: [],
  },
];

const routineDaysCount = db.prepare('SELECT COUNT(*) AS c FROM routine_days').get().c;
if (routineDaysCount === 0) {
  const insertDay = db.prepare(
    'INSERT INTO routine_days (weekday, title, is_training, note, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertExercise = db.prepare(
    'INSERT INTO routine_exercises (weekday, sort_order, name, sets_reps, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    routineSeed.forEach((day, dayIndex) => {
      insertDay.run(day.weekday, day.title, day.is_training, day.note, dayIndex);
      day.exercises.forEach((ex, exIndex) => {
        insertExercise.run(day.weekday, exIndex, ex.name, ex.sets_reps, ex.notes);
      });
    });
  });
  seedTx();
}
