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

function routeIsDiary() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '#/';
  const path = hash.slice(1).split('?')[0] || '/';
  return path === '/' || path === '';
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
    card.removeAttribute('data-fuelbase-target-label');
    card.removeAttribute('data-fuelbase-workout-overlay');
    card.removeAttribute('data-fuelbase-timing-label');
    card.querySelector('.meal-name')?.removeAttribute('data-fuelbase-target-label');
    card.querySelector('.meal-header')?.removeAttribute('data-fuelbase-timing-label');
  });
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
    const baseLabel = `${min.toLocaleString()}–${max.toLocaleString()} kcal`;
    const label = overlay > 20 ? `${baseLabel} · +${overlay.toLocaleString()} training` : baseLabel;
    const timingLabel = target.timingAdjusted && target.suggestedHour != null
      ? `Recovery meal around ${formatTime(target.suggestedHour)}`
      : null;

    // Card attributes are useful selectors; the visible pseudo-elements need
    // the same attr on the element they are attached to because CSS attr()
    // never reads through to a parent element.
    setAttr(card, 'data-fuelbase-target-label', label);
    setAttr(card, 'data-fuelbase-workout-overlay', overlay > 20 ? 'true' : 'false');
    setAttr(card, 'data-fuelbase-timing-label', timingLabel);
    setAttr(mealName, 'data-fuelbase-target-label', label);
    setAttr(mealHeader, 'data-fuelbase-timing-label', timingLabel);
  }
}

function syncDom() {
  _scheduled = false;
  if (typeof document === 'undefined') return;

  const active = _mode === 'endurance' && routeIsDiary();
  document.documentElement.classList.toggle('fuelbase-endurance-active', active);

  if (!active) {
    clearMealDecorations();
    document.documentElement.style.removeProperty('--fuelbase-endurance-target');
    return;
  }

  if (_date && _planDate !== _date) loadEndurancePlan(_date);
  if (!_plan || _planDate !== _date) return;

  const target = Math.round(Number(_plan.calories?.target) || 0);
  if (target > 0) document.documentElement.style.setProperty('--fuelbase-endurance-target', String(target));
  decorateMeals(_plan);
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
    if (_mode === 'endurance' && routeIsDiary() && value) loadEndurancePlan(value);
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
    if (_mode !== 'endurance' || !routeIsDiary()) return;
    if (!mutations.some(m => m.addedNodes?.length || m.removedNodes?.length)) return;
    scheduleSync();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

  scheduleSync();
}
