<!--
  AuthDialog.svelte
  IIIF Authorization Flow 2.0 dialog widget.
  Migrated from React AuthDialog.tsx (369 lines).

  Handles three auth profiles: active (login window), kiosk (auto-token), external (redirect).
  Flow: auto-probe on mount -> login prompt -> logging in -> result.
-->

<script lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import { Icon } from '@/src/shared/ui/atoms';
  import { ModalDialog } from '@/src/shared/ui/molecules';
  import { toast } from '@/src/shared/stores/toast.svelte';

  import type { AuthAccessService2 } from '@/src/shared/types/auth-api';
  import {
    detectProbeService,
    findTokenService,
    openAccessService,
    requestToken,
    probeResource,
    authStatusFromProbe,
  } from '@/src/shared/services/authFlowService';
  // AuthService is the general union; AuthDialog specifically handles access services
  type AuthService = AuthAccessService2;

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  type AuthState = 'authenticated' | 'degraded' | 'failed';

  type AuthFlowState =
    | 'idle'
    | 'probing'
    | 'prompt'
    | 'loggingIn'
    | 'complete'
    | 'error';

  type AuthProfile = 'active' | 'kiosk' | 'external';

  interface ProbeResult {
    status: number;
    contentLocation?: string;
    errorMessage?: string;
    substitute?: { id: string; width?: number; height?: number };
  }

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    authServices: AuthService[];
    resourceId: string;
    onComplete: (state: AuthState) => void;
    onClose: () => void;
    preferredLang?: string;
  }

  let {
    authServices,
    resourceId,
    onComplete,
    onClose,
    preferredLang = 'en',
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let flowState: AuthFlowState = $state('idle');
  let probeResult: ProbeResult | null = $state(null);
  let isLoggingIn: boolean = $state(false);
  let activeServiceIndex: number = $state(0);
  let loginWindowRef: Window | null = $state(null);
  let errorMessage: string = $state('');

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const activeService = $derived(authServices[activeServiceIndex] ?? null);

  const authProfile = $derived.by((): AuthProfile => {
    if (!activeService) return 'active';
    const profile = activeService.profile ?? '';
    if (profile.includes('kiosk')) return 'kiosk';
    if (profile.includes('external')) return 'external';
    return 'active';
  });

  const serviceLabel = $derived(
    activeService
      ? getLocalizedValue(activeService.label, preferredLang)
      : 'Authentication Required'
  );

  const serviceDescription = $derived(
    activeService
      ? getLocalizedValue(activeService.description, preferredLang)
      : 'This resource requires authentication to access.'
  );

  const confirmLabel = $derived(
    activeService
      ? getLocalizedValue(activeService.confirmLabel, preferredLang)
      : 'Login'
  );

  const isComplete = $derived((flowState as AuthFlowState) === 'complete');
  const isError = $derived((flowState as AuthFlowState) === 'error');
  const isProbing = $derived((flowState as AuthFlowState) === 'probing');
  const showLoginPrompt = $derived((flowState as AuthFlowState) === 'prompt');
  const hasDegradedSubstitute = $derived.by(() => {
    const pr = probeResult as ProbeResult | null;
    return pr != null && pr.substitute != null && (flowState as AuthFlowState) === 'prompt';
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Extract localized string from IIIF language map or plain string */
  function getLocalizedValue(
    value: string | Record<string, string[]> | undefined,
    lang: string
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[lang]?.[0] ?? value['en']?.[0] ?? value['none']?.[0] ?? '';
  }

  /**
   * Probe the auth service to determine current auth status.
   * Sends a HEAD/GET request to the probe service endpoint.
   */
  async function probeService(service: AuthService): Promise<ProbeResult> {
    const probeSvc = detectProbeService(service.service);
    if (!probeSvc) {
      return { status: 401, errorMessage: 'No probe service found' };
    }

    try {
      const response = await probeResource(probeSvc.id);
      const sub = response.substitute?.[0];
      return {
        status: response.status,
        contentLocation: response.location?.id,
        errorMessage: response.note?.en?.[0],
        substitute: sub
          ? { id: sub.id, width: sub.width, height: sub.height }
          : undefined,
      };
    } catch (e: unknown) {
      return { status: 0, errorMessage: e instanceof Error ? e.message : 'Probe request failed' };
    }
  }

  /**
   * Exchange the auth cookie/token for an access token
   * by hitting the token service endpoint.
   */
  async function fetchAccessToken(
    service: AuthService
  ): Promise<{ accessToken?: string; error?: string }> {
    const tokenSvc = findTokenService(service);
    if (!tokenSvc) {
      return { error: 'No token service found' };
    }

    try {
      const tokenResp = await requestToken(tokenSvc);
      return { accessToken: tokenResp.accessToken };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Token exchange failed';
      return { error: message };
    }
  }

  /** Open a login window for the active auth profile */
  function openLoginWindow(service: AuthService): void {
    const handle = openAccessService(service);
    // openAccessService returns { close, type } -- for 'window' type we need the
    // actual window ref for polling. Fall back to window.open directly.
    const w = window.open(service.id, '_blank', 'width=600,height=700');
    loginWindowRef = w;
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleProbe(): Promise<void> {
    if (!activeService) return;
    flowState = 'probing';
    errorMessage = '';

    try {
      const result = await probeService(activeService);
      probeResult = result;

      if (result.status === 200) {
        // Already authenticated
        flowState = 'complete';
        onComplete('authenticated');
      } else if (authProfile === 'kiosk') {
        // Kiosk: auto-fetch token without user interaction
        await handleKioskFlow();
      } else {
        // Active/External: show login prompt
        flowState = 'prompt';
      }
    } catch (e: unknown) {
      flowState = 'error';
      errorMessage = e instanceof Error ? e.message : 'Probe failed';
    }
  }

  async function handleKioskFlow(): Promise<void> {
    if (!activeService) return;
    flowState = 'loggingIn';

    try {
      const tokenResult = await fetchAccessToken(activeService);
      if (tokenResult.accessToken) {
        flowState = 'complete';
        onComplete('authenticated');
      } else {
        flowState = 'error';
        errorMessage = tokenResult.error ?? 'Token exchange failed';
        onComplete('failed');
      }
    } catch (e: unknown) {
      flowState = 'error';
      errorMessage = e instanceof Error ? e.message : 'Kiosk auth failed';
      onComplete('failed');
    }
  }

  async function handleLogin(): Promise<void> {
    if (!activeService) return;
    isLoggingIn = true;
    flowState = 'loggingIn';

    openLoginWindow(activeService);

    // Poll for login window close + listen for postMessage completion
    await new Promise<void>((resolve) => {
      const pollInterval = setInterval(() => {
        if (loginWindowRef?.closed) {
          clearInterval(pollInterval);
          resolve();
        }
      }, 500);

      // TODO(loop): Add postMessage listener for token exchange when auth
      // service sends token directly via postMessage instead of cookie flow.
      // For now, rely on window close detection followed by token exchange.
    });

    await handlePostLogin();
  }

  async function handlePostLogin(): Promise<void> {
    if (!activeService) return;

    try {
      const tokenResult = await fetchAccessToken(activeService);
      isLoggingIn = false;

      if (tokenResult.accessToken) {
        flowState = 'complete';
        onComplete('authenticated');
        toast.success('Authentication successful');
      } else if (tokenResult.error === 'missingCredentials') {
        flowState = 'complete';
        onComplete('degraded');
        toast.warning('Access granted with limited permissions');
      } else {
        flowState = 'error';
        errorMessage = tokenResult.error ?? 'Authentication failed';
        onComplete('failed');
      }
    } catch (e: unknown) {
      isLoggingIn = false;
      flowState = 'error';
      errorMessage = e instanceof Error ? e.message : 'Post-login failed';
      onComplete('failed');
    }
  }

  function handleUseDegraded(): void {
    onComplete('degraded');
    onClose();
  }

  function handleTryNextService(): void {
    if (activeServiceIndex < authServices.length - 1) {
      activeServiceIndex++;
      flowState = 'idle';
      probeResult = null;
      errorMessage = '';
      // Will re-trigger probe via effect
    } else {
      onComplete('failed');
      onClose();
    }
  }

  function handleDismiss(): void {
    if (loginWindowRef && !loginWindowRef.closed) {
      loginWindowRef.close();
    }
    onClose();
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Auto-probe on mount and when activeServiceIndex changes
  $effect(() => {
    // Track dependency
    const _idx = activeServiceIndex;
    const _services = authServices;

    if (_services.length > 0) {
      handleProbe();
    }

    return () => {
      // Cleanup: close any open login window
      if (loginWindowRef && !loginWindowRef.closed) {
        loginWindowRef.close();
      }
    };
  });
</script>

<!-- ======================================================================= -->
<!-- TEMPLATE                                                                -->
<!-- ======================================================================= -->

<div class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
  <div class="bg-nb-white shadow-brutal-lg max-w-md w-full overflow-hidden border border-nb-black/20">

    <!-- Header -->
    <div class="p-6 border-b">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-nb-orange/20 flex items-center justify-center text-nb-orange">
          <Icon name="lock" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-nb-black">{serviceLabel}</h2>
          <p class="text-[10px] font-bold uppercase tracking-widest text-nb-black/40">IIIF Authorization Flow 2.0</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">

      {#if isProbing}
        <!-- Probing state: CSS spinner + checking message -->
        <div class="flex flex-col items-center py-8">
          <div class="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-nb-black/50">Checking access...</p>
        </div>

      {:else if showLoginPrompt && !hasDegradedSubstitute}
        <!-- Unauthenticated prompt state: description + profile-specific instructions -->
        <p class="mb-6 text-nb-black/50">{serviceDescription}</p>

        {#if authProfile === 'active'}
          <div class="bg-nb-blue/10 border border-nb-blue/20 p-4 mb-4">
            <div class="flex items-start gap-3">
              <Icon name="info" class="text-nb-blue mt-0.5" />
              <div class="text-sm text-nb-blue">
                You will be redirected to a login page. After logging in, return here to continue.
              </div>
            </div>
          </div>
        {:else if authProfile === 'kiosk'}
          <div class="bg-nb-green/10 border border-nb-green/20 p-4 mb-4">
            <div class="flex items-start gap-3">
              <Icon name="verified_user" class="text-nb-green mt-0.5" />
              <div class="text-sm text-nb-green">
                Access will be granted automatically based on your network location.
              </div>
            </div>
          </div>
        {:else if authProfile === 'external'}
          <div class="bg-nb-purple/5 border border-nb-purple/10 p-4 mb-4">
            <div class="flex items-start gap-3">
              <Icon name="open_in_new" class="text-nb-purple mt-0.5" />
              <div class="text-sm text-nb-purple">
                Authentication is handled by an external service. You may need to log in separately.
              </div>
            </div>
          </div>
        {/if}

      {:else if showLoginPrompt && hasDegradedSubstitute}
        <!-- Degraded state: restricted access with substitute available -->
        <p class="mb-4 text-nb-black/50">{serviceDescription}</p>

        <div class="bg-nb-orange/10 border border-nb-orange/20 p-4 mb-4">
          <div class="flex items-start gap-3">
            <Icon name="warning" class="text-nb-orange mt-0.5" />
            <div>
              <p class="text-sm font-medium text-nb-orange mb-1">
                Restricted Access
              </p>
              <p class="text-xs text-nb-orange">
                Full access requires authentication. A lower-quality substitute is available.
              </p>
            </div>
          </div>
        </div>

        {#if probeResult?.substitute}
          <div class="border p-3 mb-4">
            <p class="text-xs font-medium mb-1 text-nb-black/50">Available substitute:</p>
            <p class="text-sm font-mono truncate text-nb-black">
              {probeResult.substitute.id}
            </p>
            {#if probeResult.substitute.width && probeResult.substitute.height}
              <p class="text-xs mt-1 text-nb-black/50">
                {probeResult.substitute.width} x {probeResult.substitute.height}
              </p>
            {/if}
          </div>
        {/if}

      {:else if flowState === 'loggingIn'}
        <!-- Logging in state: spinner + waiting message -->
        <div class="flex flex-col items-center py-8">
          <div class="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-nb-black/50">
            {authProfile === 'kiosk'
              ? 'Obtaining access...'
              : 'Waiting for authentication...'}
          </p>
        </div>

      {:else if isComplete}
        <!-- Complete state: success icon + message -->
        <div class="flex flex-col items-center py-8">
          <div class="w-16 h-16 bg-nb-green/20 flex items-center justify-center text-nb-green mb-4">
            <Icon name="check_circle" class="text-3xl" />
          </div>
          <p class="text-lg font-semibold text-nb-green">Access Granted</p>
          <p class="text-sm mt-1 text-nb-black/50">You can now view this resource.</p>
        </div>

      {:else if isError}
        <!-- Error state: error details -->
        <div class="bg-nb-red/10 border border-nb-red/30 p-4">
          <div class="flex items-start gap-3">
            <Icon name="error" class="text-nb-red mt-0.5" />
            <div>
              <p class="text-sm font-medium text-nb-red mb-1">
                Authentication Error
              </p>
              <p class="text-xs text-nb-red">
                {errorMessage || 'An error occurred during authentication.'}
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="p-4 border-t flex gap-3 justify-end">
      <Button variant="ghost" size="sm" onclick={handleDismiss}>
        Cancel
      </Button>

      {#if showLoginPrompt && !hasDegradedSubstitute}
        <Button
          variant="primary"
          size="sm"
          onclick={handleLogin}
          disabled={isLoggingIn}
        >
          {#if isLoggingIn}
            Logging in...
          {:else}
            <Icon name="login" class="mr-1" />
            {confirmLabel}
          {/if}
        </Button>
      {/if}

      {#if showLoginPrompt && hasDegradedSubstitute}
        <Button variant="secondary" size="sm" onclick={handleUseDegraded}>
          Use Substitute
        </Button>
        <Button
          variant="primary"
          size="sm"
          onclick={handleLogin}
          disabled={isLoggingIn}
        >
          {#if isLoggingIn}
            Logging in...
          {:else}
            <Icon name="login" class="mr-1" />
            {confirmLabel}
          {/if}
        </Button>
      {/if}

      {#if isComplete}
        <Button variant="primary" size="sm" onclick={() => { onComplete('authenticated'); handleDismiss(); }}>
          Continue
        </Button>
      {/if}

      {#if isError}
        {#if activeServiceIndex < authServices.length - 1}
          <Button variant="secondary" size="sm" onclick={handleTryNextService}>
            Try Another Method
          </Button>
        {/if}
        <Button variant="primary" size="sm" onclick={handleProbe}>
          Retry
        </Button>
      {/if}
    </div>

    <!-- Resource ID reference (subtle) -->
    <div class="px-4 pb-3 text-xs text-nb-black/30 truncate">
      Resource: {resourceId}
    </div>
  </div>
</div>
