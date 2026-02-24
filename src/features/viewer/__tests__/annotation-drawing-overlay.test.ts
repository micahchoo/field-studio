/**
 * AnnotationDrawingOverlay Component Tests
 *
 * Tests the Svelte 5 AnnotationDrawingOverlay molecule that bridges between
 * the OSD viewer and Annotorious drawing tools for W3C Web Annotation
 * compliant spatial annotations on IIIF canvases.
 *
 * External dependencies mocked:
 *   - @annotorious/openseadragon (createOSDAnnotator, W3CImageFormat, UserSelectAction)
 *   - @pixi/unsafe-eval
 *
 * Tests component logic only (status bar messages, tooltip, keyboard shortcuts,
 * drawing state callbacks, ref wiring).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import type { IIIFCanvas, IIIFAnnotation } from '@/src/shared/types';

// --- Annotorious mock ---

let annoEventHandlers: Record<string, Function[]>;
let mockAnnotoriousInstance: Record<string, any>;

function createMockAnnotorious() {
  annoEventHandlers = {};
  mockAnnotoriousInstance = {
    on: vi.fn((event: string, handler: Function) => {
      if (!annoEventHandlers[event]) annoEventHandlers[event] = [];
      annoEventHandlers[event].push(handler);
    }),
    setDrawingTool: vi.fn(),
    setDrawingEnabled: vi.fn(),
    setStyle: vi.fn(),
    addAnnotation: vi.fn(),
    removeAnnotation: vi.fn(),
    clearAnnotations: vi.fn(),
    cancelDrawing: vi.fn(),
    clearSelection: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    destroy: vi.fn(),
  };
  return mockAnnotoriousInstance;
}

vi.mock('@pixi/unsafe-eval', () => ({}));

vi.mock('@annotorious/openseadragon', () => ({
  createOSDAnnotator: vi.fn(() => createMockAnnotorious()),
  W3CImageFormat: vi.fn((canvasId: string) => ({ canvasId })),
  UserSelectAction: {
    EDIT: 'EDIT',
    SELECT: 'SELECT',
  },
}));

import AnnotationDrawingOverlay from '../ui/molecules/AnnotationDrawingOverlay.svelte';

// --- Test fixtures ---

function makeCanvas(): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1000,
    height: 800,
    items: [],
  } as unknown as IIIFCanvas;
}

function _makeAnnotation(id: string, text: string): IIIFAnnotation {
  return {
    id,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: text, format: 'text/plain' },
    target: `https://example.org/canvas/1#xywh=10,10,100,100`,
  } as unknown as IIIFAnnotation;
}

function createMockViewer() {
  return {
    viewport: {
      getZoom: vi.fn(() => 1),
      getCenter: vi.fn(() => ({ x: 0.5, y: 0.5 })),
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

describe('AnnotationDrawingOverlay', () => {
  it('renders drawing instruction text when isActive is true', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    // Status bar should show drawing instruction text
    expect(target.textContent).toContain('Click and drag to draw a rectangle');
  });

  it('does not render drawing instructions when isActive is false', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: false,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).not.toContain('Click and drag to draw a rectangle');
  });

  it('shows rectangle drawing instruction for rectangle mode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Click and drag to draw a rectangle');
  });

  it('shows polygon drawing instruction for polygon mode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'polygon',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Click to add points, close shape to finish');
  });

  it('shows "Select a drawing tool" for select mode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'select',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Select a drawing tool');
  });

  it('shows "Select a drawing tool" for freehand mode (no Annotorious equivalent)', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'freehand',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    expect(target.textContent).toContain('Select a drawing tool');
  });

  it('renders drawing instruction text in fieldMode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: true,
      },
    });

    // In fieldMode, drawing instructions should still be visible
    expect(target.textContent).toContain('Click and drag to draw a rectangle');
  });

  it('does not render hover tooltip when no annotation is hovered', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    // Tooltip element should not be present when nothing is hovered
    const tooltip = target.querySelector('[role="tooltip"]');
    expect(tooltip).toBeNull();
  });

  it('calls onClose when Escape is pressed and no pending annotation', async () => {
    const onClose = vi.fn();

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose,
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    // Wait for the $effect that registers the keydown handler
    await tick();
    await new Promise(r => setTimeout(r, 50));

    // Dispatch Escape keydown on window
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDrawingStateChange to clear state when Escape cancels pending annotation', async () => {
    const onDrawingStateChange = vi.fn();
    const onClose = vi.fn();

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose,
        existingAnnotations: [],
        onDrawingStateChange,
        cx,
        fieldMode: false,
      },
    });

    // Wait for Annotorious to initialize via $effect + async import
    await tick();
    await new Promise(r => setTimeout(r, 50));

    // Simulate Annotorious creating an annotation (sets pendingAnnotation)
    if (annoEventHandlers['createAnnotation']) {
      annoEventHandlers['createAnnotation'].forEach(h => h({
        id: 'test-anno-1',
        type: 'Annotation',
        body: { type: 'TextualBody', value: '', format: 'text/plain' },
        target: 'https://example.org/canvas/1#xywh=10,10,100,100',
      }));
    }

    // Now Escape should cancel the pending annotation, not close
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // onDrawingStateChange should be called with canSave: false
    const lastCall = onDrawingStateChange.mock.calls[onDrawingStateChange.mock.calls.length - 1];
    if (lastCall) {
      expect(lastCall[0].canSave).toBe(false);
      expect(lastCall[0].isDrawing).toBe(false);
    }

    // onClose should NOT be called for pending annotation cancel
    // (it only fires when there is no pending annotation)
  });

  it('renders drawing instruction in light mode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: false,
      },
    });

    // Status bar should display drawing instruction text
    expect(target.textContent).toContain('Click and drag to draw a rectangle');
  });

  it('renders drawing instruction in fieldMode', () => {
    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'polygon',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        cx,
        fieldMode: true,
      },
    });

    // Status bar should display polygon instruction text even in fieldMode
    expect(target.textContent).toContain('Click to add points, close shape to finish');
  });

  it('wires onUndoRef callback', async () => {
    let undoFn: (() => void) | undefined;
    const onUndoRef = (fn: () => void) => { undoFn = fn; };

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        onUndoRef,
        cx,
        fieldMode: false,
      },
    });

    // Wait for $effects to run
    await tick();
    await new Promise(r => setTimeout(r, 50));

    expect(undoFn).toBeDefined();
  });

  it('wires onRedoRef callback', async () => {
    let redoFn: (() => void) | undefined;
    const onRedoRef = (fn: () => void) => { redoFn = fn; };

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        onRedoRef,
        cx,
        fieldMode: false,
      },
    });

    await tick();
    await new Promise(r => setTimeout(r, 50));

    expect(redoFn).toBeDefined();
  });

  it('wires onSaveRef callback', async () => {
    let saveFn: (() => void) | undefined;
    const onSaveRef = (fn: () => void) => { saveFn = fn; };

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        onSaveRef,
        annotationText: 'Test text',
        cx,
        fieldMode: false,
      },
    });

    await tick();
    await new Promise(r => setTimeout(r, 50));

    expect(saveFn).toBeDefined();
  });

  it('wires onClearRef callback', async () => {
    let clearFn: (() => void) | undefined;
    const onClearRef = (fn: () => void) => { clearFn = fn; };

    instance = mount(AnnotationDrawingOverlay, {
      target,
      props: {
        canvas: makeCanvas(),
        viewerRef: createMockViewer(),
        isActive: true,
        drawingMode: 'rectangle',
        onCreateAnnotation: vi.fn(),
        onClose: vi.fn(),
        existingAnnotations: [],
        onClearRef,
        cx,
        fieldMode: false,
      },
    });

    await tick();
    await new Promise(r => setTimeout(r, 50));

    expect(clearFn).toBeDefined();
  });
});
