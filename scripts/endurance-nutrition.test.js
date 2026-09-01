import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEnduranceDay,
  estimateWorkoutEnergy,
  fuelingForWorkout,
  eveningPrepForNextWorkout,
} from '../src/lib/endurance-nutrition.js';

test('rest day keeps base calories and realistic meals', () => {
  const plan = calculateEnduranceDay({ baseCalories: 2400, bodyWeightKg: 80, date: '2026-09-01' });
  assert.equal(plan.calories.training, 0);
  assert.equal(plan.calories.target, 2400);
  assert.equal(plan.mealTargets.length, 4);
  assert.ok(plan.mealTargets.every(m => m.minKcal >= 300));
});

test('completed activity calories are authoritative', () => {
  const e = estimateWorkoutEnergy({ sport: 'Run', calories: 1050, durationMin: 120 }, 80);
  assert.deepEqual(e, { kcal: 1050, source: 'activity_calories' });
});

test('bike kJ fallback maps approximately 1:1 to kcal', () => {
  const e = estimateWorkoutEnergy({ sport: 'Ride', joules: 1000000, durationMin: 90 }, 80);
  assert.equal(e.kcal, 1000);
  assert.equal(e.source, 'bike_kj');
});

test('bike mechanical kJ is preferred over generic activity calories', () => {
  const e = estimateWorkoutEnergy({ sport: 'Ride', joules: 950000, calories: 1200, durationMin: 90 }, 80);
  assert.equal(e.kcal, 950);
  assert.equal(e.source, 'bike_kj');
});

test('run fallback uses body mass times distance', () => {
  const e = estimateWorkoutEnergy({ sport: 'Run', distanceKm: 10, durationMin: 45 }, 80);
  assert.equal(e.kcal, 800);
  assert.equal(e.source, 'run_weight_distance');
});

test('short easy session does not force during carbs', () => {
  const f = fuelingForWorkout({ sport: 'Run', durationMin: 45, intensity: 55 }, 80, 48);
  assert.equal(f.duringRate, 0);
});

test('two hour endurance ride receives practical pre/during/post fueling', () => {
  const f = fuelingForWorkout({ sport: 'Ride', durationMin: 120, intensity: 60 }, 80, 24);
  assert.equal(f.duringRate, 55);
  assert.equal(f.duringCarbs, 110);
  assert.ok(f.preCarbs >= 55);
  assert.ok(f.postCarbs >= 60);
});

test('long hard ride drives higher during target', () => {
  const f = fuelingForWorkout({ sport: 'Ride', durationMin: 240, intensity: 80 }, 80, 36);
  assert.equal(f.duringRate, 90);
  assert.equal(f.duringCarbs, 360);
});

test('rapid recovery increases post workout carbohydrates', () => {
  const rapid = fuelingForWorkout({ sport: 'Ride', durationMin: 90, intensity: 80 }, 80, 5);
  const normal = fuelingForWorkout({ sport: 'Ride', durationMin: 90, intensity: 80 }, 80, 40);
  assert.equal(rapid.recoveryUrgency, 'rapid');
  assert.ok(rapid.postCarbs > normal.postCarbs);
});

test('training energy raises daily target but keeps normal meal floors', () => {
  const plan = calculateEnduranceDay({
    baseCalories: 2400,
    bodyWeightKg: 80,
    date: '2026-09-01',
    workouts: [{ sport: 'Ride', durationMin: 120, calories: 1050, startTime: '2026-09-01T18:00:00' }],
  });
  assert.equal(plan.calories.target, 3450);
  assert.ok(plan.mealTargets.every(m => m.minKcal >= 300));
  const dinner = plan.mealTargets.find(m => /dinner/i.test(m.label));
  assert.ok(dinner.centerKcal > 720);
});

test('during workout carbs stay inside total daily energy', () => {
  const plan = calculateEnduranceDay({
    baseCalories: 2400,
    bodyWeightKg: 80,
    date: '2026-09-01',
    workouts: [{ sourceId: 'ride-1', sport: 'Ride', durationMin: 240, calories: 2200, intensity: 80, startTime: '2026-09-01T08:00:00' }],
  });
  assert.equal(plan.calories.target, 4600);
  assert.equal(plan.workouts[0].fueling.duringCarbs, 360);
  assert.ok(plan.workouts[0].duringFuelKcal <= plan.workouts[0].energyKcal);
  assert.ok(plan.standaloneFueling.some(x => x.type === 'during'));
});

test('early next-day quality session creates evening carb prep without adding calories', () => {
  const nextWorkout = { sport: 'Ride', name: 'Sweet Spot', durationMin: 105, intensity: 80, startTime: '2026-09-02T06:00:00' };
  const prep = eveningPrepForNextWorkout(nextWorkout, 80, '2026-09-01');
  assert.ok(prep);
  assert.ok(prep.carbs >= 50);
  const plan = calculateEnduranceDay({ baseCalories: 2400, bodyWeightKg: 80, date: '2026-09-01', nextImportantWorkout: nextWorkout });
  assert.equal(plan.calories.target, 2400);
  assert.ok(plan.eveningPrep);
  assert.ok(plan.eveningPrep.shiftedKcalToDinner > 0);
});

test('late easy next-day session does not trigger evening prep', () => {
  const prep = eveningPrepForNextWorkout({ sport: 'Run', name: 'Easy', durationMin: 60, intensity: 50, startTime: '2026-09-02T18:00:00' }, 80, '2026-09-01');
  assert.equal(prep, null);
});

test('early workout can use a standalone pre-fuel bucket while keeping breakfast normal', () => {
  const plan = calculateEnduranceDay({
    baseCalories: 2400,
    bodyWeightKg: 80,
    date: '2026-09-01',
    workouts: [{ sourceId: 'run-1', sport: 'Run', name: 'Threshold', durationMin: 75, calories: 900, intensity: 85, startTime: '2026-09-01T05:30:00' }],
  });
  assert.ok(plan.standaloneFueling.some(x => x.type === 'pre'));
  const breakfast = plan.mealTargets.find(m => /breakfast/i.test(m.label));
  assert.ok(breakfast.minKcal >= 300);
});

test('two-a-day sums both workout energy while preserving all meal floors', () => {
  const plan = calculateEnduranceDay({
    baseCalories: 2400,
    bodyWeightKg: 80,
    date: '2026-09-01',
    workouts: [
      { sport: 'Run', durationMin: 60, calories: 800, startTime: '2026-09-01T06:00:00' },
      { sport: 'Ride', durationMin: 90, calories: 900, startTime: '2026-09-01T18:00:00' },
    ],
  });
  assert.equal(plan.calories.training, 1700);
  assert.equal(plan.calories.target, 4100);
  assert.ok(plan.mealTargets.every(m => m.minKcal >= 300));
});
