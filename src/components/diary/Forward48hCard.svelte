<script>
  export let days = [];

  function dayLabel(date) {
    if (!date) return '';
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }

  function timeLabel(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function carbLabel(level) {
    if (level === 'very-high') return 'Very high carb';
    if (level === 'high') return 'High carb';
    if (level === 'moderate') return 'Moderate carb';
    return 'Low carb';
  }
</script>

{#if days?.length}
  <section class="outlook">
    <div class="outlook-head">
      <div>
        <span class="kicker">Next 48 hours</span>
        <strong>Fuel ahead, not after the fact</strong>
      </div>
      <span class="material-symbols-rounded">calendar_view_week</span>
    </div>

    <div class="outlook-days">
      {#each days as day}
        <article class="outlook-day">
          <header>
            <div><strong>{dayLabel(day.date)}</strong><span>{carbLabel(day.carbLevel)}</span></div>
            <div class="day-target"><strong>{Math.round(day.targetKcal || 0).toLocaleString()}</strong><span>kcal</span></div>
          </header>

          <div class="day-metrics">
            <span><b>{Math.round(day.carbsG || 0)}g</b> carbs</span>
            <span><b>+{Math.round(day.trainingKcal || 0)}</b> training</span>
            <span class="goal">{day.goalIntent === 'lose' ? 'Lose' : day.goalIntent === 'gain' ? 'Gain' : 'Maintain'}</span>
          </div>

          {#if day.workouts?.length}
            <div class="future-workouts">
              {#each day.workouts as workout}
                <div class="future-workout">
                  <span class="material-symbols-rounded">{String(workout.sport || '').toLowerCase().includes('run') ? 'directions_run' : String(workout.sport || '').toLowerCase().includes('swim') ? 'pool' : 'directions_bike'}</span>
                  <div>
                    <strong>{workout.name}</strong>
                    <small>{timeLabel(workout.startTime)} · {Math.round(workout.durationMin || 0)} min · {Math.round(workout.duringRate || 0)}g/h</small>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="rest-row"><span class="material-symbols-rounded">self_improvement</span><span>No structured training.</span></div>
          {/if}

          {#if day.eveningPrep}
            <div class="prep-row"><span class="material-symbols-rounded">dark_mode</span><span>Shift {Math.round(day.eveningPrep.carbs || 0)}g carbs toward the evening for the next morning.</span></div>
          {/if}
        </article>
      {/each}
    </div>
  </section>
{/if}

<style>
  .outlook { display:flex; flex-direction:column; gap:9px; padding-top:4px; }
  .outlook-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .outlook-head > div { display:flex; flex-direction:column; gap:2px; }
  .kicker { color:var(--accent); font-size:9px; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }
  .outlook-head strong { font-size:11px; }
  .outlook-head > .material-symbols-rounded { color:var(--text-3); font-size:18px; }
  .outlook-days { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
  .outlook-day { min-width:0; padding:10px; border:1px solid var(--border); border-radius:15px; background:var(--surface-1); display:flex; flex-direction:column; gap:8px; }
  .outlook-day header { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
  .outlook-day header > div:first-child { display:flex; flex-direction:column; gap:1px; min-width:0; }
  .outlook-day header strong { font-size:10.5px; }
  .outlook-day header span { color:var(--text-3); font-size:8.5px; }
  .day-target { display:flex; align-items:baseline; gap:3px; white-space:nowrap; }
  .day-target strong { color:var(--text-1); font-size:11px !important; }
  .day-metrics { display:flex; gap:5px; flex-wrap:wrap; }
  .day-metrics > span { padding:3px 6px; border-radius:999px; background:var(--surface-2); color:var(--text-3); font-size:7.8px; }
  .day-metrics b { color:var(--text-2); font-weight:700; }
  .day-metrics .goal { background:var(--accent-dim); color:var(--accent); }
  .future-workouts { display:flex; flex-direction:column; gap:5px; }
  .future-workout { display:flex; gap:6px; align-items:flex-start; }
  .future-workout > .material-symbols-rounded { color:var(--accent); font-size:14px; margin-top:1px; }
  .future-workout > div { min-width:0; display:flex; flex-direction:column; gap:1px; }
  .future-workout strong { font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .future-workout small { color:var(--text-3); font-size:7.8px; }
  .rest-row,.prep-row { display:flex; align-items:flex-start; gap:5px; color:var(--text-3); font-size:8px; line-height:1.35; }
  .rest-row .material-symbols-rounded,.prep-row .material-symbols-rounded { color:var(--accent); font-size:13px; flex:0 0 auto; }
  .prep-row { padding-top:5px; border-top:1px solid var(--border); }

  @media (max-width:460px) {
    .outlook-days { grid-template-columns:1fr; }
  }
</style>
