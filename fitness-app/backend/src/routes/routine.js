import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

// Position 0 (Legs 1) lands on this Monday; the 12-day cycle repeats from
// there, so which weekday a given training day falls on drifts week to week
// (12 isn't a multiple of 7) — that's expected, not a bug.
const ROUTINE_ANCHOR_MONDAY = '2026-08-31';

function daysBetween(a, b) {
  const d1 = new Date(`${a}T00:00:00Z`);
  const d2 = new Date(`${b}T00:00:00Z`);
  return Math.round((d2 - d1) / 86400000);
}

function positionForDate(dateStr, cycleLength) {
  const diff = daysBetween(ROUTINE_ANCHOR_MONDAY, dateStr);
  return ((diff % cycleLength) + cycleLength) % cycleLength;
}

function fullRoutine(date) {
  const days = db.prepare('SELECT * FROM routine_days ORDER BY position ASC').all();
  const exercisesByDay = db.prepare(
    'SELECT * FROM routine_exercises WHERE routine_day_id = ? ORDER BY sort_order ASC, id ASC'
  );
  for (const day of days) {
    day.exercises = exercisesByDay.all(day.id);
  }
  return {
    days,
    cycle_position: days.length ? positionForDate(date, days.length) : 0,
    principles_note: getSetting('routine_principles_note'),
    extras_note: getSetting('routine_extras_note'),
  };
}

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(fullRoutine(date));
});

router.put('/notes', (req, res) => {
  const { principles_note, extras_note } = req.body;
  if (principles_note !== undefined) setSetting('routine_principles_note', principles_note);
  if (extras_note !== undefined) setSetting('routine_extras_note', extras_note);
  res.json({
    principles_note: getSetting('routine_principles_note'),
    extras_note: getSetting('routine_extras_note'),
  });
});

router.put('/days/:id', (req, res) => {
  const day = db.prepare('SELECT * FROM routine_days WHERE id = ?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Dia não encontrado' });
  const { title, note, is_training } = req.body;
  db.prepare('UPDATE routine_days SET title = ?, note = ?, is_training = ? WHERE id = ?').run(
    title ?? day.title,
    note === undefined ? day.note : note,
    is_training === undefined ? day.is_training : (is_training ? 1 : 0),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM routine_days WHERE id = ?').get(req.params.id));
});

router.post('/days/:id/exercises', (req, res) => {
  const day = db.prepare('SELECT * FROM routine_days WHERE id = ?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Dia não encontrado' });
  const { name, sets_reps, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM routine_exercises WHERE routine_day_id = ?')
    .get(req.params.id).m;
  const info = db
    .prepare('INSERT INTO routine_exercises (routine_day_id, sort_order, name, sets_reps, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, maxOrder + 1, name, sets_reps || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM routine_exercises WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/exercises/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM routine_exercises WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Exercício do plano não encontrado' });
  const { name, sets_reps, notes } = req.body;
  db.prepare('UPDATE routine_exercises SET name = ?, sets_reps = ?, notes = ? WHERE id = ?').run(
    name ?? existing.name,
    sets_reps === undefined ? existing.sets_reps : sets_reps,
    notes === undefined ? existing.notes : notes,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM routine_exercises WHERE id = ?').get(req.params.id));
});

router.delete('/exercises/:id', (req, res) => {
  db.prepare('DELETE FROM routine_exercises WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
