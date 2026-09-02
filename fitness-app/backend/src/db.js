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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_training INTEGER NOT NULL DEFAULT 1,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS routine_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    sets_reps TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS diet_plan_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('treino', 'descanso')),
    meal_number INTEGER NOT NULL,
    label TEXT NOT NULL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS diet_plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL REFERENCES diet_plan_meals(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dose_note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS supplement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    supplement_id INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (date, supplement_id)
  );

  CREATE TABLE IF NOT EXISTS ergogenic_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    substance TEXT NOT NULL,
    dose_note TEXT,
    application_note TEXT,
    start_date TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS ergogenic_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ergogenic_item_id INTEGER NOT NULL REFERENCES ergogenic_items(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    adherence_score REAL,
    adherence_note TEXT,
    sleep_hours REAL,
    mood TEXT,
    workout_performance REAL,
    digestion_notes TEXT,
    steps INTEGER,
    bathroom_quality REAL,
    comments TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    time TEXT NOT NULL,
    days TEXT NOT NULL DEFAULT 'all',
    active INTEGER NOT NULL DEFAULT 1,
    last_sent_date TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);
  CREATE INDEX IF NOT EXISTS idx_food_date ON food_logs(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_jiujitsu_date ON jiujitsu_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON routine_exercises(routine_day_id);
  CREATE INDEX IF NOT EXISTS idx_diet_plan_meals_type ON diet_plan_meals(plan_type);
  CREATE INDEX IF NOT EXISTS idx_diet_plan_items_meal ON diet_plan_items(meal_id);
  CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date);
  CREATE INDEX IF NOT EXISTS idx_ergogenic_logs_date ON ergogenic_logs(date);
  CREATE INDEX IF NOT EXISTS idx_checkin_logs_date ON checkin_logs(date);
