/**
 * TimelineView — smoke tests
 *
 * Purpose: verify the component mounts without crashing when given
 * realistic minimal props. TimelineView is pure Svelte (no external
 * date library in the rendering layer), so happy-dom is sufficient.
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import TimelineView from '../ui/organisms/TimelineView.svelte';
import type { IIIFItem } from '@/src/shared/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const cx = {
  surface: 'bg-nb-white',
  text: 'text-nb-black',
  accent: 'text-nb-blue',
  border: 'border-nb-black/10',
  divider: 'border-nb-black/10',
  headerBg: 'bg-nb-cream',
  textMuted: 'text-nb-black/40',
  input: '',
  label: '',
  active: '',
  inactive: '',
  warningBg: '',
};

const t = (key: string, fallback?: string) => fallback ?? key;

function makeCollection(): IIIFItem {
  return {
    id: 'collection-1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
  } as unknown as IIIFItem;
}

function makeManifestWithDate(): IIIFItem {
  return {
    id: 'manifest-dated',
    type: 'Manifest',
    label: { en: ['Dated Manifest'] },
    navDate: '2023-06-15T00:00:00Z',
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('TimelineView smoke tests', () => {
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
  });

  it('mounts with empty collection without crashing', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        root: makeCollection(),
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with a dated manifest without crashing', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        root: makeManifestWithDate(),
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts in field mode without crashing', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        root: makeCollection(),
        cx,
        fieldMode: true,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });
});
