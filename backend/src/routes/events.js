import { Router } from 'express';
import { db } from '../db.js';
import { computeItemStatus } from '../status.js';
import { resolveCounter, refLabel } from '../counters.js';

export const router = Router();

function withEventItems(event) {
  const rows = db
    .prepare(
      `SELECT event_items.*, aircraft_items.zona, aircraft_items.nomenclatura, aircraft_items.ref_type, aircraft_items.ref_id,
              aircraft_items.interval_hours, aircraft_items.interval_days, aircraft_items.interval_cycles, aircraft_items.tolerance_percent,
              aircraft_items.last_done_hours, aircraft_items.last_done_cycles, aircraft_items.last_done_date
       FROM event_items JOIN aircraft_items ON aircraft_items.id = event_items.aircraft_item_id
       WHERE event_items.event_id = ?
       ORDER BY event_items.id`
    )
    .all(event.id);
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(event.aircraft_id);
  const items = rows.map((row) => {
    const counter = resolveCounter(aircraft, row.ref_type, row.ref_id);
    return {
      event_item_id: row.id,
      aircraft_item_id: row.aircraft_item_id,
      zona: row.zona,
      nomenclatura: row.nomenclatura,
      ref_label: refLabel(row.ref_type, row.ref_id),
      work_status: row.work_status,
      pending_reason: row.pending_reason,
      pending_notes: row.pending_notes,
      ...computeItemStatus(row, counter),
    };
  });
  return { ...event, items };
}

router.get('/aircraft/:aircraftId/events', (req, res) => {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.aircraftId);
  if (!aircraft) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const rows = db.prepare('SELECT * FROM maintenance_events WHERE aircraft_id = ? ORDER BY id DESC').all(req.params.aircraftId);
  res.json(rows.map(withEventItems));
});

router.get('/events/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.json(withEventItems(event));
});

router.post('/aircraft/:aircraftId/events', (req, res) => {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.aircraftId);
  if (!aircraft) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const { name, predicted_delivery_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do pacote é obrigatório' });
  const info = db
    .prepare('INSERT INTO maintenance_events (aircraft_id, name, predicted_delivery_date, notes) VALUES (?, ?, ?, ?)')
    .run(req.params.aircraftId, name.trim(), predicted_delivery_date ?? null, notes ?? null);
  const row = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withEventItems(row));
});

router.put('/events/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pacote não encontrado' });
  const fields = {
    name: req.body.name ?? existing.name,
    status: req.body.status ?? existing.status,
    predicted_delivery_date: req.body.predicted_delivery_date ?? existing.predicted_delivery_date,
    actual_delivery_date: req.body.actual_delivery_date ?? existing.actual_delivery_date,
    notes: req.body.notes ?? existing.notes,
  };
  if (fields.status === 'concluido' && !fields.actual_delivery_date) {
    fields.actual_delivery_date = new Date().toISOString().slice(0, 10);
  }
  db.prepare(
    'UPDATE maintenance_events SET name = ?, status = ?, predicted_delivery_date = ?, actual_delivery_date = ?, notes = ? WHERE id = ?'
  ).run(fields.name, fields.status, fields.predicted_delivery_date, fields.actual_delivery_date, fields.notes, req.params.id);
  const row = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(req.params.id);
  res.json(withEventItems(row));
});

router.delete('/events/:id', (req, res) => {
  const info = db.prepare('DELETE FROM maintenance_events WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Pacote não encontrado' });
  res.status(204).send();
});

// Adiciona um ou mais itens da matriz ao pacote (work_status inicial: pendente)
router.post('/events/:id/items', (req, res) => {
  const event = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Pacote não encontrado' });
  const { aircraft_item_ids } = req.body;
  if (!Array.isArray(aircraft_item_ids) || aircraft_item_ids.length === 0) {
    return res.status(400).json({ error: 'aircraft_item_ids é obrigatório' });
  }
  const insert = db.prepare('INSERT OR IGNORE INTO event_items (event_id, aircraft_item_id) VALUES (?, ?)');
  const insertMany = db.transaction((ids) => {
    for (const itemId of ids) insert.run(req.params.id, itemId);
  });
  insertMany(aircraft_item_ids);
  res.status(201).json(withEventItems(event));
});

router.put('/event-items/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM event_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item do pacote não encontrado' });
  const work_status = req.body.work_status ?? existing.work_status;
  const pending_reason = work_status === 'pendente' ? (req.body.pending_reason ?? existing.pending_reason) : null;
  const pending_notes = work_status === 'pendente' ? (req.body.pending_notes ?? existing.pending_notes) : null;
  db.prepare('UPDATE event_items SET work_status = ?, pending_reason = ?, pending_notes = ? WHERE id = ?').run(
    work_status, pending_reason, pending_notes, req.params.id
  );
  const event = db.prepare('SELECT * FROM maintenance_events WHERE id = ?').get(existing.event_id);
  res.json(withEventItems(event));
});

router.delete('/event-items/:id', (req, res) => {
  const info = db.prepare('DELETE FROM event_items WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Item do pacote não encontrado' });
  res.status(204).send();
});
