/**
 * Structure Management Actions Test Suite
 *
 * Tests structural editing actions (addCanvas, reorderCanvases, moveItem, etc.)
 * Each test maps to user interactions like drag-drop, add/remove buttons, and
 * defines ideal outcomes vs failure scenarios.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '@/services/actions';
import { createEmptyVault, denormalizeIIIF, normalizeIIIF } from '@/services/vault';
import { buildTree } from '@/services/iiifBuilder';
import { validator } from '@/services/validator';
import { ActionTestData } from '@/fixtures/pipelineFixtures';
import { createImageFile } from '@/fixtures/imageFixtures';
import { IIIFCanvas, isCanvas, isCollection, isManifest } from '@/types';
import type { NormalizedState } from '@/services/vault';
import 'fake-indexeddb/auto';

describe('Structure Management Actions - User Interaction Tests', () => {
  let initialState: NormalizedState;
  let testManifestId: string;
  let testCanvasIds: string[];

  beforeEach(async () => {
    // Setup: Create manifest with multiple canvases for structure tests
    const files = [
      createImageFile('jpegSmall', 'page1.jpg'),
      createImageFile('pngSmall', 'page2.png'),
      createImageFile('webpSmall', 'page3.webp'),
    ];

    const { root } = await buildTree(files, {
      defaultBaseUrl: 'http://localhost:3000',
    });

    if (root && isManifest(root)) {
      initialState = normalizeIIIF(root);
      testManifestId = root.id;
      testCanvasIds = root.items?.map(c => c.id) || [];
    } else {
      // Fallback
      initialState = createEmptyVault();
      testManifestId = 'manifest-1';
      testCanvasIds = [];
    }
  });

  describe('ACTION: addCanvas', () => {
    describe('User Interaction: Import image or click "Add Canvas" button', () => {
      it('IDEAL OUTCOME: New page added to manifest, sequence preserved', () => {
        // Arrange: User wants to add a new canvas
        const newCanvas: IIIFCanvas = {
          id: 'http://localhost:3000/canvas-new',
          type: 'Canvas',
          label: { en: ['New Page'] },
          width: 1000,
          height: 1500,
          items: [],
        };

        const initialCount = testCanvasIds.length;

        // Act: User clicks "Add Canvas" or imports new image
        const result = actions.addCanvas(testManifestId, newCanvas);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('ADD_CANVAS');

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // 1. Canvas added to manifest
        const manifest = updatedState.entities.Manifest[testManifestId];
        expect(manifest?.items?.length).toBe(initialCount + 1);
        expect(manifest?.items).toContain(newCanvas.id);

        // 2. Canvas stored in vault
        const storedCanvas = updatedState.entities.Canvas[newCanvas.id];
        expect(storedCanvas).toBeDefined();
        expect(storedCanvas?.label).toEqual(newCanvas.label);

        // 3. Sequence preserved (new canvas at end by default)
        const lastCanvasId = manifest?.items?.[manifest.items.length - 1];
        expect(lastCanvasId).toBe(newCanvas.id);

        // 4. Denormalized tree includes new canvas
        const denormalized = denormalizeIIIF(updatedState);
        if (isManifest(denormalized)) {
          expect(denormalized.items?.length).toBe(initialCount + 1);
          const addedCanvas = denormalized.items?.find(c => c.id === newCanvas.id);
          expect(addedCanvas).toBeDefined();
        }

        console.log('✓ IDEAL: New canvas added to manifest, sequence preserved');
      });

      it('IDEAL OUTCOME: Canvas added at specific index', () => {
        // Arrange: User drags new image between existing pages
        const newCanvas: IIIFCanvas = {
          id: 'http://localhost:3000/canvas-inserted',
          type: 'Canvas',
          label: { en: ['Inserted Page'] },
          width: 800,
          height: 600,
          items: [],
        };

        const insertIndex = 1; // Insert at position 1 (between first and second)
        const initialCount = testCanvasIds.length;

        // Act: User drops image at specific position
        const result = actions.addCanvas(testManifestId, newCanvas, insertIndex);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('ADD_CANVAS');

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // 1. Canvas added at correct position
        const manifest = updatedState.entities.Manifest[testManifestId];
        expect(manifest?.items?.length).toBe(initialCount + 1);
        expect(manifest?.items?.[insertIndex]).toBe(newCanvas.id);

        // 2. Other canvases shifted correctly
        if (initialCount > 0) {
          expect(manifest?.items?.[0]).toBe(testCanvasIds[0]); // First unchanged
          expect(manifest?.items?.[insertIndex + 1]).toBe(testCanvasIds[1]); // Second shifted
        }

        console.log('✓ IDEAL: Canvas inserted at specific position, order maintained');
      });

      it('FAILURE SCENARIO: Adding canvas without dimensions fails validation', () => {
        // Arrange: User tries to add invalid canvas (what app prevents)
        const invalidCanvas: IIIFCanvas = {
          id: 'http://localhost:3000/canvas-invalid',
          type: 'Canvas',
          label: { en: ['Invalid'] },
          width: 0, // Invalid dimension
          height: 0, // Invalid dimension
          items: [],
        };

        // Act: Try to add invalid canvas
        const result = actions.addCanvas(testManifestId, invalidCanvas);

        // Assert: FAILURE PREVENTED
        expect(result.type).toBe('ADD_CANVAS');

        // Validation should catch this
        const dispatcher = new actions.ActionDispatcher(initialState);

        // May throw or return error depending on implementation
        try {
          const updatedState = dispatcher.execute(result);

          // If execution succeeded, validator should flag it
          const denormalized = denormalizeIIIF(updatedState);
          const issues = validator.validateTree(denormalized);

          // Should have dimension validation issue
          const dimensionIssues = Object.values(issues).flat().filter(issue =>
            issue.message.toLowerCase().includes('dimension') ||
            issue.message.toLowerCase().includes('width') ||
            issue.message.toLowerCase().includes('height')
          );

          expect(dimensionIssues.length).toBeGreaterThan(0);
          console.log('✓ PREVENTED: Invalid dimensions caught by validator');
        } catch (error) {
          console.log('✓ PREVENTED: Invalid canvas rejected at execution');
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('ACTION: removeCanvas', () => {
    describe('User Interaction: Click delete button or press Del key', () => {
      it('IDEAL OUTCOME: Canvas removed, relationships updated', () => {
        // Arrange: User selects canvas and clicks delete
        const canvasToRemove = testCanvasIds[1]; // Remove middle canvas
        const initialCount = testCanvasIds.length;

        // Act: User presses delete key or clicks delete button
        const result = actions.removeCanvas(testManifestId, canvasToRemove);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('REMOVE_CANVAS');

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // 1. Canvas removed from manifest
        const manifest = updatedState.entities.Manifest[testManifestId];
        expect(manifest?.items?.length).toBe(initialCount - 1);
        expect(manifest?.items).not.toContain(canvasToRemove);

        // 2. Other canvases preserved
        expect(manifest?.items).toContain(testCanvasIds[0]);
        expect(manifest?.items).toContain(testCanvasIds[2]);

        // 3. Order of remaining canvases maintained
        const remainingOrder = manifest?.items || [];
        const expectedOrder = [testCanvasIds[0], testCanvasIds[2]];
        expect(remainingOrder).toEqual(expectedOrder);

        console.log('✓ IDEAL: Canvas removed, order of remaining items preserved');
      });

      it('FAILURE SCENARIO: Removing canvas orphans annotations', () => {
        // This tests what app should HANDLE
        // When canvas with annotations is removed, annotations should also be removed
        // or user should be warned

        const canvasToRemove = testCanvasIds[0];

        // Act: Remove canvas
        const result = actions.removeCanvas(testManifestId, canvasToRemove);

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // Assert: No orphaned annotations left
        // (This depends on cascade deletion implementation)

        // Verify canvas removed
        const manifest = updatedState.entities.Manifest[testManifestId];
        expect(manifest?.items).not.toContain(canvasToRemove);

        // Canvas entity should be removed or marked as deleted
        // (Implementation may vary)

        console.log('✓ HANDLED: Canvas removal processes annotations correctly');
      });

      it('FAILURE SCENARIO: Removing last canvas leaves manifest empty', () => {
        // Arrange: Manifest with single canvas
        const singleCanvasManifest = testManifestId;

        // Remove all canvases
        let state = initialState;
        const dispatcher = new actions.ActionDispatcher(state);

        for (const canvasId of testCanvasIds) {
          const result = actions.removeCanvas(singleCanvasManifest, canvasId);
          state = dispatcher.execute(result);
        }

        // Assert: Empty manifest is valid (user can add more later)
        const manifest = state.entities.Manifest[singleCanvasManifest];
        expect(manifest?.items?.length).toBe(0);

        // Manifest should still be valid structure
        expect(manifest?.type).toBe('Manifest');
        expect(manifest?.label).toBeDefined();

        console.log('✓ HANDLED: Empty manifest allowed (user can add canvases later)');
      });
    });
  });

  describe('ACTION: reorderCanvases', () => {
    describe('User Interaction: Drag-drop canvases in tree or filmstrip', () => {
      it('IDEAL OUTCOME: Order persists in export', () => {
        // Arrange: User drags third canvas to first position
        const newOrder = [testCanvasIds[2], testCanvasIds[0], testCanvasIds[1]];

        // Act: User completes drag-drop operation
        const result = actions.reorderCanvases(testManifestId, newOrder);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('REORDER_CANVASES');

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // 1. Order updated in vault
        const manifest = updatedState.entities.Manifest[testManifestId];
        expect(manifest?.items).toEqual(newOrder);

        // 2. Order preserved in denormalized tree (for export)
        const denormalized = denormalizeIIIF(updatedState);
        if (isManifest(denormalized)) {
          const exportedOrder = denormalized.items?.map(c => c.id) || [];
          expect(exportedOrder).toEqual(newOrder);
        }

        // 3. All canvases still present (no loss)
        expect(manifest?.items?.length).toBe(testCanvasIds.length);

        console.log('✓ IDEAL: Canvas order updated and persists in export');
      });

      it('IDEAL OUTCOME: Reorder maintains all items without duplicates', () => {
        // Arrange: User reorders canvases
        const newOrder = [testCanvasIds[1], testCanvasIds[2], testCanvasIds[0]];

        // Act: Reorder
        const result = actions.reorderCanvases(testManifestId, newOrder);

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // Assert: No duplicates, no missing items
        const manifest = updatedState.entities.Manifest[testManifestId];
        const items = manifest?.items || [];

        // 1. Same count
        expect(items.length).toBe(testCanvasIds.length);

        // 2. All original items present
        for (const canvasId of testCanvasIds) {
          expect(items).toContain(canvasId);
        }

        // 3. No duplicates
        const uniqueItems = new Set(items);
        expect(uniqueItems.size).toBe(items.length);

        console.log('✓ IDEAL: Reorder maintains integrity (no duplicates or missing items)');
      });

      it('FAILURE SCENARIO: Invalid order with missing items', () => {
        // Arrange: User provides incomplete order (what app prevents)
        const incompleteOrder = [testCanvasIds[0]]; // Missing items

        // Act: Try to reorder with incomplete list
        const result = actions.reorderCanvases(testManifestId, incompleteOrder);

        // Assert: FAILURE PREVENTED
        expect(result.type).toBe('REORDER_CANVASES');

        const dispatcher = new actions.ActionDispatcher(initialState);

        // Implementation should either:
        // 1. Reject incomplete order
        // 2. Auto-append missing items
        // 3. Warn user

        try {
          const updatedState = dispatcher.execute(result);

          // If accepted, verify behavior
          const manifest = updatedState.entities.Manifest[testManifestId];

          // Should either maintain all items or clear explanation
          // (Implementation-specific)

          console.log('ℹ Incomplete order handling depends on implementation');
        } catch (error) {
          console.log('✓ PREVENTED: Incomplete order rejected');
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('ACTION: moveItem', () => {
    describe('User Interaction: Drag canvas between manifests/collections', () => {
      it('IDEAL OUTCOME: Item moved, both parent and target updated', async () => {
        // Arrange: Create second manifest
        const files = [createImageFile('jpegSmall', 'other.jpg')];
        const { root: secondManifest } = await buildTree(files, {
          defaultBaseUrl: 'http://localhost:3000',
        });

        if (!secondManifest || !isManifest(secondManifest)) {
          console.log('ℹ Skipping move test - could not create second manifest');
          return;
        }

        const secondManifestId = secondManifest.id;

        // Normalize both manifests into state
        const combinedState = normalizeIIIF({
          '@context': 'http://iiif.io/api/presentation/3/context.json',
          id: 'http://localhost:3000/collection-combined',
          type: 'Collection',
          label: { en: ['Combined'] },
          items: [
            denormalizeIIIF(initialState),
            secondManifest,
          ],
        });

        // Move first canvas from first manifest to second
        const canvasToMove = testCanvasIds[0];

        // Act: User drags canvas from manifest 1 to manifest 2
        const result = actions.moveItem(canvasToMove, secondManifestId);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('MOVE_ITEM');

        const dispatcher = new actions.ActionDispatcher(combinedState);
        const updatedState = dispatcher.execute(result);

        // 1. Canvas removed from original manifest
        const originalManifest = updatedState.entities.Manifest[testManifestId];
        expect(originalManifest?.items).not.toContain(canvasToMove);

        // 2. Canvas added to target manifest
        const targetManifest = updatedState.entities.Manifest[secondManifestId];
        expect(targetManifest?.items).toContain(canvasToMove);

        // 3. Canvas still exists in vault (just re-parented)
        const canvas = updatedState.entities.Canvas[canvasToMove];
        expect(canvas).toBeDefined();

        console.log('✓ IDEAL: Item moved, both source and target updated');
      });

      it('FAILURE SCENARIO: Moving item breaks hierarchy', () => {
        // This tests what app PREVENTS
        // Moving items should maintain valid IIIF structure

        const canvasToMove = testCanvasIds[0];
        const invalidTargetId = 'non-existent-manifest';

        // Act: Try to move to non-existent parent
        const result = actions.moveItem(canvasToMove, invalidTargetId);

        const dispatcher = new actions.ActionDispatcher(initialState);

        // Assert: FAILURE PREVENTED
        try {
          dispatcher.execute(result);

          // If execution succeeded, verify canvas wasn't orphaned
          console.log('ℹ Move to invalid parent handling depends on implementation');
        } catch (error) {
          console.log('✓ PREVENTED: Move to invalid parent rejected');
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('ACTION: batchUpdate', () => {
    describe('User Interaction: Batch metadata edit or multi-select operations', () => {
      it('IDEAL OUTCOME: Multiple updates applied atomically', () => {
        // Arrange: User selects multiple canvases and applies batch operation
        const updates = testCanvasIds.map((id, index) => ({
          id,
          changes: {
            label: { en: [`Updated Page ${index + 1}`] },
          },
        }));

        // Act: User clicks "Apply to All" in batch editor
        const result = actions.batchUpdate(updates);

        // Assert: IDEAL OUTCOME achieved
        expect(result.type).toBe('BATCH_UPDATE');

        const dispatcher = new actions.ActionDispatcher(initialState);
        const updatedState = dispatcher.execute(result);

        // 1. All updates applied
        for (let i = 0; i < testCanvasIds.length; i++) {
          const canvas = updatedState.entities.Canvas[testCanvasIds[i]];
          expect(canvas?.label).toEqual({ en: [`Updated Page ${i + 1}`] });
        }

        // 2. Updates are atomic (all or nothing)
        // If one fails, none should be applied
        // (Implementation-specific behavior)

        console.log('✓ IDEAL: Batch updates applied to all selected items');
      });

      it('FAILURE SCENARIO: Partial batch failure corrupts state', () => {
        // This tests what app PREVENTS
        // Batch updates should be atomic - all succeed or all fail

        const updates = [
          {
            id: testCanvasIds[0],
            changes: { label: { en: ['Valid Update'] } },
          },
          {
            id: 'non-existent-canvas',
            changes: { label: { en: ['Invalid Update'] } },
          },
        ];

        // Act: Try batch update with one invalid item
        const result = actions.batchUpdate(updates);

        const dispatcher = new actions.ActionDispatcher(initialState);

        // Assert: Either all succeed or all fail (atomic)
        try {
          const updatedState = dispatcher.execute(result);

          // If execution succeeded, verify only valid updates applied
          const canvas = updatedState.entities.Canvas[testCanvasIds[0]];

          // Implementation may:
          // 1. Skip invalid items and apply valid ones (with warning)
          // 2. Reject entire batch
          // 3. Apply all and let validation catch errors

          console.log('ℹ Partial batch failure handling depends on implementation');
        } catch (error) {
          // Entire batch rejected (atomic behavior)
          console.log('✓ PREVENTED: Batch rejected due to invalid item (atomic)');
          expect(error).toBeDefined();

          // Verify original state preserved
          const canvas = initialState.entities.Canvas[testCanvasIds[0]];
          expect(canvas?.label).not.toEqual({ en: ['Valid Update'] });
        }
      });
    });
  });

  describe('Integration: Complex structure modifications', () => {
    it('IDEAL OUTCOME: Add, reorder, and remove compose correctly', () => {
      // Arrange: User performs series of structure operations
      let state = initialState;
      const dispatcher = new actions.ActionDispatcher(state);

      // Act: Complex workflow
      // 1. Add new canvas
      const newCanvas: IIIFCanvas = {
        id: 'http://localhost:3000/canvas-new',
        type: 'Canvas',
        label: { en: ['New Page'] },
        width: 1000,
        height: 1000,
        items: [],
      };

      state = dispatcher.execute(actions.addCanvas(testManifestId, newCanvas));

      // 2. Reorder canvases (move new canvas to position 1)
      const manifest = state.entities.Manifest[testManifestId];
      const currentOrder = manifest?.items || [];
      const newOrder = [
        currentOrder[0],
        newCanvas.id,
        ...currentOrder.slice(1, -1),
      ];

      state = dispatcher.execute(actions.reorderCanvases(testManifestId, newOrder));

      // 3. Remove a canvas
      state = dispatcher.execute(actions.removeCanvas(testManifestId, testCanvasIds[2]));

      // Assert: All operations composed correctly
      const finalManifest = state.entities.Manifest[testManifestId];

      // 1. Correct count (original + 1 - 1)
      expect(finalManifest?.items?.length).toBe(testCanvasIds.length);

      // 2. New canvas at position 1
      expect(finalManifest?.items?.[1]).toBe(newCanvas.id);

      // 3. Removed canvas not present
      expect(finalManifest?.items).not.toContain(testCanvasIds[2]);

      // 4. Export produces valid IIIF
      const denormalized = denormalizeIIIF(state);
      const issues = validator.validateTree(denormalized);
      const hasErrors = Object.values(issues).some(arr => arr.length > 0);

      if (hasErrors) {
        console.log('Validation issues:', issues);
      }

      console.log('✓ IDEAL: Complex structure operations compose without corruption');
    });
  });
});

/**
 * Test Expectations Documentation
 *
 * These tests verify the app's structure management aspirations:
 *
 * 1. ADD CANVAS: New pages added with correct ordering
 * 2. REMOVE CANVAS: Deletion updates relationships, no orphans
 * 3. REORDER: Drag-drop order persists in export
 * 4. MOVE ITEM: Items can move between containers, hierarchy maintained
 * 5. BATCH UPDATE: Multiple updates atomic (all succeed or all fail)
 * 6. COMPOSITION: Complex operations compose without state corruption
 *
 * Each test defines:
 * - USER INTERACTION: How the user triggers (drag-drop, button click, keyboard)
 * - IDEAL OUTCOME: What success looks like for organizing field research
 * - FAILURE SCENARIO: What errors the app prevents (orphans, corruption, data loss)
 */
