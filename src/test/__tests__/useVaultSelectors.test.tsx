/**
 * Unit Tests for hooks/useVaultSelectors.ts
 *
 * Tests Vault selectors for IIIF entity access and queries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, ReactNode } from 'react';
import {
  useEntity,
  useEntityLabel,
  useEntityChildren,
  useEntityAncestors,
  useEntityParent,
  useEntityType,
  useEntitiesByType,
  useEntityExists,
} from '../../../hooks/useVaultSelectors';
import { VaultProvider, useVaultState } from '../../../hooks/useIIIFEntity';
import { normalizeIIIF } from '../../../services/vault';
import type { IIIFManifest } from '../../../types';

// Mock vault context provider
const createMockVaultContext = (manifest: IIIFManifest) => {
  const state = normalizeIIIF(manifest);
  return {
    state,
    dispatch: vi.fn(),
  };
};

// Wrapper component using VaultProvider
const createWrapper = (manifest: IIIFManifest) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(VaultProvider, { initialRoot: manifest, children });
  };
};

// ============================================================================
// useEntity Tests
// ============================================================================

describe('useEntity', () => {
  it('should return entity by ID', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [],
    };

    const { result } = renderHook(() => useEntity('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBeDefined();
    expect(result.current?.type).toBe('Manifest');
  });

  it('should return null for non-existent entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntity('https://example.com/nonexistent'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBeNull();
  });
});

// ============================================================================
// useEntityLabel Tests
// ============================================================================

describe('useEntityLabel', () => {
  it('should return entity label', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityLabel('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe('Test Manifest');
  });

  it('should return ID fragment for entity without label', () => {
    const manifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      items: [],
    } as IIIFManifest;

    const { result } = renderHook(() => useEntityLabel('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    // Falls back to ID fragment when no label is present
    expect(result.current).toBe('manifest');
  });

  it('should return "Untitled" for entity with empty ID fragment', () => {
    const manifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'manifest',
      type: 'Manifest',
      items: [],
    } as IIIFManifest;

    const { result } = renderHook(() => useEntityLabel('manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe('Untitled');
  });
});

// ============================================================================
// useEntityChildren Tests
// ============================================================================

describe('useEntityChildren', () => {
  it('should return child IDs', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
          label: { en: ['Page 2'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    const { result } = renderHook(() => useEntityChildren('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toHaveLength(2);
    expect(result.current).toContain('https://example.com/canvas/1');
    expect(result.current).toContain('https://example.com/canvas/2');
  });

  it('should return empty array for entity without children', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityChildren('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toEqual([]);
  });
});

// ============================================================================
// useEntityParent Tests
// ============================================================================

describe('useEntityParent', () => {
  it('should return parent ID', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    const { result } = renderHook(() => useEntityParent('https://example.com/canvas/1'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe('https://example.com/manifest');
  });

  it('should return null for root entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityParent('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBeNull();
  });
});

// ============================================================================
// useEntityType Tests
// ============================================================================

describe('useEntityType', () => {
  it('should return entity type', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityType('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe('Manifest');
  });

  it('should return null for non-existent entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityType('https://example.com/nonexistent'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBeNull();
  });
});

// ============================================================================
// useEntitiesByType Tests
// ============================================================================

describe('useEntitiesByType', () => {
  it('should return all entities of specified type', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
          label: { en: ['Page 2'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    const { result } = renderHook(() => useEntitiesByType('Canvas'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).toBe('https://example.com/canvas/1');
    expect(result.current[1].id).toBe('https://example.com/canvas/2');
  });

  it('should return empty array when no entities of type exist', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntitiesByType('Canvas'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toEqual([]);
  });
});

// ============================================================================
// useEntityExists Tests
// ============================================================================

describe('useEntityExists', () => {
  it('should return true for existing entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityExists('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe(true);
  });

  it('should return false for non-existent entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityExists('https://example.com/nonexistent'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// useEntityAncestors Tests
// ============================================================================

describe('useEntityAncestors', () => {
  it('should return ancestor IDs', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    const { result } = renderHook(() => useEntityAncestors('https://example.com/canvas/1'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toContain('https://example.com/manifest');
  });

  it('should return empty array for root entity', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    const { result } = renderHook(() => useEntityAncestors('https://example.com/manifest'), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current).toEqual([]);
  });
});
