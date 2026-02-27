/**
 * Validation types — V6 discriminated union tests
 *
 * Verifies the ValidationIssue discriminated union:
 * - TreeValidationIssue (kind: 'tree') for structural/tree-level issues
 * - FieldValidationIssue (kind: 'field') for per-field inspector issues
 * - Exhaustive switch narrowing via `kind` discriminator
 */

import { describe, it, expect } from 'vitest';
import type {
  ValidationIssue,
  TreeValidationIssue,
  FieldValidationIssue,
  IssueSeverity,
  IssueCategory,
} from '@/src/shared/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTreeIssue(overrides: Partial<TreeValidationIssue> = {}): TreeValidationIssue {
  return {
    kind: 'tree',
    id: 'tree-1',
    severity: 'warning',
    category: 'Identity',
    itemId: 'canvas-1',
    itemLabel: 'Test Canvas',
    message: 'Missing label',
    fixable: false,
    ...overrides,
  };
}

function makeFieldIssue(overrides: Partial<FieldValidationIssue> = {}): FieldValidationIssue {
  return {
    kind: 'field',
    id: 'field-1',
    severity: 'error',
    category: 'Metadata',
    title: 'Invalid date format',
    description: 'Date must be ISO 8601',
    autoFixable: true,
    fixSuggestion: '2024-01-15',
    ...overrides,
  };
}

// ── Exhaustive switch helper ─────────────────────────────────────────────────

function describeIssue(issue: ValidationIssue): string {
  switch (issue.kind) {
    case 'tree':
      return `[tree] ${issue.itemLabel}: ${issue.message}`;
    case 'field':
      return `[field] ${issue.title}: ${issue.description}`;
    default: {
      const _exhaustive: never = issue;
      throw new Error(`Unknown issue kind: ${(_exhaustive as ValidationIssue).kind}`);
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ValidationIssue discriminated union (V6)', () => {
  describe('TreeValidationIssue', () => {
    it('has kind "tree" and all required tree-level fields', () => {
      const issue = makeTreeIssue();
      expect(issue.kind).toBe('tree');
      expect(issue.itemId).toBe('canvas-1');
      expect(issue.itemLabel).toBe('Test Canvas');
      expect(issue.message).toBe('Missing label');
      expect(issue.fixable).toBe(false);
    });

    it('uses severity (not level)', () => {
      const issue = makeTreeIssue({ severity: 'error' });
      expect(issue.severity).toBe('error');
      expect(issue).not.toHaveProperty('level');
    });

    it('supports all severity values', () => {
      const severities: IssueSeverity[] = ['error', 'warning', 'info'];
      for (const severity of severities) {
        const issue = makeTreeIssue({ severity });
        expect(issue.severity).toBe(severity);
      }
    });

    it('supports all category values', () => {
      const categories: IssueCategory[] = ['Identity', 'Structure', 'Metadata', 'Content'];
      for (const category of categories) {
        const issue = makeTreeIssue({ category });
        expect(issue.category).toBe(category);
      }
    });
  });

  describe('FieldValidationIssue', () => {
    it('has kind "field" and all required field-level fields', () => {
      const issue = makeFieldIssue();
      expect(issue.kind).toBe('field');
      expect(issue.title).toBe('Invalid date format');
      expect(issue.description).toBe('Date must be ISO 8601');
      expect(issue.autoFixable).toBe(true);
    });

    it('supports optional fixSuggestion and currentValue', () => {
      const issue = makeFieldIssue({
        fixSuggestion: 'use ISO 8601',
        currentValue: 'Jan 15 2024',
      });
      expect(issue.fixSuggestion).toBe('use ISO 8601');
      expect(issue.currentValue).toBe('Jan 15 2024');
    });

    it('supports optional field name', () => {
      const withField = makeFieldIssue({ field: 'metadata.date' });
      const withoutField = makeFieldIssue({ field: undefined });
      expect(withField.field).toBe('metadata.date');
      expect(withoutField.field).toBeUndefined();
    });
  });

  describe('discriminated union narrowing', () => {
    it('narrows to tree via kind discriminator', () => {
      const issue: ValidationIssue = makeTreeIssue();
      if (issue.kind === 'tree') {
        // TypeScript narrows to TreeValidationIssue — accessing tree-specific fields
        expect(issue.itemId).toBe('canvas-1');
        expect(issue.message).toBe('Missing label');
      } else {
        throw new Error('Expected tree issue');
      }
    });

    it('narrows to field via kind discriminator', () => {
      const issue: ValidationIssue = makeFieldIssue();
      if (issue.kind === 'field') {
        // TypeScript narrows to FieldValidationIssue — accessing field-specific fields
        expect(issue.title).toBe('Invalid date format');
        expect(issue.autoFixable).toBe(true);
      } else {
        throw new Error('Expected field issue');
      }
    });

    it('supports exhaustive switch', () => {
      const tree = makeTreeIssue({ itemLabel: 'Canvas A', message: 'No ID' });
      const field = makeFieldIssue({ title: 'Bad date', description: 'Fix it' });

      expect(describeIssue(tree)).toBe('[tree] Canvas A: No ID');
      expect(describeIssue(field)).toBe('[field] Bad date: Fix it');
    });

    it('handles mixed arrays with proper discrimination', () => {
      const mixed: ValidationIssue[] = [
        makeTreeIssue({ severity: 'error' }),
        makeFieldIssue({ severity: 'warning' }),
        makeTreeIssue({ severity: 'info' }),
      ];

      const treeIssues = mixed.filter((i): i is TreeValidationIssue => i.kind === 'tree');
      const fieldIssues = mixed.filter((i): i is FieldValidationIssue => i.kind === 'field');

      expect(treeIssues).toHaveLength(2);
      expect(fieldIssues).toHaveLength(1);
      // Type-narrowed access
      expect(treeIssues[0].itemId).toBe('canvas-1');
      expect(fieldIssues[0].title).toBe('Invalid date format');
    });
  });

  describe('shared base properties', () => {
    it('both variants share id and severity', () => {
      const tree: ValidationIssue = makeTreeIssue({ id: 'shared-1', severity: 'error' });
      const field: ValidationIssue = makeFieldIssue({ id: 'shared-2', severity: 'warning' });

      // Accessible without narrowing
      expect(tree.id).toBe('shared-1');
      expect(tree.severity).toBe('error');
      expect(field.id).toBe('shared-2');
      expect(field.severity).toBe('warning');
    });

    it('category is optional on both variants', () => {
      const tree = makeTreeIssue({ category: undefined });
      const field = makeFieldIssue({ category: undefined });

      expect(tree.category).toBeUndefined();
      expect(field.category).toBeUndefined();
    });
  });

  describe('adversarial cases', () => {
    it('empty string fields are valid', () => {
      const issue = makeTreeIssue({ itemId: '', itemLabel: '', message: '' });
      expect(issue.itemId).toBe('');
      expect(issue.itemLabel).toBe('');
      expect(issue.message).toBe('');
    });

    it('currentValue can hold complex objects', () => {
      const complex = { nested: [1, 2, { deep: true }] };
      const issue = makeFieldIssue({ currentValue: complex });
      expect(issue.currentValue).toEqual(complex);
    });
  });
});
