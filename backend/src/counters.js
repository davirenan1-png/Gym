import { db } from './db.js';

export function resolveCounter(aircraft, refType, refId) {
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

export function refLabel(refType, refId) {
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
