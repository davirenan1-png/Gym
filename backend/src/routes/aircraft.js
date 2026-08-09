import { Router } from 'express';
import { db } from '../db.js';
import { computeItemStatus } from '../status.js';
import { resolveCounter } from '../counters.js';

export const router = Router();

function loadAircraftFull(id) {
  const aircraft = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(id);
  if (!aircraft) return null;
  const model = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(aircraft.model_id);
  const engines = db.prepare('SELECT * FROM aircraft_engines WHERE aircraft_id = ? ORDER BY role').all(id);
  const propellers = db.prepare('SELECT * FROM aircraft_propellers WHERE aircraft_id = ? ORDER BY role').all(id);
  const currentEvent = db
    .prepare(`SELECT * FROM maintenance_events WHERE aircraft_id = ? AND status = 'em_andamento' ORDER BY id DESC LIMIT 1`)
    .get(id);
  return { ...aircraft, model, engines, propellers, current_event: currentEvent ?? null };
}

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT aircraft.*, aircraft_models.name AS model_name
       FROM aircraft JOIN aircraft_models ON aircraft_models.id = aircraft.model_id
       ORDER BY aircraft.registration`
    )
    .all();

  const withSummary = rows.map((aircraft) => {
    const items = db.prepare('SELECT * FROM aircraft_items WHERE aircraft_id = ?').all(aircraft.id);
    let vencidos = 0;
    let proximos = 0;
    for (const item of items) {
      const counter = resolveCounter(aircraft, item.ref_type, item.ref_id);
      const { status } = computeItemStatus(item, counter);
      if (status === 'vencido') vencidos += 1;
      if (status === 'proximo') proximos += 1;
    }
    const currentEvent = db
      .prepare(`SELECT * FROM maintenance_events WHERE aircraft_id = ? AND status = 'em_andamento' ORDER BY id DESC LIMIT 1`)
      .get(aircraft.id);
    return { ...aircraft, vencidos_count: vencidos, proximos_count: proximos, current_event: currentEvent ?? null };
  });

  res.json(withSummary);
});

router.get('/:id', (req, res) => {
  const full = loadAircraftFull(req.params.id);
  if (!full) return res.status(404).json({ error: 'Aeronave não encontrada' });
  res.json(full);
});

function engineRoles(engineCount) {
  return engineCount === 2 ? ['lh', 'rh'] : ['unico'];
}

router.post('/', (req, res) => {
  const {
    model_id, registration, cell_serial_number, manufacture_date,
    cell_hours, cell_cycles, engines, propellers,
  } = req.body;

  if (!model_id || !registration) {
    return res.status(400).json({ error: 'model_id e registration são obrigatórios' });
  }
  const model = db.prepare('SELECT * FROM aircraft_models WHERE id = ?').get(model_id);
  if (!model) return res.status(400).json({ error: 'Modelo inválido' });

  const expectedRoles = engineRoles(model.engine_count);
  const enginesInput = Array.isArray(engines) ? engines : [];
  const propellersInput = model.has_propellers && Array.isArray(propellers) ? propellers : [];

  try {
    const result = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO aircraft (model_id, registration, cell_serial_number, manufacture_date, cell_hours, cell_cycles)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(model_id, registration.trim().toUpperCase(), cell_serial_number ?? null, manufacture_date ?? null, cell_hours ?? 0, cell_cycles ?? 0);
      const aircraftId = info.lastInsertRowid;

      const engineIds = {};
      for (const role of expectedRoles) {
        const data = enginesInput.find((e) => e.role === role) ?? {};
        const engInfo = db
          .prepare('INSERT INTO aircraft_engines (aircraft_id, role, model, serial_number, hours, cycles) VALUES (?, ?, ?, ?, ?, ?)')
          .run(aircraftId, role, data.model ?? null, data.serial_number ?? null, data.hours ?? 0, data.cycles ?? 0);
        engineIds[role] = engInfo.lastInsertRowid;
      }

      const propellerIds = {};
      if (model.has_propellers) {
        for (const role of expectedRoles) {
          const data = propellersInput.find((p) => p.role === role) ?? {};
          const propInfo = db
            .prepare('INSERT INTO aircraft_propellers (aircraft_id, role, model, serial_number, hours, cycles) VALUES (?, ?, ?, ?, ?, ?)')
            .run(aircraftId, role, data.model ?? null, data.serial_number ?? null, data.hours ?? 0, data.cycles ?? null);
          propellerIds[role] = propInfo.lastInsertRowid;
        }
      }

      const modelItems = db.prepare('SELECT * FROM model_items WHERE model_id = ? ORDER BY sort_order, id').all(model_id);
      const insertItem = db.prepare(
        `INSERT INTO aircraft_items
          (aircraft_id, source_model_item_id, zona, nomenclatura, referencia_mm, ref_type, ref_id, interval_hours, interval_days, interval_cycles, tolerance_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of modelItems) {
        if (item.applies_to === 'celula') {
          insertItem.run(aircraftId, item.id, item.zona, item.nomenclatura, item.referencia_mm, 'celula', null, item.interval_hours, item.interval_days, item.interval_cycles, item.tolerance_percent);
        } else if (item.applies_to === 'motor') {
          for (const role of expectedRoles) {
            insertItem.run(aircraftId, item.id, item.zona, item.nomenclatura, item.referencia_mm, 'motor', engineIds[role], item.interval_hours, item.interval_days, item.interval_cycles, item.tolerance_percent);
          }
        } else if (item.applies_to === 'helice' && model.has_propellers) {
          for (const role of expectedRoles) {
            insertItem.run(aircraftId, item.id, item.zona, item.nomenclatura, item.referencia_mm, 'helice', propellerIds[role], item.interval_hours, item.interval_days, item.interval_cycles, item.tolerance_percent);
          }
        }
      }

      return aircraftId;
    })();

    res.status(201).json(loadAircraftFull(result));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Já existe uma aeronave com essa matrícula' });
    }
    res.status(500).json({ error: 'Erro ao criar aeronave: ' + err.message });
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const { registration, cell_serial_number, manufacture_date, status } = req.body;
  db.prepare(
    `UPDATE aircraft SET registration = ?, cell_serial_number = ?, manufacture_date = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    (registration ?? existing.registration).trim().toUpperCase(),
    cell_serial_number ?? existing.cell_serial_number,
    manufacture_date ?? existing.manufacture_date,
    status ?? existing.status,
    req.params.id
  );
  res.json(loadAircraftFull(req.params.id));
});

// Atualização rápida de contadores: célula + motor(es) + hélice(s) em uma única chamada
router.put('/:id/counters', (req, res) => {
  const existing = db.prepare('SELECT * FROM aircraft WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Aeronave não encontrada' });
  const { cell_hours, cell_cycles, engines, propellers } = req.body;

  db.transaction(() => {
    db.prepare(`UPDATE aircraft SET cell_hours = ?, cell_cycles = ?, updated_at = datetime('now') WHERE id = ?`).run(
      cell_hours ?? existing.cell_hours, cell_cycles ?? existing.cell_cycles, req.params.id
    );
    if (Array.isArray(engines)) {
      const upd = db.prepare('UPDATE aircraft_engines SET hours = ?, cycles = ? WHERE id = ? AND aircraft_id = ?');
      for (const e of engines) upd.run(e.hours, e.cycles, e.id, req.params.id);
    }
    if (Array.isArray(propellers)) {
      const upd = db.prepare('UPDATE aircraft_propellers SET hours = ?, cycles = ? WHERE id = ? AND aircraft_id = ?');
      for (const p of propellers) upd.run(p.hours, p.cycles ?? null, p.id, req.params.id);
    }
  })();

  res.json(loadAircraftFull(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM aircraft WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Aeronave não encontrada' });
  res.status(204).send();
});
