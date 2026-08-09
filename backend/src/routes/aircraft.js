import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM aircraft ORDER BY registration').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Aeronave não encontrada' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { registration, model, manufacturer, total_hours, total_cycles, status } = req.body;
  if (!registration || !model) {
    return res.status(400).json({ error: 'Matrícula e modelo são obrigatórios' });
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO aircraft (registration, model, manufacturer, total_hours, total_cycles, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        registration.trim().toUpperCase(),
        model.trim(),
        manufacturer?.trim() ?? null,
        total_hours ?? 0,
        total_cycles ?? 0,
        status ?? 'ativa'
      );
    const row = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Já existe uma aeronave com essa matrícula' });
    }
    res.status(500).json({ error: 'Erro ao criar aeronave' });
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Aeronave não encontrada' });

  const { registration, model, manufacturer, total_hours, total_cycles, status } = req.body;
  db.prepare(
    `UPDATE aircraft SET
      registration = ?, model = ?, manufacturer = ?, total_hours = ?, total_cycles = ?, status = ?
     WHERE id = ?`
  ).run(
    (registration ?? existing.registration).trim().toUpperCase(),
    (model ?? existing.model).trim(),
    manufacturer?.trim() ?? existing.manufacturer,
    total_hours ?? existing.total_hours,
    total_cycles ?? existing.total_cycles,
    status ?? existing.status,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM aircraft WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Aeronave não encontrada' });
  res.status(204).send();
});
