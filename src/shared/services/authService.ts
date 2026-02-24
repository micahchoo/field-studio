// Pure TypeScript — no Svelte-specific conversion

/**
 * IIIF Authorization Flow API 2.0 Implementation
 *
 * Implements the "Probe-First" authorization pattern:
 * 1. Client fetches image/manifest
 * 2. If 401, check for auth services in response
 * 3. Probe auth service to determine access level
 * 4. If degraded, show substitute; if login required, show auth UI
 * 5. After login, retrieve token via postMessage
 *
 * @see https://iiif.io/api/auth/2.0/
 */

import { networkLog } from './logger';
import type { ServiceDescriptor, IIIFGenericService } from '@/src/shared/types';

const IIIF_AUTH_CONTEXT = 'http://iiif.io/api/auth/2/context.json';

// ============================================================================
// Types
// ============================================================================

export interface AuthService {
  '@context'?: string;
  id: string;
  type: AuthServiceType;
  profile: AuthProfile;
  label?: LanguageMap;
  confirmLabel?: LanguageMap;
  header?: LanguageMap;
  description?: LanguageMap;
  service?: AuthService[];
}

export type AuthServiceType =
  | 'AuthProbeService2'
  | 'AuthAccessService2'
  | 'AuthAccessTokenService2'
  | 'AuthLogoutService2';

export type AuthProfile =
  | 'active'
  | 'kiosk'
  | 'external';

export interface LanguageMap {
  [key: string]: string[];
}

export interface ProbeResponse {
  '@context': 'http://iiif.io/api/auth/2/context.json';
  type: 'AuthProbeResult2';
  status: number;
  heading?: LanguageMap;
  note?: LanguageMap;
  substitute?: ResourceSubstitute;
  location?: string;
  auth?: {
    accessService?: AuthService;
    profile?: AuthProfile;
  };
}

