import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

router.get('/today', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const checkin = db.prepare('SELECT * FROM checkin_logs WHERE date = ?').get(date) || null;
  const weight = db.prepare('SELECT weight_kg FROM body_weight_logs WHERE date = ?').get(date);
  const water = db
    .prepare('SELECT COALESCE(SUM(amount_ml), 0) AS t FROM water_logs WHERE date = ?')
    .get(date).t;
  res.json({
    date,
    checkin,
    weight_kg: weight ? weight.weight_kg : null,
    water_ml: water,
  });
});

router.post('/', (req, res) => {
  const {
    date,
    adherence_score,
    adherence_note,
    sleep_hours,
    mood,
    workout_performance,
    digestion_notes,
    steps,
    bathroom_quality,
    comments,
    weight_kg,
  } = req.body;
  if (!date) return res.status(400).json({ error: 'date é obrigatório' });

  db.prepare(
    `INSERT INTO checkin_logs
       (date, adherence_score, adherence_note, sleep_hours, mood, workout_performance, digestion_notes, steps, bathroom_quality, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       adherence_score = excluded.adherence_score,
       adherence_note = excluded.adherence_note,
       sleep_hours = excluded.sleep_hours,
       mood = excluded.mood,
       workout_performance = excluded.workout_performance,
       digestion_notes = excluded.digestion_notes,
       steps = excluded.steps,
       bathroom_quality = excluded.bathroom_quality,
       comments = excluded.comments`
  ).run(
    date,
    adherence_score ?? null,
    adherence_note || null,
    sleep_hours ?? null,
    mood || null,
    workout_performance ?? null,
    digestion_notes || null,
    steps ?? null,
    bathroom_quality ?? null,
    comments || null
  );

  if (weight_kg) {
    db.prepare(
      `INSERT INTO body_weight_logs (date, weight_kg) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg`
    ).run(date, weight_kg);
  }

  res.status(201).json(db.prepare('SELECT * FROM checkin_logs WHERE date = ?').get(date));
});

router.get('/week', (req, res) => {
  const start = req.query.start || new Date().toISOString().slice(0, 10);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const checkin = db.prepare('SELECT * FROM checkin_logs WHERE date = ?').get(date) || null;
    const weight = db.prepare('SELECT weight_kg FROM body_weight_logs WHERE date = ?').get(date);
    const water = db
      .prepare('SELECT COALESCE(SUM(amount_ml), 0) AS t FROM water_logs WHERE date = ?')
      .get(date).t;
    days.push({ date, checkin, weight_kg: weight ? weight.weight_kg : null, water_ml: water });
  }
  res.json(days);
});
