import { test, expect, devices } from '@playwright/test';
import fs from 'node:fs/promises';

const BASE_URL = 'http://127.0.0.1:3001';
const USERNAME = 'visualqa';
const PASSWORD = 'FuelBaseVisualQA-2026!';

const settingsMock = {
  calorieGoalMode: 'endurance',
  mealNames: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
  diaryShowNutritionBar: true,
  diaryShowMacroSummary: true,
  diaryRailShowSummary: true,
  diaryRailShowWater: true,
  diaryRailShowBodyStats: true,
  diaryRailShowActivity: true,
  diaryRailShowNotes: true,
  language: 'en',
  accentColor: 'mint',
};

function planFor(date) {
  return {
    date,
    calories: { base: 2400, training: 1050, target: 3450 },
    macros: { carbohydrates: 480, proteins: 145, fat: 70 },
    workouts: [
      {
        source: 'intervals',
        sourceId: 'qa-ride',
        eventId: 42,
        planned: true,
        completed: false,
        date,
        startTime: `${date}T18:00:00`,
        sport: 'Ride',
        name: 'Z2 Endurance Ride',
        durationMin: 120,
        energyKcal: 1050,
        energySource: 'bike_kj',
        fueling: {
          preCarbs: 60,
          duringRate: 60,
          duringCarbs: 120,
          duringRateSource: 'default',
          postCarbs: 70,
          postProtein: 30,
          recoveryUrgency: 'priority',
        },
      },
    ],
    mealTargets: [
      { key: 'meal_0', label: 'Breakfast', centerKcal: 600, minKcal: 525, maxKcal: 675, workoutOverlayKcal: 0, timingAdjusted: false, suggestedHour: null },
      { key: 'meal_1', label: 'Lunch', centerKcal: 720, minKcal: 635, maxKcal: 805, workoutOverlayKcal: 0, timingAdjusted: false, suggestedHour: null },
      { key: 'meal_2', label: 'Dinner', centerKcal: 1220, minKcal: 1075, maxKcal: 1365, workoutOverlayKcal: 500, timingAdjusted: true, suggestedHour: 20.5 },
      { key: 'meal_3', label: 'Snacks', centerKcal: 910, minKcal: 800, maxKcal: 1020, workoutOverlayKcal: 550, timingAdjusted: false, suggestedHour: null },
    ],
    standaloneFueling: [
      { workoutId: 'qa-ride', type: 'during', kcal: 480, carbs: 120, label: 'During workout' },
    ],
    eveningPrep: null,
    nextImportantWorkout: null,
    config: { baseCalories: 2400, bodyWeightKg: 80, proteinGPerKg: 1.8, fatGPerKg: 0.9 },
  };
}

async function installMocks(page) {
  await page.route('**/api/settings', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settingsMock) });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/intervals/plan**', async route => {
    const url = new URL(route.request().url());
    const date = url.searchParams.get('date') || '2026-09-01';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(planFor(date)) });
  });

  await page.route('**/api/v1/intervals/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: true, config: { baseCalories: 2400, bodyWeightKg: 80, proteinGPerKg: 1.8, fatGPerKg: 0.9 } }),
    });
  });

  await page.route('**/api/v1/intervals/config', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, baseCalories: 2400, bodyWeightKg: 80, proteinGPerKg: 1.8, fatGPerKg: 0.9 }),
      });
    } else {
      await route.continue();
    }
  });
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page.locator('.login-title')).toHaveText('FuelBase');
  await page.locator('input[autocomplete="username"]').fill(USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.locator('button.btn-primary').click();
  await page.waitForURL(/#\/$/, { timeout: 15000 });
  await expect(page.locator('html')).toHaveClass(/fuelbase-endurance-active/);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(overflow.innerWidth + 2);
}

async function screenshot(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: `visual-qa/${name}.png`, fullPage, animations: 'disabled' });
}

test('FuelBase visual QA — desktop and iPhone', async ({ browser }) => {
  await fs.mkdir('visual-qa', { recursive: true });
  const notes = [];

  // Desktop first.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const d = await desktop.newPage();
  const desktopErrors = [];
  d.on('pageerror', e => desktopErrors.push(String(e)));
  await installMocks(d);

  await d.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(d.locator('.login-title')).toHaveText('FuelBase');
  await screenshot(d, '01-login-desktop', { fullPage: false });

  await d.locator('input[autocomplete="username"]').fill(USERNAME);
  await d.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await d.locator('button.btn-primary').click();
  await d.waitForURL(/#\/$/, { timeout: 15000 });
  await expect(d.locator('html')).toHaveClass(/fuelbase-endurance-active/);
  await expect(d.locator('.meal-group[data-fuelbase-target-label]')).toHaveCount(4);
  await expect(d.locator('#meal-2')).toHaveAttribute('data-fuelbase-workout-overlay', 'true');
  await assertNoHorizontalOverflow(d, 'desktop diary');
  await screenshot(d, '02-diary-desktop');

  await d.goto(`${BASE_URL}/#/goals`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(d, 'desktop goals');
  await screenshot(d, '03-goals-desktop');

  await d.goto(`${BASE_URL}/#/foods`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(d, 'desktop foods');
  await screenshot(d, '04-foods-desktop');

  await d.goto(`${BASE_URL}/#/settings`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(d, 'desktop settings');
  await screenshot(d, '05-settings-desktop');

  notes.push(`desktop page errors: ${desktopErrors.length}`);
  if (desktopErrors.length) notes.push(...desktopErrors.map(e => `desktop error: ${e}`));
  await desktop.close();

  // iPhone-sized PWA viewport. Use CSS viewport dimensions close to current
  // non-Max iPhones while keeping DPR=1 so screenshot artifacts remain compact.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
  const m = await mobile.newPage();
  const mobileErrors = [];
  m.on('pageerror', e => mobileErrors.push(String(e)));
  await installMocks(m);
  await login(m);

  await expect(m.locator('.emb')).toBeVisible();
  await expect(m.locator('.diary-bottom-bar')).toBeHidden();
  await assertNoHorizontalOverflow(m, 'mobile diary collapsed');
  await screenshot(m, '06-diary-iphone-collapsed', { fullPage: false });

  await m.locator('.emb-summary').click();
  await expect(m.locator('.emb')).toHaveClass(/expanded/);
  await assertNoHorizontalOverflow(m, 'mobile diary expanded');
  await screenshot(m, '07-diary-iphone-expanded', { fullPage: false });

  await m.goto(`${BASE_URL}/#/goals`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(m, 'mobile goals');
  await screenshot(m, '08-goals-iphone');

  await m.goto(`${BASE_URL}/#/foods`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(m, 'mobile foods');
  await screenshot(m, '09-foods-iphone', { fullPage: false });

  await m.goto(`${BASE_URL}/#/settings`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(m, 'mobile settings');
  await screenshot(m, '10-settings-iphone', { fullPage: false });

  notes.push(`mobile page errors: ${mobileErrors.length}`);
  if (mobileErrors.length) notes.push(...mobileErrors.map(e => `mobile error: ${e}`));
  await mobile.close();

  await fs.writeFile('visual-qa/qa-notes.txt', `${notes.join('\n')}\n`, 'utf8');
});
