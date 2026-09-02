import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value ?? '');
}

function fullPlan(date) {
  const meals = db.prepare('SELECT * FROM diet_plan_meals ORDER BY plan_type ASC, sort_order ASC').all();
  const itemsByMeal = db.prepare(
    'SELECT * FROM diet_plan_items WHERE meal_id = ? ORDER BY sort_order ASC, id ASC'
  );
  const doneIds = new Set(
    db.prepare('SELECT meal_id FROM diet_meal_logs WHERE date = ?').all(date).map((r) => r.meal_id)
  );
  for (const meal of meals) {
    meal.items = itemsByMeal.all(meal.id);
    meal.done = doneIds.has(meal.id);
  }
  return {
    date,
    treino: meals.filter((m) => m.plan_type === 'treino'),
    descanso: meals.filter((m) => m.plan_type === 'descanso'),
    general_notes: getSetting('diet_general_notes'),
  };
}

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(fullPlan(date));
});

router.post('/meals/:id/toggle', (req, res) => {
  const meal = db.prepare('SELECT * FROM diet_plan_meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Refeição não encontrada' });
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const existing = db
    .prepare('SELECT * FROM diet_meal_logs WHERE date = ? AND meal_id = ?')
    .get(date, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM diet_meal_logs WHERE id = ?').run(existing.id);
    return res.json({ date, done: false });
  }
  db.prepare('INSERT INTO diet_meal_logs (date, meal_id) VALUES (?, ?)').run(date, req.params.id);
  res.json({ date, done: true });
});

router.put('/notes', (req, res) => {
  const { general_notes } = req.body;
  if (general_notes !== undefined) setSetting('diet_general_notes', general_notes);
  res.json({ general_notes: getSetting('diet_general_notes') });
});

router.put('/meals/:id', (req, res) => {
  const meal = db.prepare('SELECT * FROM diet_plan_meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Refeição não encontrada' });
  const { label, notes } = req.body;
  db.prepare('UPDATE diet_plan_meals SET label = ?, notes = ? WHERE id = ?').run(
    label ?? meal.label,
    notes === undefined ? meal.notes : notes,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM diet_plan_meals WHERE id = ?').get(req.params.id));
});

router.post('/meals/:id/items', (req, res) => {
  const meal = db.prepare('SELECT * FROM diet_plan_meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Refeição não encontrada' });
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description é obrigatório' });
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM diet_plan_items WHERE meal_id = ?')
    .get(req.params.id).m;
  const info = db
    .prepare('INSERT INTO diet_plan_items (meal_id, sort_order, description) VALUES (?, ?, ?)')
    .run(req.params.id, maxOrder + 1, description);
  res.status(201).json(db.prepare('SELECT * FROM diet_plan_items WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM diet_plan_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  const { description } = req.body;
  db.prepare('UPDATE diet_plan_items SET description = ? WHERE id = ?').run(
    description ?? item.description,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM diet_plan_items WHERE id = ?').get(req.params.id));
});

router.delete('/items/:id', (req, res) => {
  db.prepare('DELETE FROM diet_plan_items WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
