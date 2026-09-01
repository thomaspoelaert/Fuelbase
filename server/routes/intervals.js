import { Router } from 'express';
import db from '../db.js';
import { wrap } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/token-crypto.js';
import { listEvents, listActivities, testConnection, reconcilePlannedAndCompleted } from '../lib/intervals.js';

const router = Router();
router.use(requireAuth);

function keyName(req) {
  const uid = req.user?.id ?? 0;
  return `fuelbase_intervals_api_key_${uid}`;
}

function readKey(req) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(keyName(req));
  return row?.value ? decrypt(row.value) : null;
}

function writeKey(req, value) {
  const encrypted = encrypt(value);
  db.prepare(`INSERT INTO app_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(keyName(req), encrypted);
}

router.get('/status', wrap((req, res) => {
  res.json({ connected: !!readKey(req) });
}));

router.put('/credentials', wrap(async (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!apiKey) return res.status(400).json({ error: 'Intervals.icu API key required' });
  const result = await testConnection(apiKey);
  writeKey(req, apiKey);
  res.json({ connected: true, ...result });
}));

router.delete('/credentials', wrap((req, res) => {
  db.prepare('DELETE FROM app_config WHERE key = ?').run(keyName(req));
  res.json({ connected: false });
}));

router.post('/test', wrap(async (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim() || readKey(req);
  if (!apiKey) return res.status(400).json({ error: 'Intervals.icu API key required' });
  const result = await testConnection(apiKey);
  res.json(result);
}));

router.get('/workouts', wrap(async (req, res) => {
  const apiKey = readKey(req);
  if (!apiKey) return res.status(409).json({ error: 'Intervals.icu is not connected' });
  const oldest = String(req.query.oldest || '').slice(0, 10);
  const newest = String(req.query.newest || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(oldest) || !/^\d{4}-\d{2}-\d{2}$/.test(newest)) {
    return res.status(400).json({ error: 'oldest and newest must be YYYY-MM-DD' });
  }
  const [events, activities] = await Promise.all([
    listEvents(apiKey, oldest, newest),
    listActivities(apiKey, oldest, newest),
  ]);
  const workouts = reconcilePlannedAndCompleted(events, activities);
  res.json({ oldest, newest, workouts });
}));

export default router;
