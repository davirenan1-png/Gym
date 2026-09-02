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

function fullRoutine() {
  const days = db.prepare('SELECT * FROM routine_days ORDER BY position ASC').all();
  const exercisesByDay = db.prepare(
    'SELECT * FROM routine_exercises WHERE routine_day_id = ? ORDER BY sort_order ASC, id ASC'
  );
  for (const day of days) {
    day.exercises = exercisesByDay.all(day.id);
  }
  return {
    days,
    cycle_position: Number(getSetting('cycle_position')) || 0,
    principles_note: getSetting('routine_principles_note'),
    extras_note: getSetting('routine_extras_note'),
  };
}

router.get('/', (req, res) => {
  res.json(fullRoutine());
});

router.put('/advance', (req, res) => {
  const days = db.prepare('SELECT position FROM routine_days ORDER BY position ASC').all();
  if (days.length === 0) return res.status(400).json({ error: 'Nenhum dia cadastrado no ciclo' });
  const current = Number(getSetting('cycle_position')) || 0;
  const maxPosition = days[days.length - 1].position;
  const positions = days.map((d) => d.position);
  const idx = positions.indexOf(current);
  const next = idx === -1 || idx === positions.length - 1 ? positions[0] : positions[idx + 1];
  setSetting('cycle_position', String(next));
  res.json({ cycle_position: next, max_position: maxPosition });
});

router.put('/position', (req, res) => {
  const { position } = req.body;
  if (position === undefined || position === null) {
    return res.status(400).json({ error: 'position é obrigatório' });
  }
  setSetting('cycle_position', String(position));
  res.json({ cycle_position: Number(position) });
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
