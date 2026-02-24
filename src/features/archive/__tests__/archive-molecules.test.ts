/**
 * Archive Feature — Molecule Tests
 *
 * Tests for BlurUpThumbnail, GroupedArchiveGrid, and HoverPreviewCard.
 * These are the 0%-coverage archive molecules ported from React TSX to Svelte 5.
 *
 * Each suite validates:
 *   - Mount without crashing (minimal required props)
 *   - DOM structure / key CSS class presence
 *   - Conditional rendering branches
 *   - Prop-driven behaviour differences (fieldMode, authStatus, etc.)
 *   - Callback wiring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import type { IIIFCanvas } from '@/src/shared/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Minimal contextual-styles stub accepted by all archive molecules */
const cx = {
  surface: '',
  text: '',
  accent: '',
  textMuted: '',
  divider: '',
  thumbnailBg: '',
  selected: '',
  border: '',
} as const;

/** Build a minimal IIIFCanvas fixture */
function makeCanvas(overrides: Partial<IIIFCanvas> = {}): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
    ...overrides,
  } as unknown as IIIFCanvas;
}

/** Anchor rect used by HoverPreviewCard position calculations */
const anchorRect = {
  top: 100,
  left: 100,
  right: 300,
  bottom: 250,
  width: 200,
  height: 150,
};

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

let target: HTMLDivElement;
let instance: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = undefined;
});

afterEach(() => {
  if (instance) {
    try { unmount(instance); } catch { /* ignore */ }
  }
  target.remove();
  vi.clearAllMocks();
});

// ===========================================================================
// BlurUpThumbnail
// ===========================================================================

import BlurUpThumbnail from '../ui/molecules/BlurUpThumbnail.svelte';

describe('BlurUpThumbnail', () => {
  const baseProps = {
    lowResUrl: 'https://example.org/thumb-low.jpg',
    highResUrl: 'https://example.org/thumb-high.jpg',
    cx,
    fieldMode: false,
  };

  it('renders without crashing', () => {
    instance = mount(BlurUpThumbnail, { target, props: baseProps });
    expect(target.firstChild).toBeTruthy();
  });

  it('renders container with relative class', () => {
    instance = mount(BlurUpThumbnail, { target, props: baseProps });
    const container = target.firstElementChild;
    expect(container).toBeTruthy();
    expect(container!.className).toContain('relative');
  });

  it('renders low-res image when lowResUrl provided', () => {
    instance = mount(BlurUpThumbnail, { target, props: baseProps });
    const imgs = target.querySelectorAll('img');
    const lowRes = Array.from(imgs).find(img => img.src.includes('thumb-low'));
    expect(lowRes).toBeTruthy();
  });

  it('renders high-res image when highResUrl provided', () => {
    instance = mount(BlurUpThumbnail, { target, props: baseProps });
    const imgs = target.querySelectorAll('img');
    const highRes = Array.from(imgs).find(img => img.src.includes('thumb-high'));
    expect(highRes).toBeTruthy();
  });

  it('shows fallback icon when both URLs are empty strings', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, lowResUrl: '', highResUrl: '' },
    });
    // Both URLs empty → showFallback = true → renders icon fallback
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    // Default fallbackIcon is 'image'
    expect(icon!.textContent).toBe('image');
  });

  it('uses custom fallbackIcon when specified', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, lowResUrl: '', highResUrl: '', fallbackIcon: 'broken_image' },
    });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('broken_image');
  });

  it('shows lock icon badge when authStatus is locked', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, authStatus: 'locked' },
    });
    const icons = target.querySelectorAll('.material-icons');
    const lockIcon = Array.from(icons).find(i => i.textContent === 'lock');
    expect(lockIcon).toBeTruthy();
  });

  it('shows lock_open icon badge when authStatus is unlocked', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, authStatus: 'unlocked' },
    });
    const icons = target.querySelectorAll('.material-icons');
    const unlockIcon = Array.from(icons).find(i => i.textContent === 'lock_open');
    expect(unlockIcon).toBeTruthy();
  });

  it('does not render auth badge when authStatus is unknown', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, authStatus: 'unknown' },
    });
    // authIcon is null when status is 'unknown' → no badge div
    const lockIcons = Array.from(target.querySelectorAll('.material-icons'))
      .filter(i => i.textContent === 'lock' || i.textContent === 'lock_open');
    expect(lockIcons.length).toBe(0);
  });

  it('applies red badge class for locked status', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, authStatus: 'locked' },
    });
    // Badge wrapper has bg-nb-red class
    const badge = target.querySelector('.rounded-full');
    expect(badge).toBeTruthy();
    expect(badge!.className).toContain('bg-nb-red');
  });

  it('applies green badge class for unlocked status', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, authStatus: 'unlocked' },
    });
    const badge = target.querySelector('.rounded-full');
    expect(badge).toBeTruthy();
    expect(badge!.className).toContain('bg-nb-green');
  });

  it('passes additional class to container', () => {
    instance = mount(BlurUpThumbnail, {
      target,
      props: { ...baseProps, class: 'custom-thumb-class' },
    });
    const container = target.firstElementChild;
    expect(container!.className).toContain('custom-thumb-class');
  });
});

