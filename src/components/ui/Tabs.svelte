<script>
  import { createEventDispatcher } from 'svelte';
  export let tabs   = [];
  export let active = 0;

  const dispatch = createEventDispatcher();
  function select(i) { active = i; dispatch('change', tabs[i]); }

  $: _pillLeft  = `calc(4px + ${active} * (100% - 8px) / ${tabs.length})`;
  $: _pillWidth = `calc((100% - 8px) / ${tabs.length})`;
</script>

<div class="tabs-bar" role="tablist">
  <div class="tabs-pill" style="left:{_pillLeft};width:{_pillWidth}" aria-hidden="true"></div>
  {#each tabs as tab, i}
    <button
      class="tab-btn"
      class:active={i === active}
      role="tab"
      aria-selected={i === active}
      on:click={() => select(i)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs-bar {
    display: flex;
    min-height: 44px;
    padding: 4px;
    position: relative;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 15px;
  }
  .tabs-pill {
    position: absolute;
    top: 4px;
    bottom: 4px;
    border-radius: 11px;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-sm);
    transition: left var(--dur-base, 220ms) var(--ease-inout, cubic-bezier(.4,0,.2,1));
    pointer-events: none;
    z-index: 0;
  }
  .tab-btn {
    flex: 1;
    min-width: 0;
    min-height: 34px;
    padding: 7px 12px;
    border-radius: 11px;
    color: var(--text-3);
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.005em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    position: relative;
    z-index: 1;
    transition: color var(--dur-fast);
  }
  .tab-btn.active { color: var(--text-1); }
  .tab-btn:active { transform: scale(.98); }
</style>
