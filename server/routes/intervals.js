import { Router } from 'express';
import db from '../db.js';
import { wrap } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/token-crypto.js';
import {
  listEvents,
  listActivities,
  testConnection,
  reconcilePlannedAndCompleted,
} from '../lib/intervals.js';
import { calculateEnduranceDay, classifyWorkout } from '../../src/lib/endurance-nutrition.js';

const router = Router();
router.use(requireAuth);

const DEFAULT_CONFIG = Object.freeze({
  baseCalories: 2400,
  bodyWeightKg: null,
  proteinGPerKg: 1.8,
  fatGPerKg: 0.9,
});

function uid(req) {
  return req.user?.id ?? 0;
}

function keyName(req) {
  return `fuelbase_intervals_api_key_${uid(req)}`;
}

function configKey(req) {
  return `fuelbase_endurance_config_${uid(req)}`;
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

function readConfig(req) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(configKey(req));
  if (!row?.value) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(req, config) {
  db.prepare(`INSERT INTO app_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(configKey(req), JSON.stringify(config));
}

function readUserSetting(req, key, fallback = null) {
  if (!req.user?.id) return fallback;
  const row = db.prepare(
    'SELECT value FROM user_settings WHERE user_id = ? AND key = ? AND deleted_at IS NULL'
  ).get(req.user.id, key);
  if (!row?.value) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

function mealSlotsForUser(req) {
  const names = readUserSetting(req, 'mealNames', ['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
  if (!Array.isArray(names) || !names.length) return undefined;
  // Shares/hours deliberately remain engine defaults by slot index. The user
  // can rename/reorder/add Diary meal slots and the returned FuelBase targets
  // will still line up 1:1 with the rendered meal cards.
  return names.map((name, index) => ({ key: `meal_${index}`, label: String(name || `Meal ${index + 1}`) }));
}

function validateNumber(name, value, min, max, { nullable = false } = {}) {
  if ((value == null || value === '') && nullable) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    const err = new Error(`${name} must be between ${min} and ${max}`);
    err.status = 400;
    throw err;
  }
  return n;
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

function isImportantWorkout(workout) {
  const c = classifyWorkout(workout);
  return c.hard || c.long || c.durationMin >= 90;
}

router.get('/status', wrap((req, res) => {
  res.json({
    connected: !!readKey(req),
    config: readConfig(req),
  });
}));

router.get('/config', wrap((req, res) => {
  res.json({
    connected: !!readKey(req),
    ...readConfig(req),
  });
}));

router.put('/config', wrap((req, res) => {
  const current = readConfig(req);
  const next = {
    ...current,
    baseCalories: req.body?.baseCalories !== undefined
      ? validateNumber('baseCalories', req.body.baseCalories, 800, 6000)
      : current.baseCalories,
    bodyWeightKg: req.body?.bodyWeightKg !== undefined
      ? validateNumber('bodyWeightKg', req.body.bodyWeightKg, 30, 250, { nullable: true })
      : current.bodyWeightKg,
    proteinGPerKg: req.body?.proteinGPerKg !== undefined
      ? validateNumber('proteinGPerKg', req.body.proteinGPerKg, 1.0, 3.0)
      : current.proteinGPerKg,
    fatGPerKg: req.body?.fatGPerKg !== undefined
      ? validateNumber('fatGPerKg', req.body.fatGPerKg, 0.4, 2.0)
      : current.fatGPerKg,
  };

  writeConfig(req, next);
  res.json({ connected: !!readKey(req), ...next });
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
  if (!validDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const saved = readConfig(req);
  const baseCalories = req.query.baseCalories !== undefined
    ? validateNumber('baseCalories', req.query.baseCalories, 800, 6000)
    : saved.baseCalories;
  const bodyWeightKg = req.query.bodyWeightKg !== undefined
    ? validateNumber('bodyWeightKg', req.query.bodyWeightKg, 30, 250)
    : saved.bodyWeightKg;

  if (!bodyWeightKg) {
    return res.status(409).json({
      error: 'Body weight is required before an endurance plan can be calculated',
      needsConfig: true,
    });
  }

  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);

  const all = await loadRange(apiKey, date, nextDate);
  const todayWorkouts = all.filter(w => w.date === date);
  const tomorrow = all.filter(w => w.date === nextDate);
  const nextImportant = tomorrow
    .filter(isImportantWorkout)
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))[0] || null;

  const plan = calculateEnduranceDay({
    date,
    baseCalories,
    bodyWeightKg,
    proteinGPerKg: saved.proteinGPerKg,
    fatGPerKg: saved.fatGPerKg,
    meals: mealSlotsForUser(req),
    workouts: todayWorkouts,
    nextImportantWorkout: nextImportant,
  });

  res.json({
    ...plan,
    nextImportantWorkout: nextImportant,
    config: {
      baseCalories,
      bodyWeightKg,
      proteinGPerKg: saved.proteinGPerKg,
      fatGPerKg: saved.fatGPerKg,
    },
  });
}));

export default router;