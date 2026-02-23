/**
 * Authorization Flow API 2.0 Service — Framework-agnostic
 *
 * Orchestrates the IIIF Auth 2.0 flow:
 * 1. Detect auth services on manifests
 * 2. Determine interaction pattern (active/kiosk/external)
 * 3. Acquire access tokens via hidden iframe + postMessage
 * 4. Probe resources to check authorization status
 * 5. Persist tokens in sessionStorage for page reloads
 *
 * @see https://iiif.io/api/auth/2.0/
 */

import type {
  AuthAccessService2,
  AuthAccessTokenService2,
  AuthProbeService2,
  AuthLogoutService2,
  AuthTokenResponse,
  AuthProbeResponse,
  AuthStatus,
  StoredToken,
} from '@/src/shared/types/auth-api';

// ---------------------------------------------------------------------------
// Service Detection
// ---------------------------------------------------------------------------

/**
 * Extract auth services from a manifest's `services` array.
 * Returns all AuthAccessService2 descriptors found at any depth.
 */
export function detectAuthServices(
  services: unknown[],
): AuthAccessService2[] {
  const results: AuthAccessService2[] = [];

  function walk(items: unknown[]): void {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (obj.type === 'AuthAccessService2') {
        results.push(obj as unknown as AuthAccessService2);
      }
      // Recurse into nested service arrays
      if (Array.isArray(obj.service)) walk(obj.service);
    }
  }

  walk(services);
  return results;
}

/**
 * Extract probe services from a resource's `service` array.
 * The probe service is typically on the content resource (image, video)
 * rather than the manifest.
 */
export function detectProbeService(
  services: unknown[],
): AuthProbeService2 | null {
  for (const item of services) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (obj.type === 'AuthProbeService2') return obj as unknown as AuthProbeService2;
  }
  return null;
}

/**
 * Find the token service nested inside an access service.
 */
export function findTokenService(
  accessService: AuthAccessService2,
): AuthAccessTokenService2 | null {
  for (const svc of accessService.service) {
    if (svc.type === 'AuthAccessTokenService2') return svc;
  }
  return null;
}

/**
 * Find the logout service nested inside an access service.
 */
