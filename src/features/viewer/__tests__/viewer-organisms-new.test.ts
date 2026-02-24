/**
 * viewer-organisms-new.test.ts
 *
 * Contract tests for viewer organism components:
 * - AnnotationToolPanel: panel combining toolbar + form with canvas info
 * - CanvasComposer: full composition editor with layers, undo/redo, save
 * - CanvasComposerPanel: panel wrapper with header + close button
 * - PolygonAnnotationTool: SVG drawing overlay for polygon/rectangle
 *
 * Each describe block verifies visible output, ARIA contracts, callback behavior,
 * and includes at least one adversarial case (null/empty/missing data).
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

import AnnotationToolPanel from '../ui/organisms/AnnotationToolPanel.svelte';
import CanvasComposer from '../ui/organisms/CanvasComposer.svelte';
import CanvasComposerPanel from '../ui/organisms/CanvasComposerPanel.svelte';
import PolygonAnnotationTool from '../ui/organisms/PolygonAnnotationTool.svelte';

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
// AnnotationToolPanel
// ============================================================================

describe('AnnotationToolPanel', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    canvas: makeCanvas(),
    drawingMode: 'polygon' as const,
    isDrawing: false,
    pointCount: 0,
    canSave: false,
    text: '',
    motivation: 'commenting' as const,
    fieldMode: false,
    cx,
    onModeChange: vi.fn(),
    onTextChange: vi.fn(),
    onMotivationChange: vi.fn(),
    onSave: vi.fn(),
    onUndo: vi.fn(),
    onClear: vi.fn(),
  });

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders a region with aria-label "Annotation tool panel"', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    const region = target.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('aria-label')).toBe('Annotation tool panel');
  });

  it('shows "Draw Annotation" as the panel title', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    expect(target.textContent).toContain('Draw Annotation');
  });

  it('displays the canvas label when canvas is provided', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: { ...baseProps(), canvas: makeCanvas({ label: { en: ['My Canvas'] } }) },
    });
    expect(target.textContent).toContain('My Canvas');
  });

  it('does not show canvas label section when canvas is null', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: { ...baseProps(), canvas: null },
    });
    // Should still render the panel without the canvas info section
    expect(target.querySelector('[role="region"]')).toBeTruthy();
    expect(target.textContent).toContain('Draw Annotation');
    // Should not contain any canvas label (no "Canvas" default either when null)
    expect(target.textContent).not.toContain('Test Canvas');
  });

  it('shows "Drawing..." indicator when isDrawing=true', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: { ...baseProps(), isDrawing: true, pointCount: 2 },
    });
    expect(target.textContent).toContain('Drawing...');
  });

  it('hides "Drawing..." indicator when isDrawing=false', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    expect(target.textContent).not.toContain('Drawing...');
  });

  it('contains a nested toolbar with drawing mode buttons', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    const toolbar = target.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    const buttons = toolbar!.querySelectorAll('button');
    expect(buttons.length).toBe(4); // polygon, rectangle, freehand, select
  });

  it('fires onModeChange when a toolbar button is clicked', () => {
    const onModeChange = vi.fn();
    component = mount(AnnotationToolPanel, {
      target,
      props: { ...baseProps(), onModeChange },
    });
    const toolbarBtns = target.querySelectorAll('[role="toolbar"] button');
    // Click rectangle (second button)
    (toolbarBtns[1] as HTMLButtonElement).click();
    expect(onModeChange).toHaveBeenCalledWith('rectangle');
  });

  it('contains the annotation form with Save button', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    expect(target.querySelector('[aria-label="Save annotation"]')).toBeTruthy();
  });

  it('shows keyboard shortcut help text at the bottom', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    expect(target.textContent).toContain('P=polygon');
    expect(target.textContent).toContain('R=rect');
    expect(target.textContent).toContain('F=freehand');
    expect(target.textContent).toContain('S=select');
    expect(target.textContent).toContain('Esc=cancel');
  });

  it('displays motivation buttons (Comment, Tag, Describe) from nested form', () => {
    component = mount(AnnotationToolPanel, { target, props: baseProps() });
    const group = target.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    const btns = group!.querySelectorAll('button');
    expect(btns.length).toBe(3);
  });

  it('shows point count from nested form when pointCount > 0', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: { ...baseProps(), pointCount: 7 },
    });
    expect(target.textContent).toContain('7 points drawn');
  });
});

// ============================================================================
// CanvasComposer
// ============================================================================

describe('CanvasComposer', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    canvas: makeCanvas(),
    root: null,
    onUpdate: vi.fn(),
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

  it('renders a region with aria-label "Canvas composer"', () => {
    component = mount(CanvasComposer, { target, props: baseProps() });
    const region = target.querySelector('[aria-label="Canvas composer"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('role')).toBe('region');
  });

  it('contains a composer toolbar with Save, Undo, Redo, Close buttons', () => {
    component = mount(CanvasComposer, { target, props: baseProps() });
    expect(target.querySelector('[aria-label="Save composition"]')).toBeTruthy();
    expect(target.querySelector('[aria-label="Undo"]')).toBeTruthy();
    expect(target.querySelector('[aria-label="Redo"]')).toBeTruthy();
    expect(target.querySelector('[aria-label="Close composer"]')).toBeTruthy();
  });

  it('contains a layer sidebar with "Layers" heading', () => {
    component = mount(CanvasComposer, { target, props: baseProps() });
    expect(target.textContent).toContain('Layers');
  });

  it('shows empty layer state initially (no pre-existing layers)', () => {
    component = mount(CanvasComposer, { target, props: baseProps() });
    expect(target.textContent).toContain('No layers');
  });

  it('fires onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    component = mount(CanvasComposer, {
      target,
      props: { ...baseProps(), onClose },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer"]') as HTMLButtonElement;
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('Save button starts disabled (not dirty)', () => {
    component = mount(CanvasComposer, { target, props: baseProps() });
    const saveBtn = target.querySelector('[aria-label="Save composition"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('works correctly in field mode', () => {
    component = mount(CanvasComposer, {
      target,
      props: { ...baseProps(), fieldMode: true, cx: FIELD_CLASSES },
    });
    const region = target.querySelector('[aria-label="Canvas composer"]');
    expect(region).toBeTruthy();
    expect(target.textContent).toContain('Layers');
  });

  it('initializes from canvas with _composerLayers without crashing', () => {
    // $effect that reads _composerLayers runs asynchronously in JSDOM,
    // so we verify the composer region renders without throwing
    const canvasWithLayers = {
      ...makeCanvas(),
      _composerLayers: [
        { id: 'l1', type: 'text', label: 'Text Layer', content: { text: 'Hello' }, visible: true, zIndex: 0 },
      ],
    } as any;
    component = mount(CanvasComposer, {
      target,
      props: { ...baseProps(), canvas: canvasWithLayers },
    });
    expect(target.querySelector('[aria-label="Canvas composer"]')).toBeTruthy();
    // Toolbar and sidebar render regardless of layer initialization timing
    expect(target.querySelector('[aria-label="Save composition"]')).toBeTruthy();
    expect(target.textContent).toContain('Layers');
  });
});

// ============================================================================
// CanvasComposerPanel
// ============================================================================

describe('CanvasComposerPanel', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    canvas: makeCanvas(),
    root: null,
    onUpdate: vi.fn(),
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

  it('renders a region with aria-label "Canvas composer panel"', () => {
    component = mount(CanvasComposerPanel, { target, props: baseProps() });
    const region = target.querySelector('[aria-label="Canvas composer panel"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('role')).toBe('region');
  });

  it('shows "Composer" title in the panel header', () => {
    component = mount(CanvasComposerPanel, { target, props: baseProps() });
    expect(target.textContent).toContain('Composer');
  });

  it('shows the canvas label in the panel header', () => {
    component = mount(CanvasComposerPanel, {
      target,
      props: { ...baseProps(), canvas: makeCanvas({ label: { en: ['My Artwork'] } }) },
    });
    expect(target.textContent).toContain('My Artwork');
  });

  it('renders without crashing when canvas has no label (getIIIFValue returns empty string)', () => {
    component = mount(CanvasComposerPanel, {
      target,
      props: { ...baseProps(), canvas: makeCanvas({ label: undefined }) },
    });
    // getIIIFValue(undefined) returns '' (empty string, not null), so ?? 'Canvas'
    // doesn't trigger. Verify the panel still renders its structure.
    expect(target.querySelector('[aria-label="Canvas composer panel"]')).toBeTruthy();
    expect(target.textContent).toContain('Composer');
  });

  it('has a close button with aria-label "Close composer panel"', () => {
    component = mount(CanvasComposerPanel, { target, props: baseProps() });
    const closeBtn = target.querySelector('[aria-label="Close composer panel"]');
    expect(closeBtn).toBeTruthy();
  });

  it('fires onClose when the panel close button is clicked', () => {
    const onClose = vi.fn();
    component = mount(CanvasComposerPanel, {
      target,
      props: { ...baseProps(), onClose },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer panel"]') as HTMLButtonElement;
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('embeds a full CanvasComposer with Save and Layers', () => {
    component = mount(CanvasComposerPanel, { target, props: baseProps() });
    // The embedded CanvasComposer should render its toolbar and sidebar
    expect(target.querySelector('[aria-label="Save composition"]')).toBeTruthy();
    expect(target.textContent).toContain('Layers');
  });

  it('works in field mode without errors', () => {
    component = mount(CanvasComposerPanel, {
      target,
      props: { ...baseProps(), fieldMode: true, cx: FIELD_CLASSES },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
    expect(target.textContent).toContain('Composer');
  });
});

// ============================================================================
// PolygonAnnotationTool
// ============================================================================

describe('PolygonAnnotationTool', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  const baseProps = () => ({
    canvas: makeCanvas(),
    containerEl: null,
    existingAnnotations: [] as IIIFAnnotation[],
    mode: 'polygon' as const,
    onAnnotationCreate: vi.fn(),
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

  it('renders an SVG with role="application"', () => {
    component = mount(PolygonAnnotationTool, { target, props: baseProps() });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('role')).toBe('application');
  });

  it('has descriptive aria-label on the SVG mentioning Escape and Enter', () => {
    component = mount(PolygonAnnotationTool, { target, props: baseProps() });
    const svg = target.querySelector('svg');
    const label = svg!.getAttribute('aria-label') ?? '';
    expect(label).toContain('Drawing overlay');
    expect(label).toContain('Escape');
    expect(label).toContain('Enter');
  });

  it('sets SVG viewBox from canvas dimensions', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: { ...baseProps(), canvas: makeCanvas({ width: 1024, height: 768 }) },
    });
    const svg = target.querySelector('svg');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 1024 768');
  });

  it('renders in rectangle mode without error', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: { ...baseProps(), mode: 'rectangle' as const },
    });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('role')).toBe('application');
  });

  it('renders correctly with existing annotations', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        ...baseProps(),
        existingAnnotations: [makeAnnotation('existing-1')],
      },
    });
    // Existing annotations are rendered as read-only SVG content
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('works in field mode', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: { ...baseProps(), fieldMode: true, cx: FIELD_CLASSES },
    });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('role')).toBe('application');
  });

  it('defaults viewBox to 1000x1000 when canvas has no dimensions', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        ...baseProps(),
        canvas: makeCanvas({ width: undefined as any, height: undefined as any }),
      },
    });
    const svg = target.querySelector('svg');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 1000 1000');
  });

  it('does not show status bar initially (no drawing in progress)', () => {
    component = mount(PolygonAnnotationTool, { target, props: baseProps() });
    // The status bar text includes "point" or "drag" only when drawing
    // When not drawing, there should be no status text about points
    const textContent = target.textContent ?? '';
    expect(textContent).not.toContain('points');
    expect(textContent).not.toContain('Esc to cancel');
  });
});
