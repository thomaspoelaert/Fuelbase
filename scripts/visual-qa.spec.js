import { test, expect } from '@playwright/test';
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

function addDays(date, amount) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function planFor(date) {
  const tomorrow = addDays(date, 1);
  const dayAfter = addDays(date, 2);
  return {
    date,
    calories: { base: 2400, goalAdjustment: 0, foundation: 2400, training: 1050, target: 3450 },
    goal: { intent: 'maintain', label: 'Maintain', adjustmentKcal: 0, description: 'Match everyday needs plus the full cost of training.', trainingFuelProtected: true },
    macros: { carbohydrates: 480, proteins: 145, fat: 70 },
    carbPeriodization: { gramsPerKg: 6, level: 'high' },
    workouts: [
      {
        source: 'intervals', sourceId: 'qa-ride', eventId: 42, planned: true, completed: false,
        date, startTime: `${date}T18:00:00`, sport: 'Ride', name: 'Z2 Endurance Ride',
        durationMin: 120, energyKcal: 1050, energySource: 'bike_kj',
        fueling: { preCarbs: 60, duringRate: 60, duringCarbs: 120, duringRateSource: 'default', postCarbs: 70, postProtein: 30, recoveryUrgency: 'priority' },
      },
    ],
    mealTargets: [
      { key:'meal_0', label:'Breakfast', centerKcal:600, minKcal:525, maxKcal:675, workoutOverlayKcal:0, timingAdjusted:false, suggestedHour:null, guidance:{ carbsG:80, proteinG:35, priority:'normal', note:'Normal meal.' } },
      { key:'meal_1', label:'Lunch', centerKcal:720, minKcal:635, maxKcal:805, workoutOverlayKcal:0, timingAdjusted:false, suggestedHour:null, guidance:{ carbsG:95, proteinG:40, priority:'normal', note:'Normal meal.' } },
      { key:'meal_2', label:'Dinner', centerKcal:1220, minKcal:1075, maxKcal:1365, workoutOverlayKcal:500, timingAdjusted:true, suggestedHour:20.5, guidance:{ carbsG:125, proteinG:40, priority:'recovery', note:'Recovery meal.' } },
      { key:'meal_3', label:'Snacks', centerKcal:910, minKcal:800, maxKcal:1020, workoutOverlayKcal:550, timingAdjusted:false, suggestedHour:null, guidance:{ carbsG:60, proteinG:30, priority:'training-support', note:'Training-support meal.' } },
    ],
    standaloneFueling: [{ workoutId:'qa-ride', type:'during', kcal:480, carbs:120, label:'During workout' }],
    eveningPrep: null,
    nextImportantWorkout: null,
    forward48h: [
      { date:tomorrow, targetKcal:3900, baseKcal:2400, goalAdjustmentKcal:0, trainingKcal:1500, carbsG:590, carbLevel:'high', goalIntent:'maintain', eveningPrep:null, workouts:[{ name:'Long Endurance Ride', sport:'Ride', startTime:`${tomorrow}T08:00:00`, durationMin:240, energyKcal:1500, preCarbs:100, duringRate:90, postCarbs:70 }] },
      { date:dayAfter, targetKcal:3000, baseKcal:2400, goalAdjustmentKcal:0, trainingKcal:600, carbsG:365, carbLevel:'moderate', goalIntent:'maintain', eveningPrep:null, workouts:[{ name:'Easy Run', sport:'Run', startTime:`${dayAfter}T07:00:00`, durationMin:60, energyKcal:600, preCarbs:60, duringRate:30, postCarbs:55 }] },
    ],
    config: { baseCalories:2400, bodyWeightKg:80, proteinGPerKg:1.8, fatGPerKg:0.9, goalIntent:'maintain' },
  };
}

async function installMocks(page) {
  let enduranceConfig = {
    connected: true,
    baseCalories: 2400,
    bodyWeightKg: 80,
    proteinGPerKg: 1.8,
    fatGPerKg: 0.9,
    goalIntent: 'maintain',
  };

  await page.route('**/api/settings', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(settingsMock) });
    else await route.continue();
  });

  await page.route('**/api/v1/intervals/plan**', async route => {
    const url = new URL(route.request().url());
    const date = url.searchParams.get('date') || '2026-09-01';
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(planFor(date)) });
  });

  await page.route('**/api/v1/intervals/status', async route => {
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ connected:true, config:enduranceConfig }) });
  });

  await page.route('**/api/v1/intervals/config', async route => {
    if (route.request().method() !== 'GET') {
      let patch = {};
      try { patch = JSON.parse(route.request().postData() || '{}'); } catch {}
      enduranceConfig = { ...enduranceConfig, ...patch, connected:true };
    }
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(enduranceConfig) });
  });
}

