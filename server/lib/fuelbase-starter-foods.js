import db from '../db.js';
import { FUELBASE_STARTER_FOODS } from '../../src/lib/fuelbase-starter-foods.js';

const marker = 'FuelBase starter food · 2026-09-01';

function existingForUser(userId, name) {
  return db.prepare(
    `SELECT id FROM foods WHERE user_id = ? AND lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1`
  ).get(userId, name);
}

export function seedFuelBaseStarterFoods(userId) {
  if (!Number.isFinite(Number(userId))) return { inserted: 0, skipped: 0 };
  const insert = db.prepare(`
    INSERT INTO foods (
      user_id, name, brand, nutrition, portion, unit, notes, category,
      visibility, alt_units, favorite, usage_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'private', ?, 0, 0, datetime('now'))
  `);

  let inserted = 0;
  let skipped = 0;
  const tx = db.transaction(() => {
    for (const food of FUELBASE_STARTER_FOODS) {
      if (existingForUser(userId, food.name)) {
        skipped += 1;
        continue;
      }
      const noteParts = [marker, food.status ? `Status: ${food.status}` : null, food.note || null].filter(Boolean);
      insert.run(
        Number(userId),
        food.name,
        food.brand || null,
        JSON.stringify(food.nutrition),
        food.portion,
        food.unit,
        noteParts.join(' · '),
        food.category || null,
        food.altUnits ? JSON.stringify(food.altUnits) : null,
      );
      inserted += 1;
    }
  });
  tx();
  return { inserted, skipped, total: FUELBASE_STARTER_FOODS.length };
}
