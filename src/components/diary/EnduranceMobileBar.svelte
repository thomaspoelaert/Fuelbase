<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentDate, diaryTotals } from '../../stores/diary.js';
  import { IntervalsClient } from '../../lib/intervals-client.js';

  let plan = null;
  let loading = false;
  let error = '';
  let expanded = false;
  let _loadedDate = null;
  let _mq = null;

  async function load(date) {
    if (!date || loading || _loadedDate === date) return;
    loading = true;
    error = '';
    try {
      plan = await IntervalsClient.plan(date);
    } catch (e) {
      plan = null;
      error = e?.data?.needsConfig ? 'Finish Endurance setup in Goals.' : (e?.message || 'Fueling plan unavailable');
    } finally {
      _loadedDate = date;
      loading = false;
    }
  }

  function syncLayout() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--nav-h', _mq?.matches ? '146px' : '78px');
  }

  onMount(() => {
    _mq = window.matchMedia('(max-width: 1279px)');
    syncLayout();
    _mq.addEventListener?.('change', syncLayout);
  });

  onDestroy(() => {
    _mq?.removeEventListener?.('change', syncLayout);
    if (typeof document !== 'undefined') document.documentElement.style.setProperty('--nav-h', '78px');
  });

  $: if ($currentDate && _loadedDate !== $currentDate) load($currentDate);
  $: consumed = Math.round($diaryTotals?.calories || 0);
  $: target = Math.round(plan?.calories?.target || 0);
  $: remaining = target ? target - consumed : 0;
  $: carbs = Math.round($diaryTotals?.carbohydrates || 0);
  $: carbTarget = Math.round(plan?.macros?.carbohydrates || 0);
  $: nextWorkout = plan?.workouts?.[0] || null;

  function timeLabel(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
</script>

<aside class="emb" class:expanded aria-label="Endurance nutrition plan">
  <button class="emb-summary" type="button" on:click={() => expanded = !expanded} aria-expanded={expanded}>
    <div class="emb-mark"><span class="material-symbols-rounded">bolt</span></div>
    {#if loading}
      <div class="emb-main"><strong>Loading training plan…</strong><span>Intervals.icu</span></div>
    {:else if error}
      <div class="emb-main error"><strong>Endurance plan needs attention</strong><span>{error}</span></div>
    {:else if plan}
      <div class="emb-main">
        <div class="emb-title-row"><strong>{remaining >= 0 ? `${remaining.toLocaleString()} kcal left` : `${Math.abs(remaining).toLocaleString()} kcal over`}</strong><span>{consumed.toLocaleString()} / {target.toLocaleString()}</span></div>
        <div class="emb-progress"><span style="width:{Math.min(100, target ? consumed / target * 100 : 0)}%"></span></div>
      </div>
      <div class="emb-carb"><strong>{carbs}/{carbTarget}g</strong><span>carbs</span></div>
    {/if}
    <span class="material-symbols-rounded emb-chevron">{expanded ? 'expand_more' : 'expand_less'}</span>
  </button>

  {#if expanded && plan}
    <div class="emb-detail">
      <div class="emb-energy">
        <div><span>Base</span><strong>{Math.round(plan.calories?.base || 0).toLocaleString()}</strong></div>
        <div><span>Training</span><strong>+{Math.round(plan.calories?.training || 0).toLocaleString()}</strong></div>
        <div><span>Target</span><strong>{target.toLocaleString()}</strong></div>
      </div>

      {#if nextWorkout}
        <div class="emb-workout">
          <div class="emb-workout-head">
            <div><span class="workout-time">{timeLabel(nextWorkout.startTime)}</span><strong>{nextWorkout.name || nextWorkout.sport || 'Workout'}</strong></div>
            <span class="status" class:actual={nextWorkout.completed}>{nextWorkout.completed ? 'Actual' : 'Planned'}</span>
          </div>
          <div class="emb-fuel">
            <div><span>Before</span><strong>{Math.round(nextWorkout.fueling?.preCarbs || 0)}g</strong></div>
            <div class="accent"><span>During</span><strong>{Math.round(nextWorkout.fueling?.duringRate || 0)}g/h</strong></div>
            <div><span>After</span><strong>{Math.round(nextWorkout.fueling?.postCarbs || 0)}g + {Math.round(nextWorkout.fueling?.postProtein || 0)}g P</strong></div>
          </div>
        </div>
      {:else}
        <div class="emb-rest"><span class="material-symbols-rounded">self_improvement</span><span>Rest day — base nutrition target only.</span></div>
      {/if}

      {#if plan.eveningPrep}
        <div class="emb-prep"><span class="material-symbols-rounded">dark_mode</span><span>Tonight: bias {Math.round(plan.eveningPrep.carbs || 0)}g carbs toward dinner/evening for tomorrow's early session.</span></div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .emb {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(84px + var(--safe-bottom));
    z-index: 49;
    overflow: hidden;
    background: color-mix(in srgb,var(--surface-1) 94%,transparent);
    border: 1px solid var(--border-strong);
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(18px) saturate(130%);
    -webkit-backdrop-filter: blur(18px) saturate(130%);
  }
  .emb-summary {
    width:100%;
    min-height:54px;
    padding:8px 9px;
    display:flex;
    align-items:center;
    gap:9px;
    color:var(--text-1);
    text-align:left;
  }
  .emb-mark { width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:11px;background:var(--accent-dim);color:var(--accent); }
  .emb-mark .material-symbols-rounded { font-size:18px; }
  .emb-main { min-width:0; flex:1; display:flex; flex-direction:column; gap:4px; }
  .emb-title-row { display:flex;justify-content:space-between;align-items:baseline;gap:8px; }
  .emb-title-row strong,.emb-main>strong { font-size:12.5px; }
  .emb-title-row>span,.emb-main>span { color:var(--text-3);font-size:9.5px;white-space:nowrap; }
  .emb-main.error>strong { color:var(--danger); }
  .emb-main.error>span { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .emb-progress { height:3px;overflow:hidden;border-radius:999px;background:var(--surface-3); }
  .emb-progress>span { display:block;height:100%;border-radius:inherit;background:var(--accent); }
  .emb-carb { flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1; }
  .emb-carb strong { font-size:11px; }
  .emb-carb span { color:var(--text-3);font-size:8.5px; }
  .emb-chevron { color:var(--text-3);font-size:18px; }

  .emb-detail { padding:0 10px 10px;display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border); }
  .emb-energy { display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding-top:9px; }
  .emb-energy>div { padding:7px 8px;border-radius:10px;background:var(--surface-2);display:flex;flex-direction:column;gap:1px; }
  .emb-energy span,.emb-fuel span { color:var(--text-3);font-size:8px; }
  .emb-energy strong { font-size:10.5px; }
  .emb-energy>div:last-child { background:var(--accent-dim); }
  .emb-energy>div:last-child strong { color:var(--accent); }

  .emb-workout { padding:9px;border-radius:12px;background:var(--surface-2); }
  .emb-workout-head { display:flex;justify-content:space-between;align-items:flex-start;gap:8px; }
  .emb-workout-head>div { min-width:0;display:flex;align-items:baseline;gap:6px; }
  .emb-workout-head strong { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px; }
  .workout-time { color:var(--accent);font-size:9px;font-weight:700; }
  .status { padding:2px 5px;border-radius:999px;background:var(--surface-3);color:var(--text-3);font-size:7.5px;font-weight:700;text-transform:uppercase; }
  .status.actual { background:var(--accent-dim);color:var(--accent); }
  .emb-fuel { display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px; }
  .emb-fuel>div { min-width:0;padding:6px;border-radius:9px;background:color-mix(in srgb,var(--surface-3) 65%,transparent);display:flex;flex-direction:column;gap:1px; }
  .emb-fuel strong { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px; }
  .emb-fuel .accent { background:var(--accent-dim); }
  .emb-fuel .accent strong { color:var(--accent); }
  .emb-prep,.emb-rest { display:flex;align-items:flex-start;gap:6px;padding:7px 8px;border-radius:10px;background:color-mix(in srgb,var(--accent) 6%,var(--surface-2));color:var(--text-2);font-size:8.8px;line-height:1.35; }
  .emb-prep .material-symbols-rounded,.emb-rest .material-symbols-rounded { flex:0 0 auto;color:var(--accent);font-size:14px; }

  @media (min-width:1280px) { .emb { display:none; } }
  @media (max-width:370px) {
    .emb-carb { display:none; }
    .emb-title-row>span { display:none; }
  }
</style>