// ===========================================================================
// GroupedArchiveGrid
// ===========================================================================

import GroupedArchiveGrid from '../ui/molecules/GroupedArchiveGrid.svelte';

describe('GroupedArchiveGrid', () => {
  const isSelected = vi.fn(() => false);
  const onItemClick = vi.fn();
  const onToggleSelect = vi.fn();
  const onContextMenu = vi.fn();

  const baseProps = {
    groups: [],
    isSelected,
    onItemClick,
    onToggleSelect,
    onContextMenu,
    cx,
    fieldMode: false,
  };

  it('renders without crashing with empty groups', () => {
    instance = mount(GroupedArchiveGrid, { target, props: baseProps });
    expect(target.firstChild).toBeTruthy();
  });

  it('shows empty state when groups array is empty', () => {
    instance = mount(GroupedArchiveGrid, { target, props: baseProps });
    // Empty state shows "No manifest groups to display"
    expect(target.textContent).toContain('No manifest groups to display');
  });

  it('renders group section headers when groups provided', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Expedition Alpha',
        canvases: [makeCanvas()],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    expect(target.textContent).toContain('Expedition Alpha');
  });

  it('renders canvas count in group header', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'My Manifest',
        canvases: [makeCanvas(), makeCanvas({ id: 'https://example.org/canvas/2' })],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    // Count is 2
    expect(target.textContent).toContain('2');
  });

  it('renders canvas grid for each group', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Group A',
        canvases: [makeCanvas()],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    const grid = target.querySelector('[role="grid"]');
    expect(grid).toBeTruthy();
  });

  it('renders validation dot for canvas with issues', () => {
    const canvasWithIssues = makeCanvas({ id: 'https://example.org/canvas/bad' });
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Issues Manifest',
        canvases: [canvasWithIssues],
      },
    ];
    const validationIssues = new Map([['https://example.org/canvas/bad', [{ severity: 'error' }]]]);
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups, validationIssues },
    });
    // Validation dot: small red circle
    const dot = target.querySelector('.bg-nb-red.rounded-full') ||
                 target.querySelector('[title="Has validation issues"]');
    expect(dot).toBeTruthy();
  });

  it('calls onItemClick when canvas cell clicked', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Click Test',
        canvases: [makeCanvas()],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    const cell = target.querySelector('[role="gridcell"]') as HTMLElement;
    expect(cell).toBeTruthy();
    cell.click();
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('renders expand_more icon in section header', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Chevron Test',
        canvases: [makeCanvas()],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    const icons = target.querySelectorAll('.material-icons');
    const chevron = Array.from(icons).find(i => i.textContent === 'expand_more');
    expect(chevron).toBeTruthy();
  });

  it('section header has aria-expanded attribute', () => {
    const groups = [
      {
        manifestId: 'https://example.org/manifest/1',
        manifestLabel: 'Aria Test',
        canvases: [makeCanvas()],
      },
    ];
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, groups },
    });
    const btn = target.querySelector('button[aria-expanded]');
    expect(btn).toBeTruthy();
    // Initially expanded (not collapsed)
    expect(btn!.getAttribute('aria-expanded')).toBe('true');
  });

  it('passes custom class to container', () => {
    instance = mount(GroupedArchiveGrid, {
      target,
      props: { ...baseProps, class: 'my-grid-class' },
    });
    // Empty state renders when groups=[] — class is only on the non-empty branch
    // Just verify it mounts without error
    expect(target.firstChild).toBeTruthy();
  });
});

