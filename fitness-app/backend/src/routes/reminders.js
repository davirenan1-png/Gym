import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM reminders ORDER BY sort_order ASC, time ASC').all());
});

router.post('/', (req, res) => {
  const { title, body, time, days } = req.body;
  if (!title || !time) return res.status(400).json({ error: 'title e time são obrigatórios' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM reminders').get().m;
  const info = db
    .prepare('INSERT INTO reminders (title, body, time, days, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(title, body || null, time, days || 'all', maxOrder + 1);
  res.status(201).json(db.prepare('SELECT * FROM reminders WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Lembrete não encontrado' });
  const { title, body, time, days, active } = req.body;
  db.prepare(
    'UPDATE reminders SET title = ?, body = ?, time = ?, days = ?, active = ? WHERE id = ?'
  ).run(
    title ?? reminder.title,
    body === undefined ? reminder.body : body,
    time ?? reminder.time,
    days ?? reminder.days,
    active === undefined ? reminder.active : (active ? 1 : 0),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
