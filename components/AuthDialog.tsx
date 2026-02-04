/**
 * AuthDialog - IIIF Authorization Flow 2.0 UI Component
 *
 * Displays authentication prompts for restricted IIIF content.
 * Supports active, kiosk, and external authentication profiles.
 */

import React, { useEffect, useState } from 'react';
import { authService, AuthService, AuthState, ProbeResponse } from '../services/authService';
import { Icon } from './Icon';

interface AuthDialogProps {
  /** The auth services extracted from the IIIF resource */
  authServices: AuthService[];
  /** Resource ID being accessed */
  resourceId: string;
  /** Callback when authentication completes */
  onComplete: (state: AuthState) => void;
  /** Callback to close dialog */
  onClose: () => void;
  /** Preferred language for labels */
  preferredLang?: string;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  authServices,
  resourceId,
  onComplete,
  onClose,
  preferredLang = 'en'
}) => {
  const [state, setState] = useState<AuthState>({ status: 'probing' });
  const [probeResult, setProbeResult] = useState<ProbeResponse | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const accessService = authService.findAccessService(authServices);
  const probeService = authService.findProbeService(authServices);
  const tokenService = authService.findTokenService(authServices);

  // Auto-probe on mount
  useEffect(() => {
    if (probeService) {
      probeForAccess();
    }
  }, []);

  const probeForAccess = async () => {
    if (!probeService) return;

    setState({ status: 'probing' });

    const result = await authService.probe(probeService, resourceId);
    setProbeResult(result);

    if (result.status === 200) {
      setState({ status: 'authenticated' });
      onComplete({ status: 'authenticated', probeResult: result });
    } else if (result.status === 401) {
      if (result.substitute) {
        setState({
          status: 'degraded',
          substitute: result.substitute,
          probeResult: result
        });
      } else {
        setState({
          status: 'unauthenticated',
          probeResult: result
        });
      }
    } else {
      setState({
        status: 'error',
        errorMessage: `Access denied (${result.status})`
      });
    }
  };

  const handleLogin = () => {
    if (!accessService) return;

    setIsLoggingIn(true);

    authService.openLoginWindow(accessService, {
      onComplete: async (windowClosed) => {
        setIsLoggingIn(false);

        // Try to get token after login window closes
        if (tokenService) {
          try {
            const tokenResponse = await authService.requestToken(tokenService);
            // Check if we got a valid token response (not an error)
            if (tokenResponse.type === 'AuthAccessToken2' && 'accessToken' in tokenResponse) {
              authService.storeToken(resourceId, tokenResponse.accessToken, tokenResponse.expiresIn);
            } else {
              throw new Error('Invalid token response');
            }

            // Re-probe to verify access
            await probeForAccess();
          } catch (error) {
            console.error('Token request failed:', error);
            setState({
              status: 'error',
              errorMessage: 'Failed to retrieve access token'
            });
          }
        } else {
          // No token service, just re-probe
          await probeForAccess();
        }
      }
    });
  };

  const handleUseDegraded = () => {
    if (state.substitute) {
      onComplete({
        status: 'degraded',
        substitute: state.substitute,
        probeResult: probeResult || undefined
      });
    }
  };

  // Get display texts
  const heading = probeResult?.heading
    ? authService.getLabel(probeResult.heading, preferredLang)
    : accessService?.header
      ? authService.getLabel(accessService.header, preferredLang)
      : 'Authentication Required';

  const description = probeResult?.note
    ? authService.getLabel(probeResult.note, preferredLang)
    : accessService?.description
      ? authService.getLabel(accessService.description, preferredLang)
      : 'This resource requires authentication to access.';

  const loginLabel = accessService?.confirmLabel
    ? authService.getLabel(accessService.confirmLabel, preferredLang)
    : 'Login';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Icon name="lock" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{heading}</h2>
              <p className="text-xs text-slate-500">IIIF Authorization Flow 2.0</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {state.status === 'probing' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-iiif-blue rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-slate-500">Checking access...</p>
            </div>
          )}

          {state.status === 'unauthenticated' && (
            <>
              <p className="text-slate-600 mb-6">{description}</p>

              {accessService?.profile === 'active' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="info" className="text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      You will be redirected to a login page. After logging in, return here to continue.
                    </div>
                  </div>
                </div>
              )}

              {accessService?.profile === 'kiosk' && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="verified_user" className="text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      Access will be granted automatically based on your network location.
                    </div>
                  </div>
                </div>
              )}

              {accessService?.profile === 'external' && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="open_in_new" className="text-purple-600 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      Authentication is handled by an external service. You may need to log in separately.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {state.status === 'degraded' && (
            <>
              <p className="text-slate-600 mb-4">{description}</p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icon name="warning" className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Restricted Access
                    </p>
                    <p className="text-xs text-amber-700">
                      Full access requires authentication. A lower-quality substitute is available.
                    </p>
                  </div>
                </div>
              </div>

              {state.substitute && (
                <div className="border rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">Available substitute:</p>
                  <p className="text-sm text-slate-700 font-mono truncate">
                    {state.substitute.id}
                  </p>
                  {state.substitute.width && state.substitute.height && (
                    <p className="text-xs text-slate-500 mt-1">
                      {state.substitute.width} x {state.substitute.height}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {state.status === 'authenticated' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <Icon name="check_circle" className="text-3xl" />
              </div>
              <p className="text-lg font-semibold text-green-800">Access Granted</p>
              <p className="text-sm text-slate-500 mt-1">You can now view this resource.</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Icon name="error" className="text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Authentication Error
                  </p>
                  <p className="text-xs text-red-700">
                    {state.errorMessage || 'An error occurred during authentication.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm"
          >
            Cancel
          </button>

          {state.status === 'unauthenticated' && accessService && (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-6 py-2 bg-iiif-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <Icon name="login" />
                  {loginLabel}
                </>
              )}
            </button>
          )}

          {state.status === 'degraded' && (
            <>
              <button
                onClick={handleUseDegraded}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-100"
              >
                Use Substitute
              </button>
              {accessService && (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-6 py-2 bg-iiif-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <Icon name="login" />
                      {loginLabel}
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {state.status === 'authenticated' && (
            <button
              onClick={() => onComplete(state)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700"
            >
              Continue
            </button>
          )}

          {state.status === 'error' && (
            <button
              onClick={probeForAccess}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-100"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for handling auth in viewers/components
 */
export const useIIIFAuth = (resourceId: string, authServices: AuthService[]) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unknown' });
  const [showDialog, setShowDialog] = useState(false);

  const checkAuth = async () => {
    const result = await authService.authenticateResource(
      resourceId,
      authServices,
      setAuthState
    );
    setAuthState(result);
    return result;
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = authService.getValidToken(resourceId);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  return {
    authState,
    showDialog,
    setShowDialog,
    checkAuth,
    getAuthHeaders,
    needsAuth: authState.status === 'unauthenticated' || authState.status === 'degraded'
  };
};

export default AuthDialog;
