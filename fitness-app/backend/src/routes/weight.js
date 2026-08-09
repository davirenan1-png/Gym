import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const limit = Number(req.query.limit) || 90;
  const rows = db
    .prepare('SELECT * FROM body_weight_logs ORDER BY date DESC LIMIT ?')
    .all(limit);
  res.json(rows.reverse());
});

router.post('/', (req, res) => {
  const { date, weight_kg, note } = req.body;
  if (!date || !weight_kg) {
    return res.status(400).json({ error: 'date e weight_kg são obrigatórios' });
  }
  db.prepare(
    `INSERT INTO body_weight_logs (date, weight_kg, note)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, note = excluded.note`
  ).run(date, weight_kg, note || null);
  const row = db.prepare('SELECT * FROM body_weight_logs WHERE date = ?').get(date);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM body_weight_logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
