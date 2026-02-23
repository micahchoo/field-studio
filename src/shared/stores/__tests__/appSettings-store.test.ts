/**
 * App Settings Store Tests
 *
 * Tests the Svelte 5 runes app settings store.
 * Validates settings CRUD, theme sync, fieldMode derivation,
 * localStorage persistence, and reset behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '@/src/shared/stores/appSettings.svelte';
import { theme } from '@/src/shared/stores/theme.svelte';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

beforeEach(() => {
  // Reset stores
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
  localStorageMock.clear();
  vi.clearAllMocks();
  appSettings.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('appSettings.settings', () => {
  it('has default settings on start', () => {
    const s = appSettings.settings;
    expect(s.language).toBe('en');
    expect(s.theme).toBe('light');
    expect(s.abstractionLevel).toBe('standard');
    expect(s.autoSaveInterval).toBe(30);
    expect(s.showTechnicalIds).toBe(false);
    expect(s.height).toBe(800);
  });

  it('has default base URL', () => {
    expect(appSettings.settings.defaultBaseUrl).toBe(DEFAULT_SETTINGS.defaultBaseUrl);
  });
});

describe('appSettings.fieldMode', () => {
  it('is false for light theme', () => {
    expect(appSettings.fieldMode).toBe(false);
  });

  it('is true for field theme', () => {
    appSettings.setTheme('field');
    expect(appSettings.fieldMode).toBe(true);
  });

  it('is false for dark theme', () => {
    appSettings.setTheme('dark');
    expect(appSettings.fieldMode).toBe(false);
  });

  it('updates when theme changes', () => {
    appSettings.setTheme('field');
    expect(appSettings.fieldMode).toBe(true);
    appSettings.setTheme('light');
    expect(appSettings.fieldMode).toBe(false);
  });
});

describe('appSettings.themeName', () => {
  it('returns current theme name', () => {
    expect(appSettings.themeName).toBe('light');
    appSettings.setTheme('dark');
    expect(appSettings.themeName).toBe('dark');
  });
});

describe('appSettings.abstractionLevel', () => {
  it('defaults to standard', () => {
    expect(appSettings.abstractionLevel).toBe('standard');
  });

  it('can be updated', () => {
    appSettings.update({ abstractionLevel: 'simple' });
    expect(appSettings.abstractionLevel).toBe('simple');
  });
});

describe('appSettings.update', () => {
  it('updates a single setting', () => {
    appSettings.update({ language: 'fr' });
    expect(appSettings.settings.language).toBe('fr');
  });

  it('updates multiple settings at once', () => {
    appSettings.update({ language: 'de', showTechnicalIds: true });
    expect(appSettings.settings.language).toBe('de');
    expect(appSettings.settings.showTechnicalIds).toBe(true);
  });

  it('preserves other settings', () => {
    appSettings.update({ language: 'ja' });
    expect(appSettings.settings.autoSaveInterval).toBe(30);
    expect(appSettings.settings.height).toBe(800);
  });

  it('syncs theme store when theme changes', () => {
    appSettings.update({ theme: 'dark' });
    expect(theme.name).toBe('dark');
  });

  it('does not sync theme store for non-theme updates', () => {
    theme.setTheme('light');
    appSettings.update({ language: 'fr' });
    expect(theme.name).toBe('light');
  });

  it('derives fieldMode from theme update', () => {
    appSettings.update({ theme: 'field' });
    expect(appSettings.fieldMode).toBe(true);
  });
});

describe('appSettings.setTheme', () => {
  it('updates settings.theme', () => {
    appSettings.setTheme('dark');
    expect(appSettings.settings.theme).toBe('dark');
  });

  it('syncs theme store', () => {
    appSettings.setTheme('field');
    expect(theme.name).toBe('field');
  });

  it('derives fieldMode', () => {
    appSettings.setTheme('field');
    expect(appSettings.fieldMode).toBe(true);

    appSettings.setTheme('light');
    expect(appSettings.fieldMode).toBe(false);
  });
});

describe('appSettings.toggleFieldMode', () => {
  it('switches from light to field', () => {
    appSettings.toggleFieldMode();
    expect(appSettings.settings.theme).toBe('field');
    expect(appSettings.fieldMode).toBe(true);
  });

  it('switches from field to light', () => {
    appSettings.setTheme('field');
    appSettings.toggleFieldMode();
    expect(appSettings.settings.theme).toBe('light');
    expect(appSettings.fieldMode).toBe(false);
  });

  it('switches from dark to field', () => {
    appSettings.setTheme('dark');
    appSettings.toggleFieldMode();
    // dark → should go to 'field' since it's not 'field'
    expect(appSettings.settings.theme).toBe('field');
  });

  it('syncs theme store', () => {
    appSettings.toggleFieldMode();
    expect(theme.name).toBe('field');
  });
});

describe('appSettings.reset', () => {
  it('restores all defaults', () => {
    appSettings.update({ language: 'fr', theme: 'dark', showTechnicalIds: true });
    appSettings.reset();

    expect(appSettings.settings.language).toBe('en');
    expect(appSettings.settings.theme).toBe('light');
    expect(appSettings.settings.showTechnicalIds).toBe(false);
  });

  it('syncs theme store to default', () => {
    appSettings.setTheme('dark');
    appSettings.reset();
    expect(theme.name).toBe('light');
  });
});

describe('appSettings.persist', () => {
  it('writes settings to localStorage', () => {
    appSettings.persist();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      SETTINGS_KEY,
      expect.any(String)
    );
  });

  it('serializes settings as JSON', () => {
    appSettings.update({ language: 'fr' });
    appSettings.persist();
    const stored = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
    expect(stored.language).toBe('fr');
  });

  it('handles storage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => { throw new Error('QuotaExceeded'); });
    expect(() => appSettings.persist()).not.toThrow();
  });
});

describe('appSettings.loadFromStorage', () => {
  it('loads stored settings', () => {
    const stored = { ...DEFAULT_SETTINGS, language: 'de', theme: 'dark' };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));

    appSettings.loadFromStorage();
    expect(appSettings.settings.language).toBe('de');
    expect(appSettings.settings.theme).toBe('dark');
  });

  it('merges with defaults for schema evolution', () => {
    // Stored settings missing 'height' (added later)
    const partial = { language: 'ja', theme: 'light' };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(partial));

    appSettings.loadFromStorage();
    expect(appSettings.settings.language).toBe('ja');
    expect(appSettings.settings.height).toBe(800); // default
  });

  it('derives fieldMode from stored theme', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'field' }));
    appSettings.loadFromStorage();
    expect(appSettings.fieldMode).toBe(true);
  });

  it('ignores stored fieldMode (derives from theme)', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ theme: 'light', fieldMode: true })
    );
    appSettings.loadFromStorage();
    // fieldMode should be derived from theme, not from stored value
    expect(appSettings.fieldMode).toBe(false);
  });

  it('syncs theme store on load', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'dark' }));
    appSettings.loadFromStorage();
    expect(theme.name).toBe('dark');
  });

  it('handles corrupted storage gracefully', () => {
    localStorageMock.getItem.mockReturnValue('not valid json{{{');
    expect(() => appSettings.loadFromStorage()).not.toThrow();
  });

  it('handles missing storage gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(() => appSettings.loadFromStorage()).not.toThrow();
  });
});
