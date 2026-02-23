/**
 * ViewerStore Tests
 *
 * Comprehensive tests for the central viewer state management class,
 * plus the pure helper functions detectMediaType and extractAnnotations.
 *
 * Test categories:
 *   1. detectMediaType() -- IIIF types + MIME types + unknown
 *   2. extractAnnotations() -- canvas with/without annotation pages
 *   3. ViewerStore constructor defaults
 *   4. load() -- canvas/manifest loading, media detection, annotation extraction
 *   5. Panel toggles (9 toggles + fullscreen + navigator + filmstrip + keyboard help)
 *   6. Rotation -- CW, CCW, setRotation wrapping, resetView
 *   7. Zoom -- zoomIn, zoomOut, setZoomLevel
 *   8. Flip -- flipHorizontal toggle
 *   9. Annotation CRUD -- addAnnotation, removeAnnotation, selectAnnotation
 *  10. Choice detection -- canvas with Choice body vs normal
 *  11. canDownload derived -- requires resolvedImageUrl + image mediaType
 *  12. reset() -- restores all defaults
 *  13. handleImageKeyDown -- keyboard shortcuts
 *  14. takeScreenshot -- with mock HTMLCanvasElement
 *  15. Miscellaneous -- setResolvedImageUrl, signalOsdReady, setActiveChoiceIndex
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  ViewerStore,
  detectMediaType,
  extractAnnotations,
  type MediaType,
  type ScreenshotFormat,
} from '@/src/features/viewer/model/viewer.svelte';

import type {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFManifest,
  IIIFExternalWebResource,
  IIIFChoice,
} from '@/src/shared/types';

// ============================================================================
// Fixture Factories
// ============================================================================

function makeAnnotation(id: string, motivation = 'commenting'): IIIFAnnotation {
  return {
    id,
    type: 'Annotation',
    motivation,
    body: {
      type: 'TextualBody',
      value: `Body for ${id}`,
      format: 'text/plain',
    },
    target: 'https://example.org/canvas/1',
  };
}

function makeAnnotationPage(
  id: string,
  annotations: IIIFAnnotation[] = [],
): IIIFAnnotationPage {
  return {
    id,
    type: 'AnnotationPage',
    items: annotations,
  };
}

function makeImageBody(overrides?: Partial<IIIFExternalWebResource>): IIIFExternalWebResource {
  return {
    id: 'https://example.org/image/1',
    type: 'Image',
    format: 'image/jpeg',
    width: 4000,
    height: 3000,
    ...overrides,
  };
}

function makeCanvas(overrides?: Partial<IIIFCanvas> & {
  paintingBody?: IIIFExternalWebResource | IIIFChoice;
  nonPaintingPages?: IIIFAnnotationPage[];
}): IIIFCanvas {
  const { paintingBody, nonPaintingPages, ...rest } = overrides ?? {};
  const body = paintingBody ?? makeImageBody();

  const paintingAnnotation: IIIFAnnotation = {
    id: 'https://example.org/canvas/1/anno/painting',
    type: 'Annotation',
    motivation: 'painting',
    body,
    target: 'https://example.org/canvas/1',
  };

  const paintingPage = makeAnnotationPage(
    'https://example.org/canvas/1/page/painting',
    [paintingAnnotation],
  );

  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    width: 4000,
    height: 3000,
    items: [paintingPage],
    annotations: nonPaintingPages,
    ...rest,
  } as IIIFCanvas;
}

function makeManifest(canvases?: IIIFCanvas[]): IIIFManifest {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: canvases ?? [makeCanvas()],
  };
}

function makeChoiceBody(labels: string[]): IIIFChoice {
  return {
    type: 'Choice',
    items: labels.map((label, i) => ({
      id: `https://example.org/image/choice-${i}`,
      type: 'Image' as const,
      format: 'image/jpeg',
      width: 4000,
      height: 3000,
      label: { en: [label] },
    })),
  };
}

/**
 * Create a minimal KeyboardEvent for testing handleImageKeyDown.
 * happy-dom provides KeyboardEvent but we construct with custom properties.
 */
function makeKeyEvent(
  key: string,
  overrides?: Partial<{
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    target: EventTarget;
  }>,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: overrides?.shiftKey ?? false,
    ctrlKey: overrides?.ctrlKey ?? false,
    metaKey: overrides?.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  // Override target if provided (KeyboardEvent constructor doesn't accept it)
  if (overrides?.target) {
    Object.defineProperty(event, 'target', {
      value: overrides.target,
      writable: false,
    });
  }

  return event;
}


// ============================================================================
// 1. detectMediaType
// ============================================================================

