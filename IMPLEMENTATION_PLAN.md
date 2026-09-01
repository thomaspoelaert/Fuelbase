# FuelBase Endurance Integration — Implementation Plan

## Goal
Extend the NutriTrace fork into a web-first endurance nutrition tracker with Intervals.icu as the training source of truth, while preserving NutriTrace's mature food diary, foods, meals, recipes, barcode/Open Food Facts workflow, and realistic breakfast/lunch/dinner structure.

## Architecture
- Keep NutriTrace diary/food infrastructure unchanged where possible.
- Add a dedicated Intervals.icu integration layer.
- Add a pure, deterministic endurance nutrition engine separate from UI and persistence.
- Separate daily energy targeting from workout fueling allocation.
- Planned workouts drive forecasts; completed activities replace their paired planned estimate when available.
- Keep FuelBase-specific visual/product changes in a dedicated modern UI layer wherever possible so upstream NutriTrace merges remain reviewable.

## Phase 1 — Intervals.icu
Status: substantially implemented.

1. Store the Intervals API key encrypted at rest.
2. Expose connection, test, disconnect and config endpoints through the existing server.
3. Read planned events and completed activities by date range.
4. Normalize sport, start time, duration, distance, load/intensity, calories and work/kJ.
5. Reconcile completed activities against planned workouts using `paired_event_id`, with a conservative time-aware same-day fallback.
6. Never count a matched planned workout and completed activity together.
7. Prefer measured cycling work/kJ over ambiguous generic wearable calorie fields when available.

Future consideration after real-use testing: persist/cache Intervals responses if network latency or API limits justify it. Do not add storage complexity pre-emptively.

## Phase 2 — Endurance nutrition engine
Status: implemented core; fueling defaults still need one final calibration pass.

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
- standalone pre/during/post fuel when no normal meal fits the timing window
- previous-evening carbohydrate preparation for an early important next-day session

Core rules:
- Daily energy = manually configured base kcal + exercise energy.
- Exercise fueling is timing/allocation, not extra energy on top of exercise energy already added.
- Completed data supersedes planned estimates.
- Bike energy fallback: measured mechanical work/kJ -> activity calories -> duration/intensity estimate.
- Run fallback: activity calories -> body mass × distance -> duration/intensity estimate.
- Swim fallback: activity calories -> duration/intensity estimate.
- Fueling depends on sport, duration, intensity and start time.
- Recovery aggressiveness depends on time until the next important workout.
- Previous-evening carbohydrate preparation redistributes existing daily energy; it must not invent extra calories.

Next engine calibration:
- honour an explicit per-workout carbohydrate-rate override from Intervals.icu when present;
- move default steady endurance fueling toward ~60 g/h for 90–150 min and ~90 g/h for long rides, while keeping short/easy and swim logic conservative;
- keep hard-session rates intensity-aware instead of blindly using one universal number.

## Phase 3 — Realistic meal allocation
Status: core implemented.

- Preserve Breakfast, Lunch and Dinner as normal meals.
- Allocate a baseline share of base kcal to normal meals before workout overlays.
- Add workout energy preferentially to the pre-workout window, during-workout intake and the first suitable post-workout meal.
- Reuse an existing normal meal as pre/post workout when timing makes sense instead of creating artificial extra meals.
- Use ranges rather than false precision for meal targets.
- Enforce sensible minimum normal-meal floors so training allocation cannot reduce breakfast/lunch/dinner to token meals.
- Late sessions can shift the dinner timing target instead of inventing a separate recovery meal.
- Early next-day quality/long sessions can shift carbohydrate emphasis toward the previous evening without changing total daily calories.

Still to add after the next Diary integration pass:
- show the calculated target range directly on each corresponding meal card, not only in the Training & Fueling dashboard.

## Phase 4 — UI
Status: major first pass implemented.

### Endurance product UI
- Endurance is a first-class goal mode in Settings → Goals.
- Goals now uses strategy cards instead of a crowded four-way segmented control.
- Endurance setup has a dedicated Intervals source card and Daily Foundation card.
- Desktop Diary right rail has a Training & Fueling dashboard with energy composition, planned/actual workout status, pre/during/recovery flow, evening prep and meal ranges.
- Mobile/bottom-nav Diary gets a dedicated expandable Endurance bar showing the true Intervals-derived target, consumed/remaining kcal, carbohydrate progress and workout fueling.

### Full FuelBase visual modernization
- Added `src/styles/modern.css` as the FuelBase product layer above upstream NutriTrace primitives.
- Modernized typography hierarchy, spacing, radii, surfaces, shadows, headers, cards, forms and buttons.
- Reduced decorative gradients/glow; accent colour is primarily an interaction/status colour.
- Reworked mobile navigation into a floating dock.
- Rebranded browser/PWA/sidebar/offline surfaces as FuelBase.
- Modernized shared Tabs, Sheet, Dialog, ActionSheet and Toast components.
- Settings rows, segmented controls, search, navigation rail and Diary meal cards inherit the new design system globally.

Still to complete:
- wire the Intervals-derived Endurance target into the legacy Diary calorie calculations themselves, not only the desktop and mobile FuelBase surfaces;
- show meal target ranges on the meal cards;
- visual QA at narrow phone, tablet, 1280px rail breakpoint and wide desktop once a frontend build/runtime is available.

## Phase 5 — Tests and validation
Engine/reconciliation tests cover or should cover at minimum:
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
- fallback matching refuses implausible time gaps
- missing calories
- missing bike kJ
- measured bike kJ preferred when available
- next workout <8 h / next day / >24 h
- extremely high training day
- realistic meal floors
- during carbs count inside total daily energy
- previous-evening carbohydrate preparation

Repository validation:
- CI definition includes i18n check, Node tests and `npm run build`.
- GitHub Actions have not executed in this fork yet.
- The current execution environment does not contain the Svelte compiler and has no external npm/network access, so the modernized frontend still requires a real `npm ci && npm run build` before merge.
- Keep PR #1 draft until that full build and a visual regression pass are green.

## Scope guard
Do not rebuild food logging, barcode scanning, recipes, or the whole NutriTrace data model. Do not make AI, wearable TDEE, HRV/sleep adjustment, adaptive expenditure or native-mobile-specific functionality part of the first FuelBase endurance release. UI modernization should reuse the mature flows rather than replacing their business logic.
