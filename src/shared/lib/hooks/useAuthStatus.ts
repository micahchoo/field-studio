/**
 * Auth Status Hook
 *
 * Provides authentication status for a given URL by checking
 * stored tokens in the auth service.
 */

import { useMemo } from 'react';
import { authService } from '@/src/shared/services/authService';

export type AuthStatusResult = 'unknown' | 'locked' | 'unlocked';

/**
 * Returns the authentication status for a URL.
 * - 'unlocked' if a valid token exists for the URL or its origin
 * - 'locked' if URL is from an external origin with no stored token
 * - 'unknown' if URL is null/local
 */
export function useAuthStatus(url: string | null | undefined): AuthStatusResult {
  return useMemo(() => {
    if (!url) return 'unknown';

    try {
      const parsed = new URL(url);
      // Local URLs don't need auth
      if (parsed.origin === window.location.origin) return 'unknown';
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'unknown';

      // Check for stored token
      const token = authService.getValidToken(url) || authService.getValidTokenForOrigin(url);
      return token ? 'unlocked' : 'locked';
    } catch {
      return 'unknown';
    }
  }, [url]);
}
