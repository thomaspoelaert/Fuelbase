import { calorieGoalMode } from '../stores/settings.js';
import { currentDate } from '../stores/diary.js';
import {
  endurancePlan,
  endurancePlanDate,
  loadEndurancePlan,
} from '../stores/endurance-plan.js';

let _started = false;
let _mode = 'fixed';
let _date = null;
let _plan = null;
let _planDate = null;
let _observer = null;
let _scheduled = false;

function routePath() {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash || '#/';
  return hash.slice(1).split('?')[0] || '/';
}

function routeIsDiary() {
  const path = routePath();
  return path === '/' || path === '';
}

function routeIsGoals() {
  return routePath() === '/goals';
}

function setAttr(el, name, value) {
  if (!el) return;
  const next = value == null ? null : String(value);
  if (next == null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
    return;
  }
  if (el.getAttribute(name) !== next) el.setAttribute(name, next);
}

function clearMealDecorations() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.meal-group[data-fuelbase-target-label]').forEach(card => {
    for (const name of ['data-fuelbase-target-label','data-fuelbase-workout-overlay','data-fuelbase-timing-label','data-fuelbase-guidance-label','data-fuelbase-priority']) {
      card.removeAttribute(name);
    }
    const mealName = card.querySelector('.meal-name');
    mealName?.removeAttribute('data-fuelbase-target-label');
    mealName?.removeAttribute('data-fuelbase-guidance-label');
    const mealHeader = card.querySelector('.meal-header');
    mealHeader?.removeAttribute('data-fuelbase-timing-label');
  });
}

function clearGoalsDecorations() {
  document.querySelector('.fuelbase-goals-notice')?.remove();
  document.querySelectorAll('.fuelbase-hidden-legacy').forEach(el => el.classList.remove('fuelbase-hidden-legacy'));
}

