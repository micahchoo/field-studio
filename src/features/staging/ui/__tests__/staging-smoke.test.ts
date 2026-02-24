/**
 * Staging organisms — smoke tests
 *
 * Purpose: catch runtime crashes from type mismatches hidden by `as unknown as`
 * casts. Each test mounts the organism with minimal realistic data and asserts
 * it renders without throwing.
 *
 * Pattern: mount → assert non-empty DOM → unmount.
 * These tests do NOT assert specific text or styling — they only guard against
 * crashes (undefined property access, missing config lookup, etc.).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import type { IngestProgress } from '@/src/shared/types';
import IngestProgressPanel from '../molecules/IngestProgressPanel.svelte';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProgress(overrides: Partial<IngestProgress> = {}): IngestProgress {
  return {
    operationId: 'test-op',
    stage: 'processing',
    stageProgress: 50,
    filesTotal: 10,
    filesCompleted: 5,
    filesProcessing: 1,
    filesError: 0,
    files: [],
    speed: 100,
    etaSeconds: 30,
    startedAt: Date.now() - 5000,
    updatedAt: Date.now(),
    isPaused: false,
    isCancelled: false,
    activityLog: [
      { timestamp: Date.now(), level: 'info', message: 'Ingest started' },
    ],
    overallProgress: 50,
    ...overrides,
  };
}

const controls = {
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(),
  retry: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IngestProgressPanel smoke tests', () => {
  let target: HTMLElement;
  let component: ReturnType<typeof mount>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
    vi.clearAllMocks();
  });

  // This is the regression test for the bug: stageIndicator crash when
  // progress.stage is not a valid IngestStage key in STAGE_CONFIG.
  it.each([
    'scanning', 'analyzing', 'processing', 'building',
    'finalizing', 'complete', 'cancelled', 'error',
  ] as const)('renders without crashing for stage=%s', (stage) => {
    component = mount(IngestProgressPanel, {
      target,
      props: { progress: makeProgress({ stage }), controls },
    });
    flushSync();
    expect(target.firstChild).toBeTruthy();
  });

  it('renders null progress without crashing', () => {
    component = mount(IngestProgressPanel, {
      target,
      props: { progress: null, controls },
    });
    flushSync();
    // null progress renders empty state, not a crash
    expect(target).toBeDefined();
  });

  it('renders full variant without crashing', () => {
    component = mount(IngestProgressPanel, {
      target,
      props: {
        progress: makeProgress({
          filesTotal: 100,
          filesCompleted: 72,
          filesError: 3,
          activityLog: [
            { timestamp: Date.now(), level: 'info', message: 'Starting' },
            { timestamp: Date.now(), level: 'warn', message: 'Slow file' },
            { timestamp: Date.now(), level: 'error', message: 'File failed' },
          ],
        }),
        controls,
        variant: 'full',
        showLogByDefault: true,
        showFilesByDefault: true,
      },
    });
    flushSync();
    expect(target.firstChild).toBeTruthy();
  });

  it('renders compact variant without crashing', () => {
    component = mount(IngestProgressPanel, {
      target,
      props: { progress: makeProgress({ stage: 'complete', filesCompleted: 10 }), controls, variant: 'compact' },
    });
    flushSync();
    expect(target.firstChild).toBeTruthy();
  });

  it('renders minimal variant without crashing', () => {
    component = mount(IngestProgressPanel, {
      target,
      props: { progress: makeProgress({ stage: 'error', error: 'Something failed' }), controls, variant: 'minimal' },
    });
    flushSync();
    expect(target.firstChild).toBeTruthy();
  });
});
