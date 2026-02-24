/**
 * BatchEditor — smoke tests
 *
 * Purpose: verify the bulk-edit organism mounts without crashing when
 * given a minimal set of IDs and a root IIIFItem. BatchEditor uses
 * localStorage for its rollback snapshot — happy-dom provides a stub
 * implementation that satisfies getItem/setItem/removeItem calls.
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BatchEditor from '../ui/organisms/BatchEditor.svelte';
import type { IIIFItem } from '@/src/shared/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeManifest(id = 'manifest-1'): IIIFItem {
  return {
    id,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('BatchEditor smoke tests', () => {
  let target: HTMLDivElement;
  let instance: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = undefined;
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('mounts with a single selected ID without crashing', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with multiple selected IDs without crashing', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1', 'canvas-2', 'canvas-3'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
        onRollback: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with empty ids array without crashing', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: [],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });
});
