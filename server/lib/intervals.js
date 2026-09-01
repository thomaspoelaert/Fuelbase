const BASE_URL = 'https://intervals.icu/api/v1';

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`;
}

async function request(apiKey, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: authHeader(apiKey),
      Accept: 'application/json',
      'User-Agent': 'FuelBase-NutriTrace/1.0',
    },
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { detail = (await res.text()).slice(0, 300) || detail; } catch {}
    const err = new Error(`Intervals.icu request failed: ${detail}`);
    err.status = res.status;
    err.retryAfter = res.headers.get('retry-after');
    throw err;
  }
  return res.json();
}

export async function listEvents(apiKey, oldest, newest) {
  const qs = new URLSearchParams({ oldest, newest });
  return request(apiKey, `/athlete/0/events?${qs}`);
}

export async function listActivities(apiKey, oldest, newest) {
  const qs = new URLSearchParams({ oldest, newest, limit: '500' });
  return request(apiKey, `/athlete/0/activities?${qs}`);
}

export async function testConnection(apiKey) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await listActivities(apiKey, today, today);
  return { ok: true, activitiesToday: Array.isArray(rows) ? rows.length : 0 };
}

function localDate(v) {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function durationMinutes(row) {
  const sec = Number(row.moving_time ?? row.elapsed_time ?? row.duration ?? row.workout_doc?.duration ?? 0);
  return sec > 0 ? Math.round(sec / 60) : 0;
}

export function normalizeEvent(row = {}) {
  return {
    source: 'intervals',
    sourceId: String(row.id ?? row.uid ?? ''),
    eventId: row.id ?? null,
    category: row.category || null,
    planned: true,
    completed: false,
    date: localDate(row.start_date_local),
    startTime: row.start_date_local || null,
    sport: row.type || row.sub_type || 'Other',
    name: row.name || row.type || 'Workout',
    durationMin: durationMinutes(row),
    distanceKm: Number(row.distance || 0) > 0 ? Number(row.distance) / 1000 : null,
    load: row.icu_training_load ?? row.load_target ?? row.workout_doc?.strain_score ?? null,
    intensity: row.icu_intensity ?? null,
    joules: row.joules ?? null,
    energyKcal: null,
    pairedEventId: null,
    carbsPerHour: row.carbs_per_hour ?? null,
    raw: row,
  };
}

export function normalizeActivity(row = {}) {
  return {
    source: 'intervals',
    sourceId: String(row.id ?? ''),
    activityId: row.id ?? null,
    planned: false,
    completed: true,
    date: localDate(row.start_date_local),
    startTime: row.start_date_local || null,
    sport: row.type || 'Other',
    name: row.name || row.type || 'Activity',
    durationMin: durationMinutes(row),
    distanceKm: Number(row.distance || 0) > 0 ? Number(row.distance) / 1000 : null,
    load: row.icu_training_load ?? row.icu_training_load2 ?? null,
    intensity: row.icu_intensity ?? null,
    joules: row.icu_joules ?? row.joules ?? null,
    energyKcal: row.calories != null ? Number(row.calories) : null,
    pairedEventId: row.paired_event_id ?? null,
    raw: row,
  };
}

function sportKey(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('ride') || s.includes('bike') || s.includes('cycle')) return 'bike';
  if (s.includes('run')) return 'run';
  if (s.includes('swim')) return 'swim';
  return s;
}

export function reconcilePlannedAndCompleted(events = [], activities = []) {
  const planned = events.filter(e => e.category === 'WORKOUT' || !e.category).map(normalizeEvent);
  const completed = activities.map(normalizeActivity);
  const usedEvents = new Set();

  for (const a of completed) {
    let match = null;
    if (a.pairedEventId != null) {
      match = planned.find(e => String(e.eventId) === String(a.pairedEventId));
    }
    if (!match) {
      // Conservative fallback: same date + same broad sport + nearest start time.
      const candidates = planned.filter(e => !usedEvents.has(e.sourceId) && e.date === a.date && sportKey(e.sport) === sportKey(a.sport));
      if (candidates.length === 1) match = candidates[0];
      else if (candidates.length > 1 && a.startTime) {
        const at = new Date(a.startTime).getTime();
        match = candidates
          .map(e => ({ e, d: e.startTime ? Math.abs(new Date(e.startTime).getTime() - at) : Infinity }))
          .sort((x, y) => x.d - y.d)[0]?.e || null;
      }
    }
    if (match) {
      usedEvents.add(match.sourceId);
      a.replacesPlannedEventId = match.eventId;
    }
  }

  return [
    ...planned.filter(e => !usedEvents.has(e.sourceId)),
    ...completed,
  ].sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
}