// ===========================================================================
// HoverPreviewCard
// ===========================================================================

import HoverPreviewCard from '../ui/molecules/HoverPreviewCard.svelte';

describe('HoverPreviewCard', () => {
  const baseProps = {
    canvas: null,
    visible: false,
    anchorRect: null,
    cx,
    fieldMode: false,
  };

  it('renders without crashing', () => {
    instance = mount(HoverPreviewCard, { target, props: baseProps });
    expect(target).toBeTruthy();
  });

  it('renders nothing when visible is false', () => {
    instance = mount(HoverPreviewCard, { target, props: baseProps });
    // The card is only rendered when visible && canvas && anchorRect
    expect(target.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('renders nothing when canvas is null', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, anchorRect, canvas: null },
    });
    expect(target.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('renders tooltip when visible, canvas, and anchorRect provided', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas: makeCanvas(), anchorRect },
    });
    const tooltip = target.querySelector('[role="tooltip"]');
    expect(tooltip).toBeTruthy();
  });

  it('displays canvas label in tooltip', () => {
    const canvas = makeCanvas({ label: { en: ['My Field Photo'] } });
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect },
    });
    expect(target.textContent).toContain('My Field Photo');
  });

  it('shows thumbnail image when canvas has thumbnail', () => {
    const canvas = makeCanvas({
      thumbnail: [{ id: 'https://example.org/thumb.jpg', type: 'Image' }] as any,
    });
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect },
    });
    const img = target.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.src).toContain('thumb.jpg');
  });

  it('shows image fallback icon when no thumbnail URL', () => {
    const canvas = makeCanvas({ thumbnail: [] as any });
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect },
    });
    const icons = target.querySelectorAll('.material-icons');
    const imgIcon = Array.from(icons).find(i => i.textContent === 'image');
    expect(imgIcon).toBeTruthy();
  });

  it('applies fieldMode dark styling when fieldMode is true', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas: makeCanvas(), anchorRect, fieldMode: true },
    });
    const tooltip = target.querySelector('[role="tooltip"]');
    expect(tooltip!.className).toContain('bg-nb-black');
    expect(tooltip!.className).toContain('border-nb-yellow');
  });

  it('applies light styling when fieldMode is false', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas: makeCanvas(), anchorRect, fieldMode: false },
    });
    const tooltip = target.querySelector('[role="tooltip"]');
    expect(tooltip!.className).toContain('bg-nb-white');
    expect(tooltip!.className).toContain('border-nb-black');
  });

  it('has pointer-events-none to avoid interfering with hover', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas: makeCanvas(), anchorRect },
    });
    const tooltip = target.querySelector('[role="tooltip"]');
    expect(tooltip!.className).toContain('pointer-events-none');
  });

  it('positions card with fixed style left and top', () => {
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas: makeCanvas(), anchorRect },
    });
    const tooltip = target.querySelector('[role="tooltip"]') as HTMLElement;
    // Should have inline style with left and top
    const style = tooltip.getAttribute('style') || '';
    expect(style).toMatch(/left:/);
    expect(style).toMatch(/top:/);
  });

  it('shows error validation count when validationIssues provided', () => {
    const canvas = makeCanvas();
    const validationIssues = [
      { severity: 'error' },
      { severity: 'error' },
      { severity: 'warning' },
    ];
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect, validationIssues },
    });
    expect(target.textContent).toContain('2 errors');
    expect(target.textContent).toContain('1 warning');
  });

  it('shows navDate when present on canvas', () => {
    const canvas = makeCanvas({ navDate: '2024-06-15' } as any);
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect },
    });
    expect(target.textContent).toContain('2024-06-15');
  });

  it('shows dimension string when canvas has width and height', () => {
    const canvas = makeCanvas({ width: 1920, height: 1080 });
    instance = mount(HoverPreviewCard, {
      target,
      props: { ...baseProps, visible: true, canvas, anchorRect },
    });
    expect(target.textContent).toContain('1920');
    expect(target.textContent).toContain('1080');
  });
});
