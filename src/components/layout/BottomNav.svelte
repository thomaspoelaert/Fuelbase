<script>
  import { location, push } from 'svelte-spa-router';
  import { _ } from 'svelte-i18n';
  import { wellnessEnabled, fitbitEnabled, withingsEnabled, garminEnabled, googleHealthEnabled, healthConnectEnabled, calorieGoalMode } from '../../stores/settings.js';
  import WellnessIcon from '../icons/WellnessIcon.svelte';
  import EnduranceMobileBar from '../diary/EnduranceMobileBar.svelte';
  import { updateAvailable } from '../../lib/updates.js';
  import { pwaUpdateReady } from '../../lib/pwa-update.js';

  $: BASE_TABS = [
    { path: '/',            icon: 'calendar_today', label: $_('nav.diary')      },
    { path: '/foods',       icon: 'restaurant',     label: $_('nav.foods')      },
    { path: '/statistics',  icon: 'monitoring',     label: $_('nav.statistics') },
    { path: '/goals',       icon: 'flag',           label: $_('nav.goals')      },
    { path: '/settings',    icon: 'settings',       label: $_('nav.settings')   },
  ];

  $: WELLNESS_TAB = { path: '/wellness', customIcon: WellnessIcon, label: $_('nav.wellness') };
  $: showWellness = $wellnessEnabled && ($fitbitEnabled || $withingsEnabled || $garminEnabled || $googleHealthEnabled || $healthConnectEnabled);
  $: tabs = showWellness
    ? [...BASE_TABS.slice(0, 2), WELLNESS_TAB, ...BASE_TABS.slice(2)]
    : BASE_TABS;

  $: activePath = $location.split('?')[0];
  $: activeIdx = (() => {
    const base = activePath;
    let idx = tabs.findIndex(t => t.path !== '/' && (base === t.path || base.startsWith(t.path + '/')));
    if (idx < 0) idx = tabs.findIndex(t => t.path === base);
    return idx >= 0 ? idx : 0;
  })();

  function go(path) { push(path); }
</script>

{#if $calorieGoalMode === 'endurance' && activePath === '/'}
  <EnduranceMobileBar />
{/if}

<nav class="bottom-nav" role="navigation" aria-label="Main navigation">
  <div
    class="nav-pill"
    style="left: calc({(activeIdx / tabs.length * 100).toFixed(2)}%); width: calc(100% / {tabs.length})"
    aria-hidden="true"
  ></div>

  {#each tabs as tab, i}
    <button
      class="nav-tab"
      class:active={i === activeIdx}
      on:click={() => go(tab.path)}
      aria-label={tab.label}
      aria-current={i === activeIdx ? 'page' : undefined}
    >
      {#if tab.customIcon}
        <span class="nav-icon custom-icon"><svelte:component this={tab.customIcon} /></span>
      {:else}
        <span class="material-symbols-rounded nav-icon">
          {tab.icon}
          {#if tab.path === '/settings' && ($updateAvailable.available || $pwaUpdateReady)}
            <span class="nav-update-dot" aria-label="Update available"></span>
          {/if}
        </span>
      {/if}
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(10px + var(--safe-bottom));
    height: 64px;
    background: var(--glass-surface);
    backdrop-filter: blur(20px) saturate(135%);
    -webkit-backdrop-filter: blur(20px) saturate(135%);
    border: 1px solid var(--border-strong);
    border-radius: 22px;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: stretch;
    overflow: hidden;
    z-index: 50;
  }

  .nav-pill {
    position: absolute;
    top: 6px;
    height: 52px;
    background: var(--accent-dim);
    border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
    border-radius: 16px;
    transform: scaleX(.88);
    transform-origin: center;
    transition: left var(--dur-base) var(--ease-inout);
    pointer-events: none;
  }

  .nav-tab {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    padding: 7px 2px 6px;
    position: relative;
    transition: color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
    -webkit-tap-highlight-color: transparent;
  }
  .nav-tab.active { color: var(--text-1); }
  .nav-tab:active { transform: scale(.95); }

  .nav-icon {
    position: relative;
    font-size: 22px;
    transition: color var(--dur-fast) var(--ease-out);
  }
  .nav-tab.active .nav-icon { color: var(--accent); }
  .nav-icon.custom-icon { display: flex; align-items: center; justify-content: center; }

  .nav-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10.5px;
    font-weight: 620;
    letter-spacing: 0;
    text-transform: none;
  }

  .nav-update-dot {
    position: absolute;
    top: -1px;
    right: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px var(--glass-surface);
  }
</style>