describe('detectMediaType', () => {
  it('detects IIIF type "Image"', () => {
    expect(detectMediaType('Image')).toBe('image');
  });

  it('detects IIIF type "Video"', () => {
    expect(detectMediaType('Video')).toBe('video');
  });

  it('detects IIIF type "Sound"', () => {
    expect(detectMediaType('Sound')).toBe('audio');
  });

  it('detects IIIF type "Audio" (non-standard alias)', () => {
    expect(detectMediaType('Audio')).toBe('audio');
  });

  it('detects MIME type "image/jpeg"', () => {
    expect(detectMediaType('image/jpeg')).toBe('image');
  });

  it('detects MIME type "image/png"', () => {
    expect(detectMediaType('image/png')).toBe('image');
  });

  it('detects MIME type "video/mp4"', () => {
    expect(detectMediaType('video/mp4')).toBe('video');
  });

  it('detects MIME type "audio/mpeg"', () => {
    expect(detectMediaType('audio/mpeg')).toBe('audio');
  });

  it('detects MIME type "audio/wav"', () => {
    expect(detectMediaType('audio/wav')).toBe('audio');
  });

  it('returns "other" for unknown type string', () => {
    expect(detectMediaType('unknown')).toBe('other');
  });

  it('returns "other" for empty string', () => {
    expect(detectMediaType('')).toBe('other');
  });

  it('returns "other" for "TextualBody"', () => {
    expect(detectMediaType('TextualBody')).toBe('other');
  });

  it('returns "other" for "application/json"', () => {
    expect(detectMediaType('application/json')).toBe('other');
  });
});


// ============================================================================
// 2. extractAnnotations
// ============================================================================

describe('extractAnnotations', () => {
  it('returns empty array for null canvas', () => {
    expect(extractAnnotations(null)).toEqual([]);
  });

  it('returns empty array for canvas with no annotations property', () => {
    const canvas = makeCanvas();
    // annotations is undefined by default when not passed
    delete (canvas as unknown as Record<string, unknown>).annotations;
    expect(extractAnnotations(canvas)).toEqual([]);
  });

  it('returns empty array for canvas with empty annotations array', () => {
    const canvas = makeCanvas({ nonPaintingPages: [] });
    // Override annotations to empty
    canvas.annotations = [];
    expect(extractAnnotations(canvas)).toEqual([]);
  });

  it('extracts annotations from a single annotation page', () => {
    const anno1 = makeAnnotation('anno-1');
    const anno2 = makeAnnotation('anno-2');
    const page = makeAnnotationPage('page-1', [anno1, anno2]);

    const canvas = makeCanvas({ nonPaintingPages: [page] });
    const result = extractAnnotations(canvas);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('anno-1');
    expect(result[1].id).toBe('anno-2');
  });

  it('extracts annotations from multiple annotation pages', () => {
    const page1 = makeAnnotationPage('page-1', [
      makeAnnotation('anno-1'),
      makeAnnotation('anno-2'),
    ]);
    const page2 = makeAnnotationPage('page-2', [
      makeAnnotation('anno-3'),
    ]);

    const canvas = makeCanvas({ nonPaintingPages: [page1, page2] });
    const result = extractAnnotations(canvas);

    expect(result).toHaveLength(3);
    expect(result.map(a => a.id)).toEqual(['anno-1', 'anno-2', 'anno-3']);
  });

  it('handles annotation page with empty items', () => {
    const page = makeAnnotationPage('page-empty', []);
    const canvas = makeCanvas({ nonPaintingPages: [page] });

    expect(extractAnnotations(canvas)).toEqual([]);
  });

  it('handles annotation page with no items property', () => {
    const page = { id: 'page-no-items', type: 'AnnotationPage' as const } as IIIFAnnotationPage;
    // Intentionally omit items
    delete (page as unknown as Record<string, unknown>).items;
    const canvas = makeCanvas({ nonPaintingPages: [page] });

    expect(extractAnnotations(canvas)).toEqual([]);
  });
});


// ============================================================================
// 3. ViewerStore -- Constructor Defaults
// ============================================================================

