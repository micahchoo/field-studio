/**
 * useImageSource Hook
 *
 * React hook for managing image source lifecycle with automatic cleanup.
 * Wraps resolveImageSource() and automatically calls cleanupImageSource()
 * on unmount to prevent blob URL memory leaks.
 *
 * @example
 * ```typescript
 * function ImageViewer({ canvas }) {
 *   const { source, isLoading, error } = useImageSource(canvas, {
 *     preferredSize: 'medium',
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <img src={source?.url} alt="" />;
 * }
 * ```
 *
 * @see services/imageSourceResolver.ts for resolution logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FEATURE_FLAGS } from '../constants/features';
import type { IIIFCanvas } from '../types';
import type {
  ResolvedImageSource,
  ImageSourceResolverOptions,
} from '../services/imageSourceResolver';

// ============================================================================
// Types
// ============================================================================

export interface UseImageSourceOptions extends ImageSourceResolverOptions {
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseImageSourceResult {
  /** The resolved image source (null while loading) */
  source: ResolvedImageSource | null;
  /** Loading state - true while resolving */
  isLoading: boolean;
  /** Error if resolution failed */
  error: Error | null;
  /** Manually refresh the source */
  refresh: () => void;
  /** Get the current source URL (convenience) */
  url: string | null;
  /** Whether the source needs cleanup (blob URLs) */
  needsCleanup: boolean;
}

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if automatic cleanup is enabled
 */
