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
  | 'active'    // User must login (interactive)
  | 'kiosk'     // Automatic login (IP-based, etc.)
  | 'external'; // External authentication (SSO, etc.)

export interface LanguageMap {
  [key: string]: string[];
}

export interface ProbeResponse {
  '@context': 'http://iiif.io/api/auth/2/context.json';
  type: 'AuthProbeResult2';
  status: number; // HTTP status code
  heading?: LanguageMap;
  note?: LanguageMap;
  substitute?: ResourceSubstitute;
  location?: string; // Redirect URL
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

class IIIFAuthService {
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map();
  private pendingMessages: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor() {
    // Listen for postMessage from auth windows
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handlePostMessage.bind(this));
    }
  }

  /**
   * Extract auth services from IIIF resource
   */
  extractAuthServices(resource: any): AuthService[] {
    const services: AuthService[] = [];

    const extract = (obj: any) => {
      if (!obj) return;

      // Check 'service' array
      const serviceArray = obj.service || obj.services;
      if (Array.isArray(serviceArray)) {
        for (const svc of serviceArray) {
          if (this.isAuthService(svc)) {
            services.push(svc);
          }
          extract(svc); // Recurse into nested services
        }
      }

      // Check items for manifests
      if (Array.isArray(obj.items)) {
        for (const item of obj.items) {
          extract(item);
        }
      }
    };

    extract(resource);
    return services;
  }

  /**
   * Check if a service is an auth service
   */
  private isAuthService(service: any): service is AuthService {
    if (!service || typeof service !== 'object') return false;
    const type = service.type || service['@type'];
    return type && (
      type.includes('AuthProbeService') ||
      type.includes('AuthAccessService') ||
      type.includes('AuthAccessTokenService') ||
      type.includes('AuthLogoutService')
    );
  }

  /**
   * Find the probe service from a list of auth services
   */
  findProbeService(services: AuthService[]): AuthService | null {
    return services.find(s => s.type === 'AuthProbeService2') || null;
  }

  /**
   * Find the access service (login) from a list of auth services
   */
  findAccessService(services: AuthService[]): AuthService | null {
    return services.find(s => s.type === 'AuthAccessService2') || null;
  }

  /**
   * Find the token service from a list of auth services
   */
  findTokenService(services: AuthService[]): AuthService | null {
    // Token service is usually nested under access service
    for (const svc of services) {
      if (svc.type === 'AuthAccessTokenService2') return svc;
      if (svc.service) {
        const nested = this.findTokenService(svc.service);
        if (nested) return nested;
      }
    }
    return null;
  }

  /**
   * Probe an auth service to determine access level
   */
  async probe(probeService: AuthService, resourceId: string): Promise<ProbeResponse> {
    const existingToken = this.getValidToken(resourceId);
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };

    if (existingToken) {
      headers['Authorization'] = `Bearer ${existingToken}`;
    }

    try {
      const response = await fetch(probeService.id, {
        method: 'GET',
        headers,
        credentials: 'include' // Send cookies for session-based auth
      });

      const data = await response.json();
      return data as ProbeResponse;
    } catch (error) {
      console.error('[AuthService] Probe failed:', error);
      return {
        '@context': 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 500,
        note: { en: ['Failed to probe authentication service'] }
      };
    }
  }

  /**
   * Open login window for active authentication
   */
  openLoginWindow(accessService: AuthService, options: {
    width?: number;
    height?: number;
    onComplete?: (success: boolean) => void;
  } = {}): Window | null {
    const { width = 600, height = 700, onComplete } = options;

    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const loginWindow = window.open(
      accessService.id,
      'iiif-auth-login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (loginWindow) {
      // Poll for window close
      const pollTimer = setInterval(() => {
        if (loginWindow.closed) {
          clearInterval(pollTimer);
          onComplete?.(false); // Window closed without explicit success
        }
      }, 500);
    }

    return loginWindow;
  }

  /**
   * Request access token via postMessage
   */
  async requestToken(tokenService: AuthService): Promise<TokenResponse | TokenError> {
    return new Promise((resolve, reject) => {
      const messageId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create iframe for token request
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';

      const url = new URL(tokenService.id);
      url.searchParams.set('messageId', messageId);
      url.searchParams.set('origin', window.location.origin);

      // Store pending promise
      this.pendingMessages.set(messageId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        iframe.remove();
        reject(new Error('Token request timed out'));
      }, 30000);

      // Override resolve to clean up
      this.pendingMessages.set(messageId, {
        resolve: (data: any) => {
          clearTimeout(timeout);
          iframe.remove();
          resolve(data);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          iframe.remove();
          reject(error);
        }
      });

      iframe.src = url.toString();
      document.body.appendChild(iframe);
    });
  }

  /**
   * Handle postMessage from auth windows/iframes
   */
  private handlePostMessage(event: MessageEvent) {
    const data = event.data;

    if (!data || typeof data !== 'object') return;

    // Check if it's an auth message
    if (data.type !== 'AuthAccessToken2' && data.type !== 'AuthAccessTokenError2') return;

    const messageId = data.messageId;
    if (!messageId) return;

    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    this.pendingMessages.delete(messageId);

    if (data.type === 'AuthAccessToken2') {
      // Store token
      const expiresAt = data.expiresIn
        ? Date.now() + data.expiresIn * 1000
        : Date.now() + 3600000; // Default 1 hour

      this.tokens.set(messageId, {
        token: data.accessToken,
        expiresAt
      });

      pending.resolve(data as TokenResponse);
    } else {
      pending.reject(data as TokenError);
    }
  }

  /**
   * Store a token for a resource
   */
  storeToken(resourceId: string, token: string, expiresIn?: number) {
    const expiresAt = expiresIn
      ? Date.now() + expiresIn * 1000
      : Date.now() + 3600000;

    this.tokens.set(resourceId, { token, expiresAt });
  }

  /**
   * Get a valid token for a resource
   */
  getValidToken(resourceId: string): string | null {
    const entry = this.tokens.get(resourceId);
    if (!entry) return null;

    if (Date.now() >= entry.expiresAt) {
      this.tokens.delete(resourceId);
      return null;
    }

    return entry.token;
  }

  /**
   * Alias for getValidToken (for remoteLoader compatibility)
   */
  getStoredToken(resourceId: string): string | null {
    return this.getValidToken(resourceId);
  }

  /**
   * Clear token for a resource
   */
  clearToken(resourceId: string) {
    this.tokens.delete(resourceId);
  }

  /**
   * Clear all tokens
   */
  clearAllTokens() {
    this.tokens.clear();
  }

  /**
   * Full auth flow for a resource
   */
  async authenticateResource(
    resourceId: string,
    authServices: AuthService[],
    onProgress?: (state: AuthState) => void
  ): Promise<AuthState> {
    const state: AuthState = { status: 'probing' };
    onProgress?.(state);

    // 1. Find probe service
    const probeService = this.findProbeService(authServices);
    if (!probeService) {
      return { status: 'error', errorMessage: 'No probe service found' };
    }

    // 2. Probe for access
    const probeResult = await this.probe(probeService, resourceId);
    state.probeResult = probeResult;

    // 3. Check probe result
    if (probeResult.status === 200) {
      // Full access
      state.status = 'authenticated';
      onProgress?.(state);
      return state;
    }

    if (probeResult.status === 401) {
      // Need authentication
      state.status = 'unauthenticated';

      if (probeResult.substitute) {
        state.substitute = probeResult.substitute;
        state.status = 'degraded';
      }

      onProgress?.(state);
      return state;
    }

    // Other status codes
    state.status = 'error';
    state.errorMessage = `Probe returned status ${probeResult.status}`;
    onProgress?.(state);
    return state;
  }

  /**
   * Get language string from LanguageMap
   */
  getLabel(map: LanguageMap | undefined, preferredLang: string = 'en'): string {
    if (!map) return '';

    // Try preferred language
    if (map[preferredLang]?.length) {
      return map[preferredLang][0];
    }

    // Try 'none' or '@none'
    if (map['none']?.length) return map['none'][0];
    if (map['@none']?.length) return map['@none'][0];

    // Return first available
    const firstKey = Object.keys(map)[0];
    if (firstKey && map[firstKey]?.length) {
      return map[firstKey][0];
    }

    return '';
  }
}

export const authService = new IIIFAuthService();

export default authService;
