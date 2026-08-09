import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const waterTotal =
    db.prepare('SELECT COALESCE(SUM(amount_ml), 0) AS t FROM water_logs WHERE date = ?').get(date).t;

  const foodTotals = db
    .prepare(
      `SELECT COALESCE(SUM(calories), 0) AS calories, COALESCE(SUM(protein_g), 0) AS protein_g,
              COALESCE(SUM(carbs_g), 0) AS carbs_g, COALESCE(SUM(fat_g), 0) AS fat_g
       FROM food_logs WHERE date = ?`
    )
    .get(date);

  const workoutToday = db
    .prepare('SELECT COUNT(*) AS c FROM workout_sessions WHERE date = ?')
    .get(date).c;

  const jiujitsuToday = db
    .prepare('SELECT COUNT(*) AS c FROM jiujitsu_sessions WHERE date = ?')
    .get(date).c;

  const latestWeight = db
    .prepare('SELECT * FROM body_weight_logs ORDER BY date DESC LIMIT 1')
    .get();

  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of settingsRows) settings[row.key] = row.value;

  const belt = db
    .prepare('SELECT * FROM belt_history ORDER BY date_achieved DESC, id DESC LIMIT 1')
    .get();

  res.json({
    date,
    water_ml: waterTotal,
    food: foodTotals,
    workout_sessions_today: workoutToday,
    jiujitsu_sessions_today: jiujitsuToday,
    latest_weight: latestWeight || null,
    settings,
    belt: belt || null,
  });
});
