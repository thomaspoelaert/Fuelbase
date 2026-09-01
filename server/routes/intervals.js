import { Router } from 'express';
import db from '../db.js';
import { wrap } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/token-crypto.js';
import { listEvents, listActivities, testConnection, reconcilePlannedAndCompleted } from '../lib/intervals.js';
import { calculateEnduranceDay } from '../../src/lib/endurance-nutrition.js';

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

function validDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
}

async function loadRange(apiKey, oldest, newest) {
  const [events, activities] = await Promise.all([
    listEvents(apiKey, oldest, newest),
    listActivities(apiKey, oldest, newest),
  ]);
  return reconcilePlannedAndCompleted(events, activities);
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
  if (!validDate(oldest) || !validDate(newest)) {
    return res.status(400).json({ error: 'oldest and newest must be YYYY-MM-DD' });
  }
  const workouts = await loadRange(apiKey, oldest, newest);
  res.json({ oldest, newest, workouts });
}));

router.get('/plan', wrap(async (req, res) => {
  const apiKey = readKey(req);
  if (!apiKey) return res.status(409).json({ error: 'Intervals.icu is not connected' });

  const date = String(req.query.date || '').slice(0, 10);
  const baseCalories = Number(req.query.baseCalories);
  const bodyWeightKg = Number(req.query.bodyWeightKg);
  if (!validDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (!Number.isFinite(baseCalories) || baseCalories <= 0) return res.status(400).json({ error: 'baseCalories must be positive' });
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) return res.status(400).json({ error: 'bodyWeightKg must be positive' });

  // Read one extra day so tomorrow's important workout can influence recovery
  // urgency and evening carbohydrate preparation.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  const all = await loadRange(apiKey, date, nextDate);
  const todayWorkouts = all.filter(w => w.date === date);
  const tomorrow = all.filter(w => w.date === nextDate);
  const nextImportant = tomorrow.find(w => {
    const intensity = Number(w.intensity || 0);
    const duration = Number(w.durationMin || 0);
    const name = String(w.name || '');
    return intensity >= 70 || duration >= 90 || /(threshold|tempo|sweet.?spot|vo2|interval|long|race|brick|quality)/i.test(name);
  });

  const plan = calculateEnduranceDay({
    date,
    baseCalories,
    bodyWeightKg,
    workouts: todayWorkouts,
    nextImportantWorkoutAt: nextImportant?.startTime || null,
  });

  res.json({ ...plan, nextImportantWorkout: nextImportant || null });
}));

export default router;