async function settle(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.children.length > 0, null, { timeout:15000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(300);
}

async function navigate(page, url) {
  await page.goto(url, { waitUntil:'domcontentloaded', timeout:15000 });
  await settle(page);
}

async function login(page) {
  await navigate(page, BASE_URL);
  await expect(page.locator('.login-title')).toHaveText('FuelBase');
  await page.locator('input[autocomplete="username"]').fill(USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.locator('button.btn-primary').click();
  await page.waitForURL(/#\/$/, { timeout:15000 });
  await expect(page.locator('html')).toHaveClass(/fuelbase-endurance-active/);
  await settle(page);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({ innerWidth:window.innerWidth, scrollWidth:document.documentElement.scrollWidth }));
  expect(overflow.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(overflow.innerWidth + 2);
}

async function screenshot(page, name, { fullPage = true } = {}) {
  await settle(page);
  await page.screenshot({ path:`visual-qa/${name}.png`, fullPage, animations:'disabled' });
}

async function assertEnduranceSettings(page, label) {
  await expect(page.locator('.goal-mode-card.active')).toContainText('Endurance');
  await expect(page.locator('.endurance-card')).toHaveCount(2);
  await expect(page.locator('.connection-pill')).toContainText('Connected');
  await expect(page.locator('.endurance-formula')).toContainText('2,400 kcal');
  await expect(page.locator('.fuelbase-settings-goal-intent')).toBeVisible();
  await expect(page.locator('.fuelbase-intent-option')).toHaveCount(3);
  await expect(page.locator('.fuelbase-intent-option.active')).toContainText(/Maintain|Lose|Gain/);
  await assertNoHorizontalOverflow(page, label);
}

async function assertGoalIntentPersistence(page) {
  const selector = page.locator('.fuelbase-settings-goal-intent');
  await expect(selector).toBeVisible();
  await expect(selector.locator('.fuelbase-intent-option.active')).toContainText('Maintain');
  await selector.locator('[data-intent="lose"]').click();
  await expect(selector.locator('.fuelbase-intent-option.active')).toContainText('Lose');
  await expect(selector.locator('.fuelbase-intent-summary')).toContainText('−250 kcal/day');

  await navigate(page, `${BASE_URL}/#/settings`);
  await navigate(page, `${BASE_URL}/#/settings/goals`);
  const reloaded = page.locator('.fuelbase-settings-goal-intent');
  await expect(reloaded.locator('.fuelbase-intent-option.active')).toContainText('Lose');

  // Restore the neutral default after proving round-trip persistence so the
  // screenshots remain easy to compare with the mocked Diary plan.
  await reloaded.locator('[data-intent="maintain"]').click();
  await expect(reloaded.locator('.fuelbase-intent-option.active')).toContainText('Maintain');
}

async function assertNewFuelBaseDiary(page, mobile = false) {
  await expect(page.locator('.meal-group[data-fuelbase-target-label]')).toHaveCount(4);
  await expect(page.locator('#meal-2')).toHaveAttribute('data-fuelbase-workout-overlay', 'true');
  await expect(page.locator('#meal-2')).toHaveAttribute('data-fuelbase-guidance-label', /carbs.*protein/);
  if (mobile) {
    await expect(page.locator('.emb')).toBeVisible();
  } else {
    await expect(page.locator('.goal-intent')).toBeVisible();
    await expect(page.locator('.outlook')).toBeVisible();
    await expect(page.locator('.energy-band')).toContainText('Foundation');
  }
}

test('FuelBase visual QA — desktop and iPhone', async ({ browser }) => {
  test.setTimeout(120000);
  await fs.mkdir('visual-qa', { recursive:true });
  const notes = [];

  const desktop = await browser.newContext({ viewport:{ width:1440, height:1000 }, colorScheme:'light' });
  const d = await desktop.newPage();
  const desktopErrors = [];
  d.on('pageerror', e => desktopErrors.push(String(e)));
  await installMocks(d);

  await navigate(d, BASE_URL);
  await expect(d.locator('.login-title')).toHaveText('FuelBase');
  await screenshot(d, '01-login-desktop', { fullPage:false });

  await d.locator('input[autocomplete="username"]').fill(USERNAME);
  await d.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await d.locator('button.btn-primary').click();
  await d.waitForURL(/#\/$/, { timeout:15000 });
  await expect(d.locator('html')).toHaveClass(/fuelbase-endurance-active/);
  await assertNewFuelBaseDiary(d, false);
  await assertNoHorizontalOverflow(d, 'desktop diary');
  await screenshot(d, '02-diary-desktop');

  await navigate(d, `${BASE_URL}/#/goals`);
  await expect(d.locator('.fuelbase-goals-notice')).toBeVisible();
  await expect(d.locator('.fuelbase-goals-notice')).toContainText('3,450 kcal today');
  await expect(d.locator('.fuelbase-goals-notice')).toContainText('Maintain');
  await assertNoHorizontalOverflow(d, 'desktop goals');
  await screenshot(d, '03-goals-desktop');

  await navigate(d, `${BASE_URL}/#/foods`);
  await expect(d.getByText('Jumbo Skyr IJslandse Stijl Vanille', { exact:false }).first()).toBeVisible();
  await expect(d.getByText('Intra-workout koolhydraten', { exact:false }).first()).toBeVisible();
  await assertNoHorizontalOverflow(d, 'desktop foods');
  await screenshot(d, '04-foods-desktop');

  await navigate(d, `${BASE_URL}/#/settings`);
  await assertNoHorizontalOverflow(d, 'desktop settings');
  await screenshot(d, '05-settings-desktop');

  await navigate(d, `${BASE_URL}/#/settings/goals`);
  await assertEnduranceSettings(d, 'desktop endurance settings');
  await assertGoalIntentPersistence(d);
  await screenshot(d, '06-endurance-settings-desktop');

  notes.push(`desktop page errors: ${desktopErrors.length}`);
  if (desktopErrors.length) notes.push(...desktopErrors.map(e => `desktop error: ${e}`));
  await desktop.close();

  const mobile = await browser.newContext({ viewport:{ width:390, height:844 }, colorScheme:'light', isMobile:true, hasTouch:true });
  const m = await mobile.newPage();
  const mobileErrors = [];
  m.on('pageerror', e => mobileErrors.push(String(e)));
  await installMocks(m);
  await login(m);

  await assertNewFuelBaseDiary(m, true);
  await expect(m.locator('.diary-bottom-bar')).toBeHidden();
  await assertNoHorizontalOverflow(m, 'mobile diary collapsed');
  await screenshot(m, '07-diary-iphone-collapsed', { fullPage:false });

  await m.locator('.emb-summary').click();
  await expect(m.locator('.emb')).toHaveClass(/expanded/);
  await expect(m.locator('.emb-forward')).toBeVisible();
  await expect(m.locator('.emb-detail')).toContainText('Maintain');
  await assertNoHorizontalOverflow(m, 'mobile diary expanded');
  await screenshot(m, '08-diary-iphone-expanded', { fullPage:false });

  await navigate(m, `${BASE_URL}/#/goals`);
  await expect(m.locator('.fuelbase-goals-notice')).toBeVisible();
  await expect(m.locator('.fuelbase-goals-notice')).toContainText('3,450 kcal today');
  await assertNoHorizontalOverflow(m, 'mobile goals');
  await screenshot(m, '09-goals-iphone');

  await navigate(m, `${BASE_URL}/#/foods`);
  await expect(m.getByText('Jumbo Skyr IJslandse Stijl Vanille', { exact:false }).first()).toBeVisible();
  await expect(m.getByText('Intra-workout koolhydraten', { exact:false }).first()).toBeVisible();
  await assertNoHorizontalOverflow(m, 'mobile foods');
  await screenshot(m, '10-foods-iphone', { fullPage:false });

  await navigate(m, `${BASE_URL}/#/settings`);
  await assertNoHorizontalOverflow(m, 'mobile settings');
  await screenshot(m, '11-settings-iphone', { fullPage:false });

  await navigate(m, `${BASE_URL}/#/settings/goals`);
  await assertEnduranceSettings(m, 'mobile endurance settings');
  await screenshot(m, '12-endurance-settings-iphone');

  notes.push(`mobile page errors: ${mobileErrors.length}`);
  if (mobileErrors.length) notes.push(...mobileErrors.map(e => `mobile error: ${e}`));
  await mobile.close();

  await fs.writeFile('visual-qa/qa-notes.txt', `${notes.join('\n')}\n`, 'utf8');
});
