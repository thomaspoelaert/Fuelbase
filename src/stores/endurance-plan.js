import { writable, get } from 'svelte/store';
import { IntervalsClient } from '../lib/intervals-client.js';

export const endurancePlan = writable(null);
export const endurancePlanLoading = writable(false);
export const endurancePlanError = writable('');
export const endurancePlanDate = writable(null);

let _inFlight = null;
let _requestSeq = 0;

function messageFor(error) {
  if (error?.data?.needsConfig) return 'Finish Endurance setup in Goals.';
  return error?.message || 'Fueling plan unavailable';
}

export async function loadEndurancePlan(date, { force = false } = {}) {
  if (!date) return null;

  const loadedDate = get(endurancePlanDate);
  const currentPlan = get(endurancePlan);
  if (!force && loadedDate === date && currentPlan) return currentPlan;
  if (!force && _inFlight?.date === date) return _inFlight.promise;

  const seq = ++_requestSeq;
  endurancePlanLoading.set(true);
  endurancePlanError.set('');

  const promise = IntervalsClient.plan(date)
    .then(plan => {
      if (seq !== _requestSeq) return plan;
      endurancePlan.set(plan);
      endurancePlanDate.set(date);
      endurancePlanError.set('');
      return plan;
    })
    .catch(error => {
      if (seq === _requestSeq) {
        endurancePlan.set(null);
        endurancePlanDate.set(date);
        endurancePlanError.set(messageFor(error));
      }
      return null;
    })
    .finally(() => {
      if (seq === _requestSeq) endurancePlanLoading.set(false);
      if (_inFlight?.seq === seq) _inFlight = null;
    });

  _inFlight = { date, seq, promise };
  return promise;
}

export function invalidateEndurancePlan() {
  _requestSeq += 1;
  _inFlight = null;
  endurancePlan.set(null);
  endurancePlanDate.set(null);
  endurancePlanError.set('');
  endurancePlanLoading.set(false);
}
