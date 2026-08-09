import { Router } from 'express';
import { db } from '../db.js';
import { computeItemStatus } from '../status.js';
import { resolveCounter } from '../counters.js';

export const router = Router();

router.get('/', (req, res) => {
  const aircraftList = db.prepare('SELECT * FROM aircraft').all();
  const aircraftById = Object.fromEntries(aircraftList.map((a) => [a.id, a]));

  const items = db.prepare('SELECT * FROM aircraft_items').all().map((item) => {
    const aircraft = aircraftById[item.aircraft_id];
    if (!aircraft) return null;
    const counter = resolveCounter(aircraft, item.ref_type, item.ref_id);
    return { ...item, ...computeItemStatus(item, counter), aircraft_registration: aircraft.registration, aircraft_id: aircraft.id };
  }).filter(Boolean);

  res.json({
    total_aircraft: aircraftList.length,
    vencidos: items.filter((i) => i.status === 'vencido'),
    proximos: items.filter((i) => i.status === 'proximo'),
  });
});
