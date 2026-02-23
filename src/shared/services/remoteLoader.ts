/**
 * Remote IIIF Resource Loader — Stub
 *
 * Provides fetchRemoteResource and auth detection for external IIIF imports.
 * Real implementation handles HTTP fetch with CORS, content negotiation,
 * and IIIF Auth API challenge flows.
 */

import type { IIIFItem } from '@/src/shared/types';
import type { AuthAccessService2 } from '@/src/shared/types/auth-api';

export type AuthService = AuthAccessService2;

export interface RemoteResourceResult {
  item: IIIFItem;
  resourceId: string;
  authServices: AuthService[];
}

export interface AuthRequiredResult {
  requiresAuth: true;
  resourceId: string;
  authServices: AuthService[];
}

export type FetchResult = RemoteResourceResult | AuthRequiredResult;

export interface FetchOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * Fetch a remote IIIF resource by URL.
 * Handles content negotiation (JSON-LD, JSON) and follows redirects.
 */
export async function fetchRemoteResource(
  url: string,
  options?: FetchOptions
): Promise<FetchResult> {
  // Stub: real implementation does HTTP fetch with CORS handling
  const response = await fetch(url, {
    signal: options?.signal,
    headers: {
      'Accept': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json", application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    item: data as IIIFItem,
    resourceId: url,
    authServices: [],
  };
}

/**
 * Check if a fetch result requires authentication
 */
export function requiresAuth(result: FetchResult): result is AuthRequiredResult {
  return 'requiresAuth' in result && result.requiresAuth === true;
}
