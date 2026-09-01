import { calculateEnduranceDay } from './endurance-nutrition.js';

const round5 = value => Math.round((Number(value) || 0) / 5) * 5;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const GOAL_PROFILES = Object.freeze({
  lose: {
    intent: 'lose',
    label: 'Weight loss',
    adjustmentKcal: -250,
    description: 'Small daily deficit outside protected training fuel.',
  },
  maintain: {
    intent: 'maintain',
    label: 'Maintain',
    adjustmentKcal: 0,
    description: 'Match everyday needs plus the full cost of training.',
  },
  gain: {
    intent: 'gain',
    label: 'Weight gain',
    adjustmentKcal: 200,
    description: 'Small daily surplus while preserving training fuel.',
  },
});

export function normalizeGoalIntent(value) {
  const key = String(value || 'maintain').toLowerCase();
  return GOAL_PROFILES[key] ? key : 'maintain';
}

export function goalProfile(value) {
  return GOAL_PROFILES[normalizeGoalIntent(value)];
}

function carbPeriodization(carbsG, bodyWeightKg) {
  const perKg = bodyWeightKg > 0 ? carbsG / bodyWeightKg : 0;
  let level = 'low';
  if (perKg >= 8) level = 'very-high';
  else if (perKg >= 6) level = 'high';
  else if (perKg >= 4) level = 'moderate';
  return { gramsPerKg: Math.round(perKg * 10) / 10, level };
}

function distribute(total, weights) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0) || 1;
  const raw = weights.map(w => safeTotal * Math.max(0, w) / sum);
  const rounded = raw.map(round5);
  let diff = round5(safeTotal) - rounded.reduce((s, n) => s + n, 0);
  if (rounded.length && diff) {
    const order = raw
      .map((n, i) => ({ i, frac: n - Math.floor(n) }))
      .sort((a, b) => b.frac - a.frac);
    let cursor = 0;
    while (Math.abs(diff) >= 5 && cursor < 50) {
      const idx = order[cursor % order.length].i;
      const step = diff > 0 ? 5 : -5;
      if (rounded[idx] + step >= 0) {
        rounded[idx] += step;
        diff -= step;
      }
      cursor += 1;
    }
  }
  return rounded;
}

function addMealGuidance(plan, bodyWeightKg) {
  const meals = plan.mealTargets || [];
  if (!meals.length) return meals;

  const standaloneCarbs = (plan.standaloneFueling || []).reduce((sum, row) => sum + Number(row.carbs || 0), 0);
  const standaloneProtein = (plan.standaloneFueling || []).reduce((sum, row) => sum + Number(row.protein || 0), 0);
  const mealCarbs = Math.max(0, Number(plan.macros?.carbohydrates || 0) - standaloneCarbs);
  const mealProtein = Math.max(0, Number(plan.macros?.proteins || 0) - standaloneProtein);

  const carbWeights = meals.map(meal => {
    const base = Math.max(1, Number(meal.centerKcal || 0));
    const overlay = Number(meal.workoutOverlayKcal || 0);
    const trainingBias = overlay > 20 ? 1.22 : 1;
    const recoveryBias = meal.timingAdjusted ? 1.18 : 1;
    return base * trainingBias * recoveryBias;
  });
  const proteinWeights = meals.map(meal => {
    const label = String(meal.label || '').toLowerCase();
    if (/snack/.test(label)) return 0.55;
    return 1;
  });

  const carbTargets = distribute(mealCarbs, carbWeights);
  const proteinTargets = distribute(mealProtein, proteinWeights);

  return meals.map((meal, index) => {
    const overlay = Number(meal.workoutOverlayKcal || 0);
    const carbsG = carbTargets[index] || 0;
    const proteinG = clamp(proteinTargets[index] || 0, /snack/i.test(meal.label || '') ? 0 : 20, 50);
    let priority = 'normal';
    let note = 'Normal meal — hit protein and let carbohydrates follow today’s training demand.';
    if (meal.timingAdjusted) {
      priority = 'recovery';
      note = 'Recovery meal — prioritise carbohydrate and protein after the session.';
    } else if (overlay > 20) {
      priority = 'training-support';
      note = 'Training-support meal — make carbohydrate the anchor and keep fat moderate around the session.';
    }

    return {
      ...meal,
      guidance: {
        carbsG: round5(carbsG),
        proteinG: round5(proteinG),
        priority,
        note,
      },
    };
  });
}

export function calculateFuelBaseDay({
  baseCalories,
  bodyWeightKg,
  goalIntent = 'maintain',
  ...rest
} = {}) {
  const base = Math.max(0, Number(baseCalories) || 0);
  const profile = goalProfile(goalIntent);
  // Goal energy is deliberately applied to the everyday foundation before the
  // workout overlay is added. This protects pre/during/recovery fuel from a
  // weight-loss deficit instead of shaving energy from the session itself.
  const foundation = Math.max(800, base + profile.adjustmentKcal);
  const appliedAdjustment = foundation - base;

  const core = calculateEnduranceDay({
    ...rest,
    baseCalories: foundation,
    bodyWeightKg,
  });

  const enriched = {
    ...core,
    calories: {
      base: Math.round(base),
      goalAdjustment: Math.round(appliedAdjustment),
      foundation: Math.round(foundation),
      training: Math.round(core.calories?.training || 0),
      target: Math.round(core.calories?.target || 0),
    },
    goal: {
      ...profile,
      adjustmentKcal: Math.round(appliedAdjustment),
      trainingFuelProtected: true,
    },
  };

  enriched.carbPeriodization = carbPeriodization(Number(enriched.macros?.carbohydrates || 0), Number(bodyWeightKg || 0));
  enriched.mealTargets = addMealGuidance(enriched, Number(bodyWeightKg || 0));
  return enriched;
}

export function summarizeFuelBaseDay(plan) {
  return {
    date: plan.date,
    targetKcal: Math.round(plan.calories?.target || 0),
    baseKcal: Math.round(plan.calories?.base || 0),
    goalAdjustmentKcal: Math.round(plan.calories?.goalAdjustment || 0),
    trainingKcal: Math.round(plan.calories?.training || 0),
    carbsG: Math.round(plan.macros?.carbohydrates || 0),
    carbLevel: plan.carbPeriodization?.level || 'low',
    goalIntent: plan.goal?.intent || 'maintain',
    eveningPrep: plan.eveningPrep || null,
    workouts: (plan.workouts || []).map(workout => ({
      name: workout.name || workout.sport || 'Workout',
      sport: workout.sport || null,
      startTime: workout.startTime || null,
      durationMin: Number(workout.durationMin || 0),
      energyKcal: Math.round(workout.energyKcal || 0),
      preCarbs: Math.round(workout.fueling?.preCarbs || 0),
      duringRate: Math.round(workout.fueling?.duringRate || 0),
      postCarbs: Math.round(workout.fueling?.postCarbs || 0),
    })),
  };
}
