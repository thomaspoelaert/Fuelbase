<script>
  import { fly, fade } from 'svelte/transition';
  import { cubicOut }  from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { portal } from '../../lib/portal.js';

  export let open   = false;
  export let title  = '';
  export let height = 'auto';
  export let overlayClose = false;

  const dispatch = createEventDispatcher();
  let _locked = false;
  let _lockTimer;
  $: if (open) {
    clearTimeout(_lockTimer);
    _locked = true;
    _lockTimer = setTimeout(() => _locked = false, 400);
  }

  function close() {
    open = false;
    dispatch('close');
  }

  function onBackdropClick(e) {
    if (_locked) return;
    if (e.target === e.currentTarget) close();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div use:portal class="sheet-backdrop" on:click={onBackdropClick}
    in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}>
    <div
      class="sheet-panel"
      class:sheet-full={height === 'full'}
      style={height !== 'auto' && height !== 'full' ? `height:${height}` : ''}
      in:fly={{ y: 48, duration: 240, easing: cubicOut }}
      out:fly={{ y: 48, duration: 170 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="sheet-handle"></div>

      {#if title}
        <div class="sheet-header">
          <h3 class="sheet-title">{title}</h3>
          <button class="sheet-close" on:click={close} aria-label={$_('common.close')} title={$_('common.close')}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      {:else if overlayClose}
        <button class="sheet-close sheet-overlay-close" on:click={close}
          aria-label={$_('common.close')} title={$_('common.close')}>
          <span class="material-symbols-rounded">close</span>
        </button>
      {/if}

      <div class="sheet-body" class:no-title={!title}>
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
    background: var(--overlay);
    backdrop-filter: blur(12px) saturate(110%);
    -webkit-backdrop-filter: blur(12px) saturate(110%);
  }

  .sheet-panel {
    width: 100%;
    max-height: 91dvh;
    padding-bottom: var(--safe-bottom);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    border-bottom: 0;
    border-radius: 28px 28px 0 0;
    box-shadow: var(--shadow-lg);
  }

  .sheet-handle {
    width: 34px;
    height: 4px;
    margin: 10px auto 0;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--border-strong);
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 20px 11px;
    flex-shrink: 0;
  }

  .sheet-title {
    min-width: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -.018em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sheet-close {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: var(--text-2);
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .sheet-close:hover { color: var(--text-1); background: var(--surface-3); }
  .sheet-close .material-symbols-rounded { font-size: 19px; }

  .sheet-overlay-close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 5;
  }

  .sheet-body {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 20px 22px;
  }
  .sheet-body.no-title { padding-top: 18px; }
  .sheet-full { height: 91dvh; }

  @media (min-width: 768px) {
    .sheet-backdrop { align-items: center; padding: 24px; }
    .sheet-panel {
      width: min(720px, 100%);
      max-height: min(86dvh, 820px);
      padding-bottom: 0;
      border-bottom: 1px solid var(--border-strong);
      border-radius: 28px;
    }
    .sheet-handle { display: none; }
    .sheet-header { padding: 20px 22px 13px; }
    .sheet-body { padding-inline: 22px; padding-bottom: 24px; }
  }
</style>
