/**
 * viewer-molecules-new.test.ts
 *
 * Contract tests for viewer molecule components. Each describe block verifies:
 * - Visible text/ARIA roles the component promises to render
 * - Interactive elements (buttons, inputs) and their callback contracts
 * - Adversarial cases: empty data, missing callbacks, boundary values
 *
 * No "renders without crashing" stubs. Every assertion targets a user-visible
 * outcome (text, ARIA attribute, disabled state, callback invocation).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';

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

function makeAnnotation(id: string, selectorType: 'SvgSelector' | 'FragmentSelector' = 'SvgSelector'): IIIFAnnotation {
  const selector = selectorType === 'SvgSelector'
    ? { type: 'SvgSelector' as const, value: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L100,0 L100,100 L0,100 Z"/></svg>' }
    : { type: 'FragmentSelector' as const, value: 'xywh=10,20,30,40' };
  return {
    id,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: 'Test', format: 'text/plain' } as any,
    target: {
      type: 'SpecificResource',
      source: 'https://example.org/canvas/1',
      selector,
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

  it('renders a data-annotation-canvas element with aria-hidden="true"', () => {
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

  it('accepts non-empty annotations array without error', () => {
    component = mount(AnnotationCanvas, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: null,
        existingAnnotations: [makeAnnotation('a-1'), makeAnnotation('a-2')],
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[data-annotation-canvas]')).toBeTruthy();
  });

  it('accepts callback props for create and select', () => {
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
    // Callbacks not called during mount (they fire on user interaction)
    expect(onCreate).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(target.querySelector('[data-annotation-canvas]')).toBeTruthy();
  });
});

// ============================================================================
// AnnotationForm
// ============================================================================

describe('AnnotationForm', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    text: '',
    motivation: 'commenting' as const,
    pointCount: 0,
    canSave: false,
    onTextChange: vi.fn(),
    onMotivationChange: vi.fn(),
    onSave: vi.fn(),
    onUndo: vi.fn(),
    onClear: vi.fn(),
    fieldMode: false,
    cx,
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders a textarea for annotation text input', () => {
    component = mount(AnnotationForm, { target, props: baseProps() });
    expect(target.querySelector('textarea')).toBeTruthy();
  });

  it('renders exactly three motivation buttons (Comment, Tag, Describe)', () => {
    component = mount(AnnotationForm, { target, props: baseProps() });
    const buttons = target.querySelectorAll('[role="group"] button');
    expect(buttons.length).toBe(3);
    const labels = Array.from(buttons).map(b => b.getAttribute('aria-label'));
    expect(labels).toContain('Comment');
    expect(labels).toContain('Tag');
    expect(labels).toContain('Describe');
  });

  it('marks the active motivation as aria-pressed="true"', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), motivation: 'tagging' as const },
    });
    const pressedBtns = target.querySelectorAll('[role="group"] button[aria-pressed="true"]');
    expect(pressedBtns.length).toBe(1);
    expect(pressedBtns[0].getAttribute('aria-label')).toBe('Tag');
  });

  it('fires onMotivationChange with the correct value on click', () => {
    const handler = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), onMotivationChange: handler },
    });
    // Click the Tag button (second in group)
    const buttons = target.querySelectorAll('[role="group"] button');
    (buttons[1] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('tagging');
  });

  it('disables Save button when canSave is false', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), canSave: false },
    });
    const saveBtn = target.querySelector('[aria-label="Save annotation"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('enables Save button and fires onSave when canSave is true', () => {
    const onSave = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), canSave: true, text: 'hello', onSave },
    });
    const saveBtn = target.querySelector('[aria-label="Save annotation"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();
    expect(onSave).toHaveBeenCalled();
  });

  it('shows "{N} points drawn" when pointCount > 0', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 5 },
    });
    expect(target.textContent).toContain('5 points drawn');
  });

  it('shows "1 point drawn" (singular) when pointCount is 1', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 1 },
    });
    expect(target.textContent).toContain('1 point drawn');
    expect(target.textContent).not.toContain('1 points');
  });

  it('hides point count when pointCount is 0', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 0 },
    });
    expect(target.textContent).not.toContain('point');
  });

  it('disables Undo button when pointCount is 0', () => {
    component = mount(AnnotationForm, { target, props: baseProps() });
    const undoBtn = target.querySelector('[aria-label="Undo last point"]') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
  });

  it('enables Undo button when pointCount > 0 and fires onUndo', () => {
    const onUndo = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 3, onUndo },
    });
    const undoBtn = target.querySelector('[aria-label="Undo last point"]') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    undoBtn.click();
    expect(onUndo).toHaveBeenCalled();
  });

  it('disables Clear button when pointCount is 0 and text is empty', () => {
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 0, text: '' },
    });
    const clearBtn = target.querySelector('[aria-label="Clear annotation"]') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });

  it('enables Clear button when text has content even with zero points', () => {
    const onClear = vi.fn();
    component = mount(AnnotationForm, {
      target,
      props: { ...baseProps(), pointCount: 0, text: 'something', onClear },
    });
    const clearBtn = target.querySelector('[aria-label="Clear annotation"]') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
    clearBtn.click();
    expect(onClear).toHaveBeenCalled();
  });

  it('displays "Annotation text" label for the textarea', () => {
    component = mount(AnnotationForm, { target, props: baseProps() });
    expect(target.textContent).toContain('Annotation text');
  });
});

// ============================================================================
// AnnotationOverlay
// ============================================================================

describe('AnnotationOverlay', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    annotations: [] as IIIFAnnotation[],
    canvasWidth: 800,
    canvasHeight: 600,
    containerWidth: 400,
    containerHeight: 300,
    fieldMode: false,
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders an SVG with role="img" and aria-label', () => {
    component = mount(AnnotationOverlay, { target, props: baseProps() });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.getAttribute('aria-label')).toBe('Annotation overlay');
  });

  it('sets pointer-events:none on the SVG root', () => {
    component = mount(AnnotationOverlay, { target, props: baseProps() });
    const svg = target.querySelector('svg') as SVGElement;
    expect(svg.style.pointerEvents).toBe('none');
  });

  it('renders no shapes when annotations array is empty', () => {
    component = mount(AnnotationOverlay, { target, props: baseProps() });
    expect(target.querySelector('polygon')).toBeNull();
    expect(target.querySelector('rect')).toBeNull();
  });

  it('renders a polygon for SvgSelector annotation', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('a-1')] },
    });
    expect(target.querySelector('polygon')).toBeTruthy();
  });

  it('renders a rect for FragmentSelector annotation with xywh', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('a-frag', 'FragmentSelector')] },
    });
    expect(target.querySelector('rect')).toBeTruthy();
  });

  it('annotation shapes have role="button" for interactivity', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('a-1')] },
    });
    const polygon = target.querySelector('polygon');
    expect(polygon!.getAttribute('role')).toBe('button');
  });

  it('fires onSelect with annotation id when a shape is clicked', () => {
    const onSelect = vi.fn();
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('anno-click')], onSelect },
    });
    const shape = target.querySelector('polygon') as SVGPolygonElement;
    shape.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('anno-click');
  });

  it('marks selected annotation shape with aria-pressed="true"', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('a-sel')], selectedId: 'a-sel' },
    });
    const polygon = target.querySelector('polygon');
    expect(polygon!.getAttribute('aria-pressed')).toBe('true');
  });

  it('marks non-selected annotation shape with aria-pressed="false"', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [makeAnnotation('a-1')], selectedId: 'other-id' },
    });
    const polygon = target.querySelector('polygon');
    expect(polygon!.getAttribute('aria-pressed')).toBe('false');
  });

  it('skips annotations without a selector (malformed target)', () => {
    const malformed: IIIFAnnotation = {
      id: 'malformed',
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: '', format: 'text/plain' } as any,
      target: { type: 'SpecificResource', source: 'c1' } as any, // no selector
    };
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), annotations: [malformed] },
    });
    expect(target.querySelector('polygon')).toBeNull();
    expect(target.querySelector('rect')).toBeNull();
  });

  it('handles zero canvasWidth gracefully (avoids division by zero)', () => {
    component = mount(AnnotationOverlay, {
      target,
      props: { ...baseProps(), canvasWidth: 0, canvasHeight: 0, annotations: [makeAnnotation('a-1')] },
    });
    // Should still render (scale defaults to 1 for zero canvas dimensions)
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
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

  it('renders a toolbar with role="toolbar" and aria-label="Drawing tools"', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: vi.fn(), fieldMode: false, cx },
    });
    const toolbar = target.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar!.getAttribute('aria-label')).toBe('Drawing tools');
  });

  it('renders four mode buttons: Polygon, Rectangle, Freehand, Select', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: vi.fn(), fieldMode: false, cx },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    expect(buttons.length).toBe(4);
    const labels = Array.from(buttons).map(b => b.getAttribute('aria-label'));
    expect(labels).toContain('Polygon (P)');
    expect(labels).toContain('Rectangle (R)');
    expect(labels).toContain('Freehand (F)');
    expect(labels).toContain('Select (S)');
  });

  it('marks the active mode button as aria-pressed="true"', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'rectangle', onModeChange: vi.fn(), fieldMode: false, cx },
    });
    const pressed = target.querySelector('[aria-pressed="true"]');
    expect(pressed).toBeTruthy();
    expect(pressed!.getAttribute('aria-label')).toContain('Rectangle');
  });

  it('marks non-active mode buttons as aria-pressed="false"', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: vi.fn(), fieldMode: false, cx },
    });
    const notPressed = target.querySelectorAll('[aria-pressed="false"]');
    expect(notPressed.length).toBe(3);
  });

  it('fires onModeChange with correct mode when a button is clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: handler, fieldMode: false, cx },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    // Click Rectangle button (second)
    (buttons[1] as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('rectangle');
  });

  it('disables all buttons when disabled=true', () => {
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: vi.fn(), disabled: true, fieldMode: false, cx },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    buttons.forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('does not fire onModeChange when disabled and clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationToolbar, {
      target,
      props: { activeMode: 'polygon', onModeChange: handler, disabled: true, fieldMode: false, cx },
    });
    const buttons = target.querySelectorAll('[role="toolbar"] button');
    (buttons[1] as HTMLButtonElement).click();
    expect(handler).not.toHaveBeenCalled();
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

  it('renders a region with aria-label="Composition canvas"', () => {
    component = mount(ComposerCanvas, {
      target,
      props: { layers: [], fieldMode: false, cx },
    });
    const region = target.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('aria-label')).toBe('Composition canvas');
  });

  it('shows empty state message when no layers are visible', () => {
    component = mount(ComposerCanvas, {
      target,
      props: { layers: [], fieldMode: false, cx },
    });
    expect(target.textContent).toContain('No layers');
  });

  it('renders a text layer as visible text', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'l-1', type: 'text', content: { text: 'Hello World' }, visible: true, zIndex: 0 }],
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Hello World');
  });

  it('renders an image layer with an img element', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'l-img', type: 'image', content: { src: 'https://example.org/img.jpg', alt: 'Test Image' }, visible: true, zIndex: 0 }],
        fieldMode: false,
        cx,
      },
    });
    const img = target.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('alt')).toBe('Test Image');
  });

  it('fires onLayerSelect with layer id when layer is clicked', () => {
    const onLayerSelect = vi.fn();
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'layer-1', type: 'text', content: { text: 'Click me' }, visible: true, zIndex: 0 }],
        onLayerSelect,
        fieldMode: false,
        cx,
      },
    });
    const btn = target.querySelector('button') as HTMLElement;
    btn.click();
    expect(onLayerSelect).toHaveBeenCalledWith('layer-1');
  });

  it('hides invisible layers', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'l-1', type: 'text', content: { text: 'Hidden' }, visible: false, zIndex: 0 }],
        fieldMode: false,
        cx,
      },
    });
    // The layer should not be rendered (filtered out by visible flag)
    expect(target.textContent).not.toContain('Hidden');
    // Empty state should show because no visible layers
    expect(target.textContent).toContain('No layers');
  });

  it('marks active layer with aria-pressed="true"', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'l-1', type: 'text', content: { text: 'A' }, visible: true, zIndex: 0 }],
        activeLayerId: 'l-1',
        fieldMode: false,
        cx,
      },
    });
    const btn = target.querySelector('button[aria-pressed="true"]');
    expect(btn).toBeTruthy();
  });

  it('renders layer button with descriptive aria-label based on type', () => {
    component = mount(ComposerCanvas, {
      target,
      props: {
        layers: [{ id: 'l-1', type: 'image', content: { src: 'x.jpg' }, visible: true, zIndex: 0 }],
        fieldMode: false,
        cx,
      },
    });
    const btn = target.querySelector('button');
    expect(btn!.getAttribute('aria-label')).toContain('Image');
  });
});

// ============================================================================
// ComposerSidebar
// ============================================================================

describe('ComposerSidebar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    layers: [] as Array<{ id: string; label: string; type: string; visible: boolean }>,
    onLayerSelect: vi.fn(),
    onLayerToggle: vi.fn(),
    onLayerReorder: vi.fn(),
    fieldMode: false,
    cx,
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders "Layers" header text', () => {
    component = mount(ComposerSidebar, { target, props: baseProps() });
    expect(target.textContent).toContain('Layers');
  });

  it('shows empty state "No layers yet" when layers array is empty', () => {
    component = mount(ComposerSidebar, { target, props: baseProps() });
    expect(target.textContent).toContain('No layers yet');
  });

  it('displays layer count in the header', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [
          { id: 'l1', label: 'Layer A', type: 'image', visible: true },
          { id: 'l2', label: 'Layer B', type: 'text', visible: false },
        ],
      },
    });
    expect(target.textContent).toContain('2');
  });

  it('renders layer labels as buttons', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: 'My Layer', type: 'image', visible: true }],
      },
    });
    expect(target.textContent).toContain('My Layer');
  });

  it('shows "Untitled layer" for layers with empty label', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: '', type: 'image', visible: true }],
      },
    });
    expect(target.textContent).toContain('Untitled layer');
  });

  it('fires onLayerToggle with layer id when visibility button is clicked', () => {
    const onToggle = vi.fn();
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: 'Layer 1', type: 'image', visible: true }],
        onLayerToggle: onToggle,
      },
    });
    const visBtn = target.querySelector('[aria-pressed]') as HTMLButtonElement;
    visBtn.click();
    expect(onToggle).toHaveBeenCalledWith('l1');
  });

  it('shows visibility toggle with correct aria-label for visible layer', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: 'My Layer', type: 'image', visible: true }],
      },
    });
    const hideBtn = target.querySelector('[aria-label="Hide My Layer"]');
    expect(hideBtn).toBeTruthy();
  });

  it('shows visibility toggle with correct aria-label for hidden layer', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: 'Hidden Layer', type: 'image', visible: false }],
      },
    });
    const showBtn = target.querySelector('[aria-label="Show Hidden Layer"]');
    expect(showBtn).toBeTruthy();
  });

  it('fires onLayerSelect when a layer label is clicked', () => {
    const onSelect = vi.fn();
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [{ id: 'l1', label: 'Click Me', type: 'text', visible: true }],
        onLayerSelect: onSelect,
      },
    });
    // The label button has aria-current when active, find the button with the label text
    const labelBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Click Me')
    );
    expect(labelBtn).toBeTruthy();
    labelBtn!.click();
    expect(onSelect).toHaveBeenCalledWith('l1');
  });

  it('has move up/down accessibility buttons for reordering', () => {
    component = mount(ComposerSidebar, {
      target,
      props: {
        ...baseProps(),
        layers: [
          { id: 'l1', label: 'A', type: 'image', visible: true },
          { id: 'l2', label: 'B', type: 'text', visible: true },
        ],
      },
    });
    const upBtns = target.querySelectorAll('[aria-label="Move layer up"]');
    const downBtns = target.querySelectorAll('[aria-label="Move layer down"]');
    expect(upBtns.length).toBeGreaterThan(0);
    expect(downBtns.length).toBeGreaterThan(0);
  });

  it('renders region with aria-label "Layer list"', () => {
    component = mount(ComposerSidebar, { target, props: baseProps() });
    const region = target.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('aria-label')).toBe('Layer list');
  });
});

// ============================================================================
// ComposerToolbar
// ============================================================================

describe('ComposerToolbar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    canUndo: false,
    canRedo: false,
    isDirty: false,
    onSave: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onClose: vi.fn(),
    fieldMode: false,
    cx,
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders a toolbar with role="toolbar" and aria-label="Composer tools"', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    const toolbar = target.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar!.getAttribute('aria-label')).toBe('Composer tools');
  });

  it('disables Save when isDirty=false', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    const saveBtn = target.querySelector('[aria-label="Save composition"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('enables Save and fires onSave when isDirty=true', () => {
    const onSave = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: { ...baseProps(), isDirty: true, onSave },
    });
    const saveBtn = target.querySelector('[aria-label="Save composition"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();
    expect(onSave).toHaveBeenCalled();
  });

  it('shows "Unsaved changes" indicator only when isDirty=true', () => {
    component = mount(ComposerToolbar, {
      target,
      props: { ...baseProps(), isDirty: true },
    });
    expect(target.textContent).toContain('Unsaved changes');
  });

  it('hides "Unsaved changes" when isDirty=false', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    expect(target.textContent).not.toContain('Unsaved changes');
  });

  it('disables Undo when canUndo=false', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    const undoBtn = target.querySelector('[aria-label="Undo"]') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
  });

  it('enables Undo and fires onUndo when canUndo=true', () => {
    const onUndo = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: { ...baseProps(), canUndo: true, onUndo },
    });
    const undoBtn = target.querySelector('[aria-label="Undo"]') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    undoBtn.click();
    expect(onUndo).toHaveBeenCalled();
  });

  it('disables Redo when canRedo=false', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    const redoBtn = target.querySelector('[aria-label="Redo"]') as HTMLButtonElement;
    expect(redoBtn.disabled).toBe(true);
  });

  it('enables Redo and fires onRedo when canRedo=true', () => {
    const onRedo = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: { ...baseProps(), canRedo: true, onRedo },
    });
    const redoBtn = target.querySelector('[aria-label="Redo"]') as HTMLButtonElement;
    expect(redoBtn.disabled).toBe(false);
    redoBtn.click();
    expect(onRedo).toHaveBeenCalled();
  });

  it('fires onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    component = mount(ComposerToolbar, {
      target,
      props: { ...baseProps(), onClose },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer"]') as HTMLButtonElement;
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('Close button is always enabled regardless of dirty state', () => {
    component = mount(ComposerToolbar, { target, props: baseProps() });
    const closeBtn = target.querySelector('[aria-label="Close composer"]') as HTMLButtonElement;
    expect(closeBtn.disabled).toBe(false);
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

  it('renders a list with role="list" and aria-label="Canvas list"', () => {
    component = mount(ContinuousViewer, {
      target,
      props: { canvases: [], fieldMode: false, cx },
    });
    const list = target.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list!.getAttribute('aria-label')).toBe('Canvas list');
  });

  it('renders no listitems when canvases is empty', () => {
    component = mount(ContinuousViewer, {
      target,
      props: { canvases: [], fieldMode: false, cx },
    });
    const items = target.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(0);
  });

  it('renders one listitem per canvas with correct aria-label from canvas label', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [
          makeCanvas({ id: 'c1', label: { en: ['Page 1'] } }),
          makeCanvas({ id: 'c2', label: { en: ['Page 2'] } }),
        ],
        fieldMode: false,
        cx,
      },
    });
    const items = target.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('aria-label')).toBe('Page 1');
    expect(items[1].getAttribute('aria-label')).toBe('Page 2');
  });

  it('shows canvas label text as overlay in each item', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'c1', label: { en: ['My Canvas'] } })],
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('My Canvas');
  });

  it('marks each canvas with data-canvas-id attribute', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'https://example.org/c/1' })],
        fieldMode: false,
        cx,
      },
    });
    const el = target.querySelector('[data-canvas-id="https://example.org/c/1"]');
    expect(el).toBeTruthy();
  });

  it('falls back gracefully when canvas.label is undefined (renders empty label, not crash)', () => {
    component = mount(ContinuousViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'c1', label: undefined })],
        fieldMode: false,
        cx,
      },
    });
    // getIIIFValue(undefined) returns '' which is falsy-ish but not nullish,
    // so ?? 'Canvas' does not trigger. The component should still render its listitem.
    const items = target.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(1);
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

  it('renders a list with role="list" and aria-label="Page spreads"', () => {
    component = mount(PagedViewer, {
      target,
      props: { canvases: [], fieldMode: false, cx },
    });
    const list = target.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list!.getAttribute('aria-label')).toBe('Page spreads');
  });

  it('renders no listitems when canvases is empty', () => {
    component = mount(PagedViewer, {
      target,
      props: { canvases: [], fieldMode: false, cx },
    });
    expect(target.querySelectorAll('[role="listitem"]').length).toBe(0);
  });

  it('renders first canvas as solo spread (cover page)', () => {
    const canvases = [
      makeCanvas({ id: 'c1', label: { en: ['Cover'] } }),
      makeCanvas({ id: 'c2', label: { en: ['Page 2'] } }),
      makeCanvas({ id: 'c3', label: { en: ['Page 3'] } }),
    ];
    component = mount(PagedViewer, {
      target,
      props: { canvases, fieldMode: false, cx },
    });
    // With 3 canvases: cover (solo) + 1 pair = 2 spreads
    const spreads = target.querySelectorAll('[role="listitem"]');
    expect(spreads.length).toBe(2);
  });

  it('fires onPageChange with canvas id when page button is clicked', () => {
    const onPageChange = vi.fn();
    component = mount(PagedViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'https://example.org/c/1' })],
        onPageChange,
        fieldMode: false,
        cx,
      },
    });
    const pageBtn = target.querySelector('button') as HTMLButtonElement;
    pageBtn.click();
    expect(onPageChange).toHaveBeenCalledWith('https://example.org/c/1');
  });

  it('marks the active canvas with aria-current="page"', () => {
    component = mount(PagedViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'c1' })],
        activeCanvasId: 'c1',
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[aria-current="page"]')).toBeTruthy();
  });

  it('does not set aria-current on non-active pages', () => {
    component = mount(PagedViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'c1' })],
        activeCanvasId: 'other-id',
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[aria-current="page"]')).toBeNull();
  });

  it('renders all canvases as solo spreads when facingPages=false', () => {
    const canvases = [
      makeCanvas({ id: 'c1', label: { en: ['P1'] } }),
      makeCanvas({ id: 'c2', label: { en: ['P2'] } }),
      makeCanvas({ id: 'c3', label: { en: ['P3'] } }),
    ];
    component = mount(PagedViewer, {
      target,
      props: { canvases, facingPages: false, fieldMode: false, cx },
    });
    const spreads = target.querySelectorAll('[role="listitem"]');
    expect(spreads.length).toBe(3);
  });

  it('shows canvas label text on each page button', () => {
    component = mount(PagedViewer, {
      target,
      props: {
        canvases: [makeCanvas({ id: 'c1', label: { en: ['Front Cover'] } })],
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Front Cover');
  });
});

// ============================================================================
// TimeAnnotationOverlay
// ============================================================================

describe('TimeAnnotationOverlay', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    currentTime: 0,
    duration: 120,
    timeRange: null as { start: number; end?: number } | null,
    isSelecting: false,
    onRangeStart: vi.fn(),
    onRangeEnd: vi.fn(),
    onRangeClear: vi.fn(),
    fieldMode: false,
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders a slider with role="slider" for the time range track', () => {
    component = mount(TimeAnnotationOverlay, { target, props: baseProps() });
    const slider = target.querySelector('[role="slider"]');
    expect(slider).toBeTruthy();
    expect(slider!.getAttribute('aria-label')).toBe('Time range track');
  });

  it('sets aria-valuemin, aria-valuemax, and aria-valuenow on the slider', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), currentTime: 30, duration: 120 },
    });
    const slider = target.querySelector('[role="slider"]');
    expect(slider!.getAttribute('aria-valuemin')).toBe('0');
    expect(slider!.getAttribute('aria-valuemax')).toBe('120');
    expect(slider!.getAttribute('aria-valuenow')).toBe('30');
  });

  it('shows "Click to set start point" when no range is set', () => {
    component = mount(TimeAnnotationOverlay, { target, props: baseProps() });
    expect(target.textContent).toContain('Click to set start');
  });

  it('shows "Click to set end point" when only start is set', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 5 }, isSelecting: true },
    });
    expect(target.textContent).toContain('Click to set end');
  });

  it('shows time range summary when both start and end are set', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 5, end: 15 } },
    });
    expect(target.textContent).toContain('Range:');
  });

  it('shows Clear button only when a timeRange exists', () => {
    component = mount(TimeAnnotationOverlay, { target, props: baseProps() });
    expect(target.querySelector('[aria-label="Clear time range"]')).toBeNull();
  });

  it('shows Clear button when timeRange is set (start only)', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 5 }, isSelecting: true },
    });
    expect(target.querySelector('[aria-label="Clear time range"]')).toBeTruthy();
  });

  it('fires onRangeClear when Clear button is clicked', () => {
    const onRangeClear = vi.fn();
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 5, end: 15 }, onRangeClear },
    });
    const clearBtn = target.querySelector('[aria-label="Clear time range"]') as HTMLButtonElement;
    clearBtn.click();
    expect(onRangeClear).toHaveBeenCalled();
  });

  it('shows Start/Duration/End labels when range has both endpoints', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 10, end: 20 } },
    });
    expect(target.textContent).toContain('Start:');
    expect(target.textContent).toContain('Duration:');
    expect(target.textContent).toContain('End:');
  });

  it('does not show Start/Duration/End labels when range has no end', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), timeRange: { start: 10 }, isSelecting: true },
    });
    // These only appear when timeRange.end is defined
    expect(target.textContent).not.toContain('Duration:');
  });

  it('handles zero duration gracefully (no NaN in output)', () => {
    component = mount(TimeAnnotationOverlay, {
      target,
      props: { ...baseProps(), duration: 0 },
    });
    expect(target.textContent).not.toContain('NaN');
  });
});