export function findLogoutService(
  accessService: AuthAccessService2,
): AuthLogoutService2 | null {
  for (const svc of accessService.service) {
    if (svc.type === 'AuthLogoutService2') return svc as AuthLogoutService2;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Token Acquisition via iframe + postMessage
// ---------------------------------------------------------------------------

/**
 * Open the access service URL to initiate authentication.
 *
 * For `active` profile: opens in a new window/tab for user login.
 * For `kiosk` profile: opens in a hidden iframe (automatic, no user interaction).
 * For `external` profile: no window needed — user should already be authenticated.
 *
 * Returns a handle to close the window/iframe when done.
 */
export function openAccessService(
  accessService: AuthAccessService2,
): { close: () => void; type: 'window' | 'iframe' } {
  if (accessService.profile === 'kiosk') {
    // Kiosk: hidden iframe, no user interaction needed
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = accessService.id;
    document.body.appendChild(iframe);
    return {
      close: () => iframe.remove(),
      type: 'iframe',
    };
  }

  // Active: new window for user login
  const win = window.open(accessService.id, '_blank', 'width=600,height=700');
  return {
    close: () => win?.close(),
    type: 'window',
  };
}

/**
 * Request an access token from the token service via hidden iframe + postMessage.
 *
 * Per the spec: create an iframe pointing to the token service URL with `?messageId=X&origin=Y`.
 * The iframe will postMessage back with the token or an error.
 *
 * Returns a promise that resolves with the token or rejects with an error.
 * Times out after `timeoutMs` (default 30 seconds).
 */
export function requestToken(
  tokenService: AuthAccessTokenService2,
  timeoutMs = 30_000,
): Promise<AuthTokenResponse> {
  return new Promise((resolve, reject) => {
    const messageId = `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const origin = window.location.origin;

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    const separator = tokenService.id.includes('?') ? '&' : '?';
    iframe.src = `${tokenService.id}${separator}messageId=${encodeURIComponent(messageId)}&origin=${encodeURIComponent(origin)}`;

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Token request timed out'));
      }
    }, timeoutMs);

    function onMessage(event: MessageEvent): void {
      if (settled) return;
      const data = event.data;
      if (!data || data.messageId !== messageId) return;

      settled = true;
      clearTimeout(timer);
      cleanup();

      if ('error' in data) {
        reject(new AuthFlowError(data.error, data.description));
      } else if ('accessToken' in data) {
        resolve(data as AuthTokenResponse);
      }
    }

    function cleanup(): void {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

// ---------------------------------------------------------------------------
// Probe Service
// ---------------------------------------------------------------------------

/**
 * Check authorization status by sending the token to the probe service.
 * Returns the probe response indicating access level.
 */
export async function probeResource(
  probeServiceId: string,
  accessToken?: string,
): Promise<AuthProbeResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const resp = await fetch(probeServiceId, { headers });
  const body: AuthProbeResponse = await resp.json();

  // The probe response status should match HTTP status
  return { ...body, status: resp.status };
}

/**
 * Determine the auth status from a probe response.
 */
export function authStatusFromProbe(probeResponse: AuthProbeResponse): AuthStatus {
  if (probeResponse.status === 200) {
    return probeResponse.substitute ? 'degraded' : 'authorized';
  }
  if (probeResponse.status === 401) return 'unauthorized';
  return 'error';
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Invalidate the current session by loading the logout service URL.
 */
export function logout(logoutService: AuthLogoutService2): void {
  // Per the spec: open the logout URL in a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = logoutService.id;
  document.body.appendChild(iframe);
  // Clean up after a short delay
  setTimeout(() => iframe.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Token Persistence (sessionStorage)
// ---------------------------------------------------------------------------

const TOKEN_STORAGE_KEY = 'field-studio-auth-tokens';

/** Persist a token to sessionStorage */
export function storeToken(
  serviceId: string,
  accessToken: string,
  expiresIn: number,
): void {
  const tokens = loadAllTokens();
  const entry: StoredToken = {
    serviceId,
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    origin: window.location.origin,
  };
  tokens.set(serviceId, entry);
  saveAllTokens(tokens);
}

/** Retrieve a stored token for a service, if still valid */
export function getStoredToken(serviceId: string): string | null {
  const tokens = loadAllTokens();
  const entry = tokens.get(serviceId);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    // Expired — remove
    tokens.delete(serviceId);
    saveAllTokens(tokens);
    return null;
  }
  return entry.accessToken;
}

/** Remove a stored token (on logout or error) */
export function clearStoredToken(serviceId: string): void {
  const tokens = loadAllTokens();
  tokens.delete(serviceId);
  saveAllTokens(tokens);
}

/** Remove all stored tokens */
export function clearAllTokens(): void {
  try { sessionStorage.removeItem(TOKEN_STORAGE_KEY); } catch {}
}

function loadAllTokens(): Map<string, StoredToken> {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return new Map();
    const arr: StoredToken[] = JSON.parse(raw);
    return new Map(arr.map((t) => [t.serviceId, t]));
  } catch {
    return new Map();
  }
}

function saveAllTokens(tokens: Map<string, StoredToken>): void {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify([...tokens.values()]));
  } catch { /* quota exceeded */ }
}

// ---------------------------------------------------------------------------
// Auth Flow Orchestration (high-level)
// ---------------------------------------------------------------------------

export interface AuthFlowResult {
  status: AuthStatus;
  token?: string;
  expiresAt?: number;
  substituteResources?: AuthProbeResponse['substitute'];
}

/**
 * Run the complete auth flow for an access service:
 * 1. Check for existing token
 * 2. If no token or expired: open access service → request new token
 * 3. Probe the resource
 * 4. Return the result
 *
 * The caller is responsible for UI (showing login prompts, handling user interaction).
 * This function handles the protocol mechanics.
 */
export async function runAuthFlow(
  accessService: AuthAccessService2,
  probeServiceId: string,
): Promise<AuthFlowResult> {
  // Step 1: Check existing token
  let token = getStoredToken(accessService.id);

  if (token) {
    // Verify existing token is still valid
    const probeResult = await probeResource(probeServiceId, token);
    const status = authStatusFromProbe(probeResult);
    if (status !== 'unauthorized') {
      return {
        status,
        token,
        substituteResources: probeResult.substitute,
      };
    }
    // Token invalid — clear and re-acquire
    clearStoredToken(accessService.id);
    token = null;
  }

  // Step 2: Open access service (for kiosk, this is automatic)
  const tokenService = findTokenService(accessService);
  if (!tokenService) {
    return { status: 'error' };
  }

  if (accessService.profile === 'kiosk') {
    // Kiosk: automatically open access service, then request token
    const handle = openAccessService(accessService);
    try {
      // Small delay for the cookie to be set
      await new Promise((r) => setTimeout(r, 1000));
      handle.close();

      const tokenResp = await requestToken(tokenService);
      storeToken(accessService.id, tokenResp.accessToken, tokenResp.expiresIn);

      const probeResult = await probeResource(probeServiceId, tokenResp.accessToken);
      return {
        status: authStatusFromProbe(probeResult),
        token: tokenResp.accessToken,
        expiresAt: Date.now() + tokenResp.expiresIn * 1000,
        substituteResources: probeResult.substitute,
      };
    } catch {
      handle.close();
      return { status: 'error' };
    }
  }

  // Active/External: caller must handle user interaction.
  // We just request the token after the access service has been opened.
  try {
    const tokenResp = await requestToken(tokenService);
    storeToken(accessService.id, tokenResp.accessToken, tokenResp.expiresIn);

    const probeResult = await probeResource(probeServiceId, tokenResp.accessToken);
    return {
      status: authStatusFromProbe(probeResult),
      token: tokenResp.accessToken,
      expiresAt: Date.now() + tokenResp.expiresIn * 1000,
      substituteResources: probeResult.substitute,
    };
  } catch {
    return { status: 'error' };
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class AuthFlowError extends Error {
  constructor(
    public readonly code: string,
    description?: string,
  ) {
    super(description ?? `Auth flow error: ${code}`);
    this.name = 'AuthFlowError';
  }
}