describe('ViewerStore', () => {
  let store: ViewerStore;

  beforeEach(() => {
    store = new ViewerStore();
  });

  describe('constructor defaults', () => {
    it('has mediaType "other"', () => {
      expect(store.mediaType).toBe('other');
    });

    it('has empty annotations', () => {
      expect(store.annotations).toEqual([]);
    });

    it('has null resolvedImageUrl', () => {
      expect(store.resolvedImageUrl).toBeNull();
    });

    it('has rotation 0', () => {
      expect(store.rotation).toBe(0);
    });

    it('has zoomLevel 100', () => {
      expect(store.zoomLevel).toBe(100);
    });

    it('has isFlipped false', () => {
      expect(store.isFlipped).toBe(false);
    });

    it('has showNavigator true', () => {
      expect(store.showNavigator).toBe(true);
    });

    it('has isFullscreen false', () => {
      expect(store.isFullscreen).toBe(false);
    });

    it('has showTranscriptionPanel false', () => {
      expect(store.showTranscriptionPanel).toBe(false);
    });

    it('has showSearchPanel false', () => {
      expect(store.showSearchPanel).toBe(false);
    });

    it('has showMetadataPanel false', () => {
      expect(store.showMetadataPanel).toBe(false);
    });

    it('has showWorkbench false', () => {
      expect(store.showWorkbench).toBe(false);
    });

    it('has showAnnotationTool false', () => {
      expect(store.showAnnotationTool).toBe(false);
    });

    it('has showFilmstrip true', () => {
      expect(store.showFilmstrip).toBe(true);
    });

    it('has showKeyboardHelp false', () => {
      expect(store.showKeyboardHelp).toBe(false);
    });

    it('has selectedAnnotationId null', () => {
      expect(store.selectedAnnotationId).toBeNull();
    });

    it('has isOcring false', () => {
      expect(store.isOcring).toBe(false);
    });

    it('has osdReady 0', () => {
      expect(store.osdReady).toBe(0);
    });

    it('has activeChoiceIndex 0', () => {
      expect(store.activeChoiceIndex).toBe(0);
    });

    it('has currentCanvasId null', () => {
      expect(store.currentCanvasId).toBeNull();
    });

    it('has hasChoice false', () => {
      expect(store.hasChoice).toBe(false);
    });

    it('has choiceItems empty', () => {
      expect(store.choiceItems).toEqual([]);
    });

    it('has hasSearchService false', () => {
      expect(store.hasSearchService).toBe(false);
    });

    it('has canDownload false', () => {
      expect(store.canDownload).toBe(false);
    });
  });


  // ==========================================================================
  // 4. load()
  // ==========================================================================

  describe('load()', () => {
    it('sets currentCanvasId from canvas.id', () => {
      const canvas = makeCanvas();
      store.load(canvas, makeManifest());
      expect(store.currentCanvasId).toBe('https://example.org/canvas/1');
    });

    it('detects media type from painting body type', () => {
      const canvas = makeCanvas({ paintingBody: makeImageBody({ type: 'Image' }) });
      store.load(canvas, makeManifest());
      expect(store.mediaType).toBe('image');
    });

    it('detects video media type', () => {
      const videoBody: IIIFExternalWebResource = {
        id: 'https://example.org/video/1.mp4',
        type: 'Video',
        format: 'video/mp4',
        width: 1920,
        height: 1080,
        duration: 120,
      };
      const canvas = makeCanvas({ paintingBody: videoBody });
      store.load(canvas, makeManifest());
      expect(store.mediaType).toBe('video');
    });

    it('detects audio media type from Sound body', () => {
      const audioBody: IIIFExternalWebResource = {
        id: 'https://example.org/audio/1.mp3',
        type: 'Sound',
        format: 'audio/mpeg',
        duration: 300,
      };
      const canvas = makeCanvas({ paintingBody: audioBody });
      store.load(canvas, makeManifest());
      expect(store.mediaType).toBe('audio');
    });

    it('extracts non-painting annotations', () => {
      const anno1 = makeAnnotation('anno-1', 'commenting');
      const anno2 = makeAnnotation('anno-2', 'tagging');
      const page = makeAnnotationPage('page-supplementing', [anno1, anno2]);

      const canvas = makeCanvas({ nonPaintingPages: [page] });
      store.load(canvas, makeManifest());

      expect(store.annotations).toHaveLength(2);
      expect(store.annotations[0].id).toBe('anno-1');
      expect(store.annotations[1].id).toBe('anno-2');
    });

    it('resets activeChoiceIndex to 0 on load', () => {
      store.setActiveChoiceIndex(3);
      store.load(makeCanvas(), makeManifest());
      expect(store.activeChoiceIndex).toBe(0);
    });

    it('handles null canvas (clears state)', () => {
      // First load a real canvas
      store.load(makeCanvas(), makeManifest());
      expect(store.currentCanvasId).toBeTruthy();

      // Then clear
      store.load(null, null);
      expect(store.currentCanvasId).toBeNull();
      expect(store.mediaType).toBe('other');
      expect(store.annotations).toEqual([]);
      expect(store.resolvedImageUrl).toBeNull();
    });

    it('handles canvas with no painting body', () => {
      const emptyCanvas: IIIFCanvas = {
        id: 'https://example.org/canvas/empty',
        type: 'Canvas',
        width: 100,
        height: 100,
        items: [],
      };
      store.load(emptyCanvas, makeManifest());
      expect(store.mediaType).toBe('other');
    });

    it('handles canvas with painting page but no painting annotation', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.org/canvas/no-anno',
        type: 'Canvas',
        width: 100,
        height: 100,
        items: [makeAnnotationPage('page-empty', [])],
      };
      store.load(canvas, makeManifest());
      expect(store.mediaType).toBe('other');
    });
  });


  // ==========================================================================
  // 5. Panel Toggles
  // ==========================================================================

  describe('panel toggles', () => {
    it('toggleTranscriptionPanel toggles on and off', () => {
      expect(store.showTranscriptionPanel).toBe(false);
      store.toggleTranscriptionPanel();
      expect(store.showTranscriptionPanel).toBe(true);
      store.toggleTranscriptionPanel();
      expect(store.showTranscriptionPanel).toBe(false);
    });

    it('toggleSearchPanel toggles on and off', () => {
      expect(store.showSearchPanel).toBe(false);
      store.toggleSearchPanel();
      expect(store.showSearchPanel).toBe(true);
      store.toggleSearchPanel();
      expect(store.showSearchPanel).toBe(false);
    });

    it('toggleMetadataPanel toggles on and off', () => {
      expect(store.showMetadataPanel).toBe(false);
      store.toggleMetadataPanel();
      expect(store.showMetadataPanel).toBe(true);
      store.toggleMetadataPanel();
      expect(store.showMetadataPanel).toBe(false);
    });

    it('toggleWorkbench toggles on and off', () => {
      expect(store.showWorkbench).toBe(false);
      store.toggleWorkbench();
      expect(store.showWorkbench).toBe(true);
      store.toggleWorkbench();
      expect(store.showWorkbench).toBe(false);
    });

    it('toggleAnnotationTool toggles on and off', () => {
      expect(store.showAnnotationTool).toBe(false);
      store.toggleAnnotationTool();
      expect(store.showAnnotationTool).toBe(true);
      store.toggleAnnotationTool();
      expect(store.showAnnotationTool).toBe(false);
    });

    it('toggleFilmstrip toggles off and on (default is true)', () => {
      expect(store.showFilmstrip).toBe(true);
      store.toggleFilmstrip();
      expect(store.showFilmstrip).toBe(false);
      store.toggleFilmstrip();
      expect(store.showFilmstrip).toBe(true);
    });

    it('toggleKeyboardHelp toggles on and off', () => {
      expect(store.showKeyboardHelp).toBe(false);
      store.toggleKeyboardHelp();
      expect(store.showKeyboardHelp).toBe(true);
      store.toggleKeyboardHelp();
      expect(store.showKeyboardHelp).toBe(false);
    });

    it('toggleNavigator toggles off and on (default is true)', () => {
      expect(store.showNavigator).toBe(true);
      store.toggleNavigator();
      expect(store.showNavigator).toBe(false);
      store.toggleNavigator();
      expect(store.showNavigator).toBe(true);
    });

    it('toggleFullscreen toggles on and off', () => {
      expect(store.isFullscreen).toBe(false);
      store.toggleFullscreen();
      expect(store.isFullscreen).toBe(true);
      store.toggleFullscreen();
      expect(store.isFullscreen).toBe(false);
    });

    it('toggleComposer is a no-op (backward compat)', () => {
      // Should not throw
      store.toggleComposer();
    });
  });


  // ==========================================================================
  // 6. Rotation
  // ==========================================================================

  describe('rotation', () => {
    it('rotateCW increments by 90', () => {
      store.rotateCW();
      expect(store.rotation).toBe(90);
    });

    it('rotateCW wraps at 360', () => {
      store.rotateCW(); // 90
      store.rotateCW(); // 180
      store.rotateCW(); // 270
      store.rotateCW(); // 0 (360 % 360)
      expect(store.rotation).toBe(0);
    });

    it('rotateCCW decrements by 90', () => {
      store.rotateCW(); // 90
      store.rotateCCW(); // 0
      expect(store.rotation).toBe(0);
    });

    it('rotateCCW wraps below 0', () => {
      store.rotateCCW(); // -90 + 360 = 270
      expect(store.rotation).toBe(270);
    });

    it('rotateCCW multiple times', () => {
      store.rotateCCW(); // 270
      store.rotateCCW(); // 180
      store.rotateCCW(); // 90
      store.rotateCCW(); // 0
      expect(store.rotation).toBe(0);
    });

    it('setRotation sets arbitrary angle', () => {
      store.setRotation(45);
      expect(store.rotation).toBe(45);
    });

    it('setRotation wraps angles >= 360', () => {
      store.setRotation(450);
      expect(store.rotation).toBe(90);
    });

    it('setRotation wraps negative angles', () => {
      store.setRotation(-90);
      expect(store.rotation).toBe(270);
    });

    it('setRotation wraps large negative angles', () => {
      store.setRotation(-450);
      expect(store.rotation).toBe(270);
    });

    it('setRotation handles 0', () => {
      store.setRotation(180);
      store.setRotation(0);
      expect(store.rotation).toBe(0);
    });

    it('setRotation handles 360 (wraps to 0)', () => {
      store.setRotation(360);
      expect(store.rotation).toBe(0);
    });

    it('resetView resets rotation to 0', () => {
      store.rotateCW();
      store.rotateCW();
      store.resetView();
      expect(store.rotation).toBe(0);
    });
  });


  // ==========================================================================
  // 7. Zoom
  // ==========================================================================

  describe('zoom', () => {
    it('zoomIn increases zoom by 20%', () => {
      store.zoomIn();
      expect(store.zoomLevel).toBe(120); // Math.round(100 * 1.2)
    });

    it('zoomIn compounds on repeated calls', () => {
      store.zoomIn();
      store.zoomIn();
      // 100 * 1.2 = 120 -> 120 * 1.2 = 144
      expect(store.zoomLevel).toBe(144);
    });

    it('zoomOut decreases zoom by 20%', () => {
      store.zoomOut();
      expect(store.zoomLevel).toBe(80); // Math.round(100 * 0.8)
    });

    it('zoomOut compounds on repeated calls', () => {
      store.zoomOut();
      store.zoomOut();
      // 100 * 0.8 = 80 -> 80 * 0.8 = 64
      expect(store.zoomLevel).toBe(64);
    });

    it('setZoomLevel sets arbitrary value', () => {
      store.setZoomLevel(250);
      expect(store.zoomLevel).toBe(250);
    });

    it('setZoomLevel accepts 0', () => {
      store.setZoomLevel(0);
      expect(store.zoomLevel).toBe(0);
    });

    it('resetView resets zoom to 100', () => {
      store.zoomIn();
      store.zoomIn();
      store.resetView();
      expect(store.zoomLevel).toBe(100);
    });
  });


  // ==========================================================================
  // 8. Flip
  // ==========================================================================

  describe('flipHorizontal', () => {
    it('toggles from false to true', () => {
      expect(store.isFlipped).toBe(false);
      store.flipHorizontal();
      expect(store.isFlipped).toBe(true);
    });

    it('toggles back to false', () => {
      store.flipHorizontal();
      store.flipHorizontal();
      expect(store.isFlipped).toBe(false);
    });

    it('resetView resets flip to false', () => {
      store.flipHorizontal();
      store.resetView();
      expect(store.isFlipped).toBe(false);
    });
  });


  // ==========================================================================
  // 9. Annotation CRUD
  // ==========================================================================

  describe('annotation CRUD', () => {
    it('addAnnotation appends to annotations list', () => {
      const anno = makeAnnotation('new-anno');
      store.addAnnotation(anno);
      expect(store.annotations).toHaveLength(1);
      expect(store.annotations[0].id).toBe('new-anno');
    });

    it('addAnnotation preserves existing annotations', () => {
      store.addAnnotation(makeAnnotation('anno-1'));
      store.addAnnotation(makeAnnotation('anno-2'));
      expect(store.annotations).toHaveLength(2);
      expect(store.annotations[0].id).toBe('anno-1');
      expect(store.annotations[1].id).toBe('anno-2');
    });

    it('removeAnnotation removes by ID', () => {
      store.addAnnotation(makeAnnotation('anno-1'));
      store.addAnnotation(makeAnnotation('anno-2'));
      store.addAnnotation(makeAnnotation('anno-3'));

      store.removeAnnotation('anno-2');

      expect(store.annotations).toHaveLength(2);
      expect(store.annotations.map(a => a.id)).toEqual(['anno-1', 'anno-3']);
    });

    it('removeAnnotation is no-op for nonexistent ID', () => {
      store.addAnnotation(makeAnnotation('anno-1'));
      store.removeAnnotation('nonexistent');
      expect(store.annotations).toHaveLength(1);
    });

    it('selectAnnotation sets selectedAnnotationId', () => {
      store.selectAnnotation('anno-42');
      expect(store.selectedAnnotationId).toBe('anno-42');
    });

    it('selectAnnotation with null deselects', () => {
      store.selectAnnotation('anno-42');
      store.selectAnnotation(null);
      expect(store.selectedAnnotationId).toBeNull();
    });

    it('load replaces annotations from canvas', () => {
      store.addAnnotation(makeAnnotation('local-anno'));
      expect(store.annotations).toHaveLength(1);

      const canvasAnno = makeAnnotation('canvas-anno');
      const page = makeAnnotationPage('page-1', [canvasAnno]);
      const canvas = makeCanvas({ nonPaintingPages: [page] });
      store.load(canvas, makeManifest());

      // local-anno is replaced by canvas annotations
      expect(store.annotations).toHaveLength(1);
      expect(store.annotations[0].id).toBe('canvas-anno');
    });
  });


  // ==========================================================================
  // 10. Choice Detection
  // ==========================================================================

  describe('choice detection', () => {
    it('hasChoice is false for normal image canvas', () => {
      store.load(makeCanvas(), makeManifest());
      expect(store.hasChoice).toBe(false);
      expect(store.choiceItems).toEqual([]);
    });

    it('hasChoice is true for canvas with Choice body', () => {
      const choiceBody = makeChoiceBody(['Natural', 'UV', 'X-Ray']);
      const canvas = makeCanvas({ paintingBody: choiceBody });
      store.load(canvas, makeManifest());

      expect(store.hasChoice).toBe(true);
      expect(store.choiceItems).toHaveLength(3);
    });

    it('choiceItems have labels from body labels', () => {
      const choiceBody = makeChoiceBody(['Visible Light', 'Infrared']);
      const canvas = makeCanvas({ paintingBody: choiceBody });
      store.load(canvas, makeManifest());

      expect(store.choiceItems[0].label).toBe('Visible Light');
      expect(store.choiceItems[1].label).toBe('Infrared');
    });

    it('choiceItems have body references', () => {
      const choiceBody = makeChoiceBody(['A', 'B']);
      const canvas = makeCanvas({ paintingBody: choiceBody });
      store.load(canvas, makeManifest());

      expect(store.choiceItems[0].body).toBeDefined();
      expect(store.choiceItems[1].body).toBeDefined();
    });

    it('setActiveChoiceIndex changes the active index', () => {
      store.setActiveChoiceIndex(2);
      expect(store.activeChoiceIndex).toBe(2);
    });

    it('hasChoice is false when canvas is null', () => {
      store.load(null, null);
      expect(store.hasChoice).toBe(false);
    });

    it('hasChoice is false when canvas has empty items', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.org/canvas/empty',
        type: 'Canvas',
        width: 100,
        height: 100,
        items: [],
      };
      store.load(canvas, makeManifest());
      expect(store.hasChoice).toBe(false);
    });
  });


  // ==========================================================================
  // 11. canDownload derived
  // ==========================================================================

  describe('canDownload', () => {
    it('is false when no resolvedImageUrl', () => {
      store.load(makeCanvas(), makeManifest());
      expect(store.canDownload).toBe(false);
    });

    it('is true when image mediaType and resolvedImageUrl set', () => {
      store.load(makeCanvas(), makeManifest());
      store.setResolvedImageUrl('https://example.org/image/1.jpg');
      expect(store.canDownload).toBe(true);
    });

    it('is false for video mediaType even with resolvedImageUrl', () => {
      const videoBody: IIIFExternalWebResource = {
        id: 'https://example.org/video/1.mp4',
        type: 'Video',
        format: 'video/mp4',
        width: 1920,
        height: 1080,
      };
      store.load(makeCanvas({ paintingBody: videoBody }), makeManifest());
      store.setResolvedImageUrl('https://example.org/video/1.mp4');
      expect(store.canDownload).toBe(false);
    });

    it('is false for audio mediaType even with resolvedImageUrl', () => {
      const audioBody: IIIFExternalWebResource = {
        id: 'https://example.org/audio/1.mp3',
        type: 'Sound',
        format: 'audio/mpeg',
      };
      store.load(makeCanvas({ paintingBody: audioBody }), makeManifest());
      store.setResolvedImageUrl('https://example.org/audio/1.mp3');
      expect(store.canDownload).toBe(false);
    });

    it('becomes false after setResolvedImageUrl(null)', () => {
      store.load(makeCanvas(), makeManifest());
      store.setResolvedImageUrl('https://example.org/image/1.jpg');
      expect(store.canDownload).toBe(true);

      store.setResolvedImageUrl(null);
      expect(store.canDownload).toBe(false);
    });
  });


  // ==========================================================================
  // 12. reset()
  // ==========================================================================

  describe('reset()', () => {
    it('restores all state to defaults', () => {
      // Mutate everything
      store.load(makeCanvas(), makeManifest());
      store.setResolvedImageUrl('https://example.org/image.jpg');
      store.rotateCW();
      store.zoomIn();
      store.flipHorizontal();
      store.toggleNavigator();
      store.toggleFullscreen();
      store.toggleTranscriptionPanel();
      store.toggleSearchPanel();
      store.toggleMetadataPanel();
      store.toggleWorkbench();
      store.toggleAnnotationTool();
      store.toggleFilmstrip();
      store.toggleKeyboardHelp();
      store.selectAnnotation('some-id');
      store.signalOsdReady();
      store.setActiveChoiceIndex(5);
      store.addAnnotation(makeAnnotation('extra'));

      // Reset
      store.reset();

      // Verify all defaults
      expect(store.mediaType).toBe('other');
      expect(store.annotations).toEqual([]);
      expect(store.resolvedImageUrl).toBeNull();
      expect(store.rotation).toBe(0);
      expect(store.zoomLevel).toBe(100);
      expect(store.isFlipped).toBe(false);
      expect(store.showNavigator).toBe(true);
      expect(store.isFullscreen).toBe(false);
      expect(store.showTranscriptionPanel).toBe(false);
      expect(store.showSearchPanel).toBe(false);
      expect(store.showMetadataPanel).toBe(false);
      expect(store.showWorkbench).toBe(false);
      expect(store.showAnnotationTool).toBe(false);
      expect(store.showFilmstrip).toBe(true);
      expect(store.showKeyboardHelp).toBe(false);
      expect(store.selectedAnnotationId).toBeNull();
      expect(store.isOcring).toBe(false);
      expect(store.osdReady).toBe(0);
      expect(store.activeChoiceIndex).toBe(0);
      expect(store.currentCanvasId).toBeNull();
    });

    it('can load again after reset', () => {
      store.load(makeCanvas(), makeManifest());
      store.reset();

      const newCanvas = makeCanvas({
        id: 'https://example.org/canvas/2',
      } as Partial<IIIFCanvas>);
      store.load(newCanvas, makeManifest());
      expect(store.currentCanvasId).toBe('https://example.org/canvas/2');
    });
  });


  // ==========================================================================
  // 13. handleImageKeyDown
  // ==========================================================================

  describe('handleImageKeyDown', () => {
    it('r rotates clockwise', () => {
      const e = makeKeyEvent('r');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.rotation).toBe(90);
    });

    it('R (shift+r) rotates counter-clockwise', () => {
      const e = makeKeyEvent('R');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.rotation).toBe(270);
    });

    it('r with shiftKey rotates counter-clockwise', () => {
      const e = makeKeyEvent('r', { shiftKey: true });
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.rotation).toBe(270);
    });

    it('f flips horizontal', () => {
      const e = makeKeyEvent('f');
      store.handleImageKeyDown(e);
      expect(store.isFlipped).toBe(true);
    });

    it('F flips horizontal', () => {
      const e = makeKeyEvent('F');
      store.handleImageKeyDown(e);
      expect(store.isFlipped).toBe(true);
    });

    it('n toggles navigator', () => {
      const e = makeKeyEvent('n');
      store.handleImageKeyDown(e);
      expect(store.showNavigator).toBe(false);
    });

    it('N toggles navigator', () => {
      const e = makeKeyEvent('N');
      store.handleImageKeyDown(e);
      expect(store.showNavigator).toBe(false);
    });

    it('? toggles keyboard help', () => {
      const e = makeKeyEvent('?');
      store.handleImageKeyDown(e);
      expect(store.showKeyboardHelp).toBe(true);
    });

    it('+ zooms in', () => {
      const e = makeKeyEvent('+');
      store.handleImageKeyDown(e);
      expect(store.zoomLevel).toBe(120);
    });

    it('= zooms in', () => {
      const e = makeKeyEvent('=');
      store.handleImageKeyDown(e);
      expect(store.zoomLevel).toBe(120);
    });

    it('- zooms out', () => {
      const e = makeKeyEvent('-');
      store.handleImageKeyDown(e);
      expect(store.zoomLevel).toBe(80);
    });

    it('_ zooms out', () => {
      const e = makeKeyEvent('_');
      store.handleImageKeyDown(e);
      expect(store.zoomLevel).toBe(80);
    });

    it('0 resets view', () => {
      store.rotateCW();
      store.flipHorizontal();
      store.zoomIn();

      const e = makeKeyEvent('0');
      store.handleImageKeyDown(e);

      expect(store.rotation).toBe(0);
      expect(store.isFlipped).toBe(false);
      expect(store.zoomLevel).toBe(100);
    });

    it('a calls onAnnotationToolToggle callback', () => {
      const onToggle = vi.fn();
      const e = makeKeyEvent('a');
      store.handleImageKeyDown(e, {
        annotationToolActive: false,
        onAnnotationToolToggle: onToggle,
      });
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('a with annotationToolActive=true passes false to callback', () => {
      const onToggle = vi.fn();
      const e = makeKeyEvent('a');
      store.handleImageKeyDown(e, {
        annotationToolActive: true,
        onAnnotationToolToggle: onToggle,
      });
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('a with Ctrl does not call annotation callback', () => {
      const onToggle = vi.fn();
      const e = makeKeyEvent('a', { ctrlKey: true });
      store.handleImageKeyDown(e, {
        annotationToolActive: false,
        onAnnotationToolToggle: onToggle,
      });
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('a with Meta does not call annotation callback', () => {
      const onToggle = vi.fn();
      const e = makeKeyEvent('a', { metaKey: true });
      store.handleImageKeyDown(e, {
        annotationToolActive: false,
        onAnnotationToolToggle: onToggle,
      });
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('m calls onMeasurementToggle callback', () => {
      const onMeasure = vi.fn();
      const e = makeKeyEvent('m');
      store.handleImageKeyDown(e, { onMeasurementToggle: onMeasure });
      expect(onMeasure).toHaveBeenCalledOnce();
    });

    it('M calls onMeasurementToggle callback', () => {
      const onMeasure = vi.fn();
      const e = makeKeyEvent('M');
      store.handleImageKeyDown(e, { onMeasurementToggle: onMeasure });
      expect(onMeasure).toHaveBeenCalledOnce();
    });

    it('m with Ctrl does not call measurement callback', () => {
      const onMeasure = vi.fn();
      const e = makeKeyEvent('m', { ctrlKey: true });
      store.handleImageKeyDown(e, { onMeasurementToggle: onMeasure });
      expect(onMeasure).not.toHaveBeenCalled();
    });

    it('Escape exits fullscreen when in fullscreen', () => {
      store.toggleFullscreen();
      expect(store.isFullscreen).toBe(true);

      const e = makeKeyEvent('Escape');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.isFullscreen).toBe(false);
    });

    it('Escape is handled but does nothing when not in fullscreen', () => {
      expect(store.isFullscreen).toBe(false);
      const e = makeKeyEvent('Escape');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.isFullscreen).toBe(false);
    });

    it('returns false for unhandled keys', () => {
      const e = makeKeyEvent('x');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(false);
    });

    it('ignores keys when target is an input element', () => {
      const input = document.createElement('input');
      const e = makeKeyEvent('r', { target: input });
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(false);
      expect(store.rotation).toBe(0);
    });

    it('ignores keys when target is a textarea element', () => {
      const textarea = document.createElement('textarea');
      const e = makeKeyEvent('f', { target: textarea });
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(false);
      expect(store.isFlipped).toBe(false);
    });

    it('ignores keys when target is a select element', () => {
      const select = document.createElement('select');
      const e = makeKeyEvent('n', { target: select });
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(false);
    });

    it('works without opts parameter', () => {
      const e = makeKeyEvent('r');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
      expect(store.rotation).toBe(90);
    });

    it('a without opts does not throw', () => {
      const e = makeKeyEvent('a');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
    });

    it('m without opts does not throw', () => {
      const e = makeKeyEvent('m');
      const handled = store.handleImageKeyDown(e);
      expect(handled).toBe(true);
    });
  });


  // ==========================================================================
  // 14. takeScreenshot
  // ==========================================================================

  describe('takeScreenshot', () => {
    it('returns null for null canvas element', async () => {
      const result = await store.takeScreenshot(null);
      expect(result).toBeNull();
    });

    it('calls toBlob on the canvas element with correct format', async () => {
      const mockBlob = new Blob(['fake'], { type: 'image/png' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (blob: Blob | null) => void, format?: string, quality?: number) => {
          cb(mockBlob);
        }),
      } as unknown as HTMLCanvasElement;

      const result = await store.takeScreenshot(mockCanvas, 'image/png');

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        undefined,
      );
      expect(result).toBe(mockBlob);
    });

    it('passes quality parameter for JPEG format', async () => {
      const mockBlob = new Blob(['fake'], { type: 'image/jpeg' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
          cb(mockBlob);
        }),
      } as unknown as HTMLCanvasElement;

      await store.takeScreenshot(mockCanvas, 'image/jpeg', 0.85);

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.85,
      );
    });

    it('uses default format image/png when not specified', async () => {
      const mockBlob = new Blob(['fake'], { type: 'image/png' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
          cb(mockBlob);
        }),
      } as unknown as HTMLCanvasElement;

      await store.takeScreenshot(mockCanvas);

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        undefined,
      );
    });

    it('resolves to null when toBlob passes null', async () => {
      const mockCanvas = {
        toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
          cb(null);
        }),
      } as unknown as HTMLCanvasElement;

      const result = await store.takeScreenshot(mockCanvas);
      expect(result).toBeNull();
    });

    it('rejects when toBlob throws synchronously inside promise executor', async () => {
      // NOTE: The implementation wraps toBlob in `new Promise()`. When toBlob
      // throws synchronously inside the executor, the Promise constructor
      // converts it to a rejection. The outer try/catch does NOT catch promise
      // rejections (only synchronous throws from creating the promise). So
      // the await surfaces the error.
      const mockCanvas = {
        toBlob: vi.fn(() => {
          throw new Error('Canvas tainted');
        }),
      } as unknown as HTMLCanvasElement;

      await expect(store.takeScreenshot(mockCanvas)).rejects.toThrow('Canvas tainted');
    });
  });


  // ==========================================================================
  // 15. Miscellaneous
  // ==========================================================================

  describe('miscellaneous methods', () => {
    it('setResolvedImageUrl sets the URL', () => {
      store.setResolvedImageUrl('https://example.org/image.jpg');
      expect(store.resolvedImageUrl).toBe('https://example.org/image.jpg');
    });

    it('setResolvedImageUrl can clear to null', () => {
      store.setResolvedImageUrl('https://example.org/image.jpg');
      store.setResolvedImageUrl(null);
      expect(store.resolvedImageUrl).toBeNull();
    });

    it('signalOsdReady increments counter', () => {
      expect(store.osdReady).toBe(0);
      store.signalOsdReady();
      expect(store.osdReady).toBe(1);
      store.signalOsdReady();
      expect(store.osdReady).toBe(2);
    });

    it('setActiveChoiceIndex updates the index', () => {
      store.setActiveChoiceIndex(3);
      expect(store.activeChoiceIndex).toBe(3);
    });

    it('hasSearchService is false (stub)', () => {
      store.load(makeCanvas(), makeManifest());
      expect(store.hasSearchService).toBe(false);
    });

    it('resetView only resets rotation, flip, and zoom -- not panels', () => {
      store.toggleTranscriptionPanel();
      store.toggleAnnotationTool();
      store.rotateCW();
      store.flipHorizontal();
      store.zoomIn();

      store.resetView();

      // View state reset
      expect(store.rotation).toBe(0);
      expect(store.isFlipped).toBe(false);
      expect(store.zoomLevel).toBe(100);

      // Panels NOT reset
      expect(store.showTranscriptionPanel).toBe(true);
      expect(store.showAnnotationTool).toBe(true);
    });
  });
});