const isAutoCleanupEnabled = (): boolean => {
  // Default to true unless explicitly disabled
  return (FEATURE_FLAGS as Record<string, boolean>).USE_IMAGE_SOURCE_CLEANUP !== false;
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for managing image source lifecycle
 *
 * This hook:
 * 1. Resolves the best image source for a canvas
 * 2. Tracks the resolved source
 * 3. Automatically cleans up blob URLs on unmount
 * 4. Handles canvas changes (cleans up old source when canvas changes)
 *
 * @param canvas - The IIIF canvas to resolve image source for
 * @param options - Resolution options and hook configuration
 * @returns Image source state and utilities
 */
export function useImageSource(
  canvas: IIIFCanvas | null,
  options: UseImageSourceOptions = {}
): UseImageSourceResult {
  const { debug = false, ...resolverOptions } = options;

  const [state, setState] = useState<{
    source: ResolvedImageSource | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    source: null,
    isLoading: false,
    error: null,
  });

  // Track the current source for cleanup
  const currentSourceRef = useRef<ResolvedImageSource | null>(null);
  const canvasIdRef = useRef<string | null>(null);

  // Import resolver dynamically to avoid circular dependencies
  const resolveImageSource = useCallback(
    async (c: IIIFCanvas | null, opts: ImageSourceResolverOptions) => {
      const { resolveImageSource: resolver } = await import(
        '../services/imageSourceResolver'
      );
      return resolver(c, opts);
    },
    []
  );

  const cleanupImageSource = useCallback(
    async (source: ResolvedImageSource | null) => {
      if (!source?.needsCleanup || !source._blobRef) return;

      const { cleanupImageSource: cleanup } = await import(
        '../services/imageSourceResolver'
      );
      cleanup(source);
    },
    []
  );

  // Main effect: resolve source when canvas changes
  useEffect(() => {
    // Skip if feature flag disabled (use legacy behavior)
    if (!isAutoCleanupEnabled()) {
      if (debug) {
        console.log('[useImageSource] Auto-cleanup disabled by feature flag');
      }

      // Still resolve but don't auto-cleanup
      let cancelled = false;
      setState((s) => ({ ...s, isLoading: true, error: null }));

      resolveImageSource(canvas, resolverOptions)
        .then((source) => {
          if (!cancelled) {
            setState({ source, isLoading: false, error: null });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              source: null,
              isLoading: false,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    // Resolve the image source
    const resolve = async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        // Clean up previous source if canvas changed
        if (
          canvasIdRef.current !== null &&
          canvasIdRef.current !== canvas?.id &&
          currentSourceRef.current?.needsCleanup
        ) {
          if (debug) {
            console.log(
              '[useImageSource] Canvas changed, cleaning up previous source'
            );
          }
          await cleanupImageSource(currentSourceRef.current);
          currentSourceRef.current = null;
        }

        const source = await resolveImageSource(canvas, resolverOptions);

        if (cancelled) {
          // Component unmounted during resolution - clean up the new source
          await cleanupImageSource(source);
          return;
        }

        // Update refs
        canvasIdRef.current = canvas?.id || null;
        currentSourceRef.current = source;

        if (debug) {
          console.log('[useImageSource] Resolved source:', {
            type: source.type,
            url: source.url.substring(0, 100) + '...',
            needsCleanup: source.needsCleanup,
          });
        }

        setState({ source, isLoading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            source: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };

    resolve();

    // Cleanup on unmount or canvas change
    return () => {
      cancelled = true;
    };
  }, [canvas?.id, debug, resolveImageSource, resolverOptions, cleanupImageSource]);

  // Cleanup effect: runs on unmount
  useEffect(() => {
    return () => {
      if (isAutoCleanupEnabled() && currentSourceRef.current?.needsCleanup) {
        if (debug) {
          console.log('[useImageSource] Unmounting, cleaning up blob URL');
        }
        cleanupImageSource(currentSourceRef.current);
        currentSourceRef.current = null;
      }
    };
  }, [debug, cleanupImageSource]);

  // Refresh function
  const refresh = useCallback(() => {
    // Clean up current source
    if (currentSourceRef.current?.needsCleanup) {
      cleanupImageSource(currentSourceRef.current);
    }
    currentSourceRef.current = null;

    // Trigger re-resolution by updating state
    setState({ source: null, isLoading: false, error: null });

    // The canvas.id dependency will trigger the main effect
  }, [cleanupImageSource]);

  return {
    source: state.source,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    url: state.source?.url || null,
    needsCleanup: state.source?.needsCleanup || false,
  };
}

// ============================================================================
// Utility Hook for Multiple Canvases
// ============================================================================

export interface UseMultipleImageSourcesResult {
  /** Map of canvas ID to resolved source */
  sources: Map<string, ResolvedImageSource>;
  /** Loading state for each canvas */
  loadingStates: Map<string, boolean>;
  /** Error state for each canvas */
  errors: Map<string, Error>;
  /** Refresh all sources */
  refreshAll: () => void;
  /** Refresh a specific canvas */
  refreshOne: (canvasId: string) => void;
}

/**
 * Hook for resolving image sources for multiple canvases
 * Useful for gallery/grid views
 */
export function useMultipleImageSources(
  canvases: IIIFCanvas[],
  options: UseImageSourceOptions = {}
): UseMultipleImageSourcesResult {
  const { debug = false, ...resolverOptions } = options;

  const [sources, setSources] = useState<Map<string, ResolvedImageSource>>(
    new Map()
  );
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(
    new Map()
  );
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const sourcesRef = useRef<Map<string, ResolvedImageSource>>(new Map());

  // Update ref when sources change
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Resolve all canvases
  useEffect(() => {
    if (!isAutoCleanupEnabled()) {
      if (debug) {
        console.log(
          '[useMultipleImageSources] Auto-cleanup disabled by feature flag'
        );
      }
    }

    let cancelled = false;
    const abortControllers = new Map<string, AbortController>();

    const resolveAll = async () => {
      // Clean up sources for removed canvases
      const currentIds = new Set(canvases.map((c) => c.id));
      sourcesRef.current.forEach(async (source, id) => {
        if (!currentIds.has(id) && source.needsCleanup) {
          const { cleanupImageSource } = await import(
            '../services/imageSourceResolver'
          );
          cleanupImageSource(source);
        }
      });

      // Resolve new canvases
      const { resolveImageSource } = await import(
        '../services/imageSourceResolver'
      );

      for (const canvas of canvases) {
        // Skip if already resolved
        if (sourcesRef.current.has(canvas.id)) continue;

        const abortController = new AbortController();
        abortControllers.set(canvas.id, abortController);

        setLoadingStates((prev) => new Map(prev).set(canvas.id, true));

        try {
          const source = resolveImageSource(canvas, resolverOptions);

          if (cancelled || abortController.signal.aborted) {
            // Clean up if cancelled
            if (source.needsCleanup) {
              const { cleanupImageSource } = await import(
                '../services/imageSourceResolver'
              );
              cleanupImageSource(source);
            }
            continue;
          }

          setSources((prev) => new Map(prev).set(canvas.id, source));
          setLoadingStates((prev) => new Map(prev).set(canvas.id, false));
        } catch (error) {
          if (!cancelled && !abortController.signal.aborted) {
            setErrors(
              (prev) =>
                new Map(prev).set(
                  canvas.id,
                  error instanceof Error ? error : new Error(String(error))
                )
            );
            setLoadingStates((prev) => new Map(prev).set(canvas.id, false));
          }
        }
      }
    };

    resolveAll();

    return () => {
      cancelled = true;
      abortControllers.forEach((controller) => {
        controller.abort();
      });

      // Cleanup all blob URLs on unmount
      if (isAutoCleanupEnabled()) {
        sourcesRef.current.forEach((source) => {
          if (source.needsCleanup) {
            import('../services/imageSourceResolver').then(
              ({ cleanupImageSource }) => {
                cleanupImageSource(source);
              }
            );
          }
        });
      }
    };
  }, [canvases, debug, resolverOptions]);

  const refreshAll = useCallback(() => {
    // Clean up all sources
    sourcesRef.current.forEach((source) => {
      if (source.needsCleanup) {
        import('../services/imageSourceResolver').then(
          ({ cleanupImageSource }) => {
            cleanupImageSource(source);
          }
        );
      }
    });
    setSources(new Map());
    setLoadingStates(new Map());
    setErrors(new Map());
  }, []);

  const refreshOne = useCallback((canvasId: string) => {
    const source = sourcesRef.current.get(canvasId);
    if (source?.needsCleanup) {
      import('../services/imageSourceResolver').then(
        ({ cleanupImageSource }) => {
          cleanupImageSource(source);
        }
      );
    }
    setSources((prev) => {
      const next = new Map(prev);
      next.delete(canvasId);
      return next;
    });
    setLoadingStates((prev) => new Map(prev).set(canvasId, false));
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(canvasId);
      return next;
    });
  }, []);

  return {
    sources,
    loadingStates,
    errors,
    refreshAll,
    refreshOne,
  };
}