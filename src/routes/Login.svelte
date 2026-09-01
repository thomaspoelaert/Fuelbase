<script>
  import { onMount } from 'svelte';
  import { currentUser, userMgmtActive, loadAuthState } from '../stores/auth.js';
  import { loadServerSettings } from '../stores/settings.js';
  import { showError, showSuccess } from '../stores/toast.js';
  import { push } from 'svelte-spa-router';
  import { slide } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import { apiUrl, isNative, getServerUrl, setAuthToken, resolveAssetUrl, iconUrl } from '../lib/platform.js';

  let username = '';
  let password = '';
  let loading  = false;

  let showRecovery  = false;
  let recovering    = false;
  let recoveryDone  = false;
  let recoveryToken = '';

  let oidcProviders = [];
  let passwordLoginEnabled = true;
  let _biometricReady = false;

  onMount(async () => {
    if (isNative && !getServerUrl()) return;
    try {
      const r = await fetch(apiUrl('/api/auth/status'), { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        if (data?.oidc) {
          oidcProviders = Array.isArray(data.oidc.providers) ? data.oidc.providers : [];
          passwordLoginEnabled = data.oidc.enable_email_password_login !== false;
        }
      }
    } catch {}
    if (isNative && getServerUrl()) {
      try {
        const bio = await import('../lib/biometric.js');
        const [available, saved] = await Promise.all([bio.isAvailable(), bio.readSavedToken()]);
        _biometricReady = available && !!saved;
      } catch {}
    }
  });

  async function biometricLogin() {
    try {
      const bio = await import('../lib/biometric.js');
      const ok = await bio.authenticate($_('login.biometric.prompt'));
      if (!ok) return;
      const saved = await bio.readSavedToken();
      if (!saved) { showError($_('login.biometric.no_saved')); return; }
      setAuthToken(saved);
      await loadAuthState();
      const cached = JSON.parse(localStorage.getItem('nt:cachedUser') || 'null');
      if (!cached) {
        showError($_('login.biometric.expired'));
        await bio.clearSavedToken();
        return;
      }
      currentUser.set(cached);
      await loadServerSettings();
      push('/');
    } catch (e) {
      console.warn('[login] biometric flow failed:', e);
      showError($_('login.biometric.failed'));
    }
  }

  async function startOidc(providerId) {
    const ret = encodeURIComponent(window.location.hash || '#/');
    if (isNative) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({
        url: apiUrl(`/api/auth/oidc/login/${providerId}?mobile=1&return=${ret}`),
        presentationStyle: 'popover',
      });
      return;
    }
    window.location.href = apiUrl(`/api/auth/oidc/login/${providerId}?return=${ret}`);
  }

  async function login() {
    if (!username.trim() || !password) return;
    loading = true;
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || $_('login.errors.failed')); return; }
      if (isNative && data.token) setAuthToken(data.token);
      if (isNative && data.token) {
        try {
          const { biometricLoginEnabled } = await import('../stores/settings.js');
          const { saveTokenForBiometric } = await import('../lib/biometric.js');
          const { get } = await import('svelte/store');
          if (get(biometricLoginEnabled)) await saveTokenForBiometric(data.token);
        } catch {}
      }
      localStorage.setItem('wl:userId', String(data.user.id));
      localStorage.setItem('nt:cachedUser', JSON.stringify(data.user));
      localStorage.setItem('nt:cachedUserMgmt', '1');
      currentUser.set(data.user);
      await loadAuthState();
      await loadServerSettings();
      push('/');
    } catch(e) {
      showError($_('common.errors.cant_reach_server'));
    } finally {
      loading = false;
    }
  }

  async function recover() {
    if (!confirm($_('login.recovery.confirm'))) return;
    recovering = true;
    try {
      const res = await fetch(apiUrl('/api/auth/recover'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recoveryToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || $_('login.recovery.failed')); return; }
      localStorage.removeItem('wl:userId');
      await loadAuthState();
      recoveryDone = true;
      showSuccess($_('login.recovery.success'));
    } catch(e) {
      showError($_('common.errors.cant_reach_server'));
    } finally {
      recovering = false;
    }
  }

  function onKey(e) { if (e.key === 'Enter') login(); }
</script>

