import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/exercises', (req, res) => {
  res.json(db.prepare('SELECT * FROM exercises ORDER BY name ASC').all());
});

router.post('/exercises', (req, res) => {
  const { name, muscle_group } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  try {
    const info = db
      .prepare('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)')
      .run(name, muscle_group || null);
    res.status(201).json(db.prepare('SELECT * FROM exercises WHERE id = ?').get(info.lastInsertRowid));
  } catch {
    res.status(409).json({ error: 'Exercício já existe' });
  }
});

router.delete('/exercises/:id', (req, res) => {
  db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/exercises/:id/progress', (req, res) => {
  const rows = db
    .prepare(
      `SELECT ws.date AS date, MAX(s.weight_kg) AS max_weight_kg
       FROM workout_sets s
       JOIN workout_sessions ws ON ws.id = s.session_id
       WHERE s.exercise_id = ?
       GROUP BY ws.date
       ORDER BY ws.date ASC`
    )
    .all(req.params.id);
  res.json(rows);
});

router.get('/sessions', (req, res) => {
  const limit = Number(req.query.limit) || 30;
  const sessions = db
    .prepare('SELECT * FROM workout_sessions ORDER BY date DESC, id DESC LIMIT ?')
    .all(limit);
  const setsBySession = db.prepare(
    `SELECT s.*, e.name AS exercise_name
     FROM workout_sets s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.session_id = ?
     ORDER BY s.id ASC`
  );
  for (const session of sessions) {
    session.sets = setsBySession.all(session.id);
  }
  res.json(sessions);
});

router.post('/sessions', (req, res) => {
  const { date, notes, sets } = req.body;
  if (!date) return res.status(400).json({ error: 'date é obrigatório' });
  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO workout_sessions (date, notes) VALUES (?, ?)')
      .run(date, notes || null);
    const sessionId = info.lastInsertRowid;
    const insertSet = db.prepare(
      `INSERT INTO workout_sets (session_id, exercise_id, set_number, reps, weight_kg)
       VALUES (?, ?, ?, ?, ?)`
    );
    (sets || []).forEach((s, idx) => {
      insertSet.run(sessionId, s.exercise_id, s.set_number || idx + 1, s.reps || null, s.weight_kg || null);
    });
    return sessionId;
  });
  const sessionId = tx();
  const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(sessionId);
  session.sets = db
    .prepare(
      `SELECT s.*, e.name AS exercise_name FROM workout_sets s
       JOIN exercises e ON e.id = s.exercise_id WHERE s.session_id = ?`
    )
    .all(sessionId);
  res.status(201).json(session);
});

router.delete('/sessions/:id', (req, res) => {
  db.prepare('DELETE FROM workout_sessions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
