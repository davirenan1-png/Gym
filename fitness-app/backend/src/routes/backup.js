import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

// Order matters: parents before children on restore, children before parents on wipe.
const TABLES = [
  'settings',
  'water_logs',
  'body_weight_logs',
  'food_logs',
  'exercises',
  'workout_sessions',
  'workout_sets',
  'jiujitsu_sessions',
  'belt_history',
  'routine_days',
  'routine_exercises',
  'diet_plan_meals',
  'diet_plan_items',
  'diet_meal_logs',
  'supplements',
  'supplement_logs',
  'ergogenic_items',
  'ergogenic_logs',
  'checkin_logs',
  'push_subscriptions',
  'reminders',
];

router.get('/', (req, res) => {
  const data = {};
  for (const table of TABLES) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  res.json({ exported_at: new Date().toISOString(), version: 1, data });
});

router.post('/', (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Arquivo de backup inválido' });
  }

  const tx = db.transaction(() => {
    for (const table of [...TABLES].reverse()) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of TABLES) {
      const rows = Array.isArray(data[table]) ? data[table] : [];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insert = db.prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      );
      for (const row of rows) {
        insert.run(columns.map((c) => row[c]));
      }
    }
  });

  try {
    tx();
  } catch (err) {
    return res.status(400).json({ error: `Falha ao restaurar backup: ${err.message}` });
  }

  res.json({ ok: true });
});
