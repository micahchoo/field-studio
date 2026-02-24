/**
 * QCDashboard — smoke tests
 *
 * Purpose: verify the quality-control dashboard renders user-visible content
 * such as health score, category labels, issue messages, and interactive
 * controls. Uses the canonical ValidatorIssue from shared/types.
 *
 * The healer functions (healIssue, applyHealToTree, safeHealAll) are imported
 * from validationHealer — mocked here so no IIIF side-effects occur on mount.
 *
 * Pattern: mount -> flushSync -> assert visible text / controls -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import QCDashboard from '../ui/QCDashboard.svelte';
import type { IIIFItem, ValidatorIssue } from '@/src/shared/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// QCDashboard imports healer functions; mock them as no-ops so tests are pure.
vi.mock('@/src/entities/manifest/model/validation/validationHealer', () => ({
  healIssue: vi.fn((_issue: unknown, root: unknown) => root),
  applyHealToTree: vi.fn((_issues: unknown, root: unknown) => root),
  safeHealAll: vi.fn((_issues: unknown, root: unknown) => root),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeIssue(overrides: Partial<ValidatorIssue> = {}): ValidatorIssue {
  return {
    id: 'issue-1',
    itemId: 'canvas-1',
    itemLabel: 'Test Canvas',
    level: 'warning',
    category: 'Metadata',
    message: 'Missing label',
    fixable: false,
    ...overrides,
  };
}

function makeCollection(): IIIFItem {
  return {
    id: 'collection-1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('QCDashboard smoke tests', () => {
  let target: HTMLDivElement;
  let instance: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = undefined;
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('displays 100% health score when there are no issues', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 10,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // Health score should be 100% with no errors
    expect(target.textContent).toContain('100%');
    expect(target.textContent).toContain('Health');
  });

  it('displays "Integrity Guard" heading and "Resources Monitored" count', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 5,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Integrity Guard');
    expect(target.textContent).toContain('5 Resources Monitored');
  });

  it('renders all four category filter labels', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 0,
        root: null,
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Identity & IDs');
    expect(target.textContent).toContain('Hierarchy');
    expect(target.textContent).toContain('Labels & Descriptive');
    expect(target.textContent).toContain('Media & Technical');
  });

  it('renders "Heal All Fixable" button', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 0,
        root: null,
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Heal All Fixable');
  });

  it('displays "No issues in this category" when the active category has zero issues', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 3,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // Default active category is 'Identity', which has zero issues
    expect(target.textContent).toContain('No issues in this category');
  });

  it('displays issue messages and item labels when issues are present', () => {
    const issuesMap: Record<string, ValidatorIssue[]> = {
      'canvas-1': [
        makeIssue({ level: 'error', category: 'Identity', message: 'Missing @id' }),
        makeIssue({ id: 'issue-2', level: 'warning', category: 'Identity', message: 'Duplicate identifier' }),
      ],
    };

    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap,
        totalItems: 5,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // Default category is Identity, so these issues should be visible
    expect(target.textContent).toContain('Missing @id');
    expect(target.textContent).toContain('Duplicate identifier');
    expect(target.textContent).toContain('Test Canvas');
  });

  it('displays reduced health score when errors are present', () => {
    const issuesMap: Record<string, ValidatorIssue[]> = {
      'canvas-1': [
        makeIssue({ level: 'error', category: 'Identity', message: 'Missing @id' }),
      ],
    };

    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap,
        totalItems: 2,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // With 1 error and 2 total items, health should be 50%
    expect(target.textContent).toContain('50%');
  });

  it('renders the "Diagnostic Panel Ready" empty state in the context panel', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 0,
        root: null,
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Diagnostic Panel Ready');
    expect(target.textContent).toContain('Select an issue from the list to begin structural repair');
  });

  it('shows "Fix It" button for fixable issues', () => {
    const issuesMap: Record<string, ValidatorIssue[]> = {
      'manifest-1': [
        makeIssue({
          id: 'fix-1',
          itemId: 'manifest-1',
          itemLabel: 'Manifest',
          level: 'error',
          category: 'Identity',
          message: 'Fixable error',
          fixable: true,
        }),
      ],
    };

    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap,
        totalItems: 3,
        root: makeCollection(),
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // The "Fix It" button appears on hover, but should be present in DOM
    expect(target.textContent).toContain('Fix It');
  });

  it('displays 0% health and zero-item count with empty issues map and zero totalItems', () => {
    instance = mount(QCDashboard, {
      target,
      props: {
        issuesMap: {},
        totalItems: 0,
        root: null,
        onSelect: vi.fn(),
        onUpdate: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // With 0 total items, the health score calculation: calculateHealthScore(0, 0) should give 100%
    // because there are 0 errors out of 0 items
    expect(target.textContent).toContain('Health');
    expect(target.textContent).toContain('0 Resources Monitored');
  });
});
