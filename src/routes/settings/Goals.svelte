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

<div class="section-body">
  <div class="card settings-card">
    <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px">
      <div>
        <span class="setting-label">{$_('settings_goals.calorie_goal_mode')}</span>
        <div class="setting-desc">{$_('settings_goals.calorie_goal_mode_desc')}</div>
      </div>
      <div class="seg-control" style="width:100%;--seg-count:4;--seg-active:{$calorieGoalMode === 'fixed' ? 0 : $calorieGoalMode === 'dynamic' ? 1 : $calorieGoalMode === 'adaptive' ? 2 : 3}">
        <button class="seg-opt" class:seg-active={$calorieGoalMode === 'fixed'} on:click={() => calorieGoalMode.set('fixed')}>{$_('settings_goals.mode_fixed')}</button>
        <button class="seg-opt" class:seg-active={$calorieGoalMode === 'dynamic'} disabled={!_hasWearable} title={!_hasWearable ? 'Connect a wearable in Wellness first' : ''} on:click={() => _hasWearable && calorieGoalMode.set('dynamic')}>{$_('settings_goals.mode_dynamic')}</button>
        <button class="seg-opt" class:seg-active={$calorieGoalMode === 'adaptive'} on:click={() => calorieGoalMode.set('adaptive')}>{$_('settings_goals.mode_adaptive')}</button>
        <button class="seg-opt" class:seg-active={$calorieGoalMode === 'endurance'} on:click={() => calorieGoalMode.set('endurance')}>Endurance</button>
      </div>
      {#if !_hasWearable && $calorieGoalMode === 'dynamic'}
        <p class="setting-desc" style="padding:4px 0 0;font-size:12px;line-height:1.4">{$_('settings_goals.dynamic_needs_wearable')} <a href="#/settings/wellness" class="about-link">{$_('settings_goals.dynamic_needs_wearable_setup')}</a>.</p>
      {/if}
    </div>

    {#if $calorieGoalMode === 'fixed'}
      <div class="setting-divider"></div>
      <p class="setting-desc" style="padding:8px var(--page-px)">Uses the calorie target from your goal templates as the daily goal.</p>
    {:else if $calorieGoalMode === 'dynamic'}
      <div class="setting-divider"></div>
      <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="setting-label">{$_('settings_goals.goal_factor')}</span>
        <div class="seg-control" style="width:100%;--seg-count:3;--seg-active:{$calorieGoalFactor === 0.8 ? 0 : $calorieGoalFactor === 1.2 ? 2 : 1}">
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 0.8} on:click={() => calorieGoalFactor.set(0.8)}>Lose −20%</button>
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 1.0} on:click={() => calorieGoalFactor.set(1.0)}>{$_('settings_goals.factor_maintain')}</button>
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 1.2} on:click={() => calorieGoalFactor.set(1.2)}>Gain +20%</button>
        </div>
      </div>
      <div class="setting-divider"></div>
      <p class="setting-desc" style="padding:8px var(--page-px)">Uses yesterday's final calorie burn from your wearable, multiplied by the factor. Falls back to your fixed goal if no data is available.</p>
    {:else if $calorieGoalMode === 'adaptive'}
      <div class="setting-divider"></div>
      <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px">
        <span class="setting-label">{$_('settings_goals.goal_factor')}</span>
        <div class="seg-control" style="width:100%;--seg-count:3;--seg-active:{$calorieGoalFactor === 0.8 ? 0 : $calorieGoalFactor === 1.2 ? 2 : 1}">
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 0.8} on:click={() => calorieGoalFactor.set(0.8)}>Lose −20%</button>
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 1.0} on:click={() => calorieGoalFactor.set(1.0)}>{$_('settings_goals.factor_maintain')}</button>
          <button class="seg-opt" class:seg-active={$calorieGoalFactor === 1.2} on:click={() => calorieGoalFactor.set(1.2)}>Gain +20%</button>
        </div>
      </div>
      <div class="setting-divider"></div>
      <p class="setting-desc" style="padding:8px var(--page-px);line-height:1.5">{$_('settings_goals.adaptive_note')} <a href="https://github.com/TraceApps/nutritrace#adaptive-tdee" target="_blank" rel="noopener" class="about-link">{$_('settings_goals.how_it_works')}</a></p>
    {:else if $calorieGoalMode === 'endurance'}
      <div class="setting-divider"></div>
      <div class="endurance-panel">
        <div>
          <div class="endurance-heading">
            <div><span class="setting-label">Intervals.icu</span><div class="setting-desc">Planned workouts and completed activities drive training energy and fueling.</div></div>
            <span class:connected={intervalsConnected} class="connection-pill">{intervalsConnected ? 'Connected' : 'Not connected'}</span>
          </div>
          <div class="endurance-key-row">
            <input class="form-input" type={showApiKey ? 'text' : 'password'} bind:value={intervalsApiKey} placeholder={intervalsConnected ? 'Stored securely — enter a new key to replace' : 'Intervals.icu API key'} autocomplete="off" />
            <button class="btn btn-ghost" on:click={() => showApiKey = !showApiKey}>{showApiKey ? 'Hide' : 'Show'}</button>
          </div>
          <div class="endurance-actions">
            <button class="btn btn-primary" disabled={connectionBusy || !intervalsApiKey.trim()} on:click={saveConnection}>{intervalsConnected ? 'Replace key' : 'Connect'}</button>
            <button class="btn btn-ghost" disabled={connectionBusy || (!intervalsConnected && !intervalsApiKey.trim())} on:click={testConnection}>Test</button>
            {#if intervalsConnected}<button class="btn btn-ghost" disabled={connectionBusy} on:click={disconnectIntervals}>Disconnect</button>{/if}
          </div>
        </div>

        <div class="setting-divider"></div>
        <div>
          <span class="setting-label">Daily base & macro floors</span>
          <div class="setting-desc">Base calories cover normal daily living. Exercise energy from Intervals.icu is added separately; fueling is allocated inside that total.</div>
          <div class="endurance-grid">
            <label><span>Base kcal/day</span><input class="form-input" type="number" min="800" max="6000" step="10" bind:value={baseCalories} /></label>
            <label><span>Body weight (kg)</span><input class="form-input" type="number" min="30" max="250" step="0.1" bind:value={bodyWeightKg} /></label>
            <label><span>Protein (g/kg)</span><input class="form-input" type="number" min="1" max="3" step="0.1" bind:value={proteinGPerKg} /></label>
            <label><span>Fat (g/kg)</span><input class="form-input" type="number" min="0.4" max="2" step="0.1" bind:value={fatGPerKg} /></label>
          </div>
          <button class="btn btn-primary" disabled={configBusy} on:click={saveEnduranceConfig}>Save endurance settings</button>
          <p class="endurance-note">Breakfast, lunch and dinner keep realistic minimum meal sizes. Extra training energy is biased toward pre-workout, during-workout and recovery windows. Early next-day quality sessions can shift carbohydrate emphasis to dinner without adding extra calories.</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .endurance-panel { padding:12px var(--page-px) 16px; display:flex; flex-direction:column; gap:14px; }
  .endurance-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .connection-pill { border:1px solid var(--border); border-radius:var(--radius-full); padding:4px 8px; font-size:11px; color:var(--text-3); white-space:nowrap; }
  .connection-pill.connected { color:var(--accent); border-color:var(--accent); }
  .endurance-key-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
  .endurance-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .endurance-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:12px 0; }
  .endurance-grid label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--text-2); }
  .form-input { width:100%; box-sizing:border-box; background:var(--surface-1); color:var(--text-1); border:1px solid var(--border); border-radius:var(--radius-md); padding:9px 10px; font:inherit; }
  .endurance-note { margin:12px 0 0; font-size:12px; line-height:1.5; color:var(--text-3); }
  @media (max-width:640px) { .endurance-grid { grid-template-columns:1fr; } }
</style>
