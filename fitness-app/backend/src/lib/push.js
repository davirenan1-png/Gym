import webpush from 'web-push';
import { db } from '../db.js';

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value ?? '');
}

let publicKey = process.env.VAPID_PUBLIC_KEY || getSetting('vapid_public_key');
let privateKey = process.env.VAPID_PRIVATE_KEY || getSetting('vapid_private_key');

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  setSetting('vapid_public_key', publicKey);
  setSetting('vapid_private_key', privateKey);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:push@fitness-tracker.local',
  publicKey,
  privateKey
);

export const vapidPublicKey = publicKey;

export async function sendPushToAll(payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  const results = { sent: 0, removed: 0, failed: 0 };
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      results.sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        results.removed += 1;
      } else {
        results.failed += 1;
      }
    }
  }
  return results;
}