export interface ResourceSubstitute {
  id: string;
  type: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface TokenResponse {
  '@context': 'http://iiif.io/api/auth/2/context.json';
  type: 'AuthAccessToken2';
  accessToken: string;
  expiresIn?: number;
  messageId: string;
}

export interface TokenError {
  '@context': 'http://iiif.io/api/auth/2/context.json';
  type: 'AuthAccessTokenError2';
  error: 'invalidCredentials' | 'unavailable' | 'invalidOrigin' | 'invalidRequest';
  heading?: LanguageMap;
  note?: LanguageMap;
  messageId: string;
}

export interface AuthState {
  status: 'unknown' | 'probing' | 'unauthenticated' | 'authenticated' | 'degraded' | 'error';
  token?: string;
  expiresAt?: number;
  substitute?: ResourceSubstitute;
  probeResult?: ProbeResponse;
  errorMessage?: string;
}

// ============================================================================
// Auth Service
// ============================================================================

const AUTH_STORAGE_KEY = 'iiif-auth-tokens';

class IIIFAuthService {
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingMessages: Map<string, { resolve: (v: any) => void; reject: (e: any) => void; resourceId?: string }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handlePostMessage.bind(this));
      this.loadTokensFromStorage();
    }
  }

  private loadTokensFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return;
      const entries: Array<[string, { token: string; expiresAt: number }]> = JSON.parse(stored);
      const now = Date.now();
      for (const [key, entry] of entries) {
        if (entry.expiresAt > now) {
          this.tokens.set(key, entry);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private persistTokensToStorage(): void {
    try {
      const entries = Array.from(this.tokens.entries());
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // sessionStorage might be full or disabled
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractAuthServices(resource: any): AuthService[] {
    const services: AuthService[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extract = (obj: any) => {
      if (!obj) return;
      const serviceArray = obj.service || obj.services;
      if (Array.isArray(serviceArray)) {
        for (const svc of serviceArray) {
          if (this.isAuthService(svc)) services.push(svc);
          extract(svc);
        }
      }
      if (Array.isArray(obj.items)) {
        for (const item of obj.items) extract(item);
      }
    };

    extract(resource);
    return services;
  }

  private isAuthService(service: ServiceDescriptor): service is AuthService {
    const type = service.type || (service as IIIFGenericService)['@type'];
    return !!type && (
      type.includes('AuthProbeService') ||
      type.includes('AuthAccessService') ||
      type.includes('AuthAccessTokenService') ||
      type.includes('AuthLogoutService')
    );
  }

  findProbeService(services: AuthService[]): AuthService | null {
    return services.find(s => s.type === 'AuthProbeService2') || null;
  }

  findAccessService(services: AuthService[]): AuthService | null {
    return services.find(s => s.type === 'AuthAccessService2') || null;
  }

  findTokenService(services: AuthService[]): AuthService | null {
    for (const svc of services) {
      if (svc.type === 'AuthAccessTokenService2') return svc;
      if (svc.service) {
        const nested = this.findTokenService(svc.service);
        if (nested) return nested;
      }
    }
    return null;
  }

  async probe(probeService: AuthService, resourceId: string): Promise<ProbeResponse> {
    const existingToken = this.getValidToken(resourceId);
    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (existingToken) headers['Authorization'] = `Bearer ${existingToken}`;

    try {
      const isSameOrigin = typeof window !== 'undefined' &&
        new URL(probeService.id, window.location.href).origin === window.location.origin;
      const response = await fetch(probeService.id, {
        method: 'GET',
        headers,
        credentials: isSameOrigin ? 'include' : 'same-origin'
      });
      const data = await response.json();
      return data as ProbeResponse;
    } catch (error) {
      networkLog.error('[AuthService] Probe failed', error instanceof Error ? error : undefined);
      return {
        '@context': IIIF_AUTH_CONTEXT as 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 500,
        note: { en: ['Failed to probe authentication service'] }
      };
    }
  }

  openLoginWindow(accessService: AuthService, options: {
    width?: number;
    height?: number;
    onComplete?: (success: boolean) => void;
  } = {}): Window | null {
    if (typeof window === 'undefined') return null;
    const { width = 600, height = 700, onComplete } = options;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const loginWindow = window.open(
      accessService.id,
      'iiif-auth-login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (loginWindow) {
      const pollTimer = setInterval(() => {
        if (loginWindow.closed) {
          clearInterval(pollTimer);
          onComplete?.(false);
        }
      }, 500);
    }

    return loginWindow;
  }

  async requestToken(tokenService: AuthService, resourceId?: string): Promise<TokenResponse | TokenError> {
    return new Promise((resolve, reject) => {
      const messageId = `auth-${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';

      const url = new URL(tokenService.id);
      url.searchParams.set('messageId', messageId);
      url.searchParams.set('origin', window.location.origin);
      const storageKey = resourceId || url.origin;

      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        iframe.remove();
        reject(new Error('Token request timed out'));
      }, 30000);

      this.pendingMessages.set(messageId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve: (data: any) => {
          clearTimeout(timeout);
          iframe.remove();
          resolve(data);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (error: any) => {
          clearTimeout(timeout);
          iframe.remove();
          reject(error);
        },
        resourceId: storageKey
      });

      iframe.src = url.toString();
      document.body.appendChild(iframe);
    });
  }

  private handlePostMessage(event: MessageEvent) {
    const { data } = event;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'AuthAccessToken2' && data.type !== 'AuthAccessTokenError2') return;

    const { messageId } = data;
    if (!messageId) return;

    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    if (!event.origin || (!event.origin.startsWith('https://') && event.origin !== window.location.origin)) {
      networkLog.warn(`[AuthService] Rejected postMessage from untrusted origin: ${event.origin}`);
      return;
    }

    this.pendingMessages.delete(messageId);

    if (data.type === 'AuthAccessToken2') {
      const expiresAt = data.expiresIn
        ? Date.now() + data.expiresIn * 1000
        : Date.now() + 3600000;
      const tokenKey = pending.resourceId || messageId;
      this.tokens.set(tokenKey, { token: data.accessToken, expiresAt });
      this.persistTokensToStorage();
      pending.resolve(data as TokenResponse);
    } else {
      pending.reject(data as TokenError);
    }
  }

  storeToken(resourceId: string, token: string, expiresIn?: number) {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 3600000;
    this.tokens.set(resourceId, { token, expiresAt });
    this.persistTokensToStorage();
  }

  getValidToken(resourceId: string): string | null {
    const entry = this.tokens.get(resourceId);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.tokens.delete(resourceId);
      this.persistTokensToStorage();
      return null;
    }
    return entry.token;
  }

  getStoredToken(resourceId: string): string | null {
    return this.getValidToken(resourceId);
  }

  getValidTokenForOrigin(url: string): string | null {
    let targetOrigin: string;
    try {
      targetOrigin = new URL(url).origin;
    } catch {
      return null;
    }

    const now = Date.now();
    for (const [key, entry] of this.tokens) {
      if (now >= entry.expiresAt) continue;
      try {
        if (new URL(key).origin === targetOrigin) return entry.token;
      } catch {
        // Key not a URL, skip
      }
    }
    return null;
  }

  clearToken(resourceId: string) {
    this.tokens.delete(resourceId);
    this.persistTokensToStorage();
  }

  clearAllTokens() {
    this.tokens.clear();
    this.persistTokensToStorage();
  }

  async authenticateResource(
    resourceId: string,
    authServices: AuthService[],
    onProgress?: (state: AuthState) => void
  ): Promise<AuthState> {
    const state: AuthState = { status: 'probing' };
    onProgress?.(state);

    const probeService = this.findProbeService(authServices);
    if (!probeService) return { status: 'error', errorMessage: 'No probe service found' };

    const probeResult = await this.probe(probeService, resourceId);
    state.probeResult = probeResult;

    if (probeResult.status === 200) {
      state.status = 'authenticated';
      onProgress?.(state);
      return state;
    }

    if (probeResult.status === 401) {
      state.status = 'unauthenticated';
      if (probeResult.substitute) {
        state.substitute = probeResult.substitute;
        state.status = 'degraded';
      }
      onProgress?.(state);
      return state;
    }

    state.status = 'error';
    state.errorMessage = `Probe returned status ${probeResult.status}`;
    onProgress?.(state);
    return state;
  }

  getLabel(map: LanguageMap | undefined, preferredLang = 'en'): string {
    if (!map) return '';
    if (map[preferredLang]?.length) return map[preferredLang][0];
    if (map['none']?.length) return map['none'][0];
    if (map['@none']?.length) return map['@none'][0];
    const firstKey = Object.keys(map)[0];
    if (firstKey && map[firstKey]?.length) return map[firstKey][0];
    return '';
  }
}

export const authService = new IIIFAuthService();
export default authService;