function formatTime(hour) {
  if (!Number.isFinite(Number(hour))) return '';
  const h = Math.floor(Number(hour));
  const m = Math.round((Number(hour) - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function decorateMeals(plan) {
  if (typeof document === 'undefined' || !plan?.mealTargets?.length) return;

  for (const [idx, target] of plan.mealTargets.entries()) {
    const card = document.getElementById(`meal-${idx}`);
    if (!card) continue;
    const mealName = card.querySelector('.meal-name');
    const mealHeader = card.querySelector('.meal-header');

    const min = Math.round(Number(target.minKcal) || 0);
    const max = Math.round(Number(target.maxKcal) || 0);
    const overlay = Math.round(Number(target.workoutOverlayKcal) || 0);
    const carbs = Math.round(Number(target.guidance?.carbsG) || 0);
    const protein = Math.round(Number(target.guidance?.proteinG) || 0);
    const baseLabel = `${min.toLocaleString()}–${max.toLocaleString()} kcal`;
    const label = overlay > 20 ? `${baseLabel} · +${overlay.toLocaleString()} training` : baseLabel;
    const guidanceLabel = `${carbs}g carbs · ${protein}g protein`;
    const timingLabel = target.timingAdjusted && target.suggestedHour != null
      ? `Recovery meal around ${formatTime(target.suggestedHour)}`
      : null;

    setAttr(card, 'data-fuelbase-target-label', label);
    setAttr(card, 'data-fuelbase-guidance-label', guidanceLabel);
    setAttr(card, 'data-fuelbase-priority', target.guidance?.priority || 'normal');
    setAttr(card, 'data-fuelbase-workout-overlay', overlay > 20 ? 'true' : 'false');
    setAttr(card, 'data-fuelbase-timing-label', timingLabel);
    setAttr(mealName, 'data-fuelbase-target-label', label);
    setAttr(mealName, 'data-fuelbase-guidance-label', guidanceLabel);
    setAttr(mealHeader, 'data-fuelbase-timing-label', timingLabel);
  }
}

function goalLabel(intent) {
  if (intent === 'lose') return 'Lose';
  if (intent === 'gain') return 'Gain';
  return 'Maintain';
}

function decorateLegacyGoals(plan) {
  if (!plan) return;
  const main = document.querySelector('.goals-main');
  if (!main) return;

  // The legacy Goals page only knows Fixed/Dynamic/Adaptive. In Endurance
  // mode its third pill would misleadingly look like Adaptive and its preview
  // would fall back to the old fixed calorie goal. Hide those legacy controls
  // and surface the live FuelBase plan instead; nutrient/water goals remain.
  const modeHeading = [...document.querySelectorAll('.goals-rail-heading')]
    .find(el => /calorie goal mode/i.test(el.textContent || ''));
  modeHeading?.classList.add('fuelbase-hidden-legacy');
  modeHeading?.nextElementSibling?.classList.add('fuelbase-hidden-legacy');

  let notice = document.querySelector('.fuelbase-goals-notice');
  if (!notice) {
    notice = document.createElement('section');
    notice.className = 'fuelbase-goals-notice';
    notice.innerHTML = `
      <div class="fuelbase-goals-notice-icon"><span class="material-symbols-rounded">directions_bike</span></div>
      <div class="fuelbase-goals-notice-copy">
        <span class="fuelbase-goals-kicker">FuelBase Endurance</span>
        <strong class="fuelbase-goals-title"></strong>
        <span class="fuelbase-goals-meta"></span>
      </div>
      <button type="button" class="fuelbase-goals-settings">Settings <span class="material-symbols-rounded">chevron_right</span></button>
    `;
    notice.querySelector('.fuelbase-goals-settings')?.addEventListener('click', () => {
      window.location.hash = '#/settings/goals';
    });
    main.prepend(notice);
  }

  const target = Math.round(Number(plan.calories?.target) || 0);
  const carbs = Math.round(Number(plan.macros?.carbohydrates) || 0);
  const adjustment = Math.round(Number(plan.calories?.goalAdjustment) || 0);
  const intent = plan.goal?.intent || plan.config?.goalIntent || 'maintain';
  const training = Math.round(Number(plan.calories?.training) || 0);
  const title = notice.querySelector('.fuelbase-goals-title');
  const meta = notice.querySelector('.fuelbase-goals-meta');
  if (title) title.textContent = `${target.toLocaleString()} kcal today · ${goalLabel(intent)}`;
  if (meta) {
    const goalPart = adjustment ? ` · ${adjustment > 0 ? '+' : ''}${adjustment} kcal goal` : '';
    meta.textContent = `${carbs} g carbs · +${training.toLocaleString()} kcal training${goalPart} · training fuel protected`;
  }
}

function syncDom() {
  _scheduled = false;
  if (typeof document === 'undefined') return;

  const diaryActive = _mode === 'endurance' && routeIsDiary();
  const goalsActive = _mode === 'endurance' && routeIsGoals();
  document.documentElement.classList.toggle('fuelbase-endurance-active', diaryActive);
  document.documentElement.classList.toggle('fuelbase-goals-endurance', goalsActive);

  if (!diaryActive) clearMealDecorations();
  if (!goalsActive) clearGoalsDecorations();

  const needsPlan = diaryActive || goalsActive;
  if (!needsPlan) {
    document.documentElement.style.removeProperty('--fuelbase-endurance-target');
    return;
  }

  if (_date && _planDate !== _date) loadEndurancePlan(_date);
  if (!_plan || _planDate !== _date) return;

  const target = Math.round(Number(_plan.calories?.target) || 0);
  if (target > 0) document.documentElement.style.setProperty('--fuelbase-endurance-target', String(target));
  if (diaryActive) decorateMeals(_plan);
  if (goalsActive) decorateLegacyGoals(_plan);
}

function scheduleSync() {
  if (_scheduled || typeof window === 'undefined') return;
  _scheduled = true;
  requestAnimationFrame(syncDom);
}

export function initEnduranceUiBridge() {
  if (_started || typeof window === 'undefined' || typeof document === 'undefined') return;
  _started = true;

  calorieGoalMode.subscribe(value => {
    _mode = value;
    scheduleSync();
  });
  currentDate.subscribe(value => {
    _date = value;
    if (_mode === 'endurance' && (routeIsDiary() || routeIsGoals()) && value) loadEndurancePlan(value);
    scheduleSync();
  });
  endurancePlan.subscribe(value => {
    _plan = value;
    scheduleSync();
  });
  endurancePlanDate.subscribe(value => {
    _planDate = value;
    scheduleSync();
  });

  window.addEventListener('hashchange', scheduleSync);

  _observer = new MutationObserver(mutations => {
    if (_mode !== 'endurance' || !(routeIsDiary() || routeIsGoals())) return;
    if (!mutations.some(m => m.addedNodes?.length || m.removedNodes?.length)) return;
    scheduleSync();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

  scheduleSync();
}
