import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/sessions', (req, res) => {
  const limit = Number(req.query.limit) || 60;
  res.json(
    db.prepare('SELECT * FROM jiujitsu_sessions ORDER BY date DESC, id DESC LIMIT ?').all(limit)
  );
});

router.post('/sessions', (req, res) => {
  const { date, gi, focus, duration_min, rounds, intensity, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'date é obrigatório' });
  const info = db
    .prepare(
      `INSERT INTO jiujitsu_sessions (date, gi, focus, duration_min, rounds, intensity, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      date,
      gi === false ? 0 : 1,
      focus || 'aula',
      duration_min || null,
      rounds || null,
      intensity || null,
      notes || null
    );
  res.status(201).json(db.prepare('SELECT * FROM jiujitsu_sessions WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/sessions/:id', (req, res) => {
  db.prepare('DELETE FROM jiujitsu_sessions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/stats', (req, res) => {
  const totalSessions = db.prepare('SELECT COUNT(*) AS c FROM jiujitsu_sessions').get().c;
  const last30 = db
    .prepare(
      `SELECT COUNT(*) AS c FROM jiujitsu_sessions WHERE date >= date('now', '-30 days')`
    )
    .get().c;
  const dates = db
    .prepare('SELECT DISTINCT date FROM jiujitsu_sessions ORDER BY date DESC')
    .all()
    .map((r) => r.date);

  let streak = 0;
  let cursor = new Date();
  const toKey = (d) => d.toISOString().slice(0, 10);
  const dateSet = new Set(dates);
  if (dateSet.has(toKey(cursor))) {
    streak = 1;
  } else {
    cursor.setDate(cursor.getDate() - 1);
    if (dateSet.has(toKey(cursor))) streak = 1;
    else streak = 0;
  }
  while (streak > 0) {
    cursor.setDate(cursor.getDate() - 1);
    if (dateSet.has(toKey(cursor))) streak += 1;
    else break;
  }

  res.json({ total_sessions: totalSessions, last_30_days: last30, current_streak_days: streak });
});

router.get('/belt', (req, res) => {
  res.json(db.prepare('SELECT * FROM belt_history ORDER BY date_achieved DESC, id DESC').all());
});

router.post('/belt', (req, res) => {
  const { belt, stripes, date_achieved, notes } = req.body;
  if (!belt || !date_achieved) {
    return res.status(400).json({ error: 'belt e date_achieved são obrigatórios' });
  }
  const info = db
    .prepare('INSERT INTO belt_history (belt, stripes, date_achieved, notes) VALUES (?, ?, ?, ?)')
    .run(belt, stripes || 0, date_achieved, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM belt_history WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/belt/:id', (req, res) => {
  db.prepare('DELETE FROM belt_history WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
