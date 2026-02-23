/**
 * viewer-organisms-new.test.ts
 *
 * Tests for newly created viewer organisms:
 * AnnotationToolPanel, CanvasComposer, CanvasComposerPanel, PolygonAnnotationTool
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

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders without crashing', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });

  it('renders "Draw Annotation" panel title', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.textContent).toContain('Draw Annotation');
  });

  it('shows canvas label when canvas is provided', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas({ label: { en: ['My Canvas'] } }),
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.textContent).toContain('My Canvas');
  });

  it('shows Drawing... indicator when isDrawing=true', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        drawingMode: 'polygon',
        isDrawing: true,
        pointCount: 2,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.textContent).toContain('Drawing...');
  });

  it('calls onModeChange via AnnotationToolbar', () => {
    const onModeChange = vi.fn();
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange,
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    // Click rectangle button (second in toolbar)
    const toolbarBtns = target.querySelectorAll('[role="toolbar"] button');
    if (toolbarBtns.length >= 2) {
      (toolbarBtns[1] as HTMLButtonElement).click();
      expect(onModeChange).toHaveBeenCalledWith('rectangle');
    }
  });

  it('shows keyboard shortcut help text', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.textContent).toContain('P=polygon');
  });

  it('works without canvas (null)', () => {
    component = mount(AnnotationToolPanel, {
      target,
      props: {
        canvas: null,
        drawingMode: 'polygon',
        isDrawing: false,
        pointCount: 0,
        canSave: false,
        text: '',
        motivation: 'commenting',
        fieldMode: false,
        cx,
        onModeChange: vi.fn(),
        onTextChange: vi.fn(),
        onMotivationChange: vi.fn(),
        onSave: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });
});

// ============================================================================
// CanvasComposer
// ============================================================================

describe('CanvasComposer', () => {
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
    component = mount(CanvasComposer, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });

  it('renders toolbar with Save button', () => {
    component = mount(CanvasComposer, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[aria-label="Save composition"]')).toBeTruthy();
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    component = mount(CanvasComposer, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose,
        fieldMode: false,
        cx,
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows layer sidebar', () => {
    component = mount(CanvasComposer, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Layers');
  });

  it('renders in field mode without errors', () => {
    component = mount(CanvasComposer, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: true,
        cx: FIELD_CLASSES,
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });
});

// ============================================================================
// CanvasComposerPanel
// ============================================================================

describe('CanvasComposerPanel', () => {
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
    component = mount(CanvasComposerPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('[role="region"]')).toBeTruthy();
  });

  it('shows "Composer" title in header', () => {
    component = mount(CanvasComposerPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('Composer');
  });

  it('shows canvas label in header', () => {
    component = mount(CanvasComposerPanel, {
      target,
      props: {
        canvas: makeCanvas({ label: { en: ['My Artwork'] } }),
        root: null,
        onUpdate: vi.fn(),
        onClose: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.textContent).toContain('My Artwork');
  });

  it('calls onClose when panel close button clicked', () => {
    const onClose = vi.fn();
    component = mount(CanvasComposerPanel, {
      target,
      props: {
        canvas: makeCanvas(),
        root: null,
        onUpdate: vi.fn(),
        onClose,
        fieldMode: false,
        cx,
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close composer panel"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });
});

// ============================================================================
// PolygonAnnotationTool
// ============================================================================

describe('PolygonAnnotationTool', () => {
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
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        canvas: makeCanvas(),
        containerEl: null,
        existingAnnotations: [],
        mode: 'polygon',
        onAnnotationCreate: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('svg')).toBeTruthy();
  });

  it('renders an SVG overlay with interactive role', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        canvas: makeCanvas(),
        containerEl: null,
        existingAnnotations: [],
        mode: 'polygon',
        onAnnotationCreate: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
    // Drawing overlay uses role="application" to support mouse/keyboard interactions
    expect(svg!.getAttribute('role')).toBe('application');
  });

  it('renders in rectangle mode without crashing', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        canvas: makeCanvas(),
        containerEl: null,
        existingAnnotations: [],
        mode: 'rectangle',
        onAnnotationCreate: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    expect(target.querySelector('svg')).toBeTruthy();
  });

  it('renders with field mode', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        canvas: makeCanvas(),
        containerEl: null,
        existingAnnotations: [],
        mode: 'polygon',
        onAnnotationCreate: vi.fn(),
        fieldMode: true,
        cx: FIELD_CLASSES,
      },
    });
    expect(target.querySelector('svg')).toBeTruthy();
  });

  it('SVG has correct aria-label', () => {
    component = mount(PolygonAnnotationTool, {
      target,
      props: {
        canvas: makeCanvas(),
        containerEl: null,
        existingAnnotations: [],
        mode: 'polygon',
        onAnnotationCreate: vi.fn(),
        fieldMode: false,
        cx,
      },
    });
    const svg = target.querySelector('svg');
    expect(svg!.getAttribute('aria-label')).toContain('Drawing overlay');
  });
});
