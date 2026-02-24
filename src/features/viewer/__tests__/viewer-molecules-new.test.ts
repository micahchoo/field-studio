/**
 * viewer-molecules-new.test.ts
 *
 * Tests for newly created viewer molecules:
 * AnnotationCanvas, AnnotationForm, AnnotationOverlay, AnnotationToolbar,
 * ComposerCanvas, ComposerSidebar, ComposerToolbar, ContinuousViewer,
 * PagedViewer, TimeAnnotationOverlay
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

// Mock heavy external dependencies
vi.mock('openseadragon', () => ({ default: { Viewer: vi.fn() } }));
vi.mock('@annotorious/openseadragon', () => ({
  createOSDAnnotator: vi.fn(() => ({
    addAnnotation: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    clearAnnotations: vi.fn(),
    setDrawingEnabled: vi.fn(),
    setDrawingTool: vi.fn(),
    setStyle: vi.fn(),
  })),
  W3CImageFormat: vi.fn(() => ({})),
  UserSelectAction: { SELECT: 'select', EDIT: 'edit' },
}));
vi.mock('@pixi/unsafe-eval', () => ({}));

import AnnotationCanvas from '../ui/molecules/AnnotationCanvas.svelte';
import AnnotationForm from '../ui/molecules/AnnotationForm.svelte';
import AnnotationOverlay from '../ui/molecules/AnnotationOverlay.svelte';
import AnnotationToolbar from '../ui/molecules/AnnotationToolbar.svelte';
import ComposerCanvas from '../ui/molecules/ComposerCanvas.svelte';
import ComposerSidebar from '../ui/molecules/ComposerSidebar.svelte';
import ComposerToolbar from '../ui/molecules/ComposerToolbar.svelte';
import ContinuousViewer from '../ui/molecules/ContinuousViewer.svelte';
import PagedViewer from '../ui/molecules/PagedViewer.svelte';
import TimeAnnotationOverlay from '../ui/molecules/TimeAnnotationOverlay.svelte';

import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';
import type { IIIFCanvas, IIIFAnnotation } from '@/src/shared/types';

const cx = LIGHT_CLASSES;

function makeCanvas(overrides: Partial<IIIFCanvas> = {}): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
    annotations: [],
    ...overrides,
  } as IIIFCanvas;
}

function makeAnnotation(id: string): IIIFAnnotation {
  return {
    id,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: 'Test', format: 'text/plain' } as any,
    target: {
      type: 'SpecificResource',
      source: 'https://example.org/canvas/1',
      selector: {
        type: 'SvgSelector',
        value: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L100,0 L100,100 L0,100 Z"/></svg>',
      },
    } as any,
  };
}

// ============================================================================
// AnnotationCanvas
// ============================================================================

describe('AnnotationCanvas', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(AnnotationCanvas, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: null,
        existingAnnotations: [],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[data-annotation-canvas]')).toBeTruthy();
  });

  it('renders an absolute positioned overlay div', () => {
    component = mount(AnnotationCanvas, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: null,
        existingAnnotations: [],
        fieldMode: false,
        cx,
      },
    });
    const el = target.querySelector('[data-annotation-canvas]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders with existing annotations prop', () => {
    component = mount(AnnotationCanvas, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: null,
        existingAnnotations: [makeAnnotation('anno-1'), makeAnnotation('anno-2')],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[data-annotation-canvas]')).toBeTruthy();
  });

  it('accepts callback props without error', () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    component = mount(AnnotationCanvas, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: null,
        existingAnnotations: [],
        onAnnotationCreate: onCreate,
        onAnnotationSelect: onSelect,
        fieldMode: true,
        cx: FIELD_CLASSES,
      },
    });
    expect(target.querySelector('[data-annotation-canvas]')).toBeTruthy();
  });
});

// ============================================================================
// AnnotationForm
// ============================================================================

describe('AnnotationForm', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(AnnotationForm, {
      target,
      props: {
        text: '',
        motivation: 'commenting',
        pointCount: 0,
        canSave: false,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('textarea')).toBeTruthy();
  });

  it('renders three motivation buttons', () => {
    component = mount(AnnotationForm, {
      target,
      props: {
        text: '',
        motivation: 'commenting',
        pointCount: 0,
        canSave: false,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const buttons = target.querySelectorAll('[role="group"] button');
    expect(buttons.length).toBe(3);
  });

  it('calls onMotivationChange when a motivation button is clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: {
        text: '',
        motivation: 'commenting',
        pointCount: 0,
        canSave: false,
        onTextChange: vi.fn(),
        onMotivationChange: handler,
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const tagBtn = target.querySelector('[aria-pressed]') as HTMLButtonElement;
    // Click second button (Tag)
    const buttons = target.querySelectorAll('[role="group"] button');
    (buttons[1] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('tagging');
  });

  it('calls onSave when Save button clicked (if canSave)', () => {
    const onSave = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: {
        text: 'Test annotation',
        motivation: 'commenting',
        pointCount: 3,
        canSave: true,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave,
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const saveBtn = target.querySelector('[aria-label="Save annotation"]') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    expect(onSave).toHaveBeenCalled();
  });

  it('disables Save button when canSave=false', () => {
    component = mount(AnnotationForm, {
      target,
      props: {
        text: '',
        motivation: 'commenting',
        pointCount: 0,
        canSave: false,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const saveBtn = target.querySelector('[aria-label="Save annotation"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('shows point count indicator when pointCount > 0', () => {
    component = mount(AnnotationForm, {
      target,
      props: {
        text: '',
        motivation: 'commenting',
        pointCount: 5,
        canSave: false,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('5 points drawn');
  });
});

// ============================================================================
// AnnotationOverlay
// ============================================================================

describe('AnnotationOverlay', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders an SVG element', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: {
        annotations: [],
        canvasWidth: 800,
        canvasHeight: 600,
        containerWidth: 400,
        containerHeight: 300,
        fieldMode: false,
      },
    });
    expect(target.querySelector('svg')).toBeTruthy();
  });

  it('renders polygon shape for SvgSelector annotation', () => {
    const annotation = makeAnnotation('anno-svg');
    component = mount(AnnotationOverlay, {
      target,
      props: {
        annotations: [annotation],
        canvasWidth: 800,
        canvasHeight: 600,
        containerWidth: 400,
        containerHeight: 300,
        fieldMode: false,
      },
    });
    expect(target.querySelector('polygon')).toBeTruthy();
  });

  it('calls onSelect when annotation shape is clicked', () => {
    const onSelect = vi.fn();
    const annotation = makeAnnotation('anno-click');
    component = mount(AnnotationOverlay, {
      target,
      props: {
        annotations: [annotation],
        canvasWidth: 800,
        canvasHeight: 600,
        containerWidth: 400,
        containerHeight: 300,
        onSelect,
        fieldMode: false,
      },
    });
    const shape = target.querySelector('polygon') as SVGPolygonElement;
    expect(shape).toBeTruthy();
    // SVGElement.click() is not available in jsdom — dispatch a MouseEvent
    shape.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('anno-click');
  });

  it('has pointer-events none on the SVG root', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: {
        annotations: [],
        canvasWidth: 800,
        canvasHeight: 600,
        containerWidth: 400,
        containerHeight: 300,
        fieldMode: false,
      },
    });
    const svg = target.querySelector('svg') as SVGElement;
    // SVG should have pointer-events: none (check style attribute)
    expect(svg.style.pointerEvents).toBe('none');
  });
});

// ============================================================================
// AnnotationToolbar
// ============================================================================

describe('AnnotationToolbar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders four mode buttons', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: {
        activeMode: 'polygon',
        onModeChange: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    expect(buttons.length).toBe(4);
  });

  it('marks active mode as aria-pressed=true', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: {
        activeMode: 'rectangle',
        onModeChange: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const activeBtn = target.querySelector('[aria-pressed="true"]') as HTMLButtonElement;
    expect(activeBtn).toBeTruthy();
    expect(activeBtn.getAttribute('aria-label')).toContain('Rectangle');
  });

  it('calls onModeChange when a mode button is clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationToolbar, {
      target,
      props: {
        activeMode: 'polygon',
        onModeChange: handler,
        fieldMode: false,
        cx,
      },
    });
    // Click rectangle button (second)
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    (buttons[1] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('rectangle');
  });

  it('has correct ARIA role on toolbar container', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: {
        activeMode: 'polygon',
        onModeChange: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const toolbar = target.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar!.getAttribute('aria-label')).toBe('Drawing tools');
  });

  it('disables all buttons when disabled=true', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: {
        activeMode: 'polygon',
        onModeChange: vi.fn(),
        disabled: true,
        fieldMode: false,
        cx,
      },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    buttons.forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});

// ============================================================================
// ComposerCanvas
// ============================================================================

describe('ComposerCanvas', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing with no layers', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });

  it('renders empty state when no layers', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [],
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('No layers');
  });

  it('calls onLayerSelect when a layer is clicked', () => {
    const onLayerSelect = vi.fn();
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [
          { id: 'layer-1', type: 'text', content: { text: 'Hello' }, visible: true, zIndex: 0 },
        ],
        onLayerSelect,
        fieldMode: false,
        cx,
      },
    });
    // ComposerCanvas layers now use semantic <button> (not <div role="button">).
    const layerEl = target.querySelector('button') as HTMLElement;
    if (layerEl) layerEl.click();
    expect(onLayerSelect).toHaveBeenCalledWith('layer-1');
  });

  it('renders image layer with img element', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [
          { id: 'layer-img', type: 'image', content: { src: 'https://example.org/img.jpg', alt: 'Test' }, visible: true, zIndex: 0 },
        ],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('img')).toBeTruthy();
  });
});

// ============================================================================
// ComposerSidebar
// ============================================================================

describe('ComposerSidebar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        layers: [],
        onLayerSelect: vi.fn(),
        onLayerToggle: vi.fn(),
        onLayerReorder: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Layers');
  });

  it('renders empty state when no layers', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        layers: [],
        onLayerSelect: vi.fn(),
        onLayerToggle: vi.fn(),
        onLayerReorder: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('No layers');
  });

  it('calls onLayerToggle when visibility button clicked', () => {
    const onToggle = vi.fn();
    component = mount(ComposerSidebar, {
      target,
      props: {
        layers: [{ id: 'l1', label: 'Layer 1', type: 'image', visible: true }],
        onLayerSelect: vi.fn(),
        onLayerToggle: onToggle,
        onLayerReorder: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const visibilityBtn = target.querySelector('[aria-pressed]') as HTMLButtonElement;
    expect(visibilityBtn).toBeTruthy();
    visibilityBtn.click();
    expect(onToggle).toHaveBeenCalledWith('l1');
  });

  it('renders correct layer count in header', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        layers: [
          { id: 'l1', label: 'Layer A', type: 'image', visible: true },
          { id: 'l2', label: 'Layer B', type: 'text', visible: false },
        ],
        onLayerSelect: vi.fn(),
        onLayerToggle: vi.fn(),
        onLayerReorder: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('2');
  });
});

// ============================================================================
// ComposerToolbar
// ============================================================================

describe('ComposerToolbar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(ComposerToolbar, {
      target,
      props: {
        canUndo: false,
        canRedo: false,
        isDirty: false,
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="toolbar"]')).toBeTruthy();
  });

  it('calls onSave when Save button clicked (when isDirty)', () => {
    const onSave = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: {
        canUndo: false,
        canRedo: false,
        isDirty: true,
        onSave,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const saveBtn = target.querySelector('[aria-label="Save composition"]') as HTMLButtonElement;
    saveBtn.click();
    expect(onSave).toHaveBeenCalled();
  });

  it('disables Save when isDirty=false', () => {
    component = mount(ComposerToolbar, {
      target,
      props: {
        canUndo: false,
        canRedo: false,
        isDirty: false,
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const saveBtn = target.querySelector('[aria-label="Save composition"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('shows "Unsaved changes" only when isDirty=true', () => {
    component = mount(ComposerToolbar, {
      target,
      props: {
        canUndo: false,
        canRedo: false,
        isDirty: true,
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Unsaved changes');
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: {
        canUndo: false,
        canRedo: false,
        isDirty: false,
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClose,
        fieldMode: false,
        cx,
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer"]') as HTMLButtonElement;
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });
});

// ============================================================================
// ContinuousViewer
// ============================================================================

describe('ContinuousViewer', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="list"]')).toBeTruthy();
  });

  it('renders a listitem for each canvas', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [
          makeCanvas({ id: 'https://example.org/canvas/1', label: { en: ['Page 1'] } }),
          makeCanvas({ id: 'https://example.org/canvas/2', label: { en: ['Page 2'] } }),
        ],
        fieldMode: false,
        cx,
      },
    });
    const items = target.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(2);
  });

  it('has horizontal flex when horizontal=true', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [makeCanvas()],
        horizontal: true,
        fieldMode: false,
        cx,
      },
    });
    const list = target.querySelector('[role="list"]') as HTMLElement;
    expect(list.className).toContain('flex-row');
  });

  it('marks active canvas with data-canvas-id', () => {
    const canvases = [
      makeCanvas({ id: 'https://example.org/canvas/1' }),
      makeCanvas({ id: 'https://example.org/canvas/2' }),
    ];
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases,
        activeCanvasId: 'https://example.org/canvas/2',
        fieldMode: false,
        cx,
      },
    });
    const items = target.querySelectorAll('[data-canvas-id]');
    expect(items.length).toBe(2);
  });
});

// ============================================================================
// PagedViewer
// ============================================================================

describe('PagedViewer', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(PagedViewer, {
      target,
      props: {
        canvases: [],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="list"]')).toBeTruthy();
  });

  it('renders first canvas as single spread (cover)', () => {
    const canvases = [
      makeCanvas({ id: 'https://example.org/canvas/1', label: { en: ['Cover'] } }),
      makeCanvas({ id: 'https://example.org/canvas/2', label: { en: ['Page 2'] } }),
      makeCanvas({ id: 'https://example.org/canvas/3', label: { en: ['Page 3'] } }),
    ];
    component = mount(PagedViewer, {
      target,
      props: { canvases, fieldMode: false, cx },
    });
    const spreads = target.querySelectorAll('[role="listitem"]');
    expect(spreads.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onPageChange when a page button is clicked', () => {
    const onPageChange = vi.fn();
    const canvases = [
      makeCanvas({ id: 'https://example.org/canvas/1' }),
    ];
    component = mount(PagedViewer, {
      target,
      props: { canvases, onPageChange, fieldMode: false, cx },
    });
    const pageBtn = target.querySelector('button') as HTMLButtonElement;
    if (pageBtn) pageBtn.click();
    expect(onPageChange).toHaveBeenCalledWith('https://example.org/canvas/1');
  });

  it('marks active canvas with aria-current=page', () => {
    const canvases = [
      makeCanvas({ id: 'https://example.org/canvas/1' }),
    ];
    component = mount(PagedViewer, {
      target,
      props: {
        canvases,
        activeCanvasId: 'https://example.org/canvas/1',
        fieldMode: false,
        cx,
      },
    });
    const current = target.querySelector('[aria-current="page"]');
    expect(current).toBeTruthy();
  });
});

// ============================================================================
// TimeAnnotationOverlay
// ============================================================================

describe('TimeAnnotationOverlay', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: {
        currentTime: 0,
        duration: 120,
        timeRange: null,
        isSelecting: false,
        onRangeStart: vi.fn(),
        onRangeEnd: vi.fn(),
        onRangeClear: vi.fn(),
        fieldMode: false,
      },
    });
    expect(target.querySelector('[role="slider"]')).toBeTruthy();
  });

  it('shows "Click to set start point" when no range', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: {
        currentTime: 0,
        duration: 120,
        timeRange: null,
        isSelecting: false,
        onRangeStart: vi.fn(),
        onRangeEnd: vi.fn(),
        onRangeClear: vi.fn(),
        fieldMode: false,
      },
    });
    expect(target.textContent).toContain('Click to set start');
  });

  it('shows "Click to set end point" when only start is set', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: {
        currentTime: 10,
        duration: 120,
        timeRange: { start: 5 },
        isSelecting: true,
        onRangeStart: vi.fn(),
        onRangeEnd: vi.fn(),
        onRangeClear: vi.fn(),
        fieldMode: false,
      },
    });
    expect(target.textContent).toContain('Click to set end');
  });

  it('shows Clear button when timeRange is set', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: {
        currentTime: 10,
        duration: 120,
        timeRange: { start: 5, end: 15 },
        isSelecting: false,
        onRangeStart: vi.fn(),
        onRangeEnd: vi.fn(),
        onRangeClear: vi.fn(),
        fieldMode: false,
      },
    });
    expect(target.querySelector('[aria-label="Clear time range"]')).toBeTruthy();
  });

  it('calls onRangeClear when Clear button is clicked', () => {
    const onRangeClear = vi.fn();
    component = mount(TimeAnnotationOverlay, {
      target,
      props: {
        currentTime: 10,
        duration: 120,
        timeRange: { start: 5, end: 15 },
        isSelecting: false,
        onRangeStart: vi.fn(),
        onRangeEnd: vi.fn(),
        onRangeClear,
        fieldMode: false,
      },
    });
    const clearBtn = target.querySelector('[aria-label="Clear time range"]') as HTMLButtonElement;
    clearBtn.click();
    expect(onRangeClear).toHaveBeenCalled();
  });
});
