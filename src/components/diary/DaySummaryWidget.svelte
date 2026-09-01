<script>
  import MacroRing from './MacroRing.svelte';
  import EnduranceFuelingCard from './EnduranceFuelingCard.svelte';
  import EnduranceGoalIntent from './EnduranceGoalIntent.svelte';
  import Forward48hCard from './Forward48hCard.svelte';
  import { macroLegendMode, calorieGoalMode } from '../../stores/settings.js';
  import { currentDate } from '../../stores/diary.js';
  import {
    endurancePlan,
    endurancePlanLoading,
    endurancePlanError,
    endurancePlanDate,
    loadEndurancePlan,
  } from '../../stores/endurance-plan.js';

  export let eatenKcal = 0;
  export let protein = 0;
  export let carbs = 0;
  export let fat = 0;
  export let goalKcal = 2000;
  export let proteinGoal = null;
  export let carbGoal = null;
  export let fatGoal = null;
  export let onOpenSummary = () => {};
  export let onOpenTrends = null;

  $: if ($calorieGoalMode === 'endurance' && $currentDate && $endurancePlanDate !== $currentDate) {
    loadEndurancePlan($currentDate);
  }

  $: _goalKcal = $calorieGoalMode === 'endurance' && $endurancePlan?.calories?.target
    ? $endurancePlan.calories.target : goalKcal;
  $: _proteinGoal = $calorieGoalMode === 'endurance' && $endurancePlan?.macros?.proteins
    ? $endurancePlan.macros.proteins : proteinGoal;
  $: _carbGoal = $calorieGoalMode === 'endurance' && $endurancePlan?.macros?.carbohydrates
    ? $endurancePlan.macros.carbohydrates : carbGoal;
  $: _fatGoal = $calorieGoalMode === 'endurance' && $endurancePlan?.macros?.fat
    ? $endurancePlan.macros.fat : fatGoal;
</script>

<section class="day-summary-widget card">
  <header class="dsw-header">
    <button class="dsw-legend-toggle" on:click={() => macroLegendMode.set($macroLegendMode === 'grams' ? 'percent' : 'grams')} aria-label="Toggle macro display between percent and grams" title="Toggle percent / grams">
      <span class="dsw-lt-opt" class:dsw-lt-active={$macroLegendMode === 'percent'}>%</span>
      <span class="dsw-lt-opt" class:dsw-lt-active={$macroLegendMode === 'grams'}>g</span>
    </button>
    {#if onOpenTrends}
      <button class="dsw-open dsw-trend" on:click={onOpenTrends} title="View trend"><span class="material-symbols-rounded">trending_up</span></button>
    {/if}
    <button class="dsw-open" on:click={onOpenSummary} title="Open full nutrition summary"><span class="material-symbols-rounded">open_in_full</span></button>
  </header>

  <div class="dsw-ring">
    <MacroRing calories={eatenKcal} caloriesGoal={_goalKcal} {protein} {carbs} {fat} proteinGoal={_proteinGoal} carbGoal={_carbGoal} fatGoal={_fatGoal} />
  </div>

  <div class="dsw-macros">
    <div class="dsw-macro-pill" style="--pill-bg:var(--macro-protein-dim);--pill-fg:var(--macro-protein)">
      <span class="dsw-macro-val">{Math.round(protein)}{#if $macroLegendMode === 'grams' && _proteinGoal != null}/{Math.round(_proteinGoal)}{/if}g</span>
      <span class="dsw-macro-lbl">Protein</span>
    </div>
    <div class="dsw-macro-pill" style="--pill-bg:var(--macro-carbs-dim);--pill-fg:var(--macro-carbs)">
      <span class="dsw-macro-val">{Math.round(carbs)}{#if $macroLegendMode === 'grams' && _carbGoal != null}/{Math.round(_carbGoal)}{/if}g</span>
      <span class="dsw-macro-lbl">Carbs</span>
    </div>
    <div class="dsw-macro-pill" style="--pill-bg:var(--macro-fat-dim);--pill-fg:var(--macro-fat)">
      <span class="dsw-macro-val">{Math.round(fat)}{#if $macroLegendMode === 'grams' && _fatGoal != null}/{Math.round(_fatGoal)}{/if}g</span>
      <span class="dsw-macro-lbl">Fat</span>
    </div>
  </div>

  {#if $calorieGoalMode === 'endurance'}
    <EnduranceGoalIntent plan={$endurancePlan} />
    <EnduranceFuelingCard plan={$endurancePlan} loading={$endurancePlanLoading} error={$endurancePlanError} />
    <Forward48hCard days={$endurancePlan?.forward48h || []} />
  {/if}
</section>

<style>
  .day-summary-widget { padding:12px 16px 16px; display:flex; flex-direction:column; gap:12px; }
  .dsw-header { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .dsw-legend-toggle { display:inline-flex; align-items:center; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-full); padding:2px; cursor:pointer; font-size:12px; font-weight:700; color:var(--text-3); line-height:1; overflow:hidden; }
  .dsw-legend-toggle:hover { background:var(--surface-3); }
  .dsw-lt-opt { padding:4px 12px; border-radius:var(--radius-full); transition:background 120ms ease,color 120ms ease; min-width:20px; text-align:center; }
  .dsw-lt-active { background:var(--accent); color:var(--on-accent,#fff); }
  .dsw-open { background:transparent; border:none; color:var(--text-3); cursor:pointer; padding:4px; border-radius:var(--radius-sm); display:inline-flex; align-items:center; justify-content:center; }
  .dsw-open:hover { color:var(--text-1); background:var(--surface-2); }
  .dsw-open .material-symbols-rounded { font-size:16px; }
  .dsw-trend { opacity:.5; }
  .dsw-trend:hover { opacity:1; }
  .dsw-trend .material-symbols-rounded { font-size:20px; }
  .dsw-ring { text-align:center; }
  .dsw-macros { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
  .dsw-macro-pill { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:10px 6px; border-radius:var(--radius-md); background:var(--pill-bg,var(--surface-2)); }
  .dsw-macro-val { font-size:16px; font-weight:700; color:var(--pill-fg,var(--text-1)); letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
  .dsw-macro-lbl { font-size:10px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--text-3); }
</style>
