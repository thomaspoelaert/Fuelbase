import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFuelBaseDay, summarizeFuelBaseDay } from '../src/lib/fuelbase-planning.js';
import { FUELBASE_STARTER_FOODS, starterFoodByName } from '../src/lib/fuelbase-starter-foods.js';

const ride = {
  sourceId: 'ride-1',
  sport: 'Ride',
  name: 'Z2 Endurance Ride',
  durationMin: 120,
  energyKcal: 1050,
  calories: 1050,
  startTime: '2026-09-01T18:00:00',
  intensity: 60,
};

function day(goalIntent = 'maintain') {
  return calculateFuelBaseDay({
    date: '2026-09-01',
    baseCalories: 2400,
    bodyWeightKg: 80,
    goalIntent,
    workouts: [ride],
  });
}

test('maintain adds full workout energy to the base day', () => {
  const plan = day('maintain');
  assert.equal(plan.calories.base, 2400);
  assert.equal(plan.calories.goalAdjustment, 0);
  assert.equal(plan.calories.foundation, 2400);
  assert.equal(plan.calories.training, 1050);
  assert.equal(plan.calories.target, 3450);
  assert.equal(plan.goal.intent, 'maintain');
});

test('weight loss reduces foundation but does not reduce workout fueling', () => {
  const maintain = day('maintain');
  const lose = day('lose');
  assert.equal(lose.calories.goalAdjustment, -250);
  assert.equal(lose.calories.foundation, 2150);
  assert.equal(lose.calories.target, maintain.calories.target - 250);
  assert.equal(lose.goal.trainingFuelProtected, true);
  assert.deepEqual(lose.workouts[0].fueling, maintain.workouts[0].fueling);
  assert.equal(lose.workouts[0].fueling.duringRate, 60);
  assert.equal(lose.workouts[0].fueling.duringCarbs, 120);
});

test('weight gain adds a small surplus outside the workout overlay', () => {
  const maintain = day('maintain');
  const gain = day('gain');
  assert.equal(gain.calories.goalAdjustment, 200);
  assert.equal(gain.calories.target, maintain.calories.target + 200);
  assert.deepEqual(gain.workouts[0].fueling, maintain.workouts[0].fueling);
});

test('meal targets include practical carb and protein guidance', () => {
  const plan = day('maintain');
  assert.ok(plan.mealTargets.length >= 4);
  assert.ok(plan.mealTargets.every(meal => Number.isFinite(meal.guidance?.carbsG)));
  assert.ok(plan.mealTargets.every(meal => Number.isFinite(meal.guidance?.proteinG)));
  const trainingMeals = plan.mealTargets.filter(meal => meal.workoutOverlayKcal > 20);
  assert.ok(trainingMeals.length >= 1);
  assert.ok(trainingMeals.some(meal => ['training-support', 'recovery'].includes(meal.guidance.priority)));
});

test('carbohydrate periodization exposes grams per kg and a level', () => {
  const plan = day('maintain');
  assert.ok(plan.carbPeriodization.gramsPerKg > 0);
  assert.ok(['low', 'moderate', 'high', 'very-high'].includes(plan.carbPeriodization.level));
});

test('48h summary is compact but keeps fueling-relevant fields', () => {
  const summary = summarizeFuelBaseDay(day('maintain'));
  assert.equal(summary.goalIntent, 'maintain');
  assert.equal(summary.trainingKcal, 1050);
  assert.equal(summary.workouts.length, 1);
  assert.equal(summary.workouts[0].duringRate, 60);
  assert.ok(summary.carbsG > 0);
});

test('starter catalogue preserves special logging conventions and exact portions', () => {
  assert.equal(FUELBASE_STARTER_FOODS.length, 23);

  const intra = starterFoodByName('Intra-workout koolhydraten');
  assert.equal(intra.portion, 1);
  assert.equal(intra.unit, 'g CHO');
  assert.deepEqual(intra.nutrition, { calories: 4, carbohydrates: 1, proteins: 0, fat: 0 });

  const bicky = starterFoodByName('Bicky Original — volledige burger');
  assert.equal(bicky.portion, 1);
  assert.equal(bicky.unit, 'burger');
  assert.deepEqual(bicky.nutrition, { calories: 429, carbohydrates: 37.6, proteins: 19.8, fat: 21.5 });

  const banana = starterFoodByName('Banaan, eetbaar deel');
  assert.equal(banana.altUnits[0].grams, 120);
});

test('recipe-dependent Julientje is deliberately not a zero-calorie starter food', () => {
  assert.equal(starterFoodByName('Julientje'), null);
});
