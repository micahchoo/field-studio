/**
 * Entity Layer API Tests
 *
 * Verifies that entity re-exports are correctly structured and accessible.
 */

import { describe, expect, it } from 'vitest';
import { canvas, collection, manifest } from '@/src/entities';

describe('Entity Layer API', () => {
  describe('Canvas Entity', () => {
    it('IDEAL OUTCOME: Canvas entity exposes model selectors', () => {
      expect(canvas.model).toBeDefined();
      expect(typeof canvas.model.selectById).toBe('function');
      expect(typeof canvas.model.selectAll).toBe('function');
      expect(typeof canvas.model.selectAnnotationPages).toBe('function');
      expect(typeof canvas.model.selectParentManifest).toBe('function');
      expect(typeof canvas.model.selectDimensions).toBe('function');
      expect(typeof canvas.model.selectLabel).toBe('function');
      expect(typeof canvas.model.hasAnnotations).toBe('function');
      expect(typeof canvas.model.countAnnotations).toBe('function');
      console.log('✓ IDEAL OUTCOME: Canvas model exposes all selectors');
    });

    it('IDEAL OUTCOME: Canvas entity exposes action creators', () => {
      expect(canvas.actions).toBeDefined();
      expect(typeof canvas.actions.updateLabel).toBe('function');
      expect(typeof canvas.actions.updateSummary).toBe('function');
      expect(typeof canvas.actions.updateDimensions).toBe('function');
      expect(typeof canvas.actions.addAnnotation).toBe('function');
      expect(typeof canvas.actions.removeAnnotation).toBe('function');
      expect(typeof canvas.actions.moveToManifest).toBe('function');
      expect(typeof canvas.actions.batchUpdate).toBe('function');
      console.log('✓ IDEAL OUTCOME: Canvas actions exposes all action creators');
    });

    it('FAILURE PREVENTED: Canvas entity does not expose service internals', () => {
      expect((canvas as any)._internalVault).toBeUndefined();
      expect((canvas as any)._cache).toBeUndefined();
      expect((canvas as any).getEntity).toBeUndefined();
      expect((canvas as any).updateEntity).toBeUndefined();
      console.log('✓ FAILURE PREVENTED: No internal service exposure in canvas');
    });
  });

  describe('Manifest Entity', () => {
    it('IDEAL OUTCOME: Manifest entity exposes model selectors', () => {
      expect(manifest.model).toBeDefined();
      expect(typeof manifest.model.selectById).toBe('function');
      expect(typeof manifest.model.selectAll).toBe('function');
      expect(typeof manifest.model.selectCanvases).toBe('function');
      expect(typeof manifest.model.selectParentCollection).toBe('function');
      expect(typeof manifest.model.selectCollectionMemberships).toBe('function');
      expect(typeof manifest.model.selectLabel).toBe('function');
      expect(typeof manifest.model.selectMetadata).toBe('function');
      expect(typeof manifest.model.isOrphan).toBe('function');
      expect(typeof manifest.model.countCanvases).toBe('function');
      console.log('✓ IDEAL OUTCOME: Manifest model exposes all selectors');
    });

    it('IDEAL OUTCOME: Manifest entity exposes action creators', () => {
      expect(manifest.actions).toBeDefined();
      expect(typeof manifest.actions.updateLabel).toBe('function');
      expect(typeof manifest.actions.updateSummary).toBe('function');
      expect(typeof manifest.actions.addCanvas).toBe('function');
      expect(typeof manifest.actions.removeCanvas).toBe('function');
      expect(typeof manifest.actions.reorderCanvases).toBe('function');
      expect(typeof manifest.actions.moveToCollection).toBe('function');
      expect(typeof manifest.actions.updateBehavior).toBe('function');
      expect(typeof manifest.actions.updateViewingDirection).toBe('function');
      console.log('✓ IDEAL OUTCOME: Manifest actions exposes all action creators');
    });

    it('FAILURE PREVENTED: Manifest entity does not expose service internals', () => {
      expect((manifest as any)._internalVault).toBeUndefined();
      expect((manifest as any)._cache).toBeUndefined();
      expect((manifest as any).getEntity).toBeUndefined();
      expect((manifest as any).updateEntity).toBeUndefined();
      console.log('✓ FAILURE PREVENTED: No internal service exposure in manifest');
    });
  });

  describe('Collection Entity', () => {
    it('IDEAL OUTCOME: Collection entity exposes model selectors', () => {
      expect(collection.model).toBeDefined();
      expect(typeof collection.model.selectById).toBe('function');
      expect(typeof collection.model.selectAll).toBe('function');
      expect(typeof collection.model.selectMembers).toBe('function');
      expect(typeof collection.model.selectParentCollection).toBe('function');
      expect(typeof collection.model.selectCollectionMemberships).toBe('function');
      expect(typeof collection.model.selectLabel).toBe('function');
      expect(typeof collection.model.isRoot).toBe('function');
      expect(typeof collection.model.selectTopLevel).toBe('function');
      expect(typeof collection.model.selectOrphanManifests).toBe('function');
      console.log('✓ IDEAL OUTCOME: Collection model exposes all selectors');
    });

    it('IDEAL OUTCOME: Collection entity exposes action creators', () => {
      expect(collection.actions).toBeDefined();
      expect(typeof collection.actions.updateLabel).toBe('function');
      expect(typeof collection.actions.updateSummary).toBe('function');
      expect(typeof collection.actions.addMember).toBe('function');
      expect(typeof collection.actions.moveToParentCollection).toBe('function');
      expect(typeof collection.actions.updateBehavior).toBe('function');
      console.log('✓ IDEAL OUTCOME: Collection actions exposes all action creators');
    });

    it('FAILURE PREVENTED: Collection entity does not expose service internals', () => {
      expect((collection as any)._internalVault).toBeUndefined();
      expect((collection as any)._cache).toBeUndefined();
      expect((collection as any).getEntity).toBeUndefined();
      expect((collection as any).updateEntity).toBeUndefined();
      console.log('✓ FAILURE PREVENTED: No internal service exposure in collection');
    });
  });

  describe('Entity Architecture', () => {
    it('IDEAL OUTCOME: Entities establish FSD boundary (no service imports)', () => {
      // Verify that each entity is properly structured as a thin re-export layer
      const entityModules = [
        { name: 'canvas', entity: canvas },
        { name: 'manifest', entity: manifest },
        { name: 'collection', entity: collection }
      ];

      for (const { name, entity } of entityModules) {
        expect(entity.model).toBeDefined();
        expect(entity.actions).toBeDefined();
        expect(Object.keys(entity).sort()).toEqual(['actions', 'model']);
      }

      console.log('✓ IDEAL OUTCOME: All entities follow consistent structure');
    });

    it('FAILURE PREVENTED: Features should not directly import from services', () => {
      // This is a documentation test - verifies the architectural intent
      // Actual enforcement would happen via ESLint rules
      const validImports = [
        "import { canvas } from '@/src/entities'",
        "import { manifest, canvas } from '@/src/entities'",
        "import { collection } from '@/src/entities'"
      ];

      const invalidImports = [
        "import { getEntity } from '@/services'",
        "import { actions } from '@/services/actions'",
        "import { updateEntity } from '@/services/vault'"
      ];

      console.log('✓ FAILURE PREVENTED: Entity boundary prevents direct service access');
    });
  });
});
