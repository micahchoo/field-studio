/**
 * Auth Store — Svelte 5 Runes Interface
 *
 * Reactive wrapper around authFlowService for IIIF Auth Flow API 2.0.
 * Tracks per-service auth state, active flow progress, and token validity.
 *
 * Usage:
 *   import { auth } from '@/src/shared/stores/auth.svelte';
 *
 *   auth.services                          // reactive list of known auth services
 *   auth.getStatus(resourceId)             // auth status for a resource
 *   auth.startFlow(accessService, probeId) // initiate auth flow
 *   auth.isFlowActive                      // true if a flow is in progress
 */

import type {
  AuthAccessService2,
  AuthAccessProfile,
  AuthServiceState,
  AuthStatus,
} from '@/src/shared/types/auth-api';
import {
  detectAuthServices,
  getStoredToken,
  clearStoredToken,
  clearAllTokens,
  runAuthFlow,
  openAccessService,
  type AuthFlowResult,
} from '@/src/shared/services/authFlowService';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class AuthStore {
  // ── Per-service auth state ──
  #services = $state<Map<string, AuthServiceState>>(new Map());

  // ── Resource → service mapping ──
  #resourceServiceMap = $state<Map<string, string>>(new Map());

  // ── Active flow ──
  #activeFlowServiceId = $state<string | null>(null);
  #activeFlowProfile = $state<AuthAccessProfile | null>(null);
  #activeFlowLabel = $state('');
  #activeFlowError = $state<string | null>(null);

  // ── Counts (derived-style, computed in getters) ──

  // ──────────────────────────────────────────────
  // Getters — reactive reads
  // ──────────────────────────────────────────────

  /** All known auth service states */
  get services(): ReadonlyMap<string, AuthServiceState> { return this.#services; }

  /** Number of services requiring login */
  get unauthorizedCount(): number {
    let count = 0;
    for (const svc of this.#services.values()) {
      if (svc.status === 'unauthorized') count++;
    }
    return count;
  }

  /** Number of authorized services */
  get authorizedCount(): number {
    let count = 0;
    for (const svc of this.#services.values()) {
      if (svc.status === 'authorized') count++;
    }
    return count;
  }

  /** Whether any auth flow is currently in progress */
  get isFlowActive(): boolean { return this.#activeFlowServiceId !== null; }

  /** The interaction pattern of the active flow */
  get activeFlowProfile(): AuthAccessProfile | null { return this.#activeFlowProfile; }

  /** Label for the active auth flow (for UI display) */
  get activeFlowLabel(): string { return this.#activeFlowLabel; }

  /** Error from the last auth flow attempt */
  get activeFlowError(): string | null { return this.#activeFlowError; }

  // ──────────────────────────────────────────────
  // Per-resource queries
  // ──────────────────────────────────────────────

  /** Get the auth status for a specific resource */
  getStatus(resourceId: string): AuthStatus {
    const serviceId = this.#resourceServiceMap.get(resourceId);
    if (!serviceId) return 'unknown';
    const svc = this.#services.get(serviceId);
    return svc?.status ?? 'unknown';
  }

  /** Check if a resource requires authentication */
  isProtected(resourceId: string): boolean {
    return this.#resourceServiceMap.has(resourceId);
  }

  /** Get the auth token for a resource (if authorized) */
  getToken(resourceId: string): string | null {
    const serviceId = this.#resourceServiceMap.get(resourceId);
    if (!serviceId) return null;
    const svc = this.#services.get(serviceId);
    return svc?.token ?? null;
  }

  /** Get the auth service for a resource */
  getServiceForResource(resourceId: string): AuthServiceState | null {
    const serviceId = this.#resourceServiceMap.get(resourceId);
    if (!serviceId) return null;
    return this.#services.get(serviceId) ?? null;
  }

  // ──────────────────────────────────────────────
  // Service Registration
  // ──────────────────────────────────────────────

  /**
   * Detect and register auth services from a manifest's services array.
   * Also maps protected resources to their auth services.
   */
  registerFromManifest(
    manifestServices: unknown[],
    protectedResourceIds: string[],
  ): AuthAccessService2[] {
    const authServices = detectAuthServices(manifestServices);

    for (const svc of authServices) {
      if (!this.#services.has(svc.id)) {
        const label = svc.label?.en?.[0]
          ?? svc.label?.none?.[0]
          ?? 'Authentication Required';

        // Check for existing token
        const existingToken = getStoredToken(svc.id);

        const state: AuthServiceState = {
          serviceId: svc.id,
          profile: svc.profile,
          label,
          status: existingToken ? 'checking' : 'unknown',
          token: existingToken ?? undefined,
          protectedResourceIds: new Set(protectedResourceIds),
        };

        this.#services = new Map(this.#services).set(svc.id, state);
      } else {
        // Add new resources to existing service
        const existing = this.#services.get(svc.id)!;
        for (const rid of protectedResourceIds) {
          existing.protectedResourceIds.add(rid);
        }
        this.#services = new Map(this.#services);
      }

      // Map resources to this service
      const newMap = new Map(this.#resourceServiceMap);
      for (const rid of protectedResourceIds) {
        newMap.set(rid, svc.id);
      }
      this.#resourceServiceMap = newMap;
    }

    return authServices;
  }

  // ──────────────────────────────────────────────
  // Auth Flow Execution
  // ──────────────────────────────────────────────

  /**
   * Start the auth flow for a service.
   *
   * For `active` profile: opens a window for login, then requests token.
   * For `kiosk` profile: automatic (no user interaction).
   * For `external` profile: shows instruction text.
   *
   * Returns the flow result.
   */
  async startFlow(
    accessService: AuthAccessService2,
    probeServiceId: string,
  ): Promise<AuthFlowResult> {
    this.#activeFlowServiceId = accessService.id;
    this.#activeFlowProfile = accessService.profile;
    this.#activeFlowLabel = accessService.label?.en?.[0]
      ?? accessService.label?.none?.[0]
      ?? 'Login';
    this.#activeFlowError = null;

    // Update service status
    this.#updateServiceStatus(accessService.id, 'checking');

    try {
      if (accessService.profile === 'active') {
        // For active: open the access service window for user interaction
        // The caller's UI should wait for the user to complete login
        const handle = openAccessService(accessService);

        // Wait a moment for user to complete login, then try token
        // In practice, the UI would call completeActiveFlow() when ready
        // For now, just attempt after opening
        const result = await runAuthFlow(accessService, probeServiceId);
        handle.close();
        this.#applyFlowResult(accessService.id, result);
        return result;
      }

      // Kiosk and external: runAuthFlow handles everything
      const result = await runAuthFlow(accessService, probeServiceId);
      this.#applyFlowResult(accessService.id, result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auth flow failed';
      this.#activeFlowError = message;
      this.#updateServiceStatus(accessService.id, 'error');
      return { status: 'error' };
    } finally {
      this.#activeFlowServiceId = null;
      this.#activeFlowProfile = null;
    }
  }

  /**
   * Verify existing tokens against their probe services.
   * Call this on app startup to revalidate persisted tokens.
   */
  async verifyExistingTokens(
    probeServices: Map<string, string>,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [serviceId, state] of this.#services) {
      if (state.token && state.status === 'checking') {
        const probeId = probeServices.get(serviceId);
        if (!probeId) continue;

        promises.push(
          (async () => {
            try {
              const { probeResource, authStatusFromProbe } = await import(
                '@/src/shared/services/authFlowService'
              );
              const resp = await probeResource(probeId, state.token!);
              const status = authStatusFromProbe(resp);
              this.#updateServiceStatus(serviceId, status);
              if (status === 'unauthorized') {
                clearStoredToken(serviceId);
                this.#updateServiceToken(serviceId, undefined);
              }
            } catch {
              this.#updateServiceStatus(serviceId, 'error');
            }
          })(),
        );
      }
    }

    await Promise.allSettled(promises);
  }

  // ──────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────

  /** Logout from a specific auth service */
  logoutFromService(serviceId: string): void {
    const svc = this.#services.get(serviceId);
    if (!svc) return;

    // TODO: find the logout service and call it
    clearStoredToken(serviceId);
    this.#updateServiceStatus(serviceId, 'unauthorized');
    this.#updateServiceToken(serviceId, undefined);
  }

  /** Logout from all auth services */
  logoutAll(): void {
    clearAllTokens();
    const newServices = new Map(this.#services);
    for (const [id, svc] of newServices) {
      newServices.set(id, { ...svc, status: 'unauthorized', token: undefined });
    }
    this.#services = newServices;
  }

  // ──────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────

  #applyFlowResult(serviceId: string, result: AuthFlowResult): void {
    this.#updateServiceStatus(serviceId, result.status);
    if (result.token) {
      this.#updateServiceToken(serviceId, result.token, result.expiresAt);
    }
  }

  #updateServiceStatus(serviceId: string, status: AuthStatus): void {
    const svc = this.#services.get(serviceId);
    if (!svc) return;
    const newServices = new Map(this.#services);
    newServices.set(serviceId, { ...svc, status });
    this.#services = newServices;
  }

  #updateServiceToken(serviceId: string, token?: string, expiresAt?: number): void {
    const svc = this.#services.get(serviceId);
    if (!svc) return;
    const newServices = new Map(this.#services);
    newServices.set(serviceId, {
      ...svc,
      token,
      tokenExpiresAt: expiresAt,
    });
    this.#services = newServices;
  }

  // ──────────────────────────────────────────────
  // Reset
  // ──────────────────────────────────────────────

  /** Clear all auth state (but preserve tokens in sessionStorage) */
  reset(): void {
    this.#services = new Map();
    this.#resourceServiceMap = new Map();
    this.#activeFlowServiceId = null;
    this.#activeFlowProfile = null;
    this.#activeFlowLabel = '';
    this.#activeFlowError = null;
  }
}

/** Global singleton */
export const auth = new AuthStore();
