<script>
  import { fly, fade } from 'svelte/transition';
  import { toasts } from '../../stores/toast.js';
</script>

<div class="toast-container" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      in:fly={{ y: 12, duration: 190 }}
      out:fade={{ duration: 130 }}
    >
      <span class="toast-icon-wrap">
        {#if toast.type === 'success'}
          <span class="material-symbols-rounded toast-icon">check</span>
        {:else if toast.type === 'error'}
          <span class="material-symbols-rounded toast-icon">priority_high</span>
        {:else}
          <span class="material-symbols-rounded toast-icon">info</span>
        {/if}
      </span>
      <span class="toast-msg">{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: calc(var(--nav-h) + var(--safe-bottom) + 12px);
    left: 50%;
    width: min(430px, calc(100vw - 28px));
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 7px;
    z-index: 200;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 9px 12px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--surface-1) 92%, transparent);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-lg);
    color: var(--text-1);
    font-size: 13px;
    font-weight: 560;
    line-height: 1.4;
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
  }
  .toast-icon-wrap {
    width: 29px;
    height: 29px;
    flex: 0 0 29px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--text-2);
  }
  .toast-icon { font-size: 16px; }
  .toast--success .toast-icon-wrap { background: color-mix(in srgb,var(--success) 12%,var(--surface-2)); color: var(--success); }
  .toast--error .toast-icon-wrap { background: color-mix(in srgb,var(--danger) 10%,var(--surface-2)); color: var(--danger); }
  .toast-msg { min-width:0; flex: 1; }

  @media (min-width:768px) {
    .toast-container {
      left: auto;
      right: 22px;
      bottom: 22px;
      width: min(390px, calc(100vw - 44px));
      transform: none;
    }
  }
</style>
