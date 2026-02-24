/**
 * ComparisonViewer Component Tests
 *
 * Tests the Svelte 5 ComparisonViewer molecule that provides side-by-side,
 * overlay, and curtain comparison modes for two IIIF canvases.
 *
 * External dependencies mocked:
 *   - OpenSeadragon (window.OpenSeadragon)
 *   - OSD viewer instances (primaryViewerRef, secondary created internally)
 *
 * Tests component logic only (mode switching, UI controls, conditional rendering).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import { ComparisonStore } from '../model/comparison.svelte';
import type { IIIFCanvas } from '@/src/shared/types';

// Mock IconButton to avoid cx prop requirement (ComparisonViewer uses IconButton
// via mode selector buttons without always threading cx through)
vi.mock('@/src/shared/ui/molecules/IconButton.svelte', () => ({
  default: function MockIconButton($$anchor: any, $$props: any) {
    const props = typeof $$props === 'function' ? $$props() : $$props;
    const btn = document.createElement('button');
    btn.setAttribute('title', props?.label || '');
    btn.setAttribute('aria-label', props?.label || '');
    if (props?.class) btn.className = props.class;
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = props?.icon || '';
    btn.appendChild(icon);
    if (props?.onclick) btn.addEventListener('click', props.onclick);
    if ($$anchor && $$anchor.parentNode) {
      $$anchor.parentNode.insertBefore(btn, $$anchor);
    }
  },
}));

// Mock OpenSeadragon globally before import
const mockSecondViewer = {
  addOnceHandler: vi.fn(),
  addHandler: vi.fn(),
  removeHandler: vi.fn(),
  removeAllHandlers: vi.fn(),
  destroy: vi.fn(),
  viewport: {
    getZoom: vi.fn(() => 1),
    getCenter: vi.fn(() => ({ x: 0.5, y: 0.5 })),
    zoomTo: vi.fn(),
    panTo: vi.fn(),
  },
};

beforeEach(() => {
  (window as any).OpenSeadragon = vi.fn(() => mockSecondViewer);
});

afterEach(() => {
  delete (window as any).OpenSeadragon;
});

import ComparisonViewer from '../ui/molecules/ComparisonViewer.svelte';

// --- Test fixtures ---

function makeCanvas(id: string, label: string): IIIFCanvas {
  return {
    id,
    type: 'Canvas',
    label: { en: [label] },
    width: 1000,
    height: 800,
    items: [],
  } as unknown as IIIFCanvas;
}

function createMockPrimaryViewer() {
  return {
    viewport: {
      getZoom: vi.fn(() => 1),
      getCenter: vi.fn(() => ({ x: 0.5, y: 0.5 })),
      zoomTo: vi.fn(),
      panTo: vi.fn(),
    },
    addHandler: vi.fn(),
    removeHandler: vi.fn(),
  };
}

const cx = {} as any;

let target: HTMLDivElement;
let instance: Record<string, any>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (instance) {
    try { unmount(instance); } catch { /* ignore */ }
  }
  target.remove();
  vi.clearAllMocks();
});

