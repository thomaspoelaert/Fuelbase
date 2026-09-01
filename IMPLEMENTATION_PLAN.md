# FuelBase Endurance Layer — Implementation Plan

## Goal

Build a focused endurance-nutrition layer on top of NutriTrace instead of creating another food tracker. Existing food, meal, recipe, barcode, diary and SQLite infrastructure remains the foundation.

Core flow:

`Base kcal -> Intervals planned/completed -> exercise energy -> daily kcal/macros -> pre/during/recovery -> realistic meal allocation -> existing food logging`

## Implemented

### Deterministic nutrition engine

- Daily target = manual base calories + exercise energy.
- Exercise energy fallbacks for bike/run/swim/general workouts.
- Cycling with measured mechanical work prefers kJ as the exercise-energy anchor.
- Protein and fat floors use configurable g/kg; carbohydrate absorbs most training variation.
- Pre/during/post targets depend on sport, duration and intensity.
- Recovery urgency depends on the next important workout.
- Early next-day quality/long sessions shift carbohydrate emphasis into the prior evening without adding energy.

### Fueling calibration

- Explicit Intervals `carbs_per_hour` is authoritative when present.
- Paired completed activities inherit the planned carb target when the completed activity does not contain its own target.
- Bike defaults are performance-forward: ~2 h endurance = 60 g/h; long rides = 90 g/h.
- Run defaults are intentionally somewhat lower than bike defaults.
- During-workout carbs remain part of total daily energy, never extra on top.

### Training-centric energy allocation

- Each workout's added energy is allocated in order: during -> pre -> recovery -> nearest normal meals.
- Remaining workout energy is biased toward the post/recovery meal and nearby pre-workout meal instead of being spread arbitrarily across the day.
- Base meal energy remains intact so breakfast/lunch/dinner stay realistic.
- Existing normal meals can serve as pre/recovery meals; unnecessary artificial meal slots are avoided.
- Meal targets are ranges, not pseudo-precise fixed kcal values.

### Intervals.icu

- Encrypted API-key storage.
- Connection/test/disconnect endpoints.
- Planned workout + completed activity retrieval.
- Completed activities replace paired planned estimates; never double-count.
- Conservative time/sport fallback pairing when Intervals pairing is absent.
- `/api/v1/intervals/plan` produces one full FuelBase day plan.
- User-configured diary meal names are read server-side so plan meal targets line up with rendered meal slots.

### Diary integration

- One shared endurance-plan store drives all FuelBase Diary surfaces.
- Desktop Day Summary uses the Intervals-derived calorie/macro target.
- Mobile Endurance bar shows target, remaining kcal, carb progress and workout fueling.
- Legacy NutriTrace bottom calorie bar is hidden in Endurance mode so contradictory fixed/adaptive goals cannot appear.
- Breakfast/Lunch/Dinner/etc. meal cards show the engine's kcal target range and the amount of workout-energy overlay.
- Recovery meal timing can be surfaced directly on the relevant meal card.

### UI/product layer

- FuelBase branding for browser/PWA/sidebar/offline surfaces.
- Modernized global design system, navigation, Goals, tabs, dialogs, sheets, action sheets and toasts.
- Modern Training & Fueling cards for desktop and mobile.
- iOS Home Screen/PWA metadata for standalone operation.

### Personal web hosting

- `npm run host:build`: i18n check + tests + production build + server dependencies + frontend bundle copy.
- `npm run host:start`: runs the complete same-origin Node web app without Docker.
- Optional `FUELBASE_USERNAME` / `FUELBASE_PASSWORD` secret-based account bootstrap creates the sole account before the public server starts.
- Persistent SQLite and uploads paths can be mapped to a hosting volume with `DB_PATH` and `UPLOADS_PATH`.
- Hosting instructions live in `docs/FUELBASE_HOSTING.md`.

## Validation matrix

The automated suite should cover at minimum:

1. rest day;
2. short easy workout;
3. 90 min endurance;
4. 90 min quality;
5. 2 h endurance bike at 60 g/h default;
6. 4 h long ride at 90 g/h default;
7. explicit Intervals carb-rate override;
8. completed activity inheriting planned carb-rate target;
9. morning workout;
10. evening workout with energy concentrated around pre/recovery;
11. two sessions/day;
12. completed replacing planned/no double-counting;
13. missing calories;
14. missing joules;
15. next important workout <8 h;
16. next workout tomorrow morning;
17. normal meals retaining realistic floors;
18. intra-workout fueling remaining inside daily total;
19. custom diary meal-slot alignment;
20. production frontend build.

## Remaining before merge

- Execute the latest full test suite and `npm run build` in an environment with dependencies available.
- Perform browser + iPhone visual regression on the real production build.
- Test the Intervals integration against real planned/completed data and confirm field shapes, particularly workout `carbs_per_hour`.
- Decide after real-use testing whether Intervals response caching/persistence is worth adding.

Do not merge the draft PR until the production build and primary mobile/desktop flows are verified.
