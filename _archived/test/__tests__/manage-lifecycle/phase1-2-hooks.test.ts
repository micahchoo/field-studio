/**
 * Phase 1 & 2 Hook Integration Tests
 *
 * Covers:
 *   - useDebouncedValue      (input-aware debounce with flush)
 *   - usePersistedTab        (localStorage-backed tab state)
 *   - useContextualStyles    (fieldMode → className map)
 *   - buildCanvasFromLayers  (pure serialiser – no hook)
 *   - useLayerHistory        (undo/redo stack + canvas parser)
 *   - UserIntentProvider     (split-context pattern: state + dispatch)
 *   - ResourceContextProvider (split-context pattern: state + dispatch)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';

// Hooks under test – use relative paths that resolve through the vitest alias
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePersistedTab } from '@/hooks/usePersistedTab';
import { useContextualStyles } from '@/hooks/useContextualStyles';
import { buildCanvasFromLayers, PlacedResource, useLayerHistory } from '@/hooks/useLayerHistory';
import {
  UserIntentProvider,
  useUserIntentDispatch,
  useUserIntentState,
} from '@/hooks/useUserIntent';
import {
  ResourceContextProvider,
  useResourceContextDispatch,
  useResourceContextState,
} from '@/hooks/useResourceContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal IIIFCanvas fixture with one painting annotation */
function makeCanvas(id = 'http://example.com/canvas/1', layers: any[] = []) {
  const items = layers.length
    ? [{
        id: `${id}/page`,
        type: 'AnnotationPage' as const,
        items: layers.map((l, i) => ({
          id: l.id ?? `${id}/anno/${i}`,
          type: 'Annotation' as const,
          motivation: 'painting' as const,
          body: { id: `http://example.com/img/${i}.jpg`, type: 'Image' },
          target: `${id}#xywh=${l.x ?? 0},${l.y ?? 0},${l.w ?? 100},${l.h ?? 100}`,
        })),
      }]
    : undefined;

  return {
    id,
    type: 'Canvas' as const,
    width: 800,
    height: 600,
    items,
  };
}

/** Wrapper that provides both Phase 1 contexts */
function providerWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    UserIntentProvider,
    null,
    React.createElement(ResourceContextProvider, null, children)
  );
}

// ===========================================================================
// useDebouncedValue
// ===========================================================================

describe('useDebouncedValue', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns initial value immediately', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebouncedValue('hello', onChange, 300));
    expect(result.current.localValue).toBe('hello');
  });

  it('does not call onChange until delay elapses', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebouncedValue('', onChange, 300));

    await act(() => { result.current.handleChange('typed'); });
    expect(onChange).not.toHaveBeenCalled();

    await act(() => { vi.advanceTimersByTime(299); });
    expect(onChange).not.toHaveBeenCalled();

    await act(() => { vi.advanceTimersByTime(1); });
    expect(onChange).toHaveBeenCalledWith('typed');
  });

  it('resets the timer on each keystroke', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebouncedValue('', onChange, 300));

    await act(() => { result.current.handleChange('a'); });
    await act(() => { vi.advanceTimersByTime(200); });
    await act(() => { result.current.handleChange('ab'); });
    await act(() => { vi.advanceTimersByTime(200); });
    // Only 200 ms after last keystroke – should not fire yet
    expect(onChange).not.toHaveBeenCalled();

    await act(() => { vi.advanceTimersByTime(100); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('ab');
  });

  it('flush fires immediately with current local value', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebouncedValue('', onChange, 300));

    await act(() => { result.current.handleChange('flush-me'); });
    expect(onChange).not.toHaveBeenCalled();

    await act(() => { result.current.flush(); });
    expect(onChange).toHaveBeenCalledWith('flush-me');
  });

  it('syncs from parent when not editing', async () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ val }: { val: string }) => useDebouncedValue(val, onChange, 300),
      { initialProps: { val: 'initial' } }
    );
    expect(result.current.localValue).toBe('initial');

    // Parent pushes new value while user is idle
    rerender({ val: 'updated' });
    expect(result.current.localValue).toBe('updated');
  });

  it('does not sync from parent while user is editing', async () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ val }: { val: string }) => useDebouncedValue(val, onChange, 300),
      { initialProps: { val: 'initial' } }
    );

    // User starts typing – sets isEditing flag
    await act(() => { result.current.handleChange('user-typed'); });
    expect(result.current.localValue).toBe('user-typed');

    // Parent pushes a different value – should be ignored mid-edit
    rerender({ val: 'parent-push' });
    expect(result.current.localValue).toBe('user-typed');
  });
});

