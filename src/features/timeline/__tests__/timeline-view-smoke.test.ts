/**
 * TimelineView — smoke tests
 *
 * Purpose: verify the component renders user-visible content: the "Timeline"
 * heading, zoom level radio buttons (day/month/year), and the "No dated items"
 * empty state when the collection has no temporal data.
 *
 * TimelineView is pure Svelte (no external date library), so happy-dom is sufficient.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA roles -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import TimelineView from '../ui/organisms/TimelineView.svelte';
import type { IIIFItem } from '@/src/shared/types';
import { vault } from '@/src/shared/stores/vault.svelte';

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
    vault.load(makeCollection());
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('renders the "Timeline" heading text', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Timeline');
  });

  it('renders zoom level radio buttons for day, month, and year', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    const radios = target.querySelectorAll('[role="radio"]');
    const radioTexts = Array.from(radios).map((r) => r.textContent?.trim());

    expect(radioTexts).toContain('day');
    expect(radioTexts).toContain('month');
    expect(radioTexts).toContain('year');
  });

  it('renders zoom level radiogroup with proper aria-label', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    const radiogroup = target.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();
    expect(radiogroup?.getAttribute('aria-label')).toBe('Zoom level');
  });

  it('displays "No dated items" empty state for a collection with no temporal data', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('No dated items');
    expect(target.textContent).toContain('Add navDate to canvases to see them on the timeline.');
  });

  it('renders without crashing for a dated manifest and shows "Timeline" heading', () => {
    vault.load(makeManifestWithDate());

    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Timeline');
  });

  it('renders in field mode without crashing and still shows Timeline heading', () => {
    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: true,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Timeline');
    expect(target.textContent).toContain('No dated items');
  });

  it('handles a collection with items that have no navDate gracefully', () => {
    vault.load({
      id: 'collection-no-dates',
      type: 'Collection',
      label: { en: ['Undated Collection'] },
      items: [
        {
          id: 'canvas-no-date',
          type: 'Canvas',
          label: { en: ['Undated Canvas'] },
          items: [],
        },
      ],
    } as unknown as IIIFItem);

    instance = mount(TimelineView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    // Canvases without navDate should still render timeline but with no dated items
    expect(target.textContent).toContain('Timeline');
  });
});
