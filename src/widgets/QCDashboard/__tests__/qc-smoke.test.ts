/**
 * QCDashboard — smoke tests
 *
 * Purpose: verify the quality-control dashboard mounts without crashing.
 * QCDashboard defines its own local ValidationIssue type (different from
 * the inspectorValidation one); the smoke test must supply the correct shape.
 *
 * The healer functions (healIssue, applyHealToTree, safeHealAll) are imported
 * from validationHealer — mocked here so no IIIF side-effects occur on mount.
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import QCDashboard from '../ui/QCDashboard.svelte';
import type { IIIFItem } from '@/src/shared/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// QCDashboard imports healer functions; mock them as no-ops so tests are pure.
vi.mock('@/src/entities/manifest/model/validation/validationHealer', () => ({
  healIssue: vi.fn((_issue: unknown, root: unknown) => root),
  applyHealToTree: vi.fn((_issues: unknown, root: unknown) => root),
  safeHealAll: vi.fn((_issues: unknown, root: unknown) => root),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

type IssueSeverity = 'error' | 'warning' | 'info';
type IssueCategory = 'Identity' | 'Structure' | 'Metadata' | 'Content';

interface QCIssue {
  id: string;
  itemId: string;
  itemLabel: string;
  level: IssueSeverity;
  category: IssueCategory;
  message: string;
  fixable: boolean;
  path?: string;
}

function makeIssue(overrides: Partial<QCIssue> = {}): QCIssue {
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

  it('mounts with empty issues map without crashing', () => {
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
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with populated issues map without crashing', () => {
    const issuesMap: Record<string, QCIssue[]> = {
      'canvas-1': [
        makeIssue({ level: 'error', category: 'Identity', message: 'Missing @id' }),
        makeIssue({ id: 'issue-2', level: 'warning', category: 'Metadata', message: 'Missing label' }),
      ],
      'canvas-2': [
        makeIssue({ id: 'issue-3', itemId: 'canvas-2', itemLabel: 'Canvas 2', level: 'info', category: 'Content', message: 'Low resolution' }),
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
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with fixable issues without crashing', () => {
    const issuesMap: Record<string, QCIssue[]> = {
      'manifest-1': [
        makeIssue({ id: 'fix-1', itemId: 'manifest-1', itemLabel: 'Manifest', level: 'error', category: 'Structure', message: 'Fixable error', fixable: true }),
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
    expect(target.firstChild).not.toBeNull();
  });
});
