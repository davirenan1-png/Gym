import { db } from './db.js';

const countAircraft = db.prepare('SELECT COUNT(*) AS n FROM aircraft').get().n;
if (countAircraft > 0) {
  console.log('Banco já possui dados, seed ignorado.');
  process.exit(0);
}

const insertAircraft = db.prepare(
  `INSERT INTO aircraft (registration, model, manufacturer, total_hours, total_cycles, status)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const pt = insertAircraft.run('PT-ABC', 'Cessna 172', 'Cessna', 1180, 2400, 'ativa');
const pr = insertAircraft.run('PR-XYZ', 'Piper PA-28', 'Piper', 940, 1800, 'ativa');

const insertSchedule = db.prepare(
  `INSERT INTO maintenance_schedules
    (aircraft_id, name, description, interval_type, interval_hours, interval_cycles, interval_days, last_done_hours, last_done_cycles, last_done_date)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
insertSchedule.run(pt.lastInsertRowid, 'Inspeção 100h', 'Inspeção obrigatória a cada 100 horas', 'horas', 100, null, null, 1090, null, null);
insertSchedule.run(pt.lastInsertRowid, 'Revisão anual', 'Inspeção anual (Annual Inspection)', 'calendario', null, null, 365, null, null, '2025-09-01');
insertSchedule.run(pr.lastInsertRowid, 'Inspeção 100h', 'Inspeção obrigatória a cada 100 horas', 'horas', 100, null, null, 855, null, null);

const insertComponent = db.prepare(
  `INSERT INTO components
    (aircraft_id, name, part_number, serial_number, install_date, install_hours, install_cycles, life_limit_hours, life_limit_cycles, life_limit_months)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
insertComponent.run(pt.lastInsertRowid, 'Motor Lycoming O-320', 'O-320-D2A', 'SN-11223', '2020-01-15', 0, 0, 2000, null, null);
insertComponent.run(pt.lastInsertRowid, 'Hélice de passo fixo', 'MCM7666', 'SN-99881', '2023-06-01', 800, 0, 1200, null, null);
insertComponent.run(pr.lastInsertRowid, 'ELT (Localizador de Emergência)', 'ARTEX-345', 'SN-44556', '2021-03-10', 0, 0, null, null, 60);

console.log('Seed concluído com sucesso.');
