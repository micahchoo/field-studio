/**
 * AuthDialog - IIIF Authorization Flow 2.0 UI Component
 *
 * Displays authentication prompts for restricted IIIF content.
 * Supports active, kiosk, and external authentication profiles.
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { authService, AuthService, AuthState, ProbeResponse } from '@/src/shared/services/authService';
import { Icon } from '@/src/shared/ui/atoms/Icon';

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
    <div className="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-nb-white shadow-brutal-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-nb-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nb-orange/20 flex items-center justify-center text-nb-orange">
              <Icon name="lock" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-nb-black">{heading}</h2>
              <p className="text-xs text-nb-black/50">IIIF Authorization Flow 2.0</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {state.status === 'probing' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue animate-spin mb-4"></div>
              <p className="text-sm text-nb-black/50">Checking access...</p>
            </div>
          )}

          {state.status === 'unauthenticated' && (
            <>
              <p className="text-nb-black/60 mb-6">{description}</p>

              {accessService?.profile === 'active' && (
                <div className="bg-nb-blue/10 border border-nb-blue/20 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="info" className="text-nb-blue mt-0.5" />
                    <div className="text-sm text-nb-blue">
                      You will be redirected to a login page. After logging in, return here to continue.
                    </div>
                  </div>
                </div>
              )}

              {accessService?.profile === 'kiosk' && (
                <div className="bg-nb-green/10 border border-nb-green/20 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="verified_user" className="text-nb-green mt-0.5" />
                    <div className="text-sm text-nb-green">
                      Access will be granted automatically based on your network location.
                    </div>
                  </div>
                </div>
              )}

              {accessService?.profile === 'external' && (
                <div className="bg-nb-purple/5 border border-nb-purple/10 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Icon name="open_in_new" className="text-nb-purple mt-0.5" />
                    <div className="text-sm text-nb-purple">
                      Authentication is handled by an external service. You may need to log in separately.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {state.status === 'degraded' && (
            <>
              <p className="text-nb-black/60 mb-4">{description}</p>

              <div className="bg-nb-orange/10 border border-nb-orange/20 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icon name="warning" className="text-nb-orange mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-nb-orange mb-1">
                      Restricted Access
                    </p>
                    <p className="text-xs text-nb-orange">
                      Full access requires authentication. A lower-quality substitute is available.
                    </p>
                  </div>
                </div>
              </div>

              {state.substitute && (
                <div className="border p-3 mb-4">
                  <p className="text-xs font-medium text-nb-black/50 mb-1">Available substitute:</p>
                  <p className="text-sm text-nb-black/80 font-mono truncate">
                    {state.substitute.id}
                  </p>
                  {state.substitute.width && state.substitute.height && (
                    <p className="text-xs text-nb-black/50 mt-1">
                      {state.substitute.width} x {state.substitute.height}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {state.status === 'authenticated' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 bg-nb-green/20 flex items-center justify-center text-nb-green mb-4">
                <Icon name="check_circle" className="text-3xl" />
              </div>
              <p className="text-lg font-semibold text-nb-green">Access Granted</p>
              <p className="text-sm text-nb-black/50 mt-1">You can now view this resource.</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="bg-nb-red/10 border border-nb-red/30 p-4">
              <div className="flex items-start gap-3">
                <Icon name="error" className="text-nb-red mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-nb-red mb-1">
                    Authentication Error
                  </p>
                  <p className="text-xs text-nb-red">
                    {state.errorMessage || 'An error occurred during authentication.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-nb-white flex gap-3 justify-end">
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className="px-4 py-2 text-nb-black/60 hover:text-nb-black font-medium text-sm"
          >
            Cancel
          </Button>

          {state.status === 'unauthenticated' && accessService && (
            <Button variant="ghost" size="bare"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-6 py-2 bg-iiif-blue text-white font-semibold text-sm hover:bg-nb-blue disabled:opacity-50 flex items-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <Icon name="login" />
                  {loginLabel}
                </>
              )}
            </Button>
          )}

          {state.status === 'degraded' && (
            <>
              <Button variant="ghost" size="bare"
                onClick={handleUseDegraded}
                className="px-4 py-2 border border-nb-black/20 text-nb-black/80 font-medium text-sm hover:bg-nb-cream"
              >
                Use Substitute
              </Button>
              {accessService && (
                <Button variant="ghost" size="bare"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-6 py-2 bg-iiif-blue text-white font-semibold text-sm hover:bg-nb-blue disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></div>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <Icon name="login" />
                      {loginLabel}
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {state.status === 'authenticated' && (
            <Button variant="ghost" size="bare"
              onClick={() => onComplete(state)}
              className="px-6 py-2 bg-nb-green text-white font-semibold text-sm hover:bg-nb-green"
            >
              Continue
            </Button>
          )}

          {state.status === 'error' && (
            <Button variant="ghost" size="bare"
              onClick={probeForAccess}
              className="px-4 py-2 border border-nb-black/20 text-nb-black/80 font-medium text-sm hover:bg-nb-cream"
            >
              Retry
            </Button>
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
