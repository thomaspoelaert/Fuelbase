import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, normalizeActivity, reconcilePlannedAndCompleted } from '../server/lib/intervals.js';

test('normalizes planned workout event', () => {
  const e = normalizeEvent({
    id: 123,
    category: 'WORKOUT',
    start_date_local: '2026-09-01T18:00:00',
    type: 'Ride',
    name: 'Z2',
    moving_time: 7200,
    joules: 1000000,
  });
  assert.equal(e.planned, true);
  assert.equal(e.durationMin, 120);
  assert.equal(e.joules, 1000000);
});

test('normalizes completed activity', () => {
  const a = normalizeActivity({
    id: 'i1',
    start_date_local: '2026-09-01T18:02:00',
    type: 'Ride',
    moving_time: 7100,
    calories: 1030,
    paired_event_id: 123,
  });
  assert.equal(a.completed, true);
  assert.equal(a.energyKcal, 1030);
  assert.equal(a.pairedEventId, 123);
});

test('completed activity replaces paired planned workout', () => {
  const rows = reconcilePlannedAndCompleted([
    { id: 123, category: 'WORKOUT', start_date_local: '2026-09-01T18:00:00', type: 'Ride', name: 'Z2', moving_time: 7200 },
  ], [
    { id: 'i1', start_date_local: '2026-09-01T18:02:00', type: 'Ride', moving_time: 7100, calories: 1030, paired_event_id: 123 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, true);
  assert.equal(rows[0].replacesPlannedEventId, 123);
});

test('same-day same-sport fallback reconciles when pair id is absent', () => {
  const rows = reconcilePlannedAndCompleted([
    { id: 123, category: 'WORKOUT', start_date_local: '2026-09-01T18:00:00', type: 'Run', name: 'Q', moving_time: 3600 },
  ], [
    { id: 'i1', start_date_local: '2026-09-01T18:04:00', type: 'Run', moving_time: 3550, calories: 700 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].replacesPlannedEventId, 123);
});
