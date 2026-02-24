/**
 * Dialog Store Tests
 *
 * Tests the Svelte 5 runes dialog store.
 * Validates DialogState class, DialogManagerStore, and all dialog state methods.
 *
 * No mocks needed — pure state class logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need a fresh import for each test to avoid state bleed from the singleton.
// The singleton `dialogs` is re-used across tests, but DialogState class is tested
// independently. We call closeAll() before each test to start from known state.

import { DialogState, dialogs } from '@/src/shared/stores/dialogs.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset all dialogs to closed before each test
  dialogs.closeAll();
  // Stub localStorage to control onboardingModal initial state
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');
});

afterEach(() => {
  dialogs.closeAll();
  vi.restoreAllMocks();
});

// ===========================================================================
// DialogState (unit class)
// ===========================================================================

describe('DialogState', () => {
  it('initializes as closed by default', () => {
    const state = new DialogState();
    expect(state.isOpen).toBe(false);
  });

  it('initializes as open when initialOpen=true', () => {
    const state = new DialogState(true);
    expect(state.isOpen).toBe(true);
  });

  it('open() sets isOpen to true', () => {
    const state = new DialogState();
    state.open();
    expect(state.isOpen).toBe(true);
  });

  it('close() sets isOpen to false', () => {
    const state = new DialogState(true);
    state.close();
    expect(state.isOpen).toBe(false);
  });

  it('toggle() toggles from false to true', () => {
    const state = new DialogState();
    state.toggle();
    expect(state.isOpen).toBe(true);
  });

  it('toggle() toggles from true to false', () => {
    const state = new DialogState(true);
    state.toggle();
    expect(state.isOpen).toBe(false);
  });

  it('toggle() can be called multiple times', () => {
    const state = new DialogState();
    state.toggle();  // true
    state.toggle();  // false
    state.toggle();  // true
    expect(state.isOpen).toBe(true);
  });

  it('open() is idempotent (calling twice stays open)', () => {
    const state = new DialogState();
    state.open();
    state.open();
    expect(state.isOpen).toBe(true);
  });

  it('close() is idempotent (calling twice stays closed)', () => {
    const state = new DialogState(true);
    state.close();
    state.close();
    expect(state.isOpen).toBe(false);
  });
});

// ===========================================================================
// DialogManagerStore — individual dialogs
// ===========================================================================

describe('dialogs.exportDialog', () => {
  it('starts closed', () => {
    expect(dialogs.exportDialog.isOpen).toBe(false);
  });

  it('opens when open() called', () => {
    dialogs.exportDialog.open();
    expect(dialogs.exportDialog.isOpen).toBe(true);
  });

  it('closes when close() called', () => {
    dialogs.exportDialog.open();
    dialogs.exportDialog.close();
    expect(dialogs.exportDialog.isOpen).toBe(false);
  });
});

describe('dialogs.commandPalette', () => {
  it('starts closed', () => {
    expect(dialogs.commandPalette.isOpen).toBe(false);
  });

  it('toggles open/closed', () => {
    dialogs.commandPalette.toggle();
    expect(dialogs.commandPalette.isOpen).toBe(true);
    dialogs.commandPalette.toggle();
    expect(dialogs.commandPalette.isOpen).toBe(false);
  });
});

describe('dialogs.keyboardShortcuts', () => {
  it('starts closed', () => {
    expect(dialogs.keyboardShortcuts.isOpen).toBe(false);
  });

  it('opens on open()', () => {
    dialogs.keyboardShortcuts.open();
    expect(dialogs.keyboardShortcuts.isOpen).toBe(true);
  });
});

describe('dialogs.authDialog', () => {
  it('starts closed', () => {
    expect(dialogs.authDialog.isOpen).toBe(false);
  });

  it('can be opened and closed', () => {
    dialogs.authDialog.open();
    expect(dialogs.authDialog.isOpen).toBe(true);
    dialogs.authDialog.close();
    expect(dialogs.authDialog.isOpen).toBe(false);
  });
});

// ===========================================================================
// dialogs.closeAll()
// ===========================================================================

describe('dialogs.closeAll', () => {
  it('closes all open dialogs', () => {
    dialogs.exportDialog.open();
    dialogs.qcDashboard.open();
    dialogs.commandPalette.open();
    dialogs.keyboardShortcuts.open();
    dialogs.authDialog.open();
    dialogs.batchEditor.open();

    dialogs.closeAll();

    expect(dialogs.exportDialog.isOpen).toBe(false);
    expect(dialogs.qcDashboard.isOpen).toBe(false);
    expect(dialogs.commandPalette.isOpen).toBe(false);
    expect(dialogs.keyboardShortcuts.isOpen).toBe(false);
    expect(dialogs.authDialog.isOpen).toBe(false);
    expect(dialogs.batchEditor.isOpen).toBe(false);
  });

  it('is safe to call when nothing is open', () => {
    expect(() => dialogs.closeAll()).not.toThrow();
  });

  it('results in anyOpen === false', () => {
    dialogs.exportDialog.open();
    dialogs.personaSettings.open();
    dialogs.closeAll();
    expect(dialogs.anyOpen).toBe(false);
  });
});

// ===========================================================================
// dialogs.anyOpen
// ===========================================================================

describe('dialogs.anyOpen', () => {
  it('returns false when all dialogs are closed', () => {
    dialogs.closeAll();
    expect(dialogs.anyOpen).toBe(false);
  });

  it('returns true when exportDialog is open', () => {
    dialogs.exportDialog.open();
    expect(dialogs.anyOpen).toBe(true);
  });

  it('returns true when commandPalette is open', () => {
    dialogs.commandPalette.open();
    expect(dialogs.anyOpen).toBe(true);
  });

  it('returns true when storageFullDialog is open', () => {
    dialogs.storageFullDialog.open();
    expect(dialogs.anyOpen).toBe(true);
  });

  it('returns false once all opened dialogs are closed', () => {
    dialogs.exportDialog.open();
    dialogs.exportDialog.close();
    expect(dialogs.anyOpen).toBe(false);
  });

  it('returns true when any one of many dialogs is open', () => {
    dialogs.exportDialog.open();
    dialogs.qcDashboard.open();
    dialogs.exportDialog.close();
    // qcDashboard is still open
    expect(dialogs.anyOpen).toBe(true);
  });
});

// ===========================================================================
// All dialog names exist on the store
// ===========================================================================

describe('dialogs — all named dialogs present', () => {
  const expectedDialogs = [
    'exportDialog',
    'qcDashboard',
    'onboardingModal',
    'externalImport',
    'batchEditor',
    'personaSettings',
    'commandPalette',
    'keyboardShortcuts',
    'authDialog',
    'storageFullDialog',
  ] as const;

  for (const name of expectedDialogs) {
    it(`has ${name} with open/close/toggle methods`, () => {
      const dialog = dialogs[name];
      expect(dialog).toBeDefined();
      expect(typeof dialog.isOpen).toBe('boolean');
      expect(typeof dialog.open).toBe('function');
      expect(typeof dialog.close).toBe('function');
      expect(typeof dialog.toggle).toBe('function');
    });
  }
});
