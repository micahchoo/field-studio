/**
 * URL State Management Hook
 *
 * Synchronizes app state with URL hash for deep linking.
 * Handles browser back/forward navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { AppMode } from '../types';

const VALID_MODES: AppMode[] = ['archive', 'collections', 'metadata', 'search', 'viewer', 'boards'];

interface URLState {
  mode: AppMode;
  selectedId: string | null;
}

interface UseURLStateReturn {
  urlState: URLState;
  setMode: (mode: AppMode) => void;
  setSelectedId: (id: string | null) => void;
  setURLState: (state: Partial<URLState>) => void;
}

export function useURLState(
  initialMode: AppMode = 'archive'
): UseURLStateReturn {
  const [urlState, setURLStateInternal] = useState<URLState>(() => {
    // Parse initial state from URL
    const hash = window.location.hash.slice(1);
    if (!hash) return { mode: initialMode, selectedId: null };

    const params = new URLSearchParams(hash);
    const mode = params.get('mode') as AppMode | null;
    const id = params.get('id');

    return {
      mode: mode && VALID_MODES.includes(mode) ? mode : initialMode,
      selectedId: id || null,
    };
  });

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const params = new URLSearchParams(hash);
      const mode = params.get('mode') as AppMode | null;
      const id = params.get('id');

      setURLStateInternal({
        mode: mode && VALID_MODES.includes(mode) ? mode : urlState.mode,
        selectedId: id || null,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [urlState.mode]);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', urlState.mode);
    if (urlState.selectedId) params.set('id', urlState.selectedId);

    const newHash = `#${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [urlState.mode, urlState.selectedId]);

  const setMode = useCallback((mode: AppMode) => {
    setURLStateInternal(prev => ({ ...prev, mode }));
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setURLStateInternal(prev => ({ ...prev, selectedId: id }));
  }, []);

  const setURLState = useCallback((updates: Partial<URLState>) => {
    setURLStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    urlState,
    setMode,
    setSelectedId,
    setURLState,
  };
}

export default useURLState;
