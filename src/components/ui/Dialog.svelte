<script>
  import { scale, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { portal } from '../../lib/portal.js';

  export let open    = false;
  export let title   = '';
  export let message = '';
  export let confirmText = 'OK';
  export let cancelText  = 'Cancel';
  export let dangerous   = false;
  export let confirmDisabled = false;
  export let manualClose = false;

  const dispatch = createEventDispatcher();
  let _locked = false;
  let _lockTimer;
  $: if (open) {
    clearTimeout(_lockTimer);
    _locked = true;
    _lockTimer = setTimeout(() => _locked = false, 400);
  }
  const confirm = () => {
    if (confirmDisabled) return;
    if (!manualClose) open = false;
    dispatch('confirm');
  };
  const cancel = () => { if (!_locked) { open = false; dispatch('cancel'); } };
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div use:portal class="dialog-backdrop" on:click={cancel}
    in:fade={{ duration: 170 }} out:fade={{ duration: 130 }}>
    <div
      class="dialog-box"
      in:scale={{ start: 0.96, duration: 190, easing: cubicOut }}
      out:scale={{ start: 0.97, duration: 130 }}
      on:click|stopPropagation
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
    >
      {#if title}<h3 class="dialog-title" id="dlg-title">{title}</h3>{/if}
      {#if message}<p class="dialog-msg">{message}</p>{/if}
      <div class="dialog-content"><slot /></div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" on:click={cancel}>{cancelText}</button>
        <button class="btn {dangerous ? 'btn-danger' : 'btn-primary'}" disabled={confirmDisabled} on:click={confirm}>{confirmText}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 600;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--overlay);
    backdrop-filter: blur(12px) saturate(110%);
    -webkit-backdrop-filter: blur(12px) saturate(110%);
  }
  .dialog-box {
    width: min(100%, 390px);
    padding: 24px;
    background: var(--surface-1);
    border: 1px solid var(--border-strong);
    border-radius: 24px;
    box-shadow: var(--shadow-lg);
  }
  .dialog-title {
    margin: 0 0 8px;
    font-size: 19px;
    font-weight: 720;
    line-height: 1.25;
    letter-spacing: -.022em;
  }
  .dialog-msg {
    margin: 0 0 18px;
    color: var(--text-2);
    font-size: 14px;
    line-height: 1.6;
  }
  .dialog-content:empty { display:none; }
  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 22px;
  }
  .dialog-actions .btn { width: 100%; }
  @media (max-width: 360px) {
    .dialog-box { padding: 20px; border-radius: 22px; }
  }
</style>
