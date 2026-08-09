import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const { aircraft_id } = req.query;
  const rows = aircraft_id
    ? db.prepare('SELECT * FROM service_orders WHERE aircraft_id = ? ORDER BY performed_at_date DESC, id DESC').all(aircraft_id)
    : db.prepare('SELECT * FROM service_orders ORDER BY performed_at_date DESC, id DESC').all();
  res.json(rows);
});
