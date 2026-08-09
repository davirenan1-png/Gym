import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM aircraft_models ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
  const items = db
    .prepare('SELECT * FROM model_items WHERE model_id = ? ORDER BY sort_order, id')
    .all(req.params.id);
  res.json({ ...model, items });
});

router.post('/', (req, res) => {
  const { name, manufacturer, engine_count, has_propellers } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const info = db
    .prepare('INSERT INTO aircraft_models (name, manufacturer, engine_count, has_propellers) VALUES (?, ?, ?, ?)')
    .run(name.trim(), manufacturer ?? null, engine_count === 2 ? 2 : 1, has_propellers ? 1 : 0);
  const row = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Modelo não encontrado' });
  const { name, manufacturer, engine_count, has_propellers } = req.body;
  db.prepare('UPDATE aircraft_models SET name = ?, manufacturer = ?, engine_count = ?, has_propellers = ? WHERE id = ?').run(
    (name ?? existing.name).trim(),
    manufacturer ?? existing.manufacturer,
    engine_count ? (engine_count === 2 ? 2 : 1) : existing.engine_count,
    has_propellers !== undefined ? (has_propellers ? 1 : 0) : existing.has_propellers,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM aircraft_models WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Modelo não encontrado' });
    res.status(204).send();
  } catch (err) {
    if (String(err.message).includes('FOREIGN KEY')) {
      return res.status(409).json({ error: 'Não é possível excluir: existem aeronaves cadastradas com este modelo' });
    }
    res.status(500).json({ error: 'Erro ao excluir modelo' });
  }
});

function validateItemPayload(body) {
  const { nomenclatura, applies_to } = body;
  if (!nomenclatura || !['celula', 'motor', 'helice'].includes(applies_to)) {
    return 'nomenclatura e applies_to (celula/motor/helice) são obrigatórios';
  }
  return null;
}

router.post('/:id/items', (req, res) => {
  const model = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
  const error = validateItemPayload(req.body);
  if (error) return res.status(400).json({ error });
  if (req.body.applies_to === 'helice' && !model.has_propellers) {
    return res.status(400).json({ error: 'Este modelo não possui hélice controlada' });
  }
  const { zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent, sort_order } = req.body;
  const info = db
    .prepare(
      `INSERT INTO model_items (model_id, zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.id, zona ?? null, nomenclatura.trim(), referencia_mm ?? null, applies_to,
      interval_hours ?? null, interval_days ?? null, interval_cycles ?? null, tolerance_percent ?? null, sort_order ?? 0
    );
  const row = db.prepare('SELECT * FROM model_items WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// Importação em massa: body { rows: [{ zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent }] }
router.post('/:id/items/bulk', (req, res) => {
  const model = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Envie um array "rows" com ao menos um item' });
  }

  const insert = db.prepare(
    `INSERT INTO model_items (model_id, zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM model_items WHERE model_id = ?').get(req.params.id).m;

  const errors = [];
  const insertMany = db.transaction((items) => {
    items.forEach((item, idx) => {
      if (!item.nomenclatura || !['celula', 'motor', 'helice'].includes(item.applies_to)) {
        errors.push(`Linha ${idx + 1}: nomenclatura e applies_to são obrigatórios`);
        return;
      }
      if (item.applies_to === 'helice' && !model.has_propellers) {
        errors.push(`Linha ${idx + 1}: modelo não possui hélice controlada`);
        return;
      }
      insert.run(
        req.params.id, item.zona ?? null, item.nomenclatura.trim(), item.referencia_mm ?? null, item.applies_to,
        item.interval_hours ?? null, item.interval_days ?? null, item.interval_cycles ?? null,
        item.tolerance_percent ?? null, maxOrder + idx + 1
      );
    });
  });
  insertMany(rows);

  if (errors.length > 0) {
    return res.status(207).json({ inserted: rows.length - errors.length, errors });
  }
  const items = db.prepare('SELECT * FROM model_items WHERE model_id = ? ORDER BY sort_order, id').all(req.params.id);
  res.status(201).json({ inserted: rows.length, items });
});

router.put('/:id/items/:itemId', (req, res) => {
  const existing = db.prepare('SELECT * FROM model_items WHERE id = ? AND model_id = ?').get(req.params.itemId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' });
  const fields = {
    zona: req.body.zona ?? existing.zona,
    nomenclatura: req.body.nomenclatura ?? existing.nomenclatura,
    referencia_mm: req.body.referencia_mm ?? existing.referencia_mm,
    applies_to: req.body.applies_to ?? existing.applies_to,
    interval_hours: req.body.interval_hours ?? existing.interval_hours,
    interval_days: req.body.interval_days ?? existing.interval_days,
    interval_cycles: req.body.interval_cycles ?? existing.interval_cycles,
    tolerance_percent: req.body.tolerance_percent ?? existing.tolerance_percent,
    sort_order: req.body.sort_order ?? existing.sort_order,
  };
  db.prepare(
    `UPDATE model_items SET zona = ?, nomenclatura = ?, referencia_mm = ?, applies_to = ?, interval_hours = ?,
      interval_days = ?, interval_cycles = ?, tolerance_percent = ?, sort_order = ? WHERE id = ?`
  ).run(
    fields.zona, fields.nomenclatura, fields.referencia_mm, fields.applies_to, fields.interval_hours,
    fields.interval_days, fields.interval_cycles, fields.tolerance_percent, fields.sort_order, req.params.itemId
  );
  const row = db.prepare('SELECT * FROM model_items WHERE id = ?').get(req.params.itemId);
  res.json(row);
});

router.delete('/:id/items/:itemId', (req, res) => {
  const info = db.prepare('DELETE FROM model_items WHERE id = ? AND model_id = ?').run(req.params.itemId, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Item não encontrado' });
  res.status(204).send();
});
