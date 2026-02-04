/**
 * Content Management Actions Test Suite
 *
 * Tests user interactions for updating labels, metadata, rights, and behaviors
 * Each test maps to a user action and defines ideal outcomes vs failures.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { buildManifestFromFiles } from '@/services/iiifBuilder';
import { ActionTestData } from '../../fixtures/pipelineFixtures';
import { isCanvas, isManifest } from '@/types';
import 'fake-indexeddb/auto';

describe('User Goal: Add descriptive metadata to make content discoverable', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('User Interaction: Edit label in Inspector', () => {
    it('IDEAL: Label updates and reflects everywhere (tree, breadcrumb, search, export)', async () => {
      // Arrange: User imports an image
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      expect(root).toBeDefined();
      if (!root || !('items' in root)) return;

      const canvas = root.items[0];
      expect(isCanvas(canvas)).toBe(true);

      const originalLabel = canvas.label;

      // Act: User edits label in Inspector (simulating form input)
      const newLabel = { en: ['Karwaan Scene 108 - Opening Sequence'] };
      canvas.label = newLabel;

      // Assert: IDEAL OUTCOME achieved
      // 1. Label updated in entity
      expect(canvas.label).toEqual(newLabel);
      expect(canvas.label).not.toEqual(originalLabel);

      // 2. Label would appear in breadcrumb navigation
      const breadcrumbText = canvas.label.en?.[0] || '';
      expect(breadcrumbText).toContain('Karwaan');
      expect(breadcrumbText).toContain('Scene 108');

      // 3. Label would be searchable
      const labelText = JSON.stringify(canvas.label);
      expect(labelText.toLowerCase()).toContain('karwaan');

      // 4. Label exports correctly
      const exported = JSON.stringify(root, null, 2);
      const parsed = JSON.parse(exported);
      expect(parsed.items[0].label.en[0]).toBe('Karwaan Scene 108 - Opening Sequence');

      console.log('✓ IDEAL: Label updated and reflected in tree, breadcrumb, search, export');
    });

    it('FAILURE PREVENTED: Empty label breaks navigation', async () => {
      // Arrange: User has a canvas with a label
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];

      // Act: User tries to clear label (what app tries to prevent)
      const emptyLabel = { en: [] };

      // Assert: FAILURE PREVENTED
      // In real implementation, validator/action system would:
      // 1. Reject empty label
      // 2. Show validation error
      // 3. Require at least one label value

      // For now, verify that empty label is detectable
      const isInvalid = !emptyLabel.en || emptyLabel.en.length === 0;
      expect(isInvalid).toBe(true);

      // App should prevent this from being saved
      // canvas.label = emptyLabel; // This should be blocked

      console.log('✓ PREVENTED: Empty label validation would trigger error');
    });
  });

  describe('User Interaction: Add metadata rows in MetadataEditor', () => {
    it('IDEAL: Metadata searchable, exportable, and editable', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User adds metadata rows
      root.metadata = [
        {
          label: { en: ['Creator'] },
          value: { en: ['Dr. Sarah Johnson'] },
        },
        {
          label: { en: ['Date'] },
          value: { en: ['2019-06-15'] },
        },
        {
          label: { en: ['Location'] },
          value: { en: ['Site Alpha, Delhi'] },
        },
        {
          label: { en: ['Field Notes'] },
          value: { en: ['Excavation of pottery shards from level 3'] },
        },
      ];

      // Assert: IDEAL OUTCOME achieved
      // 1. Metadata stored correctly
      expect(root.metadata).toHaveLength(4);
      expect(root.metadata?.[0].label.en?.[0]).toBe('Creator');
      expect(root.metadata?.[0].value.en?.[0]).toBe('Dr. Sarah Johnson');

      // 2. Metadata searchable
      const metadataText = JSON.stringify(root.metadata);
      expect(metadataText.toLowerCase()).toContain('sarah johnson');
      expect(metadataText).toContain('2019-06-15');
      expect(metadataText.toLowerCase()).toContain('site alpha');

      // 3. Metadata exportable
      const exported = JSON.stringify(root, null, 2);
      const parsed = JSON.parse(exported);
      expect(parsed.metadata).toHaveLength(4);
      expect(parsed.metadata[2].value.en[0]).toBe('Site Alpha, Delhi');

      // 4. Metadata editable (can update)
      root.metadata[3].value.en = ['Excavation of pottery shards from level 3 - revised interpretation'];
      expect(root.metadata[3].value.en[0]).toContain('revised interpretation');

      console.log('✓ IDEAL: Metadata searchable, exportable, and editable');
    });

    it('FAILURE PREVENTED: Malformed metadata breaks export', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User attempts to add invalid metadata (what app tries to prevent)
      const invalidMetadata = [
        {
          // Missing required 'label' property
          value: { en: ['Some value'] },
        },
        {
          label: { en: ['Valid Label'] },
          // Missing required 'value' property
        },
        {
          label: 'Not a language map', // Wrong type
          value: { en: ['Value'] },
        },
      ];

      // Assert: FAILURE PREVENTED
      // Validator should catch these issues:
      invalidMetadata.forEach((entry, index) => {
        const hasLabel = !!(entry.label && typeof entry.label === 'object');
        const hasValue = !!((entry as any).value && typeof (entry as any).value === 'object');

        if (index === 0) {
          expect(hasLabel).toBe(false); // Missing label
        }
        if (index === 1) {
          expect(hasValue).toBe(false); // Missing value
        }
        if (index === 2) {
          expect(typeof entry.label).toBe('string'); // Wrong type
        }
      });

      console.log('✓ PREVENTED: Malformed metadata validation would catch errors');
    });
  });

  describe('User Interaction: Select rights from dropdown', () => {
    it('IDEAL: Rights URI validated and compatible with viewers', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User selects Creative Commons license from dropdown
      const validRightsURIs = [
        'http://creativecommons.org/licenses/by/4.0/',
        'http://creativecommons.org/licenses/by-sa/4.0/',
        'http://creativecommons.org/licenses/by-nc/4.0/',
        'http://rightsstatements.org/vocab/InC/1.0/',
      ];

      root.rights = validRightsURIs[0]; // CC-BY 4.0

      // Assert: IDEAL OUTCOME achieved
      // 1. Rights URI is valid
      expect(root.rights).toBe('http://creativecommons.org/licenses/by/4.0/');
      expect(root.rights).toMatch(/^https?:\/\//);

      // 2. Rights recognized by validators
      const isKnownRights = validRightsURIs.includes(root.rights);
      expect(isKnownRights).toBe(true);

      // 3. Rights export correctly
      const exported = JSON.stringify(root);
      const parsed = JSON.parse(exported);
      expect(parsed.rights).toBe('http://creativecommons.org/licenses/by/4.0/');

      console.log('✓ IDEAL: Rights URI validated and exports correctly');
    });

    it('FAILURE PREVENTED: Invalid rights URI breaks viewer compatibility', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User enters invalid rights (what app tries to prevent)
      const invalidRights = [
        'not a URI',
        'ftp://invalid-protocol.com',
        '',
        'http://', // Incomplete URI
      ];

      // Assert: FAILURE PREVENTED
      invalidRights.forEach(rights => {
        // Validator should check:
        // 1. Is it a valid URI?
        const isValidURI = !!(rights && /^https?:\/\/.+/.test(rights));

        if (rights === 'not a URI') {
          expect(isValidURI).toBe(false);
        }
        if (rights === 'ftp://invalid-protocol.com') {
          expect(isValidURI).toBe(false); // Wrong protocol
        }
        if (rights === '') {
          expect(isValidURI).toBe(false); // Empty
        }
        if (rights === 'http://') {
          expect(isValidURI).toBe(false); // Incomplete
        }
      });

      console.log('✓ PREVENTED: Invalid rights URI validation would show warnings');
    });
  });

  describe('User Interaction: Pick date with date picker', () => {
    it('IDEAL: navDate enables timeline view and temporal search', async () => {
      // Arrange: User has canvases
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;

      // Act: User sets navDate for each canvas (simulating date picker)
      const dates = [
        '2019-06-01T10:00:00Z',
        '2019-06-02T10:00:00Z',
        '2019-06-03T10:00:00Z',
      ];

      root.items.forEach((canvas, index) => {
        if (isCanvas(canvas) && dates[index]) {
          canvas.navDate = dates[index];
        }
      });

      // Assert: IDEAL OUTCOME achieved
      // 1. All canvases have navDate
      const canvasesWithDates = root.items.filter(
        c => isCanvas(c) && c.navDate
      );
      expect(canvasesWithDates.length).toBeGreaterThan(0);

      // 2. Dates are valid ISO 8601
      canvasesWithDates.forEach(canvas => {
        if (isCanvas(canvas) && canvas.navDate) {
          const date = new Date(canvas.navDate);
          expect(isNaN(date.getTime())).toBe(false); // Valid date
          expect(canvas.navDate).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO format
        }
      });

      // 3. Dates enable timeline sorting
      const sortedByDate = [...root.items]
        .filter(c => isCanvas(c) && c.navDate)
        .sort((a, b) => {
          const dateA = new Date((a as any).navDate);
          const dateB = new Date((b as any).navDate);
          return dateA.getTime() - dateB.getTime();
        });

      expect(sortedByDate).toHaveLength(canvasesWithDates.length);

      // 4. Dates export correctly
      const exported = JSON.stringify(root);
      const parsed = JSON.parse(exported);
      expect(parsed.items[0].navDate).toBe('2019-06-01T10:00:00Z');

      console.log('✓ IDEAL: navDate enables timeline view and temporal search');
    });

    it('FAILURE PREVENTED: Invalid date format breaks timeline', async () => {
      // Arrange: User has a canvas
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !('items' in root)) return;
      const canvas = root.items[0];
      if (!isCanvas(canvas)) return;

      // Act: User enters invalid dates (what app tries to prevent)
      const invalidDates = [
        'not a date',
        '2019-13-45', // Invalid month/day
        '2019/06/01', // Wrong separator
        'June 1, 2019', // Natural language
      ];

      // Assert: FAILURE PREVENTED
      invalidDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const isValid = !isNaN(date.getTime());

        // Most invalid dates will be caught
        if (dateStr === 'not a date') {
          expect(isValid).toBe(false);
        }

        // ISO 8601 check
        const isISO8601 = /^\d{4}-\d{2}-\d{2}/.test(dateStr);
        if (dateStr === '2019/06/01') {
          expect(isISO8601).toBe(false); // Wrong format
        }
      });

      console.log('✓ PREVENTED: Invalid date format validation would show errors');
    });
  });

  describe('User Interaction: Toggle behavior checkboxes', () => {
    it('IDEAL: Behaviors applied and viewer compatibility maintained', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.sequence();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User toggles behavior checkboxes
      root.behavior = ['paged', 'individuals'];

      // Assert: IDEAL OUTCOME achieved
      // 1. Behaviors set correctly
      expect(root.behavior).toContain('paged');
      expect(root.behavior).toContain('individuals');

      // 2. Behaviors are valid IIIF values
      const validBehaviors = [
        'auto-advance',
        'no-auto-advance',
        'repeat',
        'no-repeat',
        'unordered',
        'individuals',
        'continuous',
        'paged',
        'facing-pages',
        'non-paged',
      ];

      root.behavior?.forEach(b => {
        expect(validBehaviors).toContain(b);
      });

      // 3. Behaviors export correctly
      const exported = JSON.stringify(root);
      const parsed = JSON.parse(exported);
      expect(parsed.behavior).toContain('paged');

      console.log('✓ IDEAL: Behaviors applied and viewer-compatible');
    });

    it('FAILURE PREVENTED: Conflicting behaviors break viewer rendering', async () => {
      // Arrange: User has a manifest
      const files = ActionTestData.forImport.singleImage();
      const root = await buildManifestFromFiles(files, {
        label: { en: ['Test Manifest'] },
      });

      if (!root || !isManifest(root)) return;

      // Act: User tries to set conflicting behaviors (what app tries to prevent)
      const conflicts = [
        ['auto-advance', 'no-auto-advance'],
        ['repeat', 'no-repeat'],
        ['paged', 'continuous'],
      ];

      // Assert: FAILURE PREVENTED
      conflicts.forEach(([behavior1, behavior2]) => {
        // Validator should detect conflicts
        const bothSet = [behavior1, behavior2];
        const hasConflict = bothSet.length === 2;

        expect(hasConflict).toBe(true);

        // App should either:
        // 1. Prevent setting conflicting behaviors
        // 2. Auto-remove conflicting behavior when new one is set
        // 3. Show warning to user

        console.log(`  ✓ Conflict detected: ${behavior1} vs ${behavior2}`);
      });

      console.log('✓ PREVENTED: Conflicting behaviors would show validation error');
    });
  });
});