describe('ComparisonViewer', () => {
  it('renders nothing when comparison mode is off', () => {
    const comparison = new ComparisonStore();
    // mode defaults to 'off'

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.innerHTML).toBe('<!---->');
  });

  it('renders nothing when secondCanvas is null', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: null,
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.innerHTML).toBe('<!---->');
  });

  it('renders comparison toolbar when mode is side-by-side', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Compare');
  });

  it('renders compare icon in toolbar', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    const icons = target.querySelectorAll('.material-icons');
    const compareIcon = Array.from(icons).find(el => el.textContent === 'compare');
    expect(compareIcon).toBeTruthy();
  });

  it('renders three mode selector buttons (side-by-side, overlay, curtain)', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Mode buttons have specific aria-labels/titles
    const sideBtn = target.querySelector('[title="Side by side"]') ||
                    target.querySelector('[aria-label="Side by side"]');
    const overlayBtn = target.querySelector('[title="Overlay"]') ||
                       target.querySelector('[aria-label="Overlay"]');
    const curtainBtn = target.querySelector('[title="Curtain"]') ||
                       target.querySelector('[aria-label="Curtain"]');

    expect(sideBtn).toBeTruthy();
    expect(overlayBtn).toBeTruthy();
    expect(curtainBtn).toBeTruthy();
  });

  it('renders A/B canvas labels', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('A: Painting A');
    expect(target.textContent).toContain('B: Painting B');
  });

  it('renders Sync button', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Sync');
    const icons = target.querySelectorAll('.material-icons');
    const syncIcon = Array.from(icons).find(el => el.textContent === 'sync');
    expect(syncIcon).toBeTruthy();
  });

  it('renders close button with close icon', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    const icons = target.querySelectorAll('.material-icons');
    const closeIcon = Array.from(icons).find(el => el.textContent === 'close');
    expect(closeIcon).toBeTruthy();
  });

  it('does not show opacity slider in side-by-side mode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).not.toContain('Opacity');
    const rangeInput = target.querySelector('input[type="range"]');
    expect(rangeInput).toBeNull();
  });

  it('shows opacity slider in overlay mode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('overlay');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Opacity');
    const rangeInput = target.querySelector('input[type="range"]');
    expect(rangeInput).toBeTruthy();
    expect(rangeInput!.getAttribute('min')).toBe('0');
    expect(rangeInput!.getAttribute('max')).toBe('100');
  });

  it('shows opacity percentage value in overlay mode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('overlay');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Default overlay opacity is 0.5 -> 50%
    expect(target.textContent).toContain('50%');
  });

  it('renders curtain handle/separator in curtain mode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('curtain');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    const curtainHandle = target.querySelector('[role="separator"]');
    expect(curtainHandle).toBeTruthy();
    expect(curtainHandle!.getAttribute('aria-label')).toBe('Comparison curtain divider');
    expect(curtainHandle!.getAttribute('aria-valuemin')).toBe('5');
    expect(curtainHandle!.getAttribute('aria-valuemax')).toBe('95');
  });

  it('curtain handle has drag_indicator icon', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('curtain');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    const icons = target.querySelectorAll('.material-icons');
    const dragIcon = Array.from(icons).find(el => el.textContent === 'drag_indicator');
    expect(dragIcon).toBeTruthy();
  });

  it('does not show curtain handle in overlay mode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('overlay');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    const curtainHandle = target.querySelector('[role="separator"]');
    expect(curtainHandle).toBeNull();
  });

  it('calls comparison.setMode when mode button is clicked', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');
    const setModeSpy = vi.spyOn(comparison, 'setMode');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Click the overlay mode button
    const overlayBtn = target.querySelector('[title="Overlay"]') ||
                       target.querySelector('[aria-label="Overlay"]');
    expect(overlayBtn).toBeTruthy();
    (overlayBtn as HTMLElement).click();

    expect(setModeSpy).toHaveBeenCalledWith('overlay');
  });

  it('calls comparison.toggleSyncViewports when sync button is clicked', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');
    const syncSpy = vi.spyOn(comparison, 'toggleSyncViewports');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Find the Sync button by its text content
    const syncBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Sync')
    );
    expect(syncBtn).toBeTruthy();
    syncBtn!.click();

    expect(syncSpy).toHaveBeenCalled();
  });

  it('calls comparison.reset when close button is clicked', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');
    const resetSpy = vi.spyOn(comparison, 'reset');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Close button contains close icon and is in the right group
    const allButtons = Array.from(target.querySelectorAll('button'));
    const closeBtn = allButtons.find(b => {
      const icons = b.querySelectorAll('.material-icons');
      return Array.from(icons).some(i => i.textContent === 'close');
    });
    expect(closeBtn).toBeTruthy();
    closeBtn!.click();

    expect(resetSpy).toHaveBeenCalled();
  });

  it('renders side-by-side layout with both canvas labels visible', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    // Both canvas labels should be visible in side-by-side mode
    expect(target.textContent).toContain('A: Painting A');
    expect(target.textContent).toContain('B: Painting B');
  });

  it('renders comparison controls in fieldMode', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: makeCanvas('canvas-b', 'Painting B'),
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: true,
      },
    });

    // In fieldMode, all comparison controls should still be rendered
    expect(target.textContent).toContain('Compare');
    expect(target.textContent).toContain('Sync');
    const sideBtn = target.querySelector('[title="Side by side"]') ||
                    target.querySelector('[aria-label="Side by side"]');
    expect(sideBtn).toBeTruthy();
  });

  it('uses default label "Canvas B" when second canvas has no label', () => {
    const comparison = new ComparisonStore();
    comparison.setMode('side-by-side');

    const canvasNoLabel = {
      id: 'canvas-b',
      type: 'Canvas',
      width: 1000,
      height: 800,
      items: [],
    } as unknown as IIIFCanvas;

    instance = mount(ComparisonViewer, {
      target,
      props: {
        comparison,
        primaryCanvas: makeCanvas('canvas-a', 'Painting A'),
        secondCanvas: canvasNoLabel,
        primaryViewerRef: createMockPrimaryViewer(),
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('B: Canvas B');
  });
});
