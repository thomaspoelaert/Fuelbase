// FuelBase endurance nutrition engine.
// Pure functions only: no storage, network or UI dependencies.

const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_FAT = 9;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round5 = n => Math.round(n / 5) * 5;

function validDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function classifyWorkout(workout = {}) {
  const sport = String(workout.sport || workout.type || '').toLowerCase();
  const durationMin = Number(workout.durationMin ?? workout.duration_min ?? 0);
  const load = Number(workout.load ?? workout.icu_training_load ?? 0);
  const intensity = Number(workout.intensity ?? workout.icu_intensity ?? 0);
  const name = String(workout.name || '').toLowerCase();
  const hardByName = /(threshold|tempo|sweet.?spot|vo2|interval|race|brick|quality|q\b)/i.test(name);
  const hard = hardByName || intensity >= 75 || (load >= 80 && durationMin <= 120);
  const long = durationMin >= 150;
  return { sport, durationMin, load, intensity, hard, long };
}

export function estimateWorkoutEnergy(workout = {}, bodyWeightKg = 75) {
  const { sport, durationMin, hard } = classifyWorkout(workout);
  const isBike = sport.includes('ride') || sport.includes('bike') || sport.includes('cycle');

  const joules = Number(workout.joules ?? workout.workKj ?? workout.kilojoules);
  // For cycling with measured work, mechanical kJ is preferred over a generic
  // activity calorie field. Wearable calorie fields are not always consistent
  // about active-vs-total energy; kJ from power is the cleaner exercise-energy
  // anchor for the base + exercise model.
  if (isBike && Number.isFinite(joules) && joules > 0) {
    const kj = joules > 10000 ? joules / 1000 : joules;
    return { kcal: Math.round(kj), source: 'bike_kj' };
  }

  const actual = Number(workout.energyKcal ?? workout.calories ?? workout.kcal);
  if (Number.isFinite(actual) && actual > 0) {
    return { kcal: Math.round(actual), source: 'activity_calories' };
  }

  if (Number.isFinite(joules) && joules > 0) {
    const kj = joules > 10000 ? joules / 1000 : joules;
    return { kcal: Math.round(kj), source: 'work_kj' };
  }

  const distanceKm = Number(workout.distanceKm ?? workout.distance_km ?? workout.distance);
  if ((sport.includes('run') || sport === 'running') && Number.isFinite(distanceKm) && distanceKm > 0) {
    return { kcal: Math.round(bodyWeightKg * distanceKm), source: 'run_weight_distance' };
  }
  if (durationMin <= 0) return { kcal: 0, source: 'none' };

  let kcalPerKgHour = 5;
  if (sport.includes('ride') || sport.includes('bike') || sport.includes('cycle')) kcalPerKgHour = hard ? 8.5 : 6.5;
  else if (sport.includes('run')) kcalPerKgHour = hard ? 11 : 9;
  else if (sport.includes('swim')) kcalPerKgHour = hard ? 8 : 6;
  else kcalPerKgHour = hard ? 7 : 5;

  return { kcal: Math.round(bodyWeightKg * kcalPerKgHour * (durationMin / 60)), source: 'duration_intensity' };
}

function explicitDuringRate(workout = {}) {
  const raw = workout.carbsPerHour
    ?? workout.carbs_per_hour
    ?? workout.targetCarbsPerHour
    ?? workout.target_carbs_per_hour;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 150) return null;
  return Math.round(n);
}

function defaultDuringRate(c) {
  const isBike = c.sport.includes('ride') || c.sport.includes('bike') || c.sport.includes('cycle');
  const isRun = c.sport.includes('run');
  const isSwim = c.sport.includes('swim');

  if (isSwim) return 0;

  // Cycling is deliberately performance-forward. A normal ~2 h endurance
  // ride lands at 60 g/h and long rides at 90 g/h; an explicit Intervals
  // carbs_per_hour target always overrides these defaults.
  if (isBike) {
    if (c.durationMin < 60) return c.hard ? 30 : 0;
    if (c.durationMin < 90) return c.hard ? 60 : 45;
    if (c.durationMin < 150) return c.hard ? 75 : 60;
    return 90;
  }

  // Running is kept somewhat lower than cycling because gut tolerance and
  // practical intake are usually more limiting while still prioritising CHO
  // for long and quality sessions.
  if (isRun) {
    if (c.durationMin < 60) return c.hard ? 30 : 0;
    if (c.durationMin < 90) return c.hard ? 45 : 30;
    if (c.durationMin < 150) return c.hard ? 60 : 45;
    return c.hard ? 75 : 60;
  }

  if (c.durationMin < 60) return c.hard ? 30 : 0;
  if (c.durationMin < 90) return c.hard ? 45 : 30;
  if (c.durationMin < 150) return c.hard ? 60 : 45;
  return c.hard ? 75 : 60;
}

