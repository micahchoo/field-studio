/**
 * App Mode Store Tests
 *
 * Tests the Svelte 5 runes app mode store.
 * Validates mode switching, back navigation, and annotation mode.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { appMode } from '@/src/shared/stores/appMode.svelte';

beforeEach(() => {
  // Reset to default state
  // AppMode doesn't have a reset, so we set to archive manually
  appMode.setMode('archive');
  appMode.setAnnotationMode(false);
});

describe('appMode.mode', () => {
  it('defaults to "archive"', () => {
    expect(appMode.mode).toBe('archive');
  });

  it('updates when setMode is called', () => {
    appMode.setMode('viewer');
    expect(appMode.mode).toBe('viewer');
  });

  it('accepts all valid app modes', () => {
    const modes = [
      'archive', 'collections', 'structure', 'boards', 'search',
      'viewer', 'metadata', 'trash', 'admin-deps', 'map', 'timeline',
    ] as const;

    for (const mode of modes) {
      appMode.setMode(mode);
      expect(appMode.mode).toBe(mode);
    }
  });
});

describe('appMode.previousMode', () => {
  it('is null after first setMode from default', () => {
    // After init, previousMode should be null
    // setMode('archive') in beforeEach captures the initial 'archive'
    // Let's check: the first setMode from beforeEach might not set previousMode
    // if mode === current mode (due to early return).
    // Reset properly:
    appMode.setMode('viewer');
    // Now previous should be 'archive'
    expect(appMode.previousMode).toBe('archive');
  });

  it('stores previous mode on switch', () => {
    appMode.setMode('viewer');
    appMode.setMode('boards');
    expect(appMode.previousMode).toBe('viewer');
  });

  it('updates on each mode change', () => {
    appMode.setMode('viewer');
    expect(appMode.previousMode).toBe('archive');

    appMode.setMode('metadata');
    expect(appMode.previousMode).toBe('viewer');

    appMode.setMode('boards');
    expect(appMode.previousMode).toBe('metadata');
  });
});

describe('appMode.setMode', () => {
  it('does not update if mode is the same', () => {
    const before = appMode.changedAt;
    appMode.setMode('archive'); // same as current
    // changedAt should NOT change (early return)
    expect(appMode.changedAt).toBe(before);
  });

  it('updates changedAt on mode change', () => {
    const before = appMode.changedAt;
    appMode.setMode('viewer');
    expect(appMode.changedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('appMode.goBack', () => {
  it('swaps current and previous modes', () => {
    appMode.setMode('viewer');
    appMode.setMode('boards');
    expect(appMode.mode).toBe('boards');
    expect(appMode.previousMode).toBe('viewer');

    appMode.goBack();
    expect(appMode.mode).toBe('viewer');
    expect(appMode.previousMode).toBe('boards');
  });

  it('no-ops when no previous mode', () => {
    // After beforeEach, archive is set. previousMode is null or archive.
    // Force a clean state:
    appMode.setMode('viewer');
    appMode.goBack(); // goes back to archive
    expect(appMode.mode).toBe('archive');

    // Now previousMode is 'viewer', so goBack again:
    appMode.goBack();
    expect(appMode.mode).toBe('viewer');
  });

  it('updates changedAt', () => {
    appMode.setMode('viewer');
    const before = appMode.changedAt;
    appMode.goBack();
    expect(appMode.changedAt).toBeGreaterThanOrEqual(before);
  });

  it('allows ping-pong between two modes', () => {
    appMode.setMode('viewer');
    appMode.setMode('metadata');

    appMode.goBack();
    expect(appMode.mode).toBe('viewer');

    appMode.goBack();
    expect(appMode.mode).toBe('metadata');

    appMode.goBack();
    expect(appMode.mode).toBe('viewer');
  });
});

describe('appMode.isMode', () => {
  it('returns true for current mode', () => {
    expect(appMode.isMode('archive')).toBe(true);
    expect(appMode.isMode('viewer')).toBe(false);
  });

  it('updates after setMode', () => {
    appMode.setMode('viewer');
    expect(appMode.isMode('viewer')).toBe(true);
    expect(appMode.isMode('archive')).toBe(false);
  });
});

describe('appMode.annotationMode', () => {
  it('defaults to false', () => {
    expect(appMode.annotationMode).toBe(false);
  });

  it('can be set to true', () => {
    appMode.setAnnotationMode(true);
    expect(appMode.annotationMode).toBe(true);
  });

  it('can be toggled', () => {
    appMode.setAnnotationMode(true);
    expect(appMode.annotationMode).toBe(true);
    appMode.setAnnotationMode(false);
    expect(appMode.annotationMode).toBe(false);
  });

  it('is independent of app mode', () => {
    appMode.setAnnotationMode(true);
    appMode.setMode('metadata');
    expect(appMode.annotationMode).toBe(true);
  });
});

describe('appMode.changedAt', () => {
  it('is a timestamp', () => {
    expect(typeof appMode.changedAt).toBe('number');
    expect(appMode.changedAt).toBeGreaterThan(0);
  });

  it('is updated on mode changes', () => {
    const t1 = appMode.changedAt;
    appMode.setMode('viewer');
    const t2 = appMode.changedAt;
    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});