// ===========================================================================
// usePersistedTab
// ===========================================================================

describe('usePersistedTab', () => {
  const ALLOWED = ['details', 'metadata', 'annotations'] as const;

  beforeEach(() => { localStorage.clear(); });

  it('defaults to the provided default value', () => {
    const { result } = renderHook(() =>
      usePersistedTab('test', 'canvas-1', ALLOWED, 'details')
    );
    expect(result.current[0]).toBe('details');
  });

  it('reads an existing valid value from localStorage', () => {
    localStorage.setItem('test-tab-canvas-1', 'metadata');
    const { result } = renderHook(() =>
      usePersistedTab('test', 'canvas-1', ALLOWED, 'details')
    );
    expect(result.current[0]).toBe('metadata');
  });

  it('falls back to default when stored value is not in allowlist', () => {
    localStorage.setItem('test-tab-canvas-1', 'stale-invalid-tab');
    const { result } = renderHook(() =>
      usePersistedTab('test', 'canvas-1', ALLOWED, 'details')
    );
    expect(result.current[0]).toBe('details');
  });

  it('persists the tab value when set', async () => {
    const { result } = renderHook(() =>
      usePersistedTab('test', 'canvas-1', ALLOWED, 'details')
    );

    await act(() => { result.current[1]('annotations'); });
    expect(result.current[0]).toBe('annotations');
    expect(localStorage.getItem('test-tab-canvas-1')).toBe('annotations');
  });

  it('re-reads storage when the key changes', async () => {
    localStorage.setItem('test-tab-canvas-2', 'metadata');
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        usePersistedTab('test', key, ALLOWED, 'details'),
      { initialProps: { key: 'canvas-1' } }
    );
    expect(result.current[0]).toBe('details'); // nothing stored for canvas-1

    await act(() => { rerender({ key: 'canvas-2' }); });
    expect(result.current[0]).toBe('metadata'); // picks up canvas-2 stored value
  });
});

// ===========================================================================
// useContextualStyles
// ===========================================================================

describe('useContextualStyles', () => {
  it('returns light-mode tokens when fieldMode is false', () => {
    const { result } = renderHook(() => useContextualStyles(false));
    const cx = result.current;

    expect(cx.surface).toContain('bg-white');
    expect(cx.text).toContain('text-slate-800');
    expect(cx.accent).toContain('text-blue-600');
    expect(cx.active).toContain('border-blue-600');
    expect(cx.warningBg).toContain('bg-orange-50');
  });

  it('returns dark/high-contrast tokens when fieldMode is true', () => {
    const { result } = renderHook(() => useContextualStyles(true));
    const cx = result.current;

    expect(cx.surface).toContain('bg-slate-900');
    expect(cx.text).toContain('text-white');
    expect(cx.accent).toContain('text-yellow-400');
    expect(cx.active).toContain('border-yellow-400');
    expect(cx.headerBg).toContain('bg-black');
  });

  it('all 12 semantic keys are present', () => {
    const { result } = renderHook(() => useContextualStyles(false));
    const keys = [
      'surface', 'text', 'textMuted', 'border', 'input',
      'label', 'divider', 'active', 'inactive', 'accent',
      'warningBg', 'headerBg',
    ];
    keys.forEach(k => {
      expect(result.current[k as keyof typeof result.current]).toBeDefined();
    });
  });

  it('does not produce new object reference when fieldMode unchanged', () => {
    const { result, rerender } = renderHook(
      ({ fm }: { fm: boolean }) => useContextualStyles(fm),
      { initialProps: { fm: false } }
    );
    const first = result.current;
    rerender({ fm: false });
    expect(result.current).toBe(first); // useMemo stable reference
  });
});

// ===========================================================================
// buildCanvasFromLayers (pure utility — no hooks)
// ===========================================================================

