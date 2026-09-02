import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/supplements', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const supplements = db
    .prepare('SELECT * FROM supplements WHERE active = 1 ORDER BY sort_order ASC')
    .all();
  const takenIds = new Set(
    db
      .prepare('SELECT supplement_id FROM supplement_logs WHERE date = ?')
      .all(date)
      .map((r) => r.supplement_id)
  );
  for (const s of supplements) s.taken = takenIds.has(s.id);
  res.json({ date, supplements });
});

router.post('/supplements', (req, res) => {
  const { name, dose_note } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM supplements').get().m;
  const info = db
    .prepare('INSERT INTO supplements (name, dose_note, sort_order) VALUES (?, ?, ?)')
    .run(name, dose_note || null, maxOrder + 1);
  res.status(201).json(db.prepare('SELECT * FROM supplements WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/supplements/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM supplements WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Suplemento não encontrado' });
  const { name, dose_note } = req.body;
  db.prepare('UPDATE supplements SET name = ?, dose_note = ? WHERE id = ?').run(
    name ?? s.name,
    dose_note === undefined ? s.dose_note : dose_note,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM supplements WHERE id = ?').get(req.params.id));
});

router.delete('/supplements/:id', (req, res) => {
  db.prepare('DELETE FROM supplements WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/supplements/:id/toggle', (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const existing = db
    .prepare('SELECT * FROM supplement_logs WHERE date = ? AND supplement_id = ?')
    .get(date, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM supplement_logs WHERE id = ?').run(existing.id);
    return res.json({ date, taken: false });
  }
  db.prepare('INSERT INTO supplement_logs (date, supplement_id) VALUES (?, ?)').run(date, req.params.id);
  res.json({ date, taken: true });
});

router.get('/ergogenics', (req, res) => {
  const items = db
    .prepare('SELECT * FROM ergogenic_items WHERE active = 1 ORDER BY sort_order ASC')
    .all();
  const lastLog = db.prepare(
    'SELECT date FROM ergogenic_logs WHERE ergogenic_item_id = ? ORDER BY date DESC, id DESC LIMIT 1'
  );
  for (const item of items) {
    const row = lastLog.get(item.id);
    item.last_application_date = row ? row.date : null;
  }
  res.json(items);
});

router.post('/ergogenics', (req, res) => {
  const { substance, dose_note, application_note, start_date } = req.body;
  if (!substance) return res.status(400).json({ error: 'substance é obrigatório' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM ergogenic_items').get().m;
  const info = db
    .prepare(
      'INSERT INTO ergogenic_items (substance, dose_note, application_note, start_date, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(substance, dose_note || null, application_note || null, start_date || null, maxOrder + 1);
  res.status(201).json(db.prepare('SELECT * FROM ergogenic_items WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/ergogenics/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM ergogenic_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  const { substance, dose_note, application_note, start_date } = req.body;
  db.prepare(
    'UPDATE ergogenic_items SET substance = ?, dose_note = ?, application_note = ?, start_date = ? WHERE id = ?'
  ).run(
    substance ?? item.substance,
    dose_note === undefined ? item.dose_note : dose_note,
    application_note === undefined ? item.application_note : application_note,
    start_date === undefined ? item.start_date : start_date,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM ergogenic_items WHERE id = ?').get(req.params.id));
});

router.delete('/ergogenics/:id', (req, res) => {
  db.prepare('DELETE FROM ergogenic_items WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/ergogenics/logs', (req, res) => {
  const limit = Number(req.query.limit) || 30;
  const rows = db
    .prepare(
      `SELECT l.*, e.substance, e.dose_note, e.application_note
       FROM ergogenic_logs l
       JOIN ergogenic_items e ON e.id = l.ergogenic_item_id
       ORDER BY l.date DESC, l.id DESC
       LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

router.post('/ergogenics/:id/logs', (req, res) => {
  const item = db.prepare('SELECT * FROM ergogenic_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  const { date, notes } = req.body;
  const d = date || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare('INSERT INTO ergogenic_logs (date, ergogenic_item_id, notes) VALUES (?, ?, ?)')
    .run(d, req.params.id, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM ergogenic_logs WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/ergogenics/logs/:id', (req, res) => {
  db.prepare('DELETE FROM ergogenic_logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