`);

const defaultSettings = {
  water_goal_ml: '3000',
  calorie_goal: '',
  protein_goal_g: '',
  carbs_goal_g: '',
  fat_goal_g: '',
  weight_goal_kg: '',
  cycle_position: '0',
  routine_principles_note:
    'Registre todas as sessões — tente sempre superar a carga/reps anterior (mesmo que só +0,125kg).\n' +
    'As séries escritas são até a falha de verdade — não pare em número fixo, vá até falhar dentro da faixa de reps.\n' +
    'Faça séries de aquecimento (subindo o peso, sem falhar) antes da série que conta.\n' +
    'Alongue 60-90s cada grupo muscular treinado, no final da sessão.',
  routine_extras_note:
    'Abs: 3-5x/semana (vacuum 10s, rolinho, prancha, elevação de pernas).\n' +
    'Panturrilha: 3-4x/semana, sempre 2 exercícios (um com joelho estendido, um dobrado).\n' +
    'Cardio: 20 min pós-treino, >120bpm.',
  diet_general_notes:
    'Beber 3-4L de água por dia.\n' +
    'Descanso é fundamental — mantenha uma rotina de sono adequada.\n' +
    'Bebidas "zero" podem ser incluídas, sem exagerar.\n' +
    'Salada de folhas e legumes à vontade — no mínimo 2x ao dia.\n' +
    'Tempere as refeições com sal a gosto e ervas que preferir.\n' +
    'Pode untar panelas/frigideiras com azeite ou manteiga — unte, não frite.\n' +
    'Não compre o whey mais barato — prefira isolados/3W de qualidade (CFM é ainda melhor).',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

const routineSeed = [
  {
    title: 'Legs 1',
    is_training: 1,
    exercises: [
      { name: 'Cad. Abdutora (em pé)', sets_reps: '2x12~15', notes: null },
      { name: 'Extensora', sets_reps: '2x8-10', notes: null },
      { name: 'Agachamento', sets_reps: '1x12~15, 1x5~9', notes: null },
      { name: 'Leg 45 Uni', sets_reps: '1x8-12, 1x15', notes: null },
      { name: 'Stiff RDL', sets_reps: '1x8~12, 1x5~9', notes: null },
      { name: 'Elevação Pélvica', sets_reps: '2x8-10', notes: null },
      { name: 'Cad. Adutora', sets_reps: '1x8~12, 1x10', notes: '3s parado no alongamento na 1ª série' },
    ],
  },
  {
    title: 'Push 1',
    is_training: 1,
    exercises: [
      { name: 'Crucifixo Reto', sets_reps: '2x8~12', notes: 'Aquecimento: 2s de isometria no alongamento do peitoral' },
      { name: 'Sup. Reto (máquina ou halter)', sets_reps: '1x5~9, 1x15', notes: null },
      { name: 'Supino Inclinado (smith ou barra)', sets_reps: '1x5~9, 1x15', notes: null },
      { name: 'Crossover / Voador', sets_reps: '1x5~9, 1x12~15', notes: null },
      { name: 'Militar no Smith', sets_reps: '2x5~9', notes: 'Banco um pouco mais deitado' },
      { name: 'Elevação Lateral', sets_reps: '2x12~15', notes: 'Movimento controlado, sem balanço — se possível, sentado' },
      { name: 'Tríceps Testa (halter/barra)', sets_reps: '1x8~12, 1x8', notes: 'Trocar se doer o cotovelo' },
      { name: 'Tríceps Pulley', sets_reps: '2x8~12', notes: null },
    ],
  },
  {
    title: 'Pull 1',
    is_training: 1,
    exercises: [
      { name: 'Depressão Sagital (pullover, máquina se tiver)', sets_reps: '1x15, 1x6-8', notes: null },
      { name: 'Pulldown', sets_reps: '1x10-12, 1x8', notes: null },
      { name: 'Remada Livre Pronada', sets_reps: '1x5~9, 1x12~15', notes: null },
      { name: 'Remada Máquina', sets_reps: '1x5-9, 1x12-15', notes: null },
      { name: 'Serrote', sets_reps: '1x8-12, 1x15', notes: null },
      { name: 'Crucifixo Inverso', sets_reps: '2x5~9', notes: null },
      { name: 'Encolhimento (barra atrás)', sets_reps: '2x8~12', notes: 'Mantém escápulas aduzidas; sobe ombros e flexiona cotovelo na subida também' },
      { name: 'Scott Unilateral', sets_reps: '2x8~12', notes: '2s no alongamento na 1ª série, 2s de isometria no pico de contração na 2ª' },
      { name: 'Rosca Direta W', sets_reps: '2x8~12', notes: null },
    ],
  },
  {
    title: 'Descanso',
    is_training: 0,
    exercises: [],
  },
  {
    title: 'Pernas',
    is_training: 1,
    exercises: [
      { name: 'Hack', sets_reps: '1x5~8, 1x12', notes: null },
      { name: 'Leg 45', sets_reps: '1x5~9, 1x10-12', notes: null },
      { name: 'Extensora', sets_reps: '1x8, 1x10', notes: null },
      { name: 'Mesa Flexora', sets_reps: '1x8-10, 1x12-15', notes: null },
    ],
  },
  {
    title: 'Braço e Ombro',
    is_training: 1,
    exercises: [
      { name: 'Rosca Martelo Alternada', sets_reps: '3x10-12', notes: 'Super-série com Tríceps Francês na Polia' },
      { name: 'Tríceps Francês na Polia', sets_reps: '3x10-12', notes: 'Super-série com Rosca Martelo Alternada' },
      { name: 'Rosca Direta Barra W', sets_reps: '3x10-12', notes: 'Super-série com Tríceps Corda' },
      { name: 'Tríceps Corda', sets_reps: '3x10-12', notes: 'Super-série com Rosca Direta Barra W' },
      { name: 'Rosca Scott', sets_reps: '3x10-12', notes: 'Super-série com Supino Pegada Fechada' },
      { name: 'Supino Pegada Fechada', sets_reps: '3x10-12', notes: 'Super-série com Rosca Scott — cotovelos fechados, foco em tríceps' },
      { name: 'Elevação Lateral Sentado', sets_reps: '3x12-15', notes: 'Super-série com Elevação Frontal com Halter' },
      { name: 'Elevação Frontal com Halter', sets_reps: '3x12-15', notes: 'Super-série com Elevação Lateral Sentado' },
      { name: 'Desenvolvimento', sets_reps: '1x5, 1x8', notes: null },
      { name: 'Voador Inverso', sets_reps: '3x12-15', notes: null },
    ],
  },
  {
    title: 'Peito e Costas',
    is_training: 1,
    exercises: [
      { name: 'Barra Fixa', sets_reps: '2x falha', notes: null },
      { name: 'Remada Curvada (smith)', sets_reps: '1x5~9, 1x10', notes: null },
      { name: 'Serrote ou Hammer Neutra', sets_reps: '2x8-10', notes: null },
      { name: 'Supino Inclinado', sets_reps: '2x5~9', notes: null },
      { name: 'Paralela', sets_reps: '2x falha', notes: null },
      { name: 'Pec Dec ou Voador', sets_reps: '1x10, 1x20', notes: '1ª série: 2s no alongamento. 2ª série: rest pause' },
    ],
  },
  {
    title: 'Descanso',
    is_training: 0,
    exercises: [],
  },
  {
    title: 'Legs 2',
    is_training: 1,
    exercises: [
      { name: 'Cad. Abdutora (em pé)', sets_reps: '2x12~15', notes: null },
      { name: 'Extensora', sets_reps: '1x15~20', notes: 'Pico de contração de 2s — segura a bunda no banco, foca em esticar 100% o joelho e segurar a contração lá' },
      { name: 'Cad. Flexora', sets_reps: '1x8~12, 1x5~9', notes: null },
      { name: 'Leg Press Unilateral', sets_reps: '1x5-9, 1x20', notes: 'Jeito que pega menos o joelho' },
      { name: 'Levantamento Terra', sets_reps: '1x6-8, 1x12~15', notes: null },
      { name: 'Elevação da Pelve', sets_reps: '2x8~12', notes: null },
    ],
  },
  {
    title: 'Push 2',
    is_training: 1,
    exercises: [
      { name: 'Supino Inclinado (halter)', sets_reps: '1x5-8, 1x10', notes: '1ª série com o maior peso que tiver' },
      { name: 'Supino reto ou declinado (máq. ou barra)', sets_reps: '1x5-8, 1x15', notes: null },
      { name: 'Crucifixo Inclinado', sets_reps: '2x8~12', notes: 'Aquecimento: 2s de isometria no alongamento do peitoral' },
      { name: 'Remada em Pé (pegada aberta)', sets_reps: '2x8~12', notes: null },
      { name: 'Elevação Lateral no Cross (polia na altura do joelho)', sets_reps: '2x8~12', notes: null },
      { name: 'Tríceps Francês', sets_reps: '2x5~9', notes: null },
    ],
  },
  {
    title: 'Pull 2',
    is_training: 1,
    exercises: [
      { name: 'Depressão Sagital', sets_reps: '2x15', notes: null },
      { name: 'Puxador Pronado', sets_reps: '2x5~9', notes: null },
      { name: 'Puxador Neutro', sets_reps: '2x5~9', notes: 'Se tiver Dorian Yates Pull, melhor — segura 2s no alongamento o máximo de reps que der e depois explode' },
      { name: 'Cavalinho', sets_reps: '1x5~9, 1x8', notes: null },
      { name: 'Remada Livre (barra ou smith)', sets_reps: '1x6-8, 2x12~15', notes: 'Pico de contração de 2s' },
      { name: 'Rosca no Banco Inclinado', sets_reps: '3x8~12', notes: null },
    ],
  },
  {
    title: 'Descanso',
    is_training: 0,
    exercises: [],
  },
];

const routineDaysCount = db.prepare('SELECT COUNT(*) AS c FROM routine_days').get().c;
if (routineDaysCount === 0) {
  const insertDay = db.prepare(
    'INSERT INTO routine_days (position, title, is_training, note) VALUES (?, ?, ?, ?)'
  );
  const insertExercise = db.prepare(
    'INSERT INTO routine_exercises (routine_day_id, sort_order, name, sets_reps, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    routineSeed.forEach((day, position) => {
      const info = insertDay.run(position, day.title, day.is_training, day.note || null);
      day.exercises.forEach((ex, exIndex) => {
        insertExercise.run(info.lastInsertRowid, exIndex, ex.name, ex.sets_reps, ex.notes);
      });
    });
  });
  seedTx();
}

const dietPlanSeed = {
  treino: [
    {
      meal_number: 1,
      label: 'Pela manhã',
      notes: null,
      items: ['2 ovos', '6 claras (200g) — ou 45g whey', '60g aveia', '2 banana'],
    },
    {
      meal_number: 2,
      label: 'Refeição 2',
      notes: null,
      items: ['200g arroz', '160g frango ou peixe', 'Verduras/legumes', '100g mamão'],
    },
    {
      meal_number: 3,
      label: 'Refeição 3',
      notes: 'Intra-treino: 5g creatina, se puder 10g aminoácidos',
      items: ['2 fatias de pão', '20g requeijão light/queijo cottage', '160g frango ou peixe'],
    },
    {
      meal_number: 4,
      label: 'Refeição 4',
      notes: null,
      items: ['200g arroz', '160g carne vermelha', 'Verduras/legumes'],
    },
    {
      meal_number: 5,
      label: 'Refeição 5',
      notes: null,
      items: ['40g whey', '30g aveia/granola', '170ml iogurte natural', '20g pasta de amendoim/amêndoas/castanha'],
    },
  ],
  descanso: [
    {
      meal_number: 1,
      label: 'Refeição 1',
      notes: null,
      items: ['2 ovos', '6 claras (200g) — ou 45g whey', '30g aveia', '1 banana'],
    },
    {
      meal_number: 2,
      label: 'Refeição 2',
      notes: null,
      items: ['200g arroz', '160g frango ou peixe', 'Verduras/legumes', '100g mamão'],
    },
    {
      meal_number: 3,
      label: 'Refeição 3',
      notes: null,
      items: ['2 fatias de pão', '160g frango ou peixe'],
    },
    {
      meal_number: 4,
      label: 'Refeição 4',
      notes: null,
      items: ['100g arroz', '160g carne vermelha', 'Verduras/legumes'],
    },
    {
      meal_number: 5,
      label: 'Refeição 5',
      notes: null,
      items: ['40g whey', '20g aveia/granola', '170ml iogurte natural', '20g pasta de amendoim/amêndoas/castanha'],
    },
  ],
};

const dietPlanCount = db.prepare('SELECT COUNT(*) AS c FROM diet_plan_meals').get().c;
if (dietPlanCount === 0) {
  const insertMeal = db.prepare(
    'INSERT INTO diet_plan_meals (plan_type, meal_number, label, notes, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO diet_plan_items (meal_id, sort_order, description) VALUES (?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    for (const [planType, meals] of Object.entries(dietPlanSeed)) {
      meals.forEach((meal, mealIndex) => {
        const info = insertMeal.run(planType, meal.meal_number, meal.label, meal.notes, mealIndex);
        meal.items.forEach((desc, itemIndex) => {
          insertItem.run(info.lastInsertRowid, itemIndex, desc);
        });
      });
    }
  });
  seedTx();
}

const supplementsSeed = [
  { name: 'Vitamina D3', dose_note: '5000ui/dia' },
  { name: 'Multivitamínico', dose_note: '1 cápsula/dia' },
  { name: 'NAC', dose_note: '600mg/dia' },
  { name: 'Cacau em pó', dose_note: '10g/dia (comum, não formulado)' },
];

const supplementsCount = db.prepare('SELECT COUNT(*) AS c FROM supplements').get().c;
if (supplementsCount === 0) {
  const insertSupp = db.prepare(
    'INSERT INTO supplements (name, dose_note, sort_order) VALUES (?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    supplementsSeed.forEach((s, i) => insertSupp.run(s.name, s.dose_note, i));
  });
  seedTx();
}

const ergogenicSeed = [
  { substance: 'Testosterona Enantato', dose_note: '250mg', application_note: '1 ml', start_date: '2026-05-06' },
  { substance: 'Masteron (slow)', dose_note: '200mg', application_note: '2 ml', start_date: '2026-05-06' },
];

const ergogenicCount = db.prepare('SELECT COUNT(*) AS c FROM ergogenic_items').get().c;
if (ergogenicCount === 0) {
  const insertErg = db.prepare(
    'INSERT INTO ergogenic_items (substance, dose_note, application_note, start_date, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    ergogenicSeed.forEach((e, i) => insertErg.run(e.substance, e.dose_note, e.application_note, e.start_date, i));
  });
  seedTx();
}

const remindersSeed = [
  { title: '💧 Água', body: 'Bebeu água nas últimas horas?', time: '10:00', days: 'all' },
  { title: '💧 Água', body: 'Hora de beber água.', time: '15:00', days: 'all' },
  { title: '💧 Água', body: 'Fecha a meta de água de hoje.', time: '20:00', days: 'all' },
  { title: '💊 Suplementos', body: 'Hora dos suplementos da manhã.', time: '08:00', days: 'all' },
  { title: '🍽️ Refeição 1', body: 'Café da manhã — hora de comer.', time: '07:30', days: 'all' },
  { title: '🍽️ Refeição 2', body: 'Hora da refeição 2.', time: '12:00', days: 'all' },
  { title: '🍽️ Refeição 3', body: 'Hora da refeição 3.', time: '15:30', days: 'all' },
  { title: '🍽️ Refeição 4', body: 'Hora da refeição 4.', time: '19:00', days: 'all' },
  { title: '🍽️ Refeição 5', body: 'Hora da refeição 5.', time: '21:30', days: 'all' },
  {
    title: '📸 Check-in com o coach',
    body: 'Tire as fotos e preencha o Diário antes das 9h.',
    time: '08:00',
    days: 'segunda',
  },
];

const remindersCount = db.prepare('SELECT COUNT(*) AS c FROM reminders').get().c;
if (remindersCount === 0) {
  const insertReminder = db.prepare(
    'INSERT INTO reminders (title, body, time, days, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const seedTx = db.transaction(() => {
    remindersSeed.forEach((r, i) => insertReminder.run(r.title, r.body, r.time, r.days, i));
  });
  seedTx();
}
