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
    if (!m) return `${h} h`;
    return `${h} h ${m} min`;
  }
</script>

<section class="efw">
  <div class="efw-title">
    <div>
      <div class="efw-eyebrow">ENDURANCE PLAN</div>
      <strong>Training & fueling</strong>
    </div>
    {#if plan}
      <span class="efw-target">{Math.round(plan.calories?.target || 0)} kcal</span>
    {/if}
  </div>

  {#if loading}
    <p class="efw-muted">Loading Intervals.icu plan…</p>
  {:else if error}
    <div class="efw-error">{error}</div>
  {:else if plan}
    <div class="efw-energy">
      <div><span>Base</span><strong>{Math.round(plan.calories?.base || 0)}</strong></div>
      <div><span>Training</span><strong>+{Math.round(plan.calories?.training || 0)}</strong></div>
      <div><span>Target</span><strong>{Math.round(plan.calories?.target || 0)}</strong></div>
    </div>

    {#if plan.workouts?.length}
      <div class="efw-section">
        {#each plan.workouts as workout}
          <article class="efw-workout">
            <div class="efw-workout-head">
              <div>
                <strong>{workout.name || workout.sport || 'Workout'}</strong>
                <span>{hhmm(workout.startTime)}{#if workout.durationMin} · {durationLabel(workout.durationMin)}{/if}</span>
              </div>
              <span class="efw-kcal">{Math.round(workout.energyKcal || 0)} kcal · {workout.completed ? 'actual' : 'planned'}</span>
            </div>
            <div class="efw-fuel-grid">
              <div><span>Pre</span><strong>{Math.round(workout.fueling?.preCarbs || 0)} g CHO</strong></div>
              <div><span>During</span><strong>{Math.round(workout.fueling?.duringRate || 0)} g/h</strong></div>
              <div><span>Post</span><strong>{Math.round(workout.fueling?.postCarbs || 0)} g CHO</strong></div>
              <div><span>Protein</span><strong>{Math.round(workout.fueling?.postProtein || 0)} g</strong></div>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p class="efw-muted">No training planned for this day.</p>
    {/if}

    {#if plan.eveningPrep}
      <div class="efw-prep">
        <span class="material-symbols-rounded">dark_mode</span>
        <div>
          <strong>Prepare for tomorrow morning</strong>
          <span>{Math.round(plan.eveningPrep.carbs || 0)} g carbohydrate in the evening, within today's energy target.</span>
        </div>
      </div>
    {/if}

    {#if plan.mealTargets?.length}
      <div class="efw-section">
        <div class="efw-subtitle">Meal ranges</div>
        <div class="efw-meals">
          {#each plan.mealTargets as meal}
            <div class="efw-meal">
              <span>{meal.label}</span>
              <strong>{Math.round(meal.minKcal)}–{Math.round(meal.maxKcal)} kcal</strong>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .efw { border-top:1px solid var(--border); padding-top:12px; display:flex; flex-direction:column; gap:12px; }
  .efw-title,.efw-workout-head,.efw-meal { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .efw-eyebrow,.efw-subtitle { font-size:10px; font-weight:700; letter-spacing:.08em; color:var(--text-3); }
  .efw-target { font-weight:700; color:var(--accent); white-space:nowrap; }
  .efw-energy,.efw-fuel-grid { display:grid; gap:6px; }
  .efw-energy { grid-template-columns:repeat(3,1fr); }
  .efw-fuel-grid { grid-template-columns:repeat(2,1fr); margin-top:8px; }
  .efw-energy>div,.efw-fuel-grid>div { padding:8px; border-radius:var(--radius-md); background:var(--surface-2); display:flex; flex-direction:column; gap:2px; }
  .efw-energy span,.efw-fuel-grid span,.efw-workout-head span,.efw-muted,.efw-prep span,.efw-meal span { font-size:11px; color:var(--text-3); }
  .efw-section { display:flex; flex-direction:column; gap:8px; }
  .efw-workout { padding:10px; border:1px solid var(--border); border-radius:var(--radius-md); }
  .efw-workout-head>div { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .efw-kcal { white-space:nowrap; text-align:right; }
  .efw-prep { display:flex; gap:8px; padding:10px; border-radius:var(--radius-md); background:var(--surface-2); }
  .efw-prep .material-symbols-rounded { font-size:18px; color:var(--accent); }
  .efw-prep>div { display:flex; flex-direction:column; gap:2px; }
  .efw-meals { display:flex; flex-direction:column; gap:5px; }
  .efw-meal { font-size:12px; align-items:center; }
  .efw-meal strong { font-variant-numeric:tabular-nums; font-size:12px; }
  .efw-error { padding:9px 10px; border:1px solid var(--danger,#d44); border-radius:var(--radius-md); font-size:12px; color:var(--danger,#d44); }
</style>
