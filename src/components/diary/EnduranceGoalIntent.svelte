<script>
  import { IntervalsClient } from '../../lib/intervals-client.js';
  import { invalidateEndurancePlan, loadEndurancePlan } from '../../stores/endurance-plan.js';
  import { showError } from '../../stores/toast.js';

  export let plan = null;
  let saving = false;

  const OPTIONS = [
    { key: 'lose', label: 'Lose', sub: '−250 kcal' },
    { key: 'maintain', label: 'Maintain', sub: 'steady' },
    { key: 'gain', label: 'Gain', sub: '+200 kcal' },
  ];

  $: current = plan?.goal?.intent || plan?.config?.goalIntent || 'maintain';

  async function select(intent) {
    if (saving || intent === current || !plan?.date) return;
    saving = true;
    try {
      const cfg = plan.config || {};
      await IntervalsClient.saveConfig({
        baseCalories: cfg.baseCalories ?? plan.calories?.base,
        bodyWeightKg: cfg.bodyWeightKg,
        proteinGPerKg: cfg.proteinGPerKg,
        fatGPerKg: cfg.fatGPerKg,
        goalIntent: intent,
      });
      invalidateEndurancePlan();
      await loadEndurancePlan(plan.date, { force: true });
    } catch (error) {
      showError(error?.message || 'Could not update goal intent');
    } finally {
      saving = false;
    }
  }
</script>

{#if plan}
  <section class="goal-intent" aria-label="Body weight goal">
    <div class="goal-intent-copy">
      <span>Body-weight direction</span>
      <small>{plan.goal?.description || 'Choose how daily energy should trend.'}</small>
    </div>
    <div class="goal-segment" role="radiogroup" aria-label="Lose maintain or gain">
      {#each OPTIONS as option}
        <button
          type="button"
          class:active={current === option.key}
          disabled={saving}
          aria-checked={current === option.key}
          role="radio"
          on:click={() => select(option.key)}
        >
          <strong>{option.label}</strong>
          <span>{option.sub}</span>
        </button>
      {/each}
    </div>
    {#if plan.goal?.trainingFuelProtected}
      <div class="protected-note"><span class="material-symbols-rounded">shield</span><span>Training fuel stays protected.</span></div>
    {/if}
  </section>
{/if}

<style>
  .goal-intent { display:flex; flex-direction:column; gap:9px; padding:12px; border:1px solid var(--border); border-radius:16px; background:var(--surface-1); }
  .goal-intent-copy { display:flex; flex-direction:column; gap:2px; }
  .goal-intent-copy > span { font-size:11px; font-weight:700; color:var(--text-1); }
  .goal-intent-copy small { font-size:9.5px; color:var(--text-3); line-height:1.4; }
  .goal-segment { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; padding:4px; border-radius:14px; background:var(--surface-2); }
  .goal-segment button { min-width:0; padding:8px 6px; border-radius:11px; color:var(--text-2); display:flex; flex-direction:column; align-items:center; gap:1px; transition:background var(--dur-fast),color var(--dur-fast),box-shadow var(--dur-fast); }
  .goal-segment button strong { font-size:10.5px; }
  .goal-segment button span { font-size:8px; color:var(--text-3); }
  .goal-segment button.active { color:var(--text-1); background:var(--surface-1); box-shadow:var(--shadow-sm); }
  .goal-segment button.active span { color:var(--accent); }
  .protected-note { display:flex; align-items:center; gap:5px; color:var(--text-3); font-size:8.5px; }
  .protected-note .material-symbols-rounded { font-size:13px; color:var(--accent); }
</style>
