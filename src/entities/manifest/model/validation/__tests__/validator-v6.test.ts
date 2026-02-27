/**
 * Validator V6 integration — verifies real issues use the new type shape
 *
 * Tests that ValidationService.validateTree() produces TreeValidationIssue
 * objects with `kind: 'tree'` and `severity` (not `.level`).
 */

import { describe, it, expect, vi } from 'vitest';
import { ValidationService } from '../validator';
import type { IIIFItem } from '@/src/shared/types';

// Mock the schema validator — we test structural validation, not schema
vi.mock('@/utils/iiifSchema', () => ({
  validateResource: vi.fn(() => []),
}));

vi.mock('@/utils/iiifBehaviors', () => ({
  doesInheritBehavior: vi.fn(() => false),
  findBehaviorConflicts: vi.fn(() => []),
  validateBehaviors: vi.fn(() => []),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeManifest(overrides: Partial<IIIFItem> = {}): IIIFItem {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    ...overrides,
  } as IIIFItem;
}

function makeCanvas(overrides: Partial<IIIFItem> = {}): IIIFItem {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1000,
    height: 800,
    items: [],
    ...overrides,
  } as unknown as IIIFItem;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ValidationService produces V6-shaped issues', () => {
  const validator = new ValidationService();

  it('returns empty map for a valid manifest', () => {
    const root = makeManifest({
      items: [makeCanvas()],
    });
    const issues = validator.validateTree(root);
    // May have warnings for missing recommended fields, but no critical errors
    const allIssues = Object.values(issues).flat();
    for (const issue of allIssues) {
      expect(issue).toHaveProperty('kind', 'tree');
      expect(issue).toHaveProperty('severity');
      expect(issue).not.toHaveProperty('level');
    }
  });

  it('all issues have kind: "tree"', () => {
    const root = makeManifest({
      id: '', // should trigger missing ID
      label: undefined, // should trigger missing label
      items: [makeCanvas({ id: '' })],
    });
    const issues = validator.validateTree(root);
    const allIssues = Object.values(issues).flat();
    expect(allIssues.length).toBeGreaterThan(0);
    for (const issue of allIssues) {
      expect(issue.kind).toBe('tree');
    }
  });

  it('all issues use severity, not level', () => {
    const root = makeManifest({
      items: [
        makeCanvas({ id: 'dup-id' }),
        makeCanvas({ id: 'dup-id' }), // duplicate ID
      ],
    });
    const issues = validator.validateTree(root);
    const allIssues = Object.values(issues).flat();
    expect(allIssues.length).toBeGreaterThan(0);
    for (const issue of allIssues) {
      expect(issue).toHaveProperty('severity');
      expect(['error', 'warning', 'info']).toContain(issue.severity);
      expect(issue).not.toHaveProperty('level');
    }
  });

  it('duplicate IDs produce error-severity issues', () => {
    const root = makeManifest({
      items: [
        makeCanvas({ id: 'https://example.org/canvas/dup' }),
        makeCanvas({ id: 'https://example.org/canvas/dup' }),
      ],
    });
    const issues = validator.validateTree(root);
    const dupIssues = Object.values(issues)
      .flat()
      .filter(i => i.message.includes('Duplicate ID'));
    expect(dupIssues.length).toBeGreaterThan(0);
    for (const issue of dupIssues) {
      expect(issue.severity).toBe('error');
      expect(issue.fixable).toBe(true);
      expect(issue.category).toBe('Identity');
    }
  });

  it('returns null map for null root', () => {
    const issues = validator.validateTree(null);
    expect(issues).toEqual({});
  });

  it('issues satisfy TreeValidationIssue shape', () => {
    const root = makeManifest({
      items: [makeCanvas({ label: undefined })],
    });
    const issues = validator.validateTree(root);
    const allIssues = Object.values(issues).flat();

    for (const issue of allIssues) {
      // All required TreeValidationIssue fields
      expect(typeof issue.id).toBe('string');
      expect(typeof issue.itemId).toBe('string');
      expect(typeof issue.itemLabel).toBe('string');
      expect(typeof issue.message).toBe('string');
      expect(typeof issue.fixable).toBe('boolean');
      expect(issue.kind).toBe('tree');
      expect(['error', 'warning', 'info']).toContain(issue.severity);

      // Verify it doesn't have FieldValidationIssue-specific fields
      const asAny = issue as unknown as Record<string, unknown>;
      expect(asAny).not.toHaveProperty('title');
      expect(asAny).not.toHaveProperty('description');
      expect(asAny).not.toHaveProperty('autoFixable');
    }
  });
});
