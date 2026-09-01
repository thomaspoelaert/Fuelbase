<script>
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { portal } from '../../lib/portal.js';

  export let open = false;
  export let title = '';
  export let actions = [];

  const dispatch = createEventDispatcher();
  let _locked = false;
  let _lockTimer;
  $: if (open) {
    clearTimeout(_lockTimer);
    _locked = true;
    _lockTimer = setTimeout(() => _locked = false, 400);
  }
  const pick = (a) => { open = false; dispatch('select', a); };
  const cancel = () => { if (!_locked) { open = false; dispatch('cancel'); } };
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div use:portal class="as-backdrop" on:click={cancel}
    in:fade={{ duration: 170 }} out:fade={{ duration: 130 }}>
    <div
      class="as-panel"
      in:fly={{ y: 42, duration: 220, easing: cubicOut }}
      out:fly={{ y: 42, duration: 160 }}
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Actions'}
    >
      <div class="as-handle"></div>
      {#if title}<p class="as-title">{title}</p>{/if}
      <div class="as-actions">
        {#each actions as action}
          <button class="as-btn" class:danger={action.danger} on:click={() => pick(action)}>
            {#if action.icon}<span class="material-symbols-rounded as-icon">{action.icon}</span>{/if}
            <span>{action.label}</span>
          </button>
        {/each}
      </div>
      <button class="as-cancel" on:click={cancel}>{$_('common.cancel')}</button>
    </div>
  </div>
{/if}

<style>
  .as-backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: var(--overlay);
    backdrop-filter: blur(12px) saturate(110%);
    -webkit-backdrop-filter: blur(12px) saturate(110%);
  }
  .as-panel {
    width: 100%;
    padding: 0 12px calc(12px + var(--safe-bottom));
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    border-bottom: 0;
    border-radius: 28px 28px 0 0;
    box-shadow: var(--shadow-lg);
  }
  .as-handle {
    width: 34px;
    height: 4px;
    margin: 10px auto 5px;
    border-radius: 999px;
    background: var(--border-strong);
  }
  .as-title {
    padding: 3px 6px 5px;
    color: var(--text-2);
    font-size: 13px;
    font-weight: 680;
    letter-spacing: -.006em;
  }
  .as-actions {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .as-btn,
  .as-cancel {
    width: 100%;
    min-height: 50px;
    padding: 11px 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--text-1);
    font-size: 14px;
    font-weight: 590;
    text-align: left;
    cursor: pointer;
  }
  .as-btn:hover,
  .as-cancel:hover { background: var(--surface-2); }
  .as-btn:active,
  .as-cancel:active { background: var(--surface-3); }
  .as-btn.danger { color: var(--danger); }
  .as-icon {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--text-2);
    font-size: 17px;
  }
  .as-btn.danger .as-icon { color: var(--danger); background: color-mix(in srgb,var(--danger) 9%,var(--surface-2)); }
  .as-cancel {
    margin-top: 3px;
    justify-content: center;
    color: var(--text-2);
    background: var(--surface-2);
    font-weight: 650;
  }

  @media (min-width: 768px) {
    .as-backdrop { align-items:center; padding:24px; }
    .as-panel {
      width: min(100%, 440px);
      padding: 14px;
      border-bottom: 1px solid var(--border-strong);
      border-radius: 24px;
    }
    .as-handle { display:none; }
    .as-title { padding-top: 2px; }
  }
</style>
