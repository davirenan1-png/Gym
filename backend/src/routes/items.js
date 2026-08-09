import { Router } from 'express';
import { db } from '../db.js';
import { computeItemStatus } from '../status.js';
import { resolveCounter, refLabel } from '../counters.js';

export const router = Router();

function withStatus(item, aircraft) {
  const counter = resolveCounter(aircraft, item.ref_type, item.ref_id);
  return { ...item, ref_label: refLabel(item.ref_type, item.ref_id), ...computeItemStatus(item, counter) };
}

router.get('/aircraft/:aircraftId/items', (req, res) => {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.aircraftId);
  if (!aircraft) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const rows = db.prepare('SELECT * FROM aircraft_items WHERE aircraft_id = ? ORDER BY zona, id').all(req.params.aircraftId);
  res.json(rows.map((item) => withStatus(item, aircraft)));
});

router.post('/aircraft/:aircraftId/items', (req, res) => {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.aircraftId);
  if (!aircraft) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const {
    zona, nomenclatura, referencia_mm, ref_type, ref_id,
    interval_hours, interval_days, interval_cycles, tolerance_percent,
    last_done_hours, last_done_cycles, last_done_date,
  } = req.body;

  if (!nomenclatura || !['celula', 'motor', 'helice'].includes(ref_type)) {
    return res.status(400).json({ error: 'nomenclatura e ref_type (celula/motor/helice) são obrigatórios' });
  }
  if (ref_type !== 'celula' && !ref_id) {
    return res.status(400).json({ error: 'ref_id é obrigatório para itens de motor ou hélice' });
  }

  const info = db
    .prepare(
      `INSERT INTO aircraft_items
        (aircraft_id, zona, nomenclatura, referencia_mm, ref_type, ref_id, interval_hours, interval_days, interval_cycles, tolerance_percent, last_done_hours, last_done_cycles, last_done_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.aircraftId, zona ?? null, nomenclatura.trim(), referencia_mm ?? null, ref_type, ref_type === 'celula' ? null : ref_id,
      interval_hours ?? null, interval_days ?? null, interval_cycles ?? null, tolerance_percent ?? null,
      last_done_hours ?? null, last_done_cycles ?? null, last_done_date ?? null
    );
  const row = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withStatus(row, aircraft));
});

router.put('/items/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' });
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(existing.aircraft_id);

  const fields = {
    zona: req.body.zona ?? existing.zona,
    nomenclatura: req.body.nomenclatura ?? existing.nomenclatura,
    referencia_mm: req.body.referencia_mm ?? existing.referencia_mm,
    interval_hours: req.body.interval_hours ?? existing.interval_hours,
    interval_days: req.body.interval_days ?? existing.interval_days,
    interval_cycles: req.body.interval_cycles ?? existing.interval_cycles,
    tolerance_percent: req.body.tolerance_percent ?? existing.tolerance_percent,
    last_done_hours: req.body.last_done_hours ?? existing.last_done_hours,
    last_done_cycles: req.body.last_done_cycles ?? existing.last_done_cycles,
    last_done_date: req.body.last_done_date ?? existing.last_done_date,
  };
  db.prepare(
    `UPDATE aircraft_items SET zona = ?, nomenclatura = ?, referencia_mm = ?, interval_hours = ?, interval_days = ?,
      interval_cycles = ?, tolerance_percent = ?, last_done_hours = ?, last_done_cycles = ?, last_done_date = ? WHERE id = ?`
  ).run(
    fields.zona, fields.nomenclatura, fields.referencia_mm, fields.interval_hours, fields.interval_days,
    fields.interval_cycles, fields.tolerance_percent, fields.last_done_hours, fields.last_done_cycles, fields.last_done_date,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(req.params.id);
  res.json(withStatus(row, aircraft));
});

router.delete('/items/:id', (req, res) => {
  const info = db.prepare('DELETE FROM aircraft_items WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Item não encontrado' });
  res.status(204).send();
});

// Marca o item como realizado agora, usando os contadores atuais do respectivo componente
router.post('/items/:id/executar', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' });
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(existing.aircraft_id);
  const counter = resolveCounter(aircraft, existing.ref_type, existing.ref_id);
  const date = req.body?.performed_at_date ?? new Date().toISOString().slice(0, 10);

  db.prepare('UPDATE aircraft_items SET last_done_hours = ?, last_done_cycles = ?, last_done_date = ? WHERE id = ?').run(
    counter?.hours ?? existing.last_done_hours, counter?.cycles ?? existing.last_done_cycles, date, req.params.id
  );
  db.prepare(
    `UPDATE event_items SET work_status = 'entregue', pending_reason = NULL, pending_notes = NULL
     WHERE aircraft_item_id = ? AND work_status != 'entregue'
       AND event_id IN (SELECT id FROM maintenance_events WHERE aircraft_id = ? AND status = 'em_andamento')`
  ).run(req.params.id, existing.aircraft_id);
  const row = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(req.params.id);
  res.json(withStatus(row, aircraft));
});
