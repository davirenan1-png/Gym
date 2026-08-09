import { Router } from 'express';
import { db } from '../db.js';
import { resolveCounter, refLabel } from '../counters.js';

export const router = Router();

function withItems(order) {
  const items = db.prepare('SELECT * FROM service_order_items WHERE service_order_id = ? ORDER BY id').all(order.id);
  return { ...order, items };
}

router.get('/aircraft/:aircraftId/service-orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM service_orders WHERE aircraft_id = ? ORDER BY id DESC').all(req.params.aircraftId);
  res.json(rows.map(withItems));
});

router.get('/service-orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  res.json(withItems(order));
});

// Cria uma OS rascunho a partir de itens selecionados da matriz da aeronave
router.post('/aircraft/:aircraftId/service-orders', (req, res) => {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.aircraftId);
  if (!aircraft) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const { aircraft_item_ids, event_id, performed_by, performed_at_date, notes } = req.body;
  if (!Array.isArray(aircraft_item_ids) || aircraft_item_ids.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um item para gerar a ordem de serviço' });
  }

  const result = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO service_orders (aircraft_id, event_id, performed_by, performed_at_date, notes) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.aircraftId, event_id ?? null, performed_by ?? null, performed_at_date ?? null, notes ?? null);
    const orderId = info.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT OR IGNORE INTO service_order_items (service_order_id, aircraft_item_id, zona, nomenclatura, ref_label) VALUES (?, ?, ?, ?, ?)'
    );
    for (const itemId of aircraft_item_ids) {
      const item = db.prepare('SELECT * FROM aircraft_items WHERE id = ? AND aircraft_id = ?').get(itemId, req.params.aircraftId);
      if (!item) continue;
      insertItem.run(orderId, item.id, item.zona, item.nomenclatura, refLabel(item.ref_type, item.ref_id));
    }
    return orderId;
  })();

  const order = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(result);
  res.status(201).json(withItems(order));
});

router.put('/service-orders/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  if (existing.status !== 'rascunho') return res.status(409).json({ error: 'Ordem de serviço já assinada não pode ser editada' });
  const fields = {
    performed_by: req.body.performed_by ?? existing.performed_by,
    performed_at_date: req.body.performed_at_date ?? existing.performed_at_date,
    notes: req.body.notes ?? existing.notes,
  };
  db.prepare('UPDATE service_orders SET performed_by = ?, performed_at_date = ?, notes = ? WHERE id = ?').run(
    fields.performed_by, fields.performed_at_date, fields.notes, req.params.id
  );
  const order = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  res.json(withItems(order));
});

router.delete('/service-orders/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  if (existing.status !== 'rascunho') return res.status(409).json({ error: 'Ordem de serviço já assinada não pode ser excluída' });
  db.prepare('DELETE FROM service_orders WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Assina a OS: marca como concluída, atualiza last_done dos itens e o work_status do pacote vinculado
router.post('/service-orders/:id/assinar', (req, res) => {
  const order = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  if (order.status === 'assinada') return res.status(409).json({ error: 'Ordem de serviço já assinada' });

  const { signature, performed_by, performed_at_date } = req.body;
  if (!signature) return res.status(400).json({ error: 'Assinatura é obrigatória' });

  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(order.aircraft_id);
  const date = performed_at_date ?? order.performed_at_date ?? new Date().toISOString().slice(0, 10);
  const items = db.prepare('SELECT * FROM service_order_items WHERE service_order_id = ?').all(order.id);

  db.transaction(() => {
    for (const osItem of items) {
      if (!osItem.aircraft_item_id) continue;
      const item = db.prepare('SELECT * FROM aircraft_items WHERE id = ?').get(osItem.aircraft_item_id);
      if (!item) continue;
      const counter = resolveCounter(aircraft, item.ref_type, item.ref_id);

      db.prepare('UPDATE aircraft_items SET last_done_hours = ?, last_done_cycles = ?, last_done_date = ? WHERE id = ?').run(
        counter?.hours ?? item.last_done_hours, counter?.cycles ?? item.last_done_cycles, date, item.id
      );
      db.prepare('UPDATE service_order_items SET done_hours = ?, done_cycles = ?, done_date = ? WHERE id = ?').run(
        counter?.hours ?? null, counter?.cycles ?? null, date, osItem.id
      );
      if (order.event_id) {
        db.prepare(
          `UPDATE event_items SET work_status = 'entregue', pending_reason = NULL, pending_notes = NULL
           WHERE event_id = ? AND aircraft_item_id = ?`
        ).run(order.event_id, item.id);
      }
    }

    db.prepare(
      `UPDATE service_orders SET status = 'assinada', signature = ?, signed_at = datetime('now'), performed_by = ?, performed_at_date = ? WHERE id = ?`
    ).run(signature, performed_by ?? order.performed_by, date, order.id);
  })();

  const updated = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(order.id);
  res.json(withItems(updated));
});
