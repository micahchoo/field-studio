/**
 * Test fixtures for vault unit tests.
 * Factory functions that produce valid IIIF structures for normalization.
 */
import type {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
  IIIFRange,
  IIIFItem
} from '@/src/shared/types';

let counter = 0;
function uid(prefix: string): string {
  return `https://example.org/${prefix}/${++counter}`;
}

/** Reset the counter between tests to get deterministic IDs */
export function resetIds(): void {
  counter = 0;
}

export function createPaintingAnnotation(canvasId: string, overrides?: Partial<IIIFAnnotation>): IIIFAnnotation {
  return {
    id: uid('annotation'),
    type: 'Annotation',
    motivation: 'painting',
    body: {
      id: uid('image'),
      type: 'Image',
      format: 'image/jpeg',
      width: 1000,
      height: 800,
    },
    target: canvasId,
    ...overrides,
  };
}

export function createSupplementingAnnotation(canvasId: string, overrides?: Partial<IIIFAnnotation>): IIIFAnnotation {
  return {
    id: uid('annotation'),
    type: 'Annotation',
    motivation: 'commenting',
    body: {
      type: 'TextualBody',
      value: 'A test comment',
      format: 'text/plain',
    },
    target: canvasId,
    ...overrides,
  };
}

export function createAnnotationPage(annotations: IIIFAnnotation[], overrides?: Partial<IIIFAnnotationPage>): IIIFAnnotationPage {
  return {
    id: uid('page'),
    type: 'AnnotationPage',
    items: annotations,
    ...overrides,
  };
}

export function createCanvas(overrides?: Partial<IIIFCanvas> & { supplementingAnnotations?: IIIFAnnotation[] }): IIIFCanvas {
  const id = overrides?.id ?? uid('canvas');
  const paintingAnno = createPaintingAnnotation(id);
  const paintingPage = createAnnotationPage([paintingAnno]);

  const { supplementingAnnotations, ...rest } = overrides ?? {};

  const canvas: IIIFCanvas = {
    id,
    type: 'Canvas',
    width: 1000,
    height: 800,
    label: { en: ['Test Canvas'] },
    items: [paintingPage],
    ...rest,
  };

  if (supplementingAnnotations && supplementingAnnotations.length > 0) {
    canvas.annotations = [createAnnotationPage(supplementingAnnotations)];
  }

  return canvas;
}

export function createRange(canvasIds: string[], overrides?: Partial<IIIFRange>): IIIFRange {
  return {
    id: uid('range'),
    type: 'Range',
    label: { en: ['Test Range'] },
    items: canvasIds.map(cid => ({ id: cid, type: 'Canvas' as const })),
    ...overrides,
  };
}

export function createManifest(overrides?: Partial<IIIFManifest> & { canvasCount?: number }): IIIFManifest {
  const { canvasCount = 1, ...rest } = overrides ?? {};
  const canvases: IIIFCanvas[] = [];
  for (let i = 0; i < canvasCount; i++) {
    canvases.push(createCanvas());
  }

  return {
    id: uid('manifest'),
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: canvases,
    ...rest,
  };
}

/**
 * Minimal manifest: Manifest > 1 Canvas > 1 AnnotationPage > 1 painting Annotation
 */
export function createMinimalManifest(): IIIFManifest {
  return createManifest({ canvasCount: 1 });
}

/**
 * Collection referencing 2 manifests
 */
export function createMinimalCollection(): IIIFCollection {
  return {
    id: uid('collection'),
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [createManifest({ canvasCount: 1 }), createManifest({ canvasCount: 1 })],
  };
}

/**
 * Range with canvas references
 */
export function createRangeFixture(): { manifest: IIIFManifest; range: IIIFRange } {
  const manifest = createManifest({ canvasCount: 2 });
  const canvasIds = manifest.items.map(c => c.id);
  const range = createRange(canvasIds);
  manifest.structures = [range];
  return { manifest, range };
}

/**
 * Full tree: Collection > 2 Manifests > 3 Canvases each
 * Each canvas has painting + supplementing annotations
 */
export function createFullTree(): IIIFCollection {
  const manifests: IIIFManifest[] = [];

  for (let m = 0; m < 2; m++) {
    const canvases: IIIFCanvas[] = [];
    for (let c = 0; c < 3; c++) {
      const canvasId = uid('canvas');
      const suppAnno = createSupplementingAnnotation(canvasId);
      canvases.push(createCanvas({ id: canvasId, supplementingAnnotations: [suppAnno] }));
    }
    manifests.push(createManifest({ items: canvases }));
  }

  return {
    id: uid('collection'),
    type: 'Collection',
    label: { en: ['Full Tree Collection'] },
    items: manifests,
  };
}
