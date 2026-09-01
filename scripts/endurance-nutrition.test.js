import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEnduranceDay,
  estimateWorkoutEnergy,
  fuelingForWorkout,
} from '../src/lib/endurance-nutrition.js';

test('rest day keeps base calories and realistic meals', () => {
  const plan = calculateEnduranceDay({ baseCalories: 2400, bodyWeightKg: 80, date: '2026-09-01' });
  assert.equal(plan.calories.training, 0);
  assert.equal(plan.calories.target, 2400);
  assert.equal(plan.mealTargets.length, 4);
  assert.ok(plan.mealTargets.every(m => m.minKcal >= 300));
});

test('completed activity calories are authoritative', () => {
  const e = estimateWorkoutEnergy({ sport: 'Ride', calories: 1050, durationMin: 120 }, 80);
  assert.deepEqual(e, { kcal: 1050, source: 'activity_calories' });
});

test('bike kJ fallback maps approximately 1:1 to kcal', () => {
  const e = estimateWorkoutEnergy({ sport: 'Ride', joules: 1000000, durationMin: 90 }, 80);
  assert.equal(e.kcal, 1000);
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
    workouts: [{ sport: 'Ride', durationMin: 240, calories: 2200, intensity: 80, startTime: '2026-09-01T08:00:00' }],
  });
  assert.equal(plan.calories.target, 4600);
  assert.equal(plan.workouts[0].fueling.duringCarbs, 360);
  assert.ok(plan.workouts[0].duringFuelKcal <= plan.workouts[0].energyKcal);
});
