import { Router } from 'express';
import { db } from '../db.js';
import { vapidPublicKey, sendPushToAll } from '../lib/push.js';

export const router = Router();

const TIMEZONE = 'America/Sao_Paulo';

const WEEKDAY_BY_INTL = {
  Monday: 'segunda',
  Tuesday: 'terca',
  Wednesday: 'quarta',
  Thursday: 'quinta',
  Friday: 'sexta',
  Saturday: 'sabado',
  Sunday: 'domingo',
};

function nowInTimezone() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  }).formatToParts(new Date());
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour === '24' ? '00' : map.hour}:${map.minute}`,
    weekday: WEEKDAY_BY_INTL[map.weekday],
  };
}

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Assinatura de push inválida' });
  }
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).run(endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ ok: true });
});

router.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM push_subscriptions').get().c;
  res.json({ subscriptions: count });
});

router.post('/test', async (req, res) => {
  const results = await sendPushToAll({
    title: '🔔 Teste de notificação',
    body: 'Se você recebeu isso, as notificações estão funcionando!',
  });
  res.json(results);
});

router.get('/tick', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const now = nowInTimezone();
  const reminders = db.prepare('SELECT * FROM reminders WHERE active = 1').all();
  const due = reminders.filter((r) => {
    if (r.last_sent_date === now.date) return false;
    if (r.days !== 'all' && !r.days.split(',').includes(now.weekday)) return false;
    return now.time >= r.time;
  });

  const sent = [];
  for (const reminder of due) {
    await sendPushToAll({ title: reminder.title, body: reminder.body || '' });
    db.prepare('UPDATE reminders SET last_sent_date = ? WHERE id = ?').run(now.date, reminder.id);
    sent.push(reminder.title);
  }

  res.json({ now, checked: reminders.length, sent });
});
