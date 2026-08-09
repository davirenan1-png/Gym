import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const logs = db
    .prepare('SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at ASC')
    .all(date);
  const total = logs.reduce((sum, l) => sum + l.amount_ml, 0);
  res.json({ date, logs, total_ml: total });
});

router.get('/history', (req, res) => {
  const days = Number(req.query.days) || 14;
  const rows = db
    .prepare(
      `SELECT date, SUM(amount_ml) AS total_ml
       FROM water_logs
       GROUP BY date
       ORDER BY date DESC
       LIMIT ?`
    )
    .all(days);
  res.json(rows.reverse());
});

router.post('/', (req, res) => {
  const { amount_ml, date } = req.body;
  if (!amount_ml || amount_ml <= 0) {
    return res.status(400).json({ error: 'amount_ml é obrigatório e deve ser positivo' });
  }
  const d = date || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)')
    .run(d, amount_ml);
  const log = db.prepare('SELECT * FROM water_logs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(log);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM water_logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