describe('buildCanvasFromLayers', () => {
  it('produces a canvas with one painting annotation per layer', () => {
    const canvas = makeCanvas();
    const layers: PlacedResource[] = [
      { id: 'layer-1', resource: { id: 'img-1', type: 'Image' }, x: 10, y: 20, w: 200, h: 300, opacity: 1, locked: false },
    ];

    const result = buildCanvasFromLayers(canvas as any, layers, { w: 800, h: 600 });
    const paintingPage = result.items![0];
    expect(paintingPage.items).toHaveLength(1);
    expect(paintingPage.items![0].motivation).toBe('painting');
    expect(paintingPage.items![0].target).toBe('http://example.com/canvas/1#xywh=10,20,200,300');
  });

  it('emits TextualBody for Text layers', () => {
    const canvas = makeCanvas();
    const layers: PlacedResource[] = [
      { id: 'text-1', resource: { id: 'txt', type: 'Text', _text: 'Hello' }, x: 0, y: 0, w: 100, h: 50, opacity: 1, locked: false },
    ];

    const result = buildCanvasFromLayers(canvas as any, layers, { w: 800, h: 600 });
    const anno = result.items![0].items![0];
    expect(anno.body).toMatchObject({ type: 'TextualBody', value: 'Hello', format: 'text/plain' });
  });

  it('preserves existing non-painting annotations', () => {
    const canvas = {
      ...makeCanvas(),
      items: [{
        id: 'page',
        type: 'AnnotationPage' as const,
        items: [
          { id: 'existing-comment', type: 'Annotation' as const, motivation: 'commenting' as const, body: { type: 'TextualBody', value: 'note' }, target: 'http://example.com/canvas/1' },
        ],
      }],
    };
    const layers: PlacedResource[] = [];

    const result = buildCanvasFromLayers(canvas as any, layers, { w: 800, h: 600 });
    // Second page should contain the preserved commenting annotation
    expect(result.items).toHaveLength(2);
    expect(result.items![1].items![0].id).toBe('existing-comment');
  });

  it('updates canvas dimensions from the provided dimensions arg', () => {
    const canvas = makeCanvas();
    const result = buildCanvasFromLayers(canvas as any, [], { w: 1920, h: 1080 });
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('rounds fractional coordinates to integers', () => {
    const canvas = makeCanvas();
    const layers: PlacedResource[] = [
      { id: 'layer-frac', resource: { id: 'img', type: 'Image' }, x: 10.7, y: 20.3, w: 100.9, h: 50.1, opacity: 1, locked: false },
    ];

    const result = buildCanvasFromLayers(canvas as any, layers, { w: 800, h: 600 });
    expect(result.items![0].items![0].target).toBe('http://example.com/canvas/1#xywh=11,20,101,50');
  });
});

// ===========================================================================
// useLayerHistory
// ===========================================================================

describe('useLayerHistory', () => {
  it('initialises layers from canvas painting annotations', () => {
    const canvas = makeCanvas('http://ex.com/c/1', [
      { x: 0, y: 0, w: 400, h: 300 },
      { x: 400, y: 0, w: 400, h: 300 },
    ]);

    const { result } = renderHook(() => useLayerHistory(canvas as any));
    expect(result.current.layers).toHaveLength(2);
    expect(result.current.layers[0].x).toBe(0);
    expect(result.current.layers[1].x).toBe(400);
  });

  it('initialises empty when canvas has no items', () => {
    const canvas = makeCanvas();
    const { result } = renderHook(() => useLayerHistory(canvas as any));
    expect(result.current.layers).toHaveLength(0);
  });

  it('records history on updateLayers and enables undo', async () => {
    const canvas = makeCanvas();
    const { result } = renderHook(() => useLayerHistory(canvas as any));

    const layer: PlacedResource = {
      id: 'new', resource: { id: 'img', type: 'Image' },
      x: 0, y: 0, w: 100, h: 100, opacity: 1, locked: false,
    };

    await act(() => { result.current.updateLayers([layer]); });
    expect(result.current.layers).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Undo returns to empty
    await act(() => { result.current.undo(); });
    expect(result.current.layers).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo restores undone state', async () => {
    const canvas = makeCanvas();
    const { result } = renderHook(() => useLayerHistory(canvas as any));

    const layer: PlacedResource = {
      id: 'r', resource: { id: 'img', type: 'Image' },
      x: 5, y: 5, w: 50, h: 50, opacity: 1, locked: false,
    };

    await act(() => { result.current.updateLayers([layer]); });
    await act(() => { result.current.undo(); });
    expect(result.current.layers).toHaveLength(0);

    await act(() => { result.current.redo(); });
    expect(result.current.layers).toHaveLength(1);
    expect(result.current.layers[0].id).toBe('r');
  });

  it('new update after undo clears the future stack', async () => {
    const canvas = makeCanvas();
    const { result } = renderHook(() => useLayerHistory(canvas as any));

    const a: PlacedResource = { id: 'a', resource: { id: 'a', type: 'Image' }, x: 0, y: 0, w: 10, h: 10, opacity: 1, locked: false };
    const b: PlacedResource = { id: 'b', resource: { id: 'b', type: 'Image' }, x: 0, y: 0, w: 20, h: 20, opacity: 1, locked: false };
    const c: PlacedResource = { id: 'c', resource: { id: 'c', type: 'Image' }, x: 0, y: 0, w: 30, h: 30, opacity: 1, locked: false };

    await act(() => { result.current.updateLayers([a]); });
    await act(() => { result.current.updateLayers([a, b]); });
    await act(() => { result.current.undo(); }); // back to [a]
    expect(result.current.canRedo).toBe(true);

    // Branch: new update should clear future
    await act(() => { result.current.updateLayers([a, c]); });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.layers[1].id).toBe('c');
  });

  it('re-initialises when canvas.id changes', async () => {
    const canvasA = makeCanvas('http://ex.com/c/A', [{ x: 0, y: 0, w: 100, h: 100 }]);
    const canvasB = makeCanvas('http://ex.com/c/B', [
      { x: 10, y: 10, w: 50, h: 50 },
      { x: 60, y: 10, w: 50, h: 50 },
    ]);

    const { result, rerender } = renderHook(
      ({ canvas }: { canvas: any }) => useLayerHistory(canvas),
      { initialProps: { canvas: canvasA } }
    );
    expect(result.current.layers).toHaveLength(1);

    rerender({ canvas: canvasB });
    expect(result.current.layers).toHaveLength(2);
    expect(result.current.canUndo).toBe(false); // history reset
  });

  it('ignores duplicate updateLayers calls with identical state', async () => {
    const canvas = makeCanvas();
    const { result } = renderHook(() => useLayerHistory(canvas as any));

    const layer: PlacedResource = { id: 'dup', resource: { id: 'i', type: 'Image' }, x: 0, y: 0, w: 10, h: 10, opacity: 1, locked: false };
    await act(() => { result.current.updateLayers([layer]); });

    // Push exact same state again
    await act(() => { result.current.updateLayers([layer]); });
    expect(result.current.canUndo).toBe(true);

    await act(() => { result.current.undo(); });
    // Should go back to empty (only one history entry was recorded)
    expect(result.current.layers).toHaveLength(0);
  });
});

// ===========================================================================
// UserIntentProvider – split-context integration
// ===========================================================================

describe('UserIntentProvider', () => {
  it('starts with idle intent', () => {
    const { result } = renderHook(
      () => useUserIntentState(),
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );
    expect(result.current.intent).toBe('idle');
  });

  it('setIntent updates state and records startedAt', async () => {
    const { result: stateResult } = renderHook(
      () => useUserIntentState(),
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );
    const { result: dispatchResult } = renderHook(
      () => useUserIntentDispatch(),
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );

    // Note: state and dispatch come from separate renderHook calls so they
    // have independent provider instances.  Test them within a single wrapper.
    const Combined = () => {
      const state = useUserIntentState();
      const dispatch = useUserIntentDispatch();
      return { state, dispatch } as any;
    };

    const { result } = renderHook(
      () => {
        const state = useUserIntentState();
        const dispatch = useUserIntentDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );

    expect(result.current.state.intent).toBe('idle');

    await act(() => {
      result.current.dispatch.setIntent('editing', { area: 'inspector' });
    });

    expect(result.current.state.intent).toBe('editing');
    expect(result.current.state.area).toBe('inspector');
    expect(result.current.state.startedAt).toBeTypeOf('number');
  });

  it('clearIntent resets to idle', async () => {
    const { result } = renderHook(
      () => {
        const state = useUserIntentState();
        const dispatch = useUserIntentDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );

    await act(() => { result.current.dispatch.setIntent('exporting'); });
    expect(result.current.state.intent).toBe('exporting');

    await act(() => { result.current.dispatch.clearIntent(); });
    expect(result.current.state.intent).toBe('idle');
  });

  it('updateMeta merges metadata', async () => {
    const { result } = renderHook(
      () => {
        const state = useUserIntentState();
        const dispatch = useUserIntentDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );

    await act(() => { result.current.dispatch.setIntent('editing', { meta: { field: 'label' } }); });
    await act(() => { result.current.dispatch.updateMeta({ count: 3 }); });

    expect(result.current.state.meta).toMatchObject({ field: 'label', count: 3 });
  });

  it('isIntent returns correct boolean', async () => {
    const { result } = renderHook(
      () => {
        const state = useUserIntentState();
        const dispatch = useUserIntentDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(UserIntentProvider, null, children) }
    );

    await act(() => { result.current.dispatch.setIntent('searching'); });
    expect(result.current.dispatch.isIntent('searching')).toBe(true);
    expect(result.current.dispatch.isIntent('editing')).toBe(false);
  });

  it('throws when used outside provider', () => {
    // Suppress the error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useUserIntentState());
    }).toThrow(/UserIntentProvider/);
    spy.mockRestore();
  });
});

// ===========================================================================
// ResourceContextProvider – split-context integration
// ===========================================================================

describe('ResourceContextProvider', () => {
  it('starts with null resource', () => {
    const { result } = renderHook(
      () => useResourceContextState(),
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );
    expect(result.current.resource).toBeNull();
    expect(result.current.type).toBeNull();
  });

  it('setResource updates state including derived type', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    const manifest = { id: 'http://ex.com/manifest', type: 'Manifest' as const, label: { en: ['Test'] } };
    await act(() => { result.current.dispatch.setResource(manifest as any); });

    expect(result.current.state.resource).toBe(manifest);
    expect(result.current.state.type).toBe('Manifest');
  });

  it('clearResource resets to null', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    await act(() => {
      result.current.dispatch.setResource({ id: 'x', type: 'Canvas' as const } as any);
    });
    expect(result.current.state.type).toBe('Canvas');

    await act(() => { result.current.dispatch.clearResource(); });
    expect(result.current.state.resource).toBeNull();
    expect(result.current.state.type).toBeNull();
  });

  it('recordEdit increments editCount and records editor', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    await act(() => { result.current.dispatch.recordEdit('user-1'); });
    await act(() => { result.current.dispatch.recordEdit('user-1'); }); // duplicate editor
    await act(() => { result.current.dispatch.recordEdit('user-2'); });

    expect(result.current.state.editHistory.editCount).toBe(3);
    expect(result.current.state.editHistory.editors).toEqual(['user-1', 'user-2']);
    expect(result.current.state.editHistory.lastEditedAt).toBeTypeOf('number');
  });

  it('setCollaborationLock updates lock state', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    await act(() => {
      result.current.dispatch.setCollaborationLock(true, ['user-A'], 42);
    });

    expect(result.current.state.collaborationState).toMatchObject({
      isLocked: true,
      lockedBy: ['user-A'],
      version: 42,
    });
  });

  it('updateAccessibility merges partial features', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    await act(() => {
      result.current.dispatch.updateAccessibility({ hasAltText: true, contrastLevel: 'AA' });
    });

    expect(result.current.state.accessibilityFeatures.hasAltText).toBe(true);
    expect(result.current.state.accessibilityFeatures.contrastLevel).toBe('AA');
    // Untouched fields remain at defaults
    expect(result.current.state.accessibilityFeatures.hasCaptions).toBe(false);
  });

  it('isType returns correct boolean for current resource', async () => {
    const { result } = renderHook(
      () => {
        const state = useResourceContextState();
        const dispatch = useResourceContextDispatch();
        return { state, dispatch };
      },
      { wrapper: ({ children }) => React.createElement(ResourceContextProvider, null, children) }
    );

    await act(() => {
      result.current.dispatch.setResource({ id: 'c', type: 'Canvas' as const } as any);
    });

    expect(result.current.dispatch.isType('Canvas')).toBe(true);
    expect(result.current.dispatch.isType('Manifest')).toBe(false);
  });

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useResourceContextState());
    }).toThrow(/ResourceContextProvider/);
    spy.mockRestore();
  });
});

// ===========================================================================
// Provider composition – both providers nested together
// ===========================================================================

describe('Provider composition', () => {
  it('both contexts are accessible from a single wrapper', () => {
    const { result } = renderHook(
      () => {
        const intentState = useUserIntentState();
        const resourceState = useResourceContextState();
        return { intentState, resourceState };
      },
      { wrapper: providerWrapper }
    );

    expect(result.current.intentState.intent).toBe('idle');
    expect(result.current.resourceState.resource).toBeNull();
  });

  it('intent and resource dispatches are independent', async () => {
    const { result } = renderHook(
      () => {
        const intentState = useUserIntentState();
        const intentDispatch = useUserIntentDispatch();
        const resourceState = useResourceContextState();
        const resourceDispatch = useResourceContextDispatch();
        return { intentState, intentDispatch, resourceState, resourceDispatch };
      },
      { wrapper: providerWrapper }
    );

    await act(() => { result.current.intentDispatch.setIntent('editing'); });
    await act(() => {
      result.current.resourceDispatch.setResource({ id: 'x', type: 'Canvas' as const } as any);
    });

    expect(result.current.intentState.intent).toBe('editing');
    expect(result.current.resourceState.type).toBe('Canvas');
  });
});
