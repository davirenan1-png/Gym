import { Router } from 'express';
import { db } from '../db.js';
import { computeMaintenanceStatus, computeComponentStatus } from '../status.js';

export const router = Router();

router.get('/', (req, res) => {
  const aircraftList = db.prepare('SELECT * FROM aircraft').all();
  const aircraftById = Object.fromEntries(aircraftList.map((a) => [a.id, a]));

  const schedules = db.prepare('SELECT * FROM maintenance_schedules').all().map((s) => {
    const aircraft = aircraftById[s.aircraft_id];
    return aircraft ? { ...s, ...computeMaintenanceStatus(s, aircraft), aircraft_registration: aircraft.registration } : null;
  }).filter(Boolean);

  const components = db.prepare('SELECT * FROM components').all().map((c) => {
    const aircraft = aircraftById[c.aircraft_id];
    return aircraft ? { ...c, ...computeComponentStatus(c, aircraft), aircraft_registration: aircraft.registration } : null;
  }).filter(Boolean);

  res.json({
    total_aircraft: aircraftList.length,
    maintenances_overdue: schedules.filter((s) => s.status === 'vencido'),
    maintenances_upcoming: schedules.filter((s) => s.status === 'proximo'),
    components_overdue: components.filter((c) => c.status === 'vencido'),
    components_upcoming: components.filter((c) => c.status === 'proximo'),
  });
});
