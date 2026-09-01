<script>
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import {
    calorieGoalMode, calorieGoalFactor,
    fitbitFamilyEnabled, garminEnabled,
  } from '../../stores/settings.js';
  import { IntervalsClient } from '../../lib/intervals-client.js';
  import { showSuccess, showError } from '../../stores/toast.js';

  $: _hasWearable = $fitbitFamilyEnabled || $garminEnabled;

  const MODES = [
    { key: 'fixed', icon: 'target', title: 'Fixed', desc: 'Use your saved daily nutrition target.' },
    { key: 'dynamic', icon: 'monitor_heart', title: 'Dynamic', desc: 'Adjust from wearable energy expenditure.' },
    { key: 'adaptive', icon: 'query_stats', title: 'Adaptive', desc: 'Estimate expenditure from weight and intake trends.' },
    { key: 'endurance', icon: 'directions_bike', title: 'Endurance', desc: 'Periodize energy and carbohydrates around training.', badge: 'FuelBase' },
  ];

  let intervalsConnected = false;
  let intervalsApiKey = '';
  let showApiKey = false;
  let connectionBusy = false;
  let configBusy = false;
  let baseCalories = 2400;
  let bodyWeightKg = '';
  let proteinGPerKg = 1.8;
  let fatGPerKg = 0.9;

  async function loadEnduranceConfig() {
    try {
      const cfg = await IntervalsClient.config();
      intervalsConnected = !!cfg.connected;
      baseCalories = cfg.baseCalories ?? 2400;
      bodyWeightKg = cfg.bodyWeightKg ?? '';
      proteinGPerKg = cfg.proteinGPerKg ?? 1.8;
      fatGPerKg = cfg.fatGPerKg ?? 0.9;
    } catch {}
  }

  function selectMode(mode) {
    if (mode === 'dynamic' && !_hasWearable) return;
    calorieGoalMode.set(mode);
  }

  async function saveConnection() {
    const key = intervalsApiKey.trim();
    if (!key) { showError('Enter your Intervals.icu API key.'); return; }
    connectionBusy = true;
    try {
      await IntervalsClient.saveCredentials(key);
      intervalsConnected = true;
      intervalsApiKey = '';
      showSuccess('Intervals.icu connected');
    } catch (e) { showError(e?.message || 'Could not connect to Intervals.icu'); }
    finally { connectionBusy = false; }
  }

  async function testConnection() {
    connectionBusy = true;
    try {
      await IntervalsClient.test(intervalsApiKey.trim());
      showSuccess('Intervals.icu connection verified');
    } catch (e) { showError(e?.message || 'Intervals.icu connection failed'); }
    finally { connectionBusy = false; }
  }

  async function disconnectIntervals() {
    connectionBusy = true;
    try {
      await IntervalsClient.disconnect();
      intervalsConnected = false;
      intervalsApiKey = '';
      showSuccess('Intervals.icu disconnected');
    } catch (e) { showError(e?.message || 'Could not disconnect Intervals.icu'); }
    finally { connectionBusy = false; }
  }

  async function saveEnduranceConfig() {
    configBusy = true;
    try {
      const cfg = await IntervalsClient.saveConfig({
        baseCalories: Number(baseCalories),
        bodyWeightKg: bodyWeightKg === '' ? null : Number(bodyWeightKg),
        proteinGPerKg: Number(proteinGPerKg),
        fatGPerKg: Number(fatGPerKg),
      });
      baseCalories = cfg.baseCalories;
      bodyWeightKg = cfg.bodyWeightKg ?? '';
      proteinGPerKg = cfg.proteinGPerKg;
      fatGPerKg = cfg.fatGPerKg;
      showSuccess('Endurance targets saved');
    } catch (e) { showError(e?.message || 'Could not save endurance targets'); }
    finally { configBusy = false; }
  }

  onMount(loadEnduranceConfig);
</script>