<div class="login-page">
  <div class="login-card card">
    <div class="login-logo">
      <img src={iconUrl('/icons/logo.png')} alt="FuelBase" class="logo-img" />
      <h1 class="login-title">FuelBase</h1>
      <p class="text-3 text-sm">{$_('login.subtitle')}</p>
    </div>

    {#if !recoveryDone}
      {#if oidcProviders.length}
        <div class="sso-row">
          {#each oidcProviders as p (p.id)}
            <button class="btn btn-secondary sso-btn" on:click={() => startOidc(p.id)} type="button">
              {#if p.logo_url}
                <img src={resolveAssetUrl(p.logo_url)} alt="" class="sso-logo" />
              {:else}
                <span class="material-symbols-rounded sso-icon">login</span>
              {/if}
              <span>{$_('login.sso_sign_in_with', { values: { provider: p.display_name || 'SSO' } })}</span>
            </button>
          {/each}
        </div>
        {#if passwordLoginEnabled}
          <div class="sso-divider"><span>{$_('login.sso_or')}</span></div>
        {/if}
      {/if}

      {#if passwordLoginEnabled}
        <div class="form-group">
          <label class="form-label">{$_('login.username')}</label>
          <input class="input" type="text" autocomplete="username"
            bind:value={username} on:keydown={onKey}
            placeholder={$_('login.username_placeholder')} autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">{$_('login.password')}</label>
          <input class="input" type="password" autocomplete="current-password"
            bind:value={password} on:keydown={onKey}
            placeholder={$_('login.password_placeholder')} />
        </div>

        <button class="btn btn-primary w-full" class:loading on:click={login} disabled={loading || !username || !password}>
          {loading ? $_('login.signing_in') : $_('login.sign_in')}
        </button>

        {#if _biometricReady}
          <button class="btn btn-secondary w-full" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px"
            on:click={biometricLogin} disabled={loading}>
            <span class="material-symbols-rounded" style="font-size:20px">fingerprint</span>
            <span>{$_('login.biometric.sign_in_button')}</span>
          </button>
        {/if}
      {/if}

      <button class="recovery-link" on:click={() => showRecovery = !showRecovery}>
        <span class="material-symbols-rounded">emergency</span>
        Emergency recovery
      </button>

      {#if showRecovery}
        <div class="recovery-box" transition:slide>
          <p class="text-3 text-xs">Use the server recovery token if you are locked out of your account.</p>
          <input class="input" type="text" bind:value={recoveryToken}
            placeholder={$_('login.recovery.token_placeholder')} />
          <button class="btn btn-danger w-full" class:loading={recovering}
            on:click={recover} disabled={recovering || !recoveryToken.trim()}>
            {recovering ? 'Recovering…' : 'Recover access'}
          </button>
        </div>
      {/if}
    {:else}
      <div class="recovery-done">
        <span class="material-symbols-rounded success-icon">check_circle</span>
        <h3>Recovery complete</h3>
        <p class="text-3 text-sm">You can continue with the recovered server state.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .login-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
      radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 34%),
      var(--bg);
  }
  .login-card {
    width: 100%; max-width: 400px; padding: 32px;
    display: flex; flex-direction: column; gap: 18px;
    border-radius: 24px;
  }
  .login-logo { text-align: center; margin-bottom: 4px; }
  .logo-img { width: 62px; height: 62px; object-fit: contain; margin-bottom: 12px; }
  .login-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; letter-spacing: -.035em; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 12px; font-weight: 650; color: var(--text-2); }
  .w-full { width: 100%; }
  .loading { opacity: .65; pointer-events: none; }
  .sso-row { display:flex; flex-direction:column; gap:8px; }
  .sso-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; }
  .sso-logo { width:20px; height:20px; object-fit:contain; border-radius:3px; }
  .sso-icon { font-size:20px; }
  .sso-divider { display:flex; align-items:center; gap:10px; margin:2px 0; color:var(--text-3); font-size:11px; }
  .sso-divider::before,.sso-divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .recovery-link {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: none; border: none; color: var(--text-3); font-size: 12px;
    cursor: pointer; padding: 4px; margin-top: 2px;
  }
  .recovery-link:hover { color: var(--text-2); }
  .recovery-link .material-symbols-rounded { font-size: 15px; }
  .recovery-box {
    display: flex; flex-direction: column; gap: 12px;
    padding: 16px; border: 1px solid var(--border); border-radius: 14px;
    background: var(--surface-2);
  }
  .recovery-done { text-align: center; padding: 12px 0; }
  .success-icon { font-size: 48px; color: var(--accent); margin-bottom: 8px; }
</style>
