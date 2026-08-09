import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const logs = db
    .prepare('SELECT * FROM food_logs WHERE date = ? ORDER BY logged_at ASC')
    .all(date);
  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein_g: acc.protein_g + (l.protein_g || 0),
      carbs_g: acc.carbs_g + (l.carbs_g || 0),
      fat_g: acc.fat_g + (l.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  res.json({ date, logs, totals });
});

router.post('/', (req, res) => {
  const { date, meal_type, description, calories, protein_g, carbs_g, fat_g } = req.body;
  if (!description || !meal_type) {
    return res.status(400).json({ error: 'meal_type e description são obrigatórios' });
  }
  const d = date || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO food_logs (date, meal_type, description, calories, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(d, meal_type, description, calories || null, protein_g || null, carbs_g || null, fat_g || null);
  const log = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(log);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM food_logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
