import { Router } from 'express';
import { db } from '../db.js';
import { computeItemStatus } from '../status.js';

export const router = Router();

function resolveCounter(aircraft, refType, refId) {
  if (refType === 'celula') return { hours: aircraft.cell_hours, cycles: aircraft.cell_cycles };
  if (refType === 'motor') {
    const engine = db.prepare('SELECT * FROM aircraft_engines WHERE id = ?').get(refId);
    return engine ? { hours: engine.hours, cycles: engine.cycles } : null;
  }
  if (refType === 'helice') {
    const prop = db.prepare('SELECT * FROM aircraft_propellers WHERE id = ?').get(refId);
    return prop ? { hours: prop.hours, cycles: prop.cycles } : null;
  }
  return null;
}

function refLabel(aircraft, refType, refId) {
  if (refType === 'celula') return 'Célula';
  if (refType === 'motor') {
    const e = db.prepare('SELECT * FROM aircraft_engines WHERE id = ?').get(refId);
    if (!e) return 'Motor';
    return e.role === 'unico' ? 'Motor' : `Motor ${e.role.toUpperCase()}`;
  }
  if (refType === 'helice') {
    const p = db.prepare('SELECT * FROM aircraft_propellers WHERE id = ?').get(refId);
    if (!p) return 'Hélice';
    return p.role === 'unico' ? 'Hélice' : `Hélice ${p.role.toUpperCase()}`;
  }
  return '';
}

function withStatus(item, aircraft) {
  const counter = resolveCounter(aircraft, item.ref_type, item.ref_id);
  return { ...item, ref_label: refLabel(aircraft, item.ref_type, item.ref_id), ...computeItemStatus(item, counter) };
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
  const row = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(req.params.id);
  res.json(withStatus(row, aircraft));
});
