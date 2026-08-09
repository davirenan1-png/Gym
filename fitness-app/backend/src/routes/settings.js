import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  const belt = db
    .prepare('SELECT * FROM belt_history ORDER BY date_achieved DESC, id DESC LIMIT 1')
    .get();
  res.json({ ...settings, belt: belt || null });
});

const upsert = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

router.put('/', (req, res) => {
  const allowedKeys = [
    'water_goal_ml',
    'calorie_goal',
    'protein_goal_g',
    'carbs_goal_g',
    'fat_goal_g',
    'weight_goal_kg',
  ];
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (!allowedKeys.includes(key)) continue;
      upsert.run(key, value === null || value === undefined ? '' : String(value));
    }
  });
  tx(Object.entries(req.body || {}));
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});
