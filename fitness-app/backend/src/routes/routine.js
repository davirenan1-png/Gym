import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

const WEEKDAYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

function fullRoutine() {
  const days = db.prepare('SELECT * FROM routine_days ORDER BY sort_order ASC').all();
  const exercisesByDay = db.prepare(
    'SELECT * FROM routine_exercises WHERE weekday = ? ORDER BY sort_order ASC, id ASC'
  );
  for (const day of days) {
    day.exercises = exercisesByDay.all(day.weekday);
  }
  const note = db.prepare('SELECT value FROM settings WHERE key = ?').get('routine_general_note');
  return { days, general_note: note ? note.value : '' };
}

router.get('/', (req, res) => {
  res.json(fullRoutine());
});

router.put('/note', (req, res) => {
  const { note } = req.body;
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('routine_general_note', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(note || '');
  res.json({ general_note: note || '' });
});

router.put('/:weekday', (req, res) => {
  const { weekday } = req.params;
  if (!WEEKDAYS.includes(weekday)) return res.status(400).json({ error: 'weekday inválido' });
  const { title, note } = req.body;
  const day = db.prepare('SELECT * FROM routine_days WHERE weekday = ?').get(weekday);
  if (!day) return res.status(404).json({ error: 'Dia não encontrado' });
  db.prepare('UPDATE routine_days SET title = ?, note = ? WHERE weekday = ?').run(
    title ?? day.title,
    note === undefined ? day.note : note,
    weekday
  );
  res.json(db.prepare('SELECT * FROM routine_days WHERE weekday = ?').get(weekday));
});

router.post('/:weekday/exercises', (req, res) => {
  const { weekday } = req.params;
  if (!WEEKDAYS.includes(weekday)) return res.status(400).json({ error: 'weekday inválido' });
  const { name, sets_reps, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM routine_exercises WHERE weekday = ?')
    .get(weekday).m;
  const info = db
    .prepare('INSERT INTO routine_exercises (weekday, sort_order, name, sets_reps, notes) VALUES (?, ?, ?, ?, ?)')
    .run(weekday, maxOrder + 1, name, sets_reps || null, notes || null);
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