export function fuelingForWorkout(workout = {}, bodyWeightKg = 75, hoursToNextImportant = Infinity) {
  const c = classifyWorkout(workout);
  const h = c.durationMin / 60;
  const explicitRate = explicitDuringRate(workout);
  const duringRate = explicitRate ?? defaultDuringRate(c);
  const duringRateSource = explicitRate != null ? 'workout_target' : 'default';

  let preCarbs = 0;
  if (c.durationMin >= 60 || c.hard) {
    const gPerKg = c.long ? 1.25 : c.hard ? 1.0 : 0.75;
    preCarbs = round5(bodyWeightKg * gPerKg);
  }
  const duringCarbs = round5(duringRate * h);

  let postCarbPerKg = 0.65;
  let recoveryUrgency = 'normal';
  if (hoursToNextImportant < 8) { postCarbPerKg = 1.1; recoveryUrgency = 'rapid'; }
  else if (hoursToNextImportant <= 24 || c.long || c.hard) { postCarbPerKg = 0.85; recoveryUrgency = 'priority'; }

  const postCarbs = round5(bodyWeightKg * postCarbPerKg);
  const postProtein = round5(clamp(bodyWeightKg * 0.35, 25, 40));
  return { preCarbs, duringRate, duringCarbs, duringRateSource, postCarbs, postProtein, recoveryUrgency };
}

export function eveningPrepForNextWorkout(nextWorkout, bodyWeightKg = 75, currentDate = null) {
  if (!nextWorkout?.startTime) return null;
  const start = validDate(nextWorkout.startTime);
  if (!start) return null;

  if (currentDate) {
    const current = validDate(`${currentDate}T12:00:00`);
    if (!current) return null;
    const nextDay = new Date(current);
    nextDay.setDate(nextDay.getDate() + 1);
    const expected = [nextDay.getFullYear(), String(nextDay.getMonth() + 1).padStart(2, '0'), String(nextDay.getDate()).padStart(2, '0')].join('-');
    if (String(nextWorkout.startTime).slice(0, 10) !== expected) return null;
  }

  const startHour = start.getHours() + start.getMinutes() / 60;
  const c = classifyWorkout(nextWorkout);
  const important = c.hard || c.long || c.durationMin >= 90;
  if (!important || startHour > 9) return null;

  const gPerKg = c.long ? 1.0 : c.hard ? 0.75 : 0.5;
  const carbs = round5(clamp(bodyWeightKg * gPerKg, 30, 100));
  return { carbs, kcal: carbs * KCAL_PER_G_CARB, workoutName: nextWorkout.name || nextWorkout.sport || 'Workout', startTime: nextWorkout.startTime, reason: 'early_next_day_training' };
}

function defaultMeals() {
  return [
    { key: 'breakfast', label: 'Breakfast', share: 0.25, hour: 8 },
    { key: 'lunch', label: 'Lunch', share: 0.30, hour: 12.5 },
    { key: 'dinner', label: 'Dinner', share: 0.30, hour: 19.5 },
    { key: 'snacks', label: 'Snacks', share: 0.15, hour: 15.5 },
  ];
}

function normalizeMealSlots(meals) {
  const defaults = defaultMeals();
  const slots = Array.isArray(meals) && meals.length ? meals : defaults;
  const normalized = slots.map((m, idx) => ({
    key: m.key || `meal_${idx}`,
    label: m.label || m.name || `Meal ${idx + 1}`,
    share: Number(m.share) > 0 ? Number(m.share) : (defaults[idx]?.share || 1 / slots.length),
    hour: Number.isFinite(Number(m.hour)) ? Number(m.hour) : (defaults[idx]?.hour ?? 12 + idx * 2),
  }));
  const shareTotal = normalized.reduce((s, m) => s + m.share, 0) || 1;
  return normalized.map(m => ({ ...m, normalizedShare: m.share / shareTotal }));
}

function closestBefore(plan, hour, maxGapHours = 3) {
  const rows = plan.filter(m => m.hour <= hour).map(m => ({ m, gap: hour - m.hour })).filter(x => x.gap <= maxGapHours).sort((a, b) => a.gap - b.gap);
  return rows[0]?.m || null;
}
function closestAfter(plan, hour, maxGapHours = 3) {
  const rows = plan.filter(m => m.hour >= hour).map(m => ({ m, gap: m.hour - hour })).filter(x => x.gap <= maxGapHours).sort((a, b) => a.gap - b.gap);
  return rows[0]?.m || null;
}

function addMealEnergy(meal, kcal) {
  const amount = Math.max(0, Number(kcal) || 0);
  if (!meal || amount <= 0) return 0;
  meal.targetKcal += amount;
  meal.workoutOverlayKcal += amount;
  return amount;
}

