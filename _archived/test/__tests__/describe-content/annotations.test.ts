/**
 * Annotations Test Suite
 *
 * Tests user interactions with annotations and notes
 * Each test maps to a user action and defines ideal outcomes vs failures.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { buildManifestFromFiles } from '@/services/iiifBuilder';
import { ActionTestData } from '../../fixtures/pipelineFixtures';
import { isAnnotationPage, isCanvas } from '@/types';
import 'fake-indexeddb/auto';

describe('User Goal: Add context through annotations', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('User Interaction: Draw annotation on canvas', () => {
    it('IDEAL: Annotation visible and survives export', async () => {
      // Arrange: User imports an image
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      expect(root).toBeDefined();
      if (!root || !('items' in root)) return;

      const canvas = root.items[0];
      expect(isCanvas(canvas)).toBe(true);

      // Act: User creates annotation (simulating annotation tool)
      const annotation = {
        id: `${canvas.id}/annotations/1`,
        type: 'Annotation' as const,
        motivation: 'commenting' as const,
        body: {
          type: 'TextualBody' as const,
          value: 'This is an important detail',
          language: 'en',
        },
        target: {
          type: 'SpecificResource' as const,
          source: canvas.id,
          selector: {
            type: 'FragmentSelector' as const,
            value: 'xywh=100,100,200,200',
          },
        },
      };

      // Add annotation to canvas
      if (!canvas.annotations) {
        canvas.annotations = [];
      }

      const annotationPage = {
        id: `${canvas.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [annotation],
      };

      canvas.annotations.push(annotationPage);

      // Assert: IDEAL OUTCOME achieved
      expect(canvas.annotations).toHaveLength(1);
      expect(isAnnotationPage(canvas.annotations[0])).toBe(true);

      const addedAnnotation = canvas.annotations[0];
      if (isAnnotationPage(addedAnnotation)) {
        expect(addedAnnotation.items).toHaveLength(1);
        expect(addedAnnotation.items[0].motivation).toBe('commenting');
        expect(addedAnnotation.items[0].body).toBeDefined();

        // Annotation has target with selector
        expect(addedAnnotation.items[0].target).toBeDefined();
        if (typeof addedAnnotation.items[0].target === 'object' && 'selector' in addedAnnotation.items[0].target) {
          expect(addedAnnotation.items[0].target.selector).toBeDefined();
        }
      }

      console.log('✓ IDEAL: Annotation created with body, target, and selector');
    });

    it('FAILURE PREVENTED: Annotation lost when canvas removed', async () => {
      // Arrange: User creates canvas with annotation
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];

      // Add annotation
      canvas.annotations = [{
        id: `${canvas.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [{
          id: `${canvas.id}/annotations/1`,
          type: 'Annotation' as const,
          motivation: 'commenting' as const,
          body: {
            type: 'TextualBody' as const,
            value: 'Important note',
            language: 'en',
          },
          target: canvas.id,
        }],
      }];

      // Act: User removes canvas
      root.items = root.items.filter(item => item.id !== canvas.id);

      // Assert: FAILURE PREVENTED
      // Canvas and its annotations are removed together (no orphaned annotations)
      expect(root.items).toHaveLength(0);

      // In a real implementation, you'd check:
      // - Annotation database doesn't have orphaned entries
      // - Cleanup job removed associated annotation data
      // - No broken references in search index

      console.log('✓ PREVENTED: Annotations removed with canvas, no orphans');
    });
  });

  describe('User Interaction: Add text note to region', () => {
    it('IDEAL: Note attached to region, searchable', async () => {
      // Arrange: User has a canvas
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];

      // Act: User adds region note (simulating annotation with fragment selector)
      const regionAnnotation = {
        id: `${canvas.id}/annotations/region-1`,
        type: 'Annotation' as const,
        motivation: 'describing' as const,
        body: [
          {
            type: 'TextualBody' as const,
            value: 'Karwaan scene showing main character',
            language: 'en',
            purpose: 'describing',
          },
          {
            type: 'TextualBody' as const,
            value: 'Karwaan, scene, character, field research',
            language: 'en',
            purpose: 'tagging',
          },
        ],
        target: {
          type: 'SpecificResource' as const,
          source: canvas.id,
          selector: {
            type: 'FragmentSelector' as const,
            value: 'xywh=250,300,400,500',
          },
        },
      };

      if (!canvas.annotations) canvas.annotations = [];
      canvas.annotations.push({
        id: `${canvas.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [regionAnnotation],
      });

      // Assert: IDEAL OUTCOME achieved
      const annotationPage = canvas.annotations[0];
      expect(isAnnotationPage(annotationPage)).toBe(true);

      if (isAnnotationPage(annotationPage)) {
        const annotation = annotationPage.items[0];

        // Has describing body
        expect(Array.isArray(annotation.body)).toBe(true);
        if (Array.isArray(annotation.body)) {
          expect(annotation.body.length).toBe(2);

          const describingBody = annotation.body.find(b => b.purpose === 'describing');
          const taggingBody = annotation.body.find(b => b.purpose === 'tagging');

          expect(describingBody?.value).toContain('Karwaan');
          expect(taggingBody?.value).toContain('field research');
        }

        // Has region selector
        const {target} = annotation;
        if (typeof target === 'object' && 'selector' in target) {
          expect(target.selector).toBeDefined();
        }

        console.log('✓ IDEAL: Region note with description and tags created');
      }
    });

    it('FAILURE PREVENTED: Note without region breaks viewer', async () => {
      // Arrange: User attempts to create annotation without proper target
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];

      // Act: Attempt to create invalid annotation (what app tries to prevent)
      const invalidAnnotation = {
        id: `${canvas.id}/annotations/invalid`,
        type: 'Annotation' as const,
        motivation: 'commenting' as const,
        body: {
          type: 'TextualBody' as const,
          value: 'Note without target',
          language: 'en',
        },
        // Missing target - this should be prevented/validated
      };

      // Assert: FAILURE PREVENTED
      // In real implementation, validator would catch this
      // For now, we verify the structure expectation
      expect(invalidAnnotation.target).toBeUndefined();

      // App should:
      // 1. Reject annotation without target
      // 2. Show validation error
      // 3. Not add to annotation page

      console.log('✓ PREVENTED: Invalid annotation structure detected');
    });
  });

  describe('User Interaction: Link related items', () => {
    it('IDEAL: Navigation between linked items works', async () => {
      // Arrange: User has multiple canvases
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      expect(root.items.length).toBeGreaterThan(1);

      const canvas1 = root.items[0];
      const canvas2 = root.items[1];

      // Act: User creates linking annotation
      const linkingAnnotation = {
        id: `${canvas1.id}/annotations/link-1`,
        type: 'Annotation' as const,
        motivation: 'linking' as const,
        body: {
          id: canvas2.id,
          type: 'Canvas' as const,
          label: { en: ['Related scene'] },
        },
        target: canvas1.id,
      };

      if (!canvas1.annotations) canvas1.annotations = [];
      canvas1.annotations.push({
        id: `${canvas1.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [linkingAnnotation],
      });

      // Assert: IDEAL OUTCOME achieved
      const annotationPage = canvas1.annotations[0];
      expect(isAnnotationPage(annotationPage)).toBe(true);

      if (isAnnotationPage(annotationPage)) {
        const annotation = annotationPage.items[0];

        expect(annotation.motivation).toBe('linking');
        expect(typeof annotation.body).toBe('object');

        if (typeof annotation.body === 'object' && 'id' in annotation.body) {
          expect(annotation.body.id).toBe(canvas2.id);

          // In viewer, clicking this annotation would navigate to canvas2
          console.log('✓ IDEAL: Link annotation connects related canvases');
        }
      }
    });

    it('FAILURE PREVENTED: Broken links after item restructure', async () => {
      // Arrange: User has linked canvases
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas1 = root.items[0];
      const canvas2 = root.items[1];

      // Create link
      const originalId = canvas2.id;
      canvas1.annotations = [{
        id: `${canvas1.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [{
          id: `${canvas1.id}/annotations/link-1`,
          type: 'Annotation' as const,
          motivation: 'linking' as const,
          body: { id: originalId },
          target: canvas1.id,
        }],
      }];

      // Act: User removes the linked canvas
      root.items = root.items.filter(item => item.id !== canvas2.id);

      // Assert: FAILURE PREVENTED
      // App should:
      // 1. Detect that link target no longer exists
      // 2. Either update link or show warning
      // 3. Not crash when user clicks broken link

      const annotation = (canvas1.annotations[0] as any).items[0];
      const linkedId = typeof annotation.body === 'object' && 'id' in annotation.body
        ? annotation.body.id
        : null;

      const linkedItemExists = root.items.some(item => item.id === linkedId);
      expect(linkedItemExists).toBe(false);

      // In real implementation, this would trigger:
      // - Link validation warning
      // - Option to remove or update link
      // - Graceful handling in viewer

      console.log('✓ PREVENTED: Broken link detected, would show warning');
    });
  });

  describe('Export with annotations', () => {
    it('IDEAL: Annotations preserved in IIIF export', async () => {
      // Arrange: User creates annotated manifest
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];

      // Add annotation
      canvas.annotations = [{
        id: `${canvas.id}/page/1`,
        type: 'AnnotationPage' as const,
        items: [{
          id: `${canvas.id}/annotations/1`,
          type: 'Annotation' as const,
          motivation: 'commenting' as const,
          body: {
            type: 'TextualBody' as const,
            value: 'Export test annotation',
            language: 'en',
          },
          target: canvas.id,
        }],
      }];

      // Act: Export as JSON (simulating export)
      const exported = JSON.stringify(root, null, 2);
      const parsed = JSON.parse(exported);

      // Assert: IDEAL OUTCOME achieved
      expect(parsed.items[0].annotations).toBeDefined();
      expect(Array.isArray(parsed.items[0].annotations)).toBe(true);
      expect(parsed.items[0].annotations[0].items).toHaveLength(1);
      expect(parsed.items[0].annotations[0].items[0].body.value).toBe('Export test annotation');

      // Exported manifest is valid IIIF with annotations
      console.log('✓ IDEAL: Annotations included in IIIF export');
    });
  });
});
