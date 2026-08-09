import { Router } from 'express';
import { db } from '../db.js';
import { computeMaintenanceStatus } from '../status.js';

export const router = Router();

function withStatus(schedule) {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(schedule.aircraft_id);
  if (!aircraft) return { ...schedule, status: null };
  return { ...schedule, ...computeMaintenanceStatus(schedule, aircraft) };
}

router.get('/', (req, res) => {
  const { aircraft_id } = req.query;
  const rows = aircraft_id
    ? db.prepare('SELECT * FROM maintenance_schedules WHERE aircraft_id = ? ORDER BY id DESC').all(aircraft_id)
    : db.prepare('SELECT * FROM maintenance_schedules ORDER BY id DESC').all();
  res.json(rows.map(withStatus));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Manutenção não encontrada' });
  res.json(withStatus(row));
});

router.post('/', (req, res) => {
  const {
    aircraft_id, name, description, interval_type,
    interval_hours, interval_cycles, interval_days,
    last_done_hours, last_done_cycles, last_done_date,
  } = req.body;

  if (!aircraft_id || !name || !interval_type) {
    return res.status(400).json({ error: 'aircraft_id, name e interval_type são obrigatórios' });
  }
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(aircraft_id);
  if (!aircraft) return res.status(400).json({ error: 'Aeronave inválida' });

  const info = db
    .prepare(
      `INSERT INTO maintenance_schedules
        (aircraft_id, name, description, interval_type, interval_hours, interval_cycles, interval_days,
         last_done_hours, last_done_cycles, last_done_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      aircraft_id, name.trim(), description ?? null, interval_type,
      interval_hours ?? null, interval_cycles ?? null, interval_days ?? null,
      last_done_hours ?? null, last_done_cycles ?? null, last_done_date ?? null
    );
  const row = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withStatus(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manutenção não encontrada' });

  const fields = {
    name: req.body.name ?? existing.name,
    description: req.body.description ?? existing.description,
    interval_type: req.body.interval_type ?? existing.interval_type,
    interval_hours: req.body.interval_hours ?? existing.interval_hours,
    interval_cycles: req.body.interval_cycles ?? existing.interval_cycles,
    interval_days: req.body.interval_days ?? existing.interval_days,
    last_done_hours: req.body.last_done_hours ?? existing.last_done_hours,
    last_done_cycles: req.body.last_done_cycles ?? existing.last_done_cycles,
    last_done_date: req.body.last_done_date ?? existing.last_done_date,
  };

  db.prepare(
    `UPDATE maintenance_schedules SET
      name = ?, description = ?, interval_type = ?, interval_hours = ?, interval_cycles = ?,
      interval_days = ?, last_done_hours = ?, last_done_cycles = ?, last_done_date = ?
     WHERE id = ?`
  ).run(
    fields.name, fields.description, fields.interval_type, fields.interval_hours, fields.interval_cycles,
    fields.interval_days, fields.last_done_hours, fields.last_done_cycles, fields.last_done_date,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(req.params.id);
  res.json(withStatus(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM maintenance_schedules WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Manutenção não encontrada' });
  res.status(204).send();
});

// Marca a manutenção como executada agora (registra também uma ordem de serviço)
router.post('/:id/executar', (req, res) => {
  const existing = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manutenção não encontrada' });
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(existing.aircraft_id);

  const { performed_by, performed_at_date, notes } = req.body;
  const date = performed_at_date ?? new Date().toISOString().slice(0, 10);

  db.prepare(
    `UPDATE maintenance_schedules SET last_done_hours = ?, last_done_cycles = ?, last_done_date = ? WHERE id = ?`
  ).run(aircraft.total_hours, aircraft.total_cycles, date, req.params.id);

  db.prepare(
    `INSERT INTO service_orders
      (aircraft_id, maintenance_schedule_id, title, description, performed_by, performed_at_date, performed_at_hours, performed_at_cycles)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    aircraft.id, existing.id, existing.name, notes ?? null, performed_by ?? null,
    date, aircraft.total_hours, aircraft.total_cycles
  );

  const row = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(req.params.id);
  res.json(withStatus(row));
});