function recoveryMeal(plan, endHour) {
  const after = closestAfter(plan, endHour, 4);
  if (after) return after;
  // An evening workout can overlap the user's normal dinner time. In that
  // case dinner becomes the recovery meal rather than creating a fake extra
  // meal, and its suggested timing is shifted to shortly after the session.
  const dinner = [...plan].filter(m => /dinner|avond/i.test(m.label)).sort((a, b) => b.hour - a.hour)[0];
  if (dinner && endHour <= 22 && dinner.hour >= endHour - 1.5) {
    dinner.timingAdjusted = true;
    dinner.suggestedHour = Math.min(22, endHour + 0.5);
    return dinner;
  }
  return null;
}

function allocateResidualNearWorkout(plan, startHour, endHour, kcal) {
  let remaining = Math.max(0, Number(kcal) || 0);
  if (remaining <= 0) return 0;

  const before = closestBefore(plan, startHour, 4);
  const after = recoveryMeal(plan, endHour);
  let allocated = 0;

  if (after && before && after !== before) {
    const afterShare = remaining * 0.7;
    allocated += addMealEnergy(after, afterShare);
    allocated += addMealEnergy(before, remaining - afterShare);
    return allocated;
  }
  if (after) return addMealEnergy(after, remaining);
  if (before) return addMealEnergy(before, remaining);

  const fallback = plan.find(m => /dinner|avond/i.test(m.label))
    || plan.find(m => /lunch|middag/i.test(m.label))
    || plan[plan.length - 1];
  return addMealEnergy(fallback, remaining);
}

export function allocateMeals({ baseCalories, meals, workouts, dailyTargetKcal, eveningPrep = null }) {
  const normalized = normalizeMealSlots(meals);
  const plan = normalized.map(m => {
    const center = baseCalories * m.normalizedShare;
    const floor = Math.max(300, center * 0.72);
    return { ...m, baseCenterKcal: center, targetKcal: center, floorKcal: floor, workoutOverlayKcal: 0, timingAdjusted: false };
  });

  const standaloneFueling = [];
  const sortedWorkouts = [...(workouts || [])].sort((a, b) => Number(a.startHour ?? 12) - Number(b.startHour ?? 12));

  // Every workout gets its own exercise-energy budget. That budget is placed
  // in this order: during -> pre -> recovery -> nearest normal meals. This
  // keeps most of the added training calories around the workout while the
  // original base calories still preserve realistic breakfast/lunch/dinner.
  for (const w of sortedWorkouts) {
    const energy = Math.max(0, Number(w.energyKcal || 0));
    let workoutBudget = energy;
    const fueling = w.fueling || {};
    const startHour = Number.isFinite(Number(w.startHour)) ? Number(w.startHour) : 12;
    const durationHours = Number(w.durationMin || 0) / 60;
    const endHour = startHour + durationHours;
    const preKcal = Number(fueling.preCarbs || 0) * KCAL_PER_G_CARB;
    const duringKcal = Number(fueling.duringCarbs || 0) * KCAL_PER_G_CARB;
    const postKcal = Number(fueling.postCarbs || 0) * KCAL_PER_G_CARB + Number(fueling.postProtein || 0) * KCAL_PER_G_PROTEIN;
    const workoutId = w.sourceId || w.activityId || w.eventId || null;

    const duringAllocated = Math.min(workoutBudget, duringKcal);
    w.duringFuelKcal = duringAllocated;
    if (duringAllocated > 0) {
      standaloneFueling.push({ workoutId, type: 'during', kcal: Math.round(duringAllocated), carbs: Number(fueling.duringCarbs || 0), label: 'During workout' });
      workoutBudget -= duringAllocated;
    }

    const before = closestBefore(plan, startHour, 3);
    if (preKcal > 0 && workoutBudget > 0) {
      const add = Math.min(preKcal, workoutBudget);
      if (before) addMealEnergy(before, add);
      else standaloneFueling.push({ workoutId, type: 'pre', kcal: Math.round(add), carbs: Number(fueling.preCarbs || 0), label: 'Pre-workout' });
      workoutBudget -= add;
    }

    if (postKcal > 0 && workoutBudget > 0) {
      const add = Math.min(postKcal, workoutBudget);
      const receiver = recoveryMeal(plan, endHour);
      if (receiver) addMealEnergy(receiver, add);
      else standaloneFueling.push({ workoutId, type: 'post', kcal: Math.round(add), carbs: Number(fueling.postCarbs || 0), protein: Number(fueling.postProtein || 0), label: 'Recovery' });
      workoutBudget -= add;
    }

    if (workoutBudget > 0.5) {
      allocateResidualNearWorkout(plan, startHour, endHour, workoutBudget);
      workoutBudget = 0;
    }
  }

  // Numerical guard only: normal workout energy should have been allocated
  // completely above. If future workout types produce a rounding residue,
  // keep total meal targets consistent with the day target.
  const allocatedOverlay = plan.reduce((s, m) => s + m.workoutOverlayKcal, 0)
    + standaloneFueling.reduce((s, x) => s + Number(x.kcal || 0), 0);
  let residue = Math.max(0, (dailyTargetKcal - baseCalories) - allocatedOverlay);
  if (residue > 0.5) {
    const fallback = plan.find(m => /dinner|avond/i.test(m.label)) || plan[plan.length - 1];
    addMealEnergy(fallback, residue);
  }

  let eveningShiftKcal = 0;
  if (eveningPrep?.kcal > 0) {
    const dinner = [...plan].filter(m => /dinner|avond/i.test(m.label)).sort((a, b) => b.hour - a.hour)[0];
    if (dinner) {
      let wanted = Math.min(250, eveningPrep.kcal * 0.6);
      const donors = plan.filter(m => m !== dinner).sort((a, b) => ((/snack/i.test(a.label) ? -1 : 0) - (/snack/i.test(b.label) ? -1 : 0)) || b.hour - a.hour);
      for (const donor of donors) {
        if (wanted <= 0.5) break;
        const room = Math.max(0, donor.targetKcal - donor.floorKcal);
        const moved = Math.min(room, wanted);
        donor.targetKcal -= moved;
        dinner.targetKcal += moved;
        wanted -= moved;
        eveningShiftKcal += moved;
      }
    }
  }

  const mealTargets = plan.map(m => {
    const center = Math.max(m.floorKcal, m.targetKcal);
    return {
      key: m.key,
      label: m.label,
      centerKcal: Math.round(center),
      minKcal: Math.round(Math.max(m.floorKcal, center * 0.88)),
      maxKcal: Math.round(center * 1.12),
      workoutOverlayKcal: Math.round(m.workoutOverlayKcal),
      timingAdjusted: !!m.timingAdjusted,
      suggestedHour: m.suggestedHour ?? null,
    };
  });
  return { mealTargets, standaloneFueling, eveningShiftKcal: Math.round(eveningShiftKcal) };
}

