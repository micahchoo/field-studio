/**
 * IIIF Authorization Flow API 2.0 Types
 * @see https://iiif.io/api/auth/2.0/
 */

// ---------------------------------------------------------------------------
// Service Descriptors (found in manifest.services array)
// ---------------------------------------------------------------------------

/**
 * Access service — the user-facing endpoint for authentication.
 * Profile determines the interaction pattern.
 */
export interface AuthAccessService2 {
  id: string;
  type: 'AuthAccessService2';
  profile: AuthAccessProfile;
  label: LanguageMap;
  /** Human-readable note explaining what access is needed */
  note?: LanguageMap;
  /** Human-readable description of the access service */
  description?: LanguageMap;
  /** Heading for the auth UI */
  heading?: LanguageMap;
  /** Text for the confirm button */
  confirmLabel?: LanguageMap;
  service: (AuthAccessTokenService2 | AuthLogoutService2)[];
}

/**
 * Interaction pattern:
 * - active: user must perform an action (login form)
 * - kiosk: automatic, no user interaction (IP-based auth)
 * - external: user has pre-existing credentials (VPN, campus network)
 */
export type AuthAccessProfile = 'active' | 'kiosk' | 'external';

/**
 * Token service — acquires an access token via iframe + postMessage.
 */
export interface AuthAccessTokenService2 {
  id: string;
  type: 'AuthAccessTokenService2';
}

/**
 * Probe service — checks whether the client has access to a resource.
 * Send the access token as a Bearer token in the Authorization header.
 */
export interface AuthProbeService2 {
  id: string;
  type: 'AuthProbeService2';
  service: AuthAccessService2[];
}

/**
 * Logout service — invalidates the current session.
 */
export interface AuthLogoutService2 {
  id: string;
  type: 'AuthLogoutService2';
  label: LanguageMap;
}

// ---------------------------------------------------------------------------
// Token Response (via postMessage from iframe)
// ---------------------------------------------------------------------------

export interface AuthTokenResponse {
  /** The access token to use in Authorization headers */
  accessToken: string;
  /** Token lifetime in seconds */
  expiresIn: number;
  /** The id of the AuthAccessTokenService2 that issued this token */
  messageId: string;
}

export interface AuthTokenError {
  error: AuthTokenErrorCode;
  description?: string;
  messageId: string;
}

export type AuthTokenErrorCode =
  | 'invalidRequest'
  | 'missingCredentials'
  | 'invalidCredentials'
  | 'invalidOrigin'
  | 'unavailable';

// ---------------------------------------------------------------------------
// Probe Response
// ---------------------------------------------------------------------------

export interface AuthProbeResponse {
  /** HTTP status: 200 = authorized, 401 = unauthorized */
  status: number;
  /**
   * Substitute resources available at a lower tier.
   * E.g., a smaller image when full resolution requires auth.
   */
  substitute?: AuthSubstitute[];
  /**
   * Redirect: the resource has moved, follow this location.
   */
  location?: AuthLocation;
  heading?: LanguageMap;
  note?: LanguageMap;
}

export interface AuthSubstitute {
  id: string;
  type: string;
  profile?: string;
  format?: string;
  width?: number;
  height?: number;
  service?: Array<{ id: string; type: string; profile?: string }>;
}

export interface AuthLocation {
  id: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Auth State (for the client store)
// ---------------------------------------------------------------------------

/** Per-service auth state tracked by the client */
export interface AuthServiceState {
  serviceId: string;
  profile: AuthAccessProfile;
  label: string;
  status: AuthStatus;
  token?: string;
  tokenExpiresAt?: number;
  /** Resources that are gated by this service */
  protectedResourceIds: Set<string>;
}

export type AuthStatus =
  | 'unknown'        // Haven't checked yet
  | 'checking'       // Probe in flight
  | 'authorized'     // Probe returned 200
  | 'unauthorized'   // Probe returned 401
  | 'degraded'       // Probe returned 200 with substitute (lower tier)
  | 'error';         // Network or protocol error

/** Token storage entry for persistence in sessionStorage */
export interface StoredToken {
  serviceId: string;
  accessToken: string;
  expiresAt: number;
  origin: string;
}

// ---------------------------------------------------------------------------
// AuthService union (IIIF Auth 2.0 union type)
// ---------------------------------------------------------------------------

/** Union of all IIIF Auth 2.0 service types */
export type AuthService =
  | AuthAccessService2
  | AuthAccessTokenService2
  | AuthProbeService2
  | AuthLogoutService2;

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

interface LanguageMap {
  [lang: string]: string[];
}
