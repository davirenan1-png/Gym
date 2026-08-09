import { Router } from 'express';
import { db } from '../db.js';
import { computeComponentStatus } from '../status.js';

export const router = Router();

function withStatus(component) {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(component.aircraft_id);
  if (!aircraft) return { ...component, status: null };
  return { ...component, ...computeComponentStatus(component, aircraft) };
}

router.get('/', (req, res) => {
  const { aircraft_id } = req.query;
  const rows = aircraft_id
    ? db.prepare('SELECT * FROM components WHERE aircraft_id = ? ORDER BY id DESC').all(aircraft_id)
    : db.prepare('SELECT * FROM components ORDER BY id DESC').all();
  res.json(rows.map(withStatus));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Componente não encontrado' });
  res.json(withStatus(row));
});

router.post('/', (req, res) => {
  const {
    aircraft_id, name, part_number, serial_number,
    install_date, install_hours, install_cycles,
    life_limit_hours, life_limit_cycles, life_limit_months,
  } = req.body;

  if (!aircraft_id || !name) {
    return res.status(400).json({ error: 'aircraft_id e name são obrigatórios' });
  }
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(aircraft_id);
  if (!aircraft) return res.status(400).json({ error: 'Aeronave inválida' });

  const info = db
    .prepare(
      `INSERT INTO components
        (aircraft_id, name, part_number, serial_number, install_date, install_hours, install_cycles,
         life_limit_hours, life_limit_cycles, life_limit_months)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      aircraft_id, name.trim(), part_number ?? null, serial_number ?? null,
      install_date ?? null, install_hours ?? 0, install_cycles ?? 0,
      life_limit_hours ?? null, life_limit_cycles ?? null, life_limit_months ?? null
    );
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withStatus(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Componente não encontrado' });

  const fields = {
    name: req.body.name ?? existing.name,
    part_number: req.body.part_number ?? existing.part_number,
    serial_number: req.body.serial_number ?? existing.serial_number,
    install_date: req.body.install_date ?? existing.install_date,
    install_hours: req.body.install_hours ?? existing.install_hours,
    install_cycles: req.body.install_cycles ?? existing.install_cycles,
    life_limit_hours: req.body.life_limit_hours ?? existing.life_limit_hours,
    life_limit_cycles: req.body.life_limit_cycles ?? existing.life_limit_cycles,
    life_limit_months: req.body.life_limit_months ?? existing.life_limit_months,
  };

  db.prepare(
    `UPDATE components SET
      name = ?, part_number = ?, serial_number = ?, install_date = ?, install_hours = ?, install_cycles = ?,
      life_limit_hours = ?, life_limit_cycles = ?, life_limit_months = ?
     WHERE id = ?`
  ).run(
    fields.name, fields.part_number, fields.serial_number, fields.install_date,
    fields.install_hours, fields.install_cycles, fields.life_limit_hours,
    fields.life_limit_cycles, fields.life_limit_months, req.params.id
  );
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  res.json(withStatus(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM components WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Componente não encontrado' });
  res.status(204).send();
});

// Substitui o componente por um novo (registra troca por vida útil esgotada)
router.post('/:id/substituir', (req, res) => {
  const existing = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Componente não encontrado' });
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(existing.aircraft_id);

  const { serial_number, install_date } = req.body;
  const date = install_date ?? new Date().toISOString().slice(0, 10);

  db.prepare(
    `UPDATE components SET serial_number = ?, install_date = ?, install_hours = ?, install_cycles = ? WHERE id = ?`
  ).run(serial_number ?? null, date, aircraft.total_hours, aircraft.total_cycles, req.params.id);

  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  res.json(withStatus(row));
});