export function calculateEnduranceDay({ baseCalories, bodyWeightKg, workouts = [], meals, nextImportantWorkout = null, nextImportantWorkoutAt = null, date = null, proteinGPerKg = 1.8, fatGPerKg = 0.9 } = {}) {
  const base = Math.max(0, Number(baseCalories) || 0);
  const weight = Math.max(1, Number(bodyWeightKg) || 75);
  const day = date || new Date().toISOString().slice(0, 10);
  const nextStart = nextImportantWorkout?.startTime || nextImportantWorkoutAt || null;

  const normalized = workouts.map(w => {
    const energy = estimateWorkoutEnergy(w, weight);
    const start = w.startTime || w.start_date_local || w.startDateLocal || null;
    const startDate = start ? validDate(start) : null;
    let hoursToNext = Infinity;
    if (nextStart && startDate) {
      const nextDate = validDate(nextStart);
      if (nextDate) {
        const endMs = startDate.getTime() + Number(w.durationMin ?? w.duration_min ?? 0) * 60000;
        hoursToNext = (nextDate.getTime() - endMs) / 3600000;
      }
    }
    const fueling = fuelingForWorkout(w, weight, hoursToNext);
    const startHour = startDate ? startDate.getHours() + startDate.getMinutes() / 60 : 12;
    return { ...w, durationMin: Number(w.durationMin ?? w.duration_min ?? 0), energyKcal: energy.kcal, energySource: energy.source, startHour, fueling };
  });

  const trainingKcal = normalized.reduce((s, w) => s + w.energyKcal, 0);
  const targetKcal = Math.round(base + trainingKcal);
  const proteinG = round5(weight * proteinGPerKg);
  const fatG = round5(weight * fatGPerKg);
  const remainingKcalForCarbs = Math.max(0, targetKcal - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT);
  const carbsG = round5(remainingKcalForCarbs / KCAL_PER_G_CARB);

  const eveningPrep = eveningPrepForNextWorkout(nextImportantWorkout, weight, day);
  const allocation = allocateMeals({ baseCalories: base, meals, workouts: normalized, dailyTargetKcal: targetKcal, eveningPrep });

  return {
    date: day,
    calories: { base: Math.round(base), training: Math.round(trainingKcal), target: targetKcal },
    macros: { carbohydrates: carbsG, proteins: proteinG, fat: fatG },
    workouts: normalized,
    mealTargets: allocation.mealTargets,
    standaloneFueling: allocation.standaloneFueling,
    eveningPrep: eveningPrep ? { ...eveningPrep, shiftedKcalToDinner: allocation.eveningShiftKcal } : null,
  };
}