<div class="section-body goals-page">
  <section class="goal-intro">
    <span class="eyebrow">Energy strategy</span>
    <h2>Choose how FuelBase sets your day</h2>
    <p>The mode controls your calorie target. Endurance adds workout energy and places fuel around the sessions that need it.</p>
  </section>

  <div class="goal-mode-grid" role="radiogroup" aria-label="Calorie goal mode">
    {#each MODES as mode}
      {@const disabled = mode.key === 'dynamic' && !_hasWearable}
      <button
        type="button"
        class="goal-mode-card"
        class:active={$calorieGoalMode === mode.key}
        class:disabled
        disabled={disabled}
        role="radio"
        aria-checked={$calorieGoalMode === mode.key}
        on:click={() => selectMode(mode.key)}
      >
        <div class="mode-icon"><span class="material-symbols-rounded">{mode.icon}</span></div>
        <div class="mode-copy">
          <div class="mode-title-row">
            <span class="mode-title">{mode.title}</span>
            {#if mode.badge}<span class="mode-badge">{mode.badge}</span>{/if}
          </div>
          <span class="mode-desc">{mode.desc}</span>
          {#if disabled}<span class="mode-requirement">Connect a wearable first</span>{/if}
        </div>
        <span class="material-symbols-rounded mode-check">check_circle</span>
      </button>
    {/each}
  </div>

  {#if $calorieGoalMode === 'fixed'}
    <div class="mode-detail card">
      <div class="detail-icon"><span class="material-symbols-rounded">target</span></div>
      <div><strong>Fixed daily target</strong><p>Uses the calorie target from your goal templates every day.</p></div>
    </div>
  {:else if $calorieGoalMode === 'dynamic' || $calorieGoalMode === 'adaptive'}
    <div class="mode-detail card stacked">
      <div class="detail-head">
        <div class="detail-icon"><span class="material-symbols-rounded">{$calorieGoalMode === 'dynamic' ? 'monitor_heart' : 'query_stats'}</span></div>
        <div>
          <strong>{$calorieGoalMode === 'dynamic' ? 'Wearable-adjusted target' : 'Adaptive expenditure target'}</strong>
          <p>{$calorieGoalMode === 'dynamic' ? "Uses yesterday's final calorie burn from your wearable." : 'Uses intake and weight trends to estimate expenditure.'}</p>
        </div>
      </div>
      <div class="factor-grid" aria-label="Goal factor">
        <button class:active={$calorieGoalFactor === 0.8} on:click={() => calorieGoalFactor.set(0.8)}><strong>−20%</strong><span>Lose</span></button>
        <button class:active={$calorieGoalFactor === 1.0} on:click={() => calorieGoalFactor.set(1.0)}><strong>100%</strong><span>Maintain</span></button>
        <button class:active={$calorieGoalFactor === 1.2} on:click={() => calorieGoalFactor.set(1.2)}><strong>+20%</strong><span>Gain</span></button>
      </div>
      {#if $calorieGoalMode === 'adaptive'}
        <a href="https://github.com/TraceApps/nutritrace#adaptive-tdee" target="_blank" rel="noopener" class="detail-link">How adaptive TDEE works <span class="material-symbols-rounded">open_in_new</span></a>
      {/if}
    </div>
  {:else if $calorieGoalMode === 'endurance'}
    <section class="endurance-hero">
      <div class="endurance-hero-copy">
        <span class="eyebrow accent">Endurance mode</span>
        <h2>Fuel the training, keep normal meals normal.</h2>
        <p>FuelBase starts from your everyday energy need, adds exercise energy from Intervals.icu and distributes the extra demand around training without turning breakfast, lunch or dinner into token meals.</p>
      </div>
      <div class="endurance-formula" aria-label="Endurance calorie formula">
        <div><span>Base day</span><strong>{Number(baseCalories || 0).toLocaleString()} kcal</strong></div>
        <span class="formula-plus">+</span>
        <div><span>Training</span><strong>Intervals.icu</strong></div>
        <span class="formula-equals">=</span>
        <div class="formula-total"><span>Daily target</span><strong>Dynamic</strong></div>
      </div>
    </section>

    <div class="endurance-layout">
      <section class="endurance-card card">
        <header class="endurance-card-head">
          <div class="service-mark"><span class="material-symbols-rounded">sync_alt</span></div>
          <div class="service-copy"><h3>Intervals.icu</h3><p>Training source of truth</p></div>
          <span class="connection-pill" class:connected={intervalsConnected}>
            <span class="status-dot"></span>{intervalsConnected ? 'Connected' : 'Not connected'}
          </span>
        </header>

        <p class="card-copy">Planned workouts shape the forecast. As soon as the activity is completed, the actual session replaces the plan so exercise is never counted twice.</p>

        <label class="field-label" for="intervals-key">API key</label>
        <div class="api-key-field">
          <input id="intervals-key" class="input" type={showApiKey ? 'text' : 'password'} bind:value={intervalsApiKey} placeholder={intervalsConnected ? 'Stored securely — enter a new key to replace it' : 'Paste your Intervals.icu API key'} autocomplete="off" />
          <button class="key-toggle" type="button" on:click={() => showApiKey = !showApiKey} aria-label={showApiKey ? 'Hide API key' : 'Show API key'}>
            <span class="material-symbols-rounded">{showApiKey ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>

        <div class="endurance-actions">
          <button class="btn btn-primary" disabled={connectionBusy || !intervalsApiKey.trim()} on:click={saveConnection}>{intervalsConnected ? 'Replace key' : 'Connect Intervals.icu'}</button>
          <button class="btn btn-secondary" disabled={connectionBusy || (!intervalsConnected && !intervalsApiKey.trim())} on:click={testConnection}>Test</button>
          {#if intervalsConnected}<button class="btn btn-ghost disconnect" disabled={connectionBusy} on:click={disconnectIntervals}>Disconnect</button>{/if}
        </div>
      </section>

      <section class="endurance-card card">
        <header class="endurance-card-head">
          <div class="service-mark"><span class="material-symbols-rounded">tune</span></div>
          <div class="service-copy"><h3>Daily foundation</h3><p>Set once, training varies around it</p></div>
        </header>

        <div class="endurance-grid">
          <label>
            <span class="field-label">Base calories</span>
            <div class="input-with-unit"><input class="input" type="number" min="800" max="6000" step="10" bind:value={baseCalories} /><span>kcal/day</span></div>
            <small>Normal daily living before deliberate exercise.</small>
          </label>
          <label>
            <span class="field-label">Body weight</span>
            <div class="input-with-unit"><input class="input" type="number" min="30" max="250" step="0.1" bind:value={bodyWeightKg} /><span>kg</span></div>
            <small>Used for run estimates and fueling targets.</small>
          </label>
          <label>
            <span class="field-label">Protein floor</span>
            <div class="input-with-unit"><input class="input" type="number" min="1" max="3" step="0.1" bind:value={proteinGPerKg} /><span>g/kg</span></div>
            <small>Daily floor; not scaled endlessly with training load.</small>
          </label>
          <label>
            <span class="field-label">Fat floor</span>
            <div class="input-with-unit"><input class="input" type="number" min="0.4" max="2" step="0.1" bind:value={fatGPerKg} /><span>g/kg</span></div>
            <small>Remaining training energy is mainly carbohydrate.</small>
          </label>
        </div>

        <div class="logic-strip">
          <div><span class="material-symbols-rounded">breakfast_dining</span><span><strong>Real meals</strong><small>Breakfast, lunch and dinner keep sensible floors.</small></span></div>
          <div><span class="material-symbols-rounded">sports</span><span><strong>Fuel timing</strong><small>Pre, during and recovery follow session demand.</small></span></div>
          <div><span class="material-symbols-rounded">bedtime</span><span><strong>Next-day prep</strong><small>Early key sessions can shift carbs into dinner.</small></span></div>
        </div>

        <button class="btn btn-primary save-targets" disabled={configBusy} on:click={saveEnduranceConfig}>{configBusy ? 'Saving…' : 'Save endurance settings'}</button>
      </section>
    </div>
  {/if}
</div>

<style>
  .goals-page { gap:18px; }
  .goal-intro { max-width:680px; padding:4px 2px 0; }
  .goal-intro h2 { margin:4px 0 6px; }
  .goal-intro p, .card-copy, .mode-detail p, .endurance-hero p { color:var(--text-2); font-size:13px; line-height:1.6; }
  .eyebrow { display:block; color:var(--text-3); font-size:10.5px; font-weight:750; letter-spacing:.09em; text-transform:uppercase; }
  .eyebrow.accent { color:var(--accent); }

  .goal-mode-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .goal-mode-card { position:relative; display:flex; align-items:flex-start; gap:12px; width:100%; min-height:94px; padding:15px; text-align:left; color:var(--text-1); background:var(--surface-1); border:1px solid var(--border); border-radius:18px; box-shadow:var(--shadow-sm); transition:border-color var(--dur-fast), background var(--dur-fast), transform var(--dur-fast); }
  .goal-mode-card:hover:not(:disabled) { border-color:var(--border-strong); background:color-mix(in srgb,var(--surface-1) 92%,var(--accent)); }
  .goal-mode-card:active:not(:disabled) { transform:scale(.985); }
  .goal-mode-card.active { border-color:color-mix(in srgb,var(--accent) 55%,var(--border)); box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 15%,transparent),var(--shadow-sm); }
  .goal-mode-card.disabled { opacity:.48; cursor:not-allowed; }
  .mode-icon { width:38px; height:38px; border-radius:12px; background:var(--surface-2); color:var(--text-2); display:flex; align-items:center; justify-content:center; flex:0 0 38px; }
  .mode-icon .material-symbols-rounded { font-size:20px; }
  .goal-mode-card.active .mode-icon { background:var(--accent-dim); color:var(--accent); }
  .mode-copy { min-width:0; display:flex; flex-direction:column; gap:4px; padding-right:20px; }
  .mode-title-row { display:flex; align-items:center; gap:7px; }
  .mode-title { font-size:14px; font-weight:700; }
  .mode-desc { color:var(--text-2); font-size:12px; line-height:1.45; }
  .mode-badge { padding:2px 6px; border-radius:999px; background:var(--accent-dim); color:var(--accent); font-size:9px; font-weight:750; letter-spacing:.04em; text-transform:uppercase; }
  .mode-requirement { color:var(--text-3); font-size:10.5px; }
  .mode-check { position:absolute; right:12px; top:12px; color:transparent; font-size:18px; }
  .goal-mode-card.active .mode-check { color:var(--accent); }

  .mode-detail { display:flex; align-items:flex-start; gap:12px; padding:16px; }
  .mode-detail.stacked { flex-direction:column; }
  .detail-head { display:flex; gap:12px; align-items:flex-start; }
  .detail-icon, .service-mark { width:40px; height:40px; border-radius:13px; background:var(--accent-dim); color:var(--accent); display:flex; align-items:center; justify-content:center; flex:0 0 40px; }
  .detail-icon .material-symbols-rounded, .service-mark .material-symbols-rounded { font-size:21px; }
  .mode-detail strong { font-size:14px; }
  .factor-grid { width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .factor-grid button { padding:11px 8px; border-radius:13px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-2); display:flex; flex-direction:column; gap:1px; }
  .factor-grid button strong { color:var(--text-1); font-size:14px; }
  .factor-grid button span { font-size:11px; }
  .factor-grid button.active { border-color:color-mix(in srgb,var(--accent) 45%,var(--border)); background:var(--accent-dim); }
  .factor-grid button.active strong { color:var(--accent); }
  .detail-link { display:inline-flex; align-items:center; gap:5px; color:var(--accent); font-size:12px; font-weight:650; }
  .detail-link .material-symbols-rounded { font-size:15px; }

  .endurance-hero { padding:20px; border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border)); border-radius:22px; background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 8%,var(--surface-1)),var(--surface-1) 60%); display:grid; grid-template-columns:minmax(0,1fr) auto; gap:22px; align-items:center; box-shadow:var(--shadow-sm); }
  .endurance-hero h2 { max-width:580px; margin:5px 0 7px; }
  .endurance-hero p { max-width:690px; margin:0; }
  .endurance-formula { display:flex; align-items:stretch; gap:7px; }
  .endurance-formula > div { min-width:116px; padding:11px 12px; border-radius:14px; background:var(--surface-2); display:flex; flex-direction:column; gap:2px; }
  .endurance-formula span { color:var(--text-3); font-size:10.5px; }
  .endurance-formula strong { font-size:13px; white-space:nowrap; }
  .endurance-formula .formula-total { background:var(--accent-dim); }
  .endurance-formula .formula-total strong { color:var(--accent); }
  .formula-plus,.formula-equals { align-self:center; font-size:16px!important; font-weight:700; }

  .endurance-layout { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:14px; }
  .endurance-card { padding:18px; overflow:visible; }
  .endurance-card-head { display:flex; align-items:center; gap:11px; margin-bottom:14px; }
  .service-copy { min-width:0; }
  .service-copy h3 { margin:0; font-size:16px; }
  .service-copy p { margin:1px 0 0; color:var(--text-3); font-size:11.5px; }
  .connection-pill { margin-left:auto; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); background:var(--surface-2); border-radius:999px; padding:5px 8px; font-size:10.5px; color:var(--text-3); white-space:nowrap; }
  .status-dot { width:6px; height:6px; border-radius:50%; background:var(--text-3); }
  .connection-pill.connected { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 24%,var(--border)); background:var(--accent-dim); }
  .connection-pill.connected .status-dot { background:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent); }
  .card-copy { margin:0 0 14px; }
  .field-label { display:block; color:var(--text-2); font-size:12px; font-weight:650; margin-bottom:6px; }
  .api-key-field { position:relative; }
  .api-key-field .input { padding-right:46px; }
  .key-toggle { position:absolute; right:4px; top:4px; width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:var(--text-3); }
  .key-toggle:hover { background:var(--surface-2); color:var(--text-1); }
  .key-toggle .material-symbols-rounded { font-size:19px; }
  .endurance-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
  .endurance-actions .disconnect { margin-left:auto; color:var(--danger); }

  .endurance-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; }
  .endurance-grid label { min-width:0; }
  .endurance-grid small { display:block; margin-top:5px; color:var(--text-3); font-size:10.5px; line-height:1.4; }
  .input-with-unit { position:relative; }
  .input-with-unit .input { padding-right:70px; }
  .input-with-unit > span { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--text-3); font-size:10.5px; pointer-events:none; }
  .logic-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:17px 0; }
  .logic-strip > div { min-width:0; padding:11px; border-radius:14px; background:var(--surface-2); display:flex; gap:8px; align-items:flex-start; }
  .logic-strip .material-symbols-rounded { color:var(--accent); font-size:18px; margin-top:1px; }
  .logic-strip span:last-child { min-width:0; display:flex; flex-direction:column; gap:2px; }
  .logic-strip strong { font-size:11.5px; }
  .logic-strip small { color:var(--text-3); font-size:9.8px; line-height:1.35; }
  .save-targets { width:100%; }

  @media (max-width:900px) {
    .endurance-hero { grid-template-columns:1fr; }
    .endurance-formula { width:100%; }
    .endurance-formula > div { flex:1; min-width:0; }
    .endurance-layout { grid-template-columns:1fr; }
  }

  @media (max-width:640px) {
    .goal-mode-grid { grid-template-columns:1fr; }
    .goal-mode-card { min-height:82px; }
    .endurance-hero { padding:17px; }
    .endurance-formula { display:grid; grid-template-columns:1fr 1fr; }
    .endurance-formula .formula-plus,.endurance-formula .formula-equals { display:none; }
    .endurance-formula .formula-total { grid-column:1 / -1; }
    .endurance-grid { grid-template-columns:1fr; }
    .logic-strip { grid-template-columns:1fr; }
    .endurance-actions .btn { flex:1; }
    .endurance-actions .disconnect { flex-basis:100%; margin-left:0; }
  }
</style>
