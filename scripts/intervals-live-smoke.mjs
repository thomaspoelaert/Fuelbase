import { listActivities, listEvents, reconcilePlannedAndCompleted } from '../server/lib/intervals.js';
import { calculateEnduranceDay } from '../src/lib/endurance-nutrition.js';

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

function dateInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDays(date, amount) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function safeWorkoutSummary(workout) {
  return {
    date: workout.date,
    sport: workout.sport,
    name: workout.name,
    durationMin: workout.durationMin,
    completed: !!workout.completed,
    replacesPlannedEventId: workout.replacesPlannedEventId ?? null,
    energyKcal: workout.energyKcal ?? null,
    joules: workout.joules ?? null,
    carbsPerHour: workout.carbsPerHour ?? null,
  };
}

async function main() {
  const apiKey = String(process.env.INTERVALS_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('INTERVALS_API_KEY is required. Pass it as an environment variable; never commit it.');
  }

  const timeZone = process.env.SMOKE_TIME_ZONE || 'Europe/Brussels';
  const date = process.env.SMOKE_DATE || dateInZone(timeZone);
  const oldest = process.env.SMOKE_OLDEST || date;
  const newest = process.env.SMOKE_NEWEST || addDays(date, 1);
  const baseCalories = envNumber('FUELBASE_BASE_CALORIES', 2400);
  const bodyWeightKg = envNumber('FUELBASE_BODY_WEIGHT_KG', 75);
  const requireWorkouts = process.env.SMOKE_REQUIRE_WORKOUTS === '1';

  const [events, activities] = await Promise.all([
    listEvents(apiKey, oldest, newest),
    listActivities(apiKey, oldest, newest),
  ]);

  if (!Array.isArray(events)) throw new Error('Intervals events response is not an array');
  if (!Array.isArray(activities)) throw new Error('Intervals activities response is not an array');

  const reconciled = reconcilePlannedAndCompleted(events, activities);
  const selectedDay = reconciled.filter(workout => workout.date === date);
  if (requireWorkouts && selectedDay.length === 0) {
    throw new Error(`No planned or completed workouts found on ${date}`);
  }

  const remainingPlannedIds = new Set(
    selectedDay
      .filter(workout => workout.planned)
      .map(workout => String(workout.eventId)),
  );
  for (const workout of selectedDay) {
    if (workout.completed && workout.replacesPlannedEventId != null) {
      if (remainingPlannedIds.has(String(workout.replacesPlannedEventId))) {
        throw new Error(`Planned event ${workout.replacesPlannedEventId} was not replaced by its completed activity`);
      }
    }
  }

  const nextImportantWorkout = reconciled.find(workout => workout.date > date) || null;
  const plan = calculateEnduranceDay({
    baseCalories,
    bodyWeightKg,
    workouts: selectedDay,
    nextImportantWorkout,
    date,
  });

  if (!Number.isFinite(plan.calories?.target) || plan.calories.target < baseCalories) {
    throw new Error('Nutrition engine returned an invalid daily calorie target');
  }
  if (!Array.isArray(plan.workouts) || plan.workouts.length !== selectedDay.length) {
    throw new Error('Nutrition engine workout count does not match reconciled Intervals data');
  }
  for (const workout of plan.workouts) {
    if (!Number.isFinite(workout.energyKcal) || workout.energyKcal < 0) {
      throw new Error(`Invalid energy estimate for ${workout.name || workout.sport || 'workout'}`);
    }
    if (!workout.fueling || !Number.isFinite(Number(workout.fueling.duringRate))) {
      throw new Error(`Missing fueling prescription for ${workout.name || workout.sport || 'workout'}`);
    }
  }

  const output = {
    ok: true,
    range: { oldest, newest, selectedDate: date, timeZone },
    source: {
      events: events.length,
      activities: activities.length,
      reconciled: reconciled.length,
      selectedDayWorkouts: selectedDay.length,
    },
    plan: {
      baseCalories: plan.calories.base,
      trainingCalories: plan.calories.training,
      targetCalories: plan.calories.target,
      macros: plan.macros,
      mealTargets: plan.mealTargets.length,
      standaloneFuelingItems: plan.standaloneFueling.length,
      eveningPrep: !!plan.eveningPrep,
    },
    workouts: plan.workouts.map(safeWorkoutSummary),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  const detail = {
    ok: false,
    error: error?.message || String(error),
    status: error?.status ?? null,
    retryAfter: error?.retryAfter ?? null,
  };
  console.error(JSON.stringify(detail, null, 2));
  process.exitCode = 1;
});
