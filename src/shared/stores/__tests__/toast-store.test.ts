/**
 * Toast Store Tests
 *
 * Tests the Svelte 5 runes toast notification store.
 * Validates show/dismiss, auto-dismiss, persistent toasts,
 * MAX_TOASTS enforcement, and clear behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toast } from '@/src/shared/stores/toast.svelte';

beforeEach(() => {
  toast.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  toast.clear();
  vi.useRealTimers();
});

describe('toast.show', () => {
  it('adds a toast with default type "info"', () => {
    toast.show('Hello');
    expect(toast.count).toBe(1);
    expect(toast.items[0].message).toBe('Hello');
    expect(toast.items[0].type).toBe('info');
  });

  it('adds a toast with explicit type', () => {
    toast.show('Error!', 'error');
    expect(toast.items[0].type).toBe('error');
  });

  it('adds a toast with success type', () => {
    toast.show('Saved', 'success');
    expect(toast.items[0].type).toBe('success');
  });

  it('adds a toast with warning type', () => {
    toast.show('Careful', 'warning');
    expect(toast.items[0].type).toBe('warning');
  });

  it('returns the toast ID', () => {
    const id = toast.show('Test');
    expect(typeof id).toBe('string');
    expect(id.length).toBe(9);
  });

  it('generates unique IDs', () => {
    const id1 = toast.show('First');
    const id2 = toast.show('Second');
    expect(id1).not.toBe(id2);
  });

  it('adds toast with action', () => {
    const onClick = vi.fn();
    toast.show('Action', 'info', { label: 'Retry', onClick });
    expect(toast.items[0].action).toBeDefined();
    expect(toast.items[0].action!.label).toBe('Retry');
  });

  it('adds toast with action variant', () => {
    toast.show('Action', 'info', { label: 'Retry', onClick: vi.fn(), variant: 'primary' });
    expect(toast.items[0].action!.variant).toBe('primary');
  });
});

describe('toast auto-dismiss', () => {
  it('auto-dismisses after 3000ms', () => {
    toast.show('Temp');
    expect(toast.count).toBe(1);

    vi.advanceTimersByTime(2999);
    expect(toast.count).toBe(1);

    vi.advanceTimersByTime(1);
    expect(toast.count).toBe(0);
  });

  it('does not auto-dismiss persistent toasts', () => {
    toast.showPersistent('Persist', 'info');
    vi.advanceTimersByTime(10000);
    expect(toast.count).toBe(1);
  });
});

describe('toast.showPersistent', () => {
  it('creates a persistent toast', () => {
    toast.showPersistent('Uploading', 'info');
    expect(toast.items[0].persistent).toBe(true);
  });

  it('returns the toast ID', () => {
    const id = toast.showPersistent('Uploading', 'info');
    expect(typeof id).toBe('string');
  });

  it('creates persistent toast with action', () => {
    toast.showPersistent('Upload', 'info', { label: 'Cancel', onClick: vi.fn() });
    expect(toast.items[0].action!.label).toBe('Cancel');
  });
});

describe('toast.dismiss', () => {
  it('removes a specific toast by ID', () => {
    const id1 = toast.show('First');
    toast.show('Second');
    expect(toast.count).toBe(2);

    toast.dismiss(id1);
    expect(toast.count).toBe(1);
    expect(toast.items[0].message).toBe('Second');
  });

  it('no-ops on unknown ID', () => {
    toast.show('Test');
    toast.dismiss('unknown-id');
    expect(toast.count).toBe(1);
  });
});

describe('toast.dismissOldest', () => {
  it('removes the oldest (first) toast', () => {
    toast.show('First');
    toast.show('Second');
    toast.show('Third');

    toast.dismissOldest();
    expect(toast.count).toBe(2);
    expect(toast.items[0].message).toBe('Second');
  });

  it('no-ops when empty', () => {
    toast.dismissOldest();
    expect(toast.count).toBe(0);
  });
});

describe('toast.clear', () => {
  it('removes all toasts', () => {
    toast.show('A');
    toast.show('B');
    toast.showPersistent('C', 'info');
    expect(toast.count).toBe(3);

    toast.clear();
    expect(toast.count).toBe(0);
    expect(toast.items).toEqual([]);
  });

  it('clears pending timeouts', () => {
    toast.show('Temp');
    toast.clear();
    // Advance past auto-dismiss — should not throw
    vi.advanceTimersByTime(5000);
    expect(toast.count).toBe(0);
  });
});

describe('MAX_TOASTS enforcement', () => {
  it('limits to 3 toasts, removing oldest', () => {
    toast.show('A');
    toast.show('B');
    toast.show('C');
    toast.show('D');

    expect(toast.count).toBe(3);
    expect(toast.items[0].message).toBe('B');
    expect(toast.items[2].message).toBe('D');
  });

  it('limits persistent toasts the same way', () => {
    toast.showPersistent('A', 'info');
    toast.showPersistent('B', 'info');
    toast.showPersistent('C', 'info');
    toast.showPersistent('D', 'info');

    expect(toast.count).toBe(3);
    expect(toast.items[0].message).toBe('B');
  });

  it('limits mixed toasts', () => {
    toast.show('A');
    toast.showPersistent('B', 'info');
    toast.show('C');
    toast.show('D');

    expect(toast.count).toBe(3);
  });
});

describe('toast.items reactivity', () => {
  it('returns empty array by default', () => {
    expect(toast.items).toEqual([]);
  });

  it('items is read-only array', () => {
    toast.show('Test');
    // Items should be an array (readonly)
    expect(Array.isArray(toast.items)).toBe(true);
  });
});

describe('toast.count reactivity', () => {
  it('starts at 0', () => {
    expect(toast.count).toBe(0);
  });

  it('increments with show', () => {
    toast.show('A');
    expect(toast.count).toBe(1);
    toast.show('B');
    expect(toast.count).toBe(2);
  });

  it('decrements with dismiss', () => {
    const id = toast.show('A');
    toast.show('B');
    toast.dismiss(id);
    expect(toast.count).toBe(1);
  });
});
