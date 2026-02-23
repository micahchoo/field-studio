/**
 * Auth Status — Pure computation (Category 1)
 *
 * Replaces useAuthStatus React hook.
 * Architecture doc §4 Cat 1: plain function called inside $derived.
 *
 * Usage in Svelte: let status = $derived(getAuthStatus(url));
 */

export type AuthStatusResult = 'unknown' | 'locked' | 'unlocked';

/**
 * Stub auth service interface.
 * In the full app, this would be the real authService.
 * For the migration MVP, we provide a minimal interface.
 */
interface AuthServiceLike {
  getValidToken(url: string): string | null;
  getValidTokenForOrigin(url: string): string | null;
}

/** Default stub that always returns null (no auth) */
const stubAuthService: AuthServiceLike = {
  getValidToken: () => null,
  getValidTokenForOrigin: () => null,
};

let _authService: AuthServiceLike = stubAuthService;

/** Allow the real auth service to be injected at app init */
export function setAuthService(service: AuthServiceLike): void {
  _authService = service;
}

/**
 * Returns the authentication status for a URL.
 * - 'unlocked' if a valid token exists for the URL or its origin
 * - 'locked' if URL is from an external origin with no stored token
 * - 'unknown' if URL is null/local
 */
export function getAuthStatus(url: string | null | undefined): AuthStatusResult {
  if (!url) return 'unknown';

  try {
    const parsed = new URL(url);
    // Local URLs don't need auth
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return 'unknown';
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'unknown';

    // Check for stored token
    const token = _authService.getValidToken(url) || _authService.getValidTokenForOrigin(url);
    return token ? 'unlocked' : 'locked';
  } catch {
    return 'unknown';
  }
}
