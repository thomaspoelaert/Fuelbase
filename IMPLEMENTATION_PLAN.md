# FuelBase Endurance Integration — Implementation Plan

## Goal
Extend the NutriTrace fork into a web-first endurance nutrition tracker with Intervals.icu as the training source of truth, while preserving NutriTrace's mature food diary, foods, meals, recipes, barcode/Open Food Facts workflow, and realistic breakfast/lunch/dinner structure.

## Architecture
- Keep NutriTrace diary/food infrastructure unchanged where possible.
- Add a dedicated Intervals.icu integration layer.
- Add a pure, deterministic endurance nutrition engine separate from UI and persistence.
- Separate daily energy targeting from workout fueling allocation.
- Planned workouts drive forecasts; completed activities replace their paired planned estimate when available.

## Phase 1 — Intervals.icu
1. Add user settings for Intervals API key and enable/disable state.
2. Add server-side proxy endpoints so the API key is not exposed in browser requests.
3. Add persistent storage for planned Intervals events and completed Intervals activities.
4. Sync a configurable date range around today.
5. Normalize sport, start time, duration, distance, load/intensity, calories and kJ/joules.
6. Match completed activities to planned workouts when Intervals pairing data is available; otherwise use conservative same-day matching.

## Phase 2 — Endurance nutrition engine
Pure module inputs:
- date
- base kcal
- body weight
- meal schedule
- planned/completed workouts
- next relevant workout
- fueling settings

Outputs:
- base kcal
- training kcal
- daily kcal target
- daily protein/fat/carbohydrate targets
- per-workout pre/during/post carbohydrate targets
- post-workout protein target
- recovery urgency
- meal-level target ranges

Core rules:
- Daily energy = manually configured base kcal + exercise energy.
- Exercise fueling is timing/allocation, not extra energy on top of exercise energy already added.
- Completed data supersedes planned estimates.
- Bike energy fallback: activity calories -> mechanical kJ approximation -> duration/intensity estimate.
- Run fallback: activity calories -> body mass × distance -> duration/intensity estimate.
- Swim fallback: activity calories -> duration/intensity estimate.
- Fueling depends on sport, duration, intensity and start time.
- Recovery aggressiveness depends on time until the next important workout.

## Phase 3 — Realistic meal allocation
- Preserve Breakfast, Lunch and Dinner as normal meals.
- Allocate a configurable baseline share of base kcal to normal meals before workout overlays.
- Add workout energy preferentially to the pre-workout window, during-workout intake and the first suitable post-workout meal.
- Reuse an existing normal meal as pre/post workout when timing makes sense instead of creating artificial extra meals.
- Use ranges rather than false precision for meal targets.
- Enforce sensible minimum normal-meal floors so training allocation cannot reduce breakfast/lunch/dinner to token meals.
- For an early hard/long workout, allow part of carbohydrate preparation to be allocated to the previous evening without inventing extra daily calories.

## Phase 4 — UI
- Add Endurance mode to Goals/Settings.
- Add Intervals connection/test/sync controls under Connected Services.
- Add a Training & Fueling card to Diary showing workouts, estimated/actual energy and pre/during/post targets.
- Add target-vs-consumed-vs-remaining day summary.
- Show meal target ranges on existing meal cards.
- Keep existing food logging workflow intact.

## Phase 5 — Tests
Cover at minimum:
- rest day
- <60 min easy workout
- 90 min Z2
- 90 min threshold
- 2 h endurance ride
- 4 h long ride
- early-morning workout
- midday workout
- evening workout
- two-a-day
- completed replaces planned
- missing calories
- missing bike kJ
- next workout <8 h / next day / >24 h
- extremely high training day
- realistic meal floors
- during carbs count inside total daily energy
- previous-evening carbohydrate preparation

## Scope guard
Do not rebuild food logging, barcode scanning, recipes, or the whole NutriTrace UI. Do not make AI, wearable TDEE, HRV/sleep adjustment, adaptive expenditure or native mobile apps part of the first endurance release.
