<script>
  export let plan = null;
  export let loading = false;
  export let error = '';

  function hhmm(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function durationLabel(minutes) {
    const min = Math.max(0, Number(minutes) || 0);
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (!h) return `${m} min`;
    if (!m) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function sportIcon(sport = '') {
    const s = String(sport).toLowerCase();
    if (s.includes('run')) return 'directions_run';
    if (s.includes('swim')) return 'pool';
    if (s.includes('ride') || s.includes('bike') || s.includes('cycle')) return 'directions_bike';
    return 'exercise';
  }

  function urgencyLabel(value) {
    if (value === 'rapid') return 'Rapid recovery';
    if (value === 'priority') return 'Priority recovery';
    return 'Normal recovery';
  }
</script>

<section class="efw">
  <header class="efw-header">
    <div>
      <span class="efw-kicker">Training plan</span>
      <h3>Fueling today</h3>
    </div>
    {#if plan}
      <div class="target-chip"><strong>{Math.round(plan.calories?.target || 0).toLocaleString()}</strong><span>kcal target</span></div>
    {/if}
  </header>

  {#if loading}
    <div class="efw-state">
      <span class="state-spinner"></span>
      <span>Loading your Intervals.icu plan…</span>
    </div>
  {:else if error}
    <div class="efw-error">
      <span class="material-symbols-rounded">error</span>
      <span>{error}</span>
    </div>
  {:else if plan}
    <div class="energy-band">
      <div><span>Everyday base</span><strong>{Math.round(plan.calories?.base || 0).toLocaleString()}</strong><small>kcal</small></div>
      <span class="energy-operator">+</span>
      <div class="energy-training"><span>Training</span><strong>{Math.round(plan.calories?.training || 0).toLocaleString()}</strong><small>kcal</small></div>
      <span class="energy-operator">=</span>
      <div class="energy-total"><span>Eat today</span><strong>{Math.round(plan.calories?.target || 0).toLocaleString()}</strong><small>kcal</small></div>
    </div>

    {#if plan.workouts?.length}
      <div class="workout-list">
        {#each plan.workouts as workout}
          <article class="workout-card">
            <div class="workout-top">
              <div class="sport-icon"><span class="material-symbols-rounded">{sportIcon(workout.sport)}</span></div>
              <div class="workout-copy">
                <div class="workout-name-row">
                  <strong>{workout.name || workout.sport || 'Workout'}</strong>
                  <span class="workout-status" class:actual={workout.completed}>{workout.completed ? 'Actual' : 'Planned'}</span>
                </div>
                <span class="workout-meta">{hhmm(workout.startTime)}{#if workout.durationMin} · {durationLabel(workout.durationMin)}{/if} · {Math.round(workout.energyKcal || 0)} kcal</span>
              </div>
            </div>

            <div class="fuel-flow">
              <div class="fuel-phase">
                <div class="phase-icon"><span class="material-symbols-rounded">schedule</span></div>
                <div><span>Before</span><strong>{Math.round(workout.fueling?.preCarbs || 0)} g carbs</strong></div>
              </div>
              <span class="flow-line"></span>
              <div class="fuel-phase during">
                <div class="phase-icon"><span class="material-symbols-rounded">water_bottle</span></div>
                <div><span>During</span><strong>{Math.round(workout.fueling?.duringRate || 0)} g/h</strong></div>
              </div>
              <span class="flow-line"></span>
              <div class="fuel-phase recovery">
                <div class="phase-icon"><span class="material-symbols-rounded">restaurant</span></div>
                <div><span>Recovery</span><strong>{Math.round(workout.fueling?.postCarbs || 0)} g carbs + {Math.round(workout.fueling?.postProtein || 0)} g protein</strong></div>
              </div>
            </div>

            <div class="recovery-row">
              <span class="material-symbols-rounded">autorenew</span>
              <span>{urgencyLabel(workout.fueling?.recoveryUrgency)}</span>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="rest-day">
        <span class="material-symbols-rounded">self_improvement</span>
        <div><strong>Rest day</strong><span>No structured training on the calendar. Your normal base target stays in place.</span></div>
      </div>
    {/if}

    {#if plan.eveningPrep}
      <div class="evening-prep">
        <div class="prep-icon"><span class="material-symbols-rounded">dark_mode</span></div>
        <div>
          <span class="prep-label">Tonight</span>
          <strong>Front-load {Math.round(plan.eveningPrep.carbs || 0)} g carbohydrate for tomorrow</strong>
          <small>This shifts today's carbs toward dinner/evening. It does not add calories on top of today's target.</small>
        </div>
      </div>
    {/if}

    {#if plan.mealTargets?.length}
      <div class="meal-plan">
        <div class="meal-plan-head"><span>Meal guide</span><small>ranges, not hard limits</small></div>
        <div class="meal-range-grid">
          {#each plan.mealTargets as meal}
            <div class="meal-range">
              <span>{meal.label}</span>
              <strong>{Math.round(meal.minKcal)}–{Math.round(meal.maxKcal)}</strong>
              <small>kcal</small>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .efw { border-top:1px solid var(--border); padding-top:16px; display:flex; flex-direction:column; gap:14px; }
  .efw-header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .efw-kicker { display:block; color:var(--accent); font-size:10px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
  .efw-header h3 { margin:2px 0 0; font-size:17px; }
  .target-chip { padding:7px 9px; border-radius:12px; background:var(--accent-dim); color:var(--accent); display:flex; flex-direction:column; align-items:flex-end; line-height:1.15; }
  .target-chip strong { font-size:14px; }
  .target-chip span { font-size:9px; color:var(--text-3); }

  .energy-band { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:stretch; gap:6px; }
  .energy-band > div { min-width:0; padding:9px; background:var(--surface-2); border:1px solid var(--border); border-radius:13px; display:grid; grid-template-columns:1fr auto; align-items:baseline; gap:1px 5px; }
  .energy-band > div > span { grid-column:1/-1; color:var(--text-3); font-size:9.5px; }
  .energy-band strong { font-size:15px; font-variant-numeric:tabular-nums; }
  .energy-band small { color:var(--text-3); font-size:9px; }
  .energy-band .energy-training { border-color:color-mix(in srgb,var(--accent) 18%,var(--border)); }
  .energy-band .energy-total { background:var(--accent-dim); border-color:transparent; }
  .energy-band .energy-total strong { color:var(--accent); }
  .energy-operator { align-self:center; color:var(--text-3); font-size:12px; font-weight:700; }

  .workout-list { display:flex; flex-direction:column; gap:9px; }
  .workout-card { padding:12px; border:1px solid var(--border); border-radius:16px; background:color-mix(in srgb,var(--surface-2) 55%,var(--surface-1)); }
  .workout-top { display:flex; gap:9px; align-items:center; }
  .sport-icon { width:36px; height:36px; flex:0 0 36px; display:flex; align-items:center; justify-content:center; border-radius:12px; color:var(--accent); background:var(--accent-dim); }
  .sport-icon .material-symbols-rounded { font-size:19px; }
  .workout-copy { min-width:0; flex:1; display:flex; flex-direction:column; gap:2px; }
  .workout-name-row { display:flex; align-items:center; gap:7px; min-width:0; }
  .workout-name-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
  .workout-status { padding:2px 6px; border-radius:999px; color:var(--text-3); background:var(--surface-2); border:1px solid var(--border); font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
  .workout-status.actual { color:var(--accent); background:var(--accent-dim); border-color:transparent; }
  .workout-meta { color:var(--text-3); font-size:10px; }

  .fuel-flow { display:grid; grid-template-columns:minmax(0,1fr) 12px minmax(0,.8fr) 12px minmax(0,1.35fr); align-items:center; gap:3px; margin-top:11px; }
  .fuel-phase { min-width:0; display:flex; gap:6px; align-items:center; }
  .phase-icon { width:25px; height:25px; flex:0 0 25px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:var(--surface-2); color:var(--text-2); }
  .phase-icon .material-symbols-rounded { font-size:14px; }
  .fuel-phase > div:last-child { min-width:0; display:flex; flex-direction:column; gap:1px; }
  .fuel-phase span { color:var(--text-3); font-size:8.5px; }
  .fuel-phase strong { font-size:9.5px; line-height:1.3; white-space:normal; }
  .fuel-phase.during .phase-icon { color:var(--accent); background:var(--accent-dim); }
  .flow-line { height:1px; background:var(--border-strong); }
  .recovery-row { margin-top:9px; padding-top:8px; border-top:1px solid var(--border); display:flex; align-items:center; gap:5px; color:var(--text-3); font-size:9.5px; }
  .recovery-row .material-symbols-rounded { font-size:13px; }

  .evening-prep { display:flex; gap:9px; padding:12px; border:1px solid color-mix(in srgb,var(--accent) 16%,var(--border)); border-radius:15px; background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,var(--surface-2)),var(--surface-2)); }
  .prep-icon { width:32px; height:32px; flex:0 0 32px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--accent-dim); color:var(--accent); }
  .prep-icon .material-symbols-rounded { font-size:17px; }
  .evening-prep > div:last-child { min-width:0; display:flex; flex-direction:column; gap:2px; }
  .prep-label { color:var(--accent); font-size:9px; font-weight:750; letter-spacing:.06em; text-transform:uppercase; }
  .evening-prep strong { font-size:11px; line-height:1.35; }
  .evening-prep small { color:var(--text-3); font-size:9.5px; line-height:1.4; }

  .meal-plan { display:flex; flex-direction:column; gap:7px; }
  .meal-plan-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .meal-plan-head > span { font-size:10.5px; font-weight:700; color:var(--text-2); }
  .meal-plan-head small { font-size:9px; color:var(--text-3); }
  .meal-range-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
  .meal-range { min-width:0; padding:7px 8px; border-radius:11px; background:var(--surface-2); display:grid; grid-template-columns:1fr auto; align-items:baseline; gap:1px 4px; }
  .meal-range > span { grid-column:1/-1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-3); font-size:8.5px; }
  .meal-range strong { font-size:10.5px; }
  .meal-range small { color:var(--text-3); font-size:8px; }

  .rest-day { padding:13px; display:flex; gap:9px; align-items:flex-start; border-radius:15px; background:var(--surface-2); }
  .rest-day > .material-symbols-rounded { color:var(--accent); font-size:20px; }
  .rest-day > div { display:flex; flex-direction:column; gap:2px; }
  .rest-day strong { font-size:11px; }
  .rest-day span { color:var(--text-3); font-size:9.5px; line-height:1.4; }

  .efw-state { min-height:72px; display:flex; align-items:center; justify-content:center; gap:8px; color:var(--text-3); font-size:11px; }
  .state-spinner { width:15px; height:15px; border-radius:50%; border:2px solid var(--border-strong); border-top-color:var(--accent); animation:spin .8s linear infinite; }
  .efw-error { display:flex; gap:8px; align-items:flex-start; padding:11px; border-radius:14px; background:color-mix(in srgb,var(--danger,#d44) 8%,var(--surface-2)); color:var(--danger,#d44); font-size:11px; line-height:1.4; }
  .efw-error .material-symbols-rounded { font-size:17px; }
  @keyframes spin { to { transform:rotate(360deg); } }

  @media (max-width:360px) {
    .energy-band { grid-template-columns:1fr 1fr; }
    .energy-operator { display:none; }
    .energy-total { grid-column:1/-1; }
    .fuel-flow { grid-template-columns:1fr; gap:7px; }
    .flow-line { display:none; }
  }
</style>
