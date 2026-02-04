/**
 * App Settings Tests - Realistic localStorage Behavior
 *
 * Tests useAppSettings with realistic browser localStorage behavior including:
 * - QuotaExceededError when storage is full
 * - Safari private mode restrictions
 * - Serialization/deserialization edge cases
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAppSettings } from '@/hooks/useAppSettings';

// ============================================================================
// Realistic localStorage Mock
// ============================================================================

const SETTINGS_KEY = 'iiif-field-settings';
const DEFAULT_QUOTA = 5 * 1024 * 1024; // 5MB typical browser limit

/**
 * Creates a realistic localStorage mock that simulates:
 * - Storage quota limits
 * - Serialization/deserialization
 * - Event dispatching for cross-tab sync
 */
function createRealisticLocalStorage() {
  const store: Map<string, string> = new Map();
  let storedSize = 0;
  const quota = DEFAULT_QUOTA;

  const calculateSize = (key: string, value: string): number => {
    // UTF-16 encoding: 2 bytes per character
    return (key.length + value.length) * 2;
  };

  return {
    getItem: (key: string): string | null => {
      return store.get(key) ?? null;
    },

    setItem: (key: string, value: string): void => {
      const newSize = calculateSize(key, value);
      const oldSize = store.has(key) ? calculateSize(key, store.get(key)!) : 0;
      const projectedSize = storedSize - oldSize + newSize;

      // Simulate quota exceeded
      if (projectedSize > quota) {
        const error = new Error('The quota has been exceeded.');
        (error as any).name = 'QuotaExceededError';
        (error as any).code = 22; // QUOTA_EXCEEDED_ERR
        throw error;
      }

      storedSize = projectedSize;
      store.set(key, value);

      // Dispatch storage event for cross-tab sync simulation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: value,
            oldValue: store.get(key) || null,
            storageArea: localStorage,
          })
        );
      }
    },

    removeItem: (key: string): void => {
      if (store.has(key)) {
        storedSize -= calculateSize(key, store.get(key)!);
        store.delete(key);
      }
    },

    clear: (): void => {
      store.clear();
      storedSize = 0;
    },

    get length(): number {
      return store.size;
    },

    key: (index: number): string | null => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },

    // Test helpers
    _getStoredSize: (): number => storedSize,
    _fillToNearQuota: (key: string): void => {
      // Fill storage to exact capacity minus 1 byte - any write will fail
      const remaining = quota - storedSize - 1;
      if (remaining > 0) {
        const filler = 'x'.repeat(Math.max(0, Math.floor(remaining / 2) - key.length - 10));
        store.set(key, filler);
        storedSize += calculateSize(key, filler);
      }
    },
  };
}

type RealisticLocalStorage = ReturnType<typeof createRealisticLocalStorage>;

// ============================================================================
// Safari Private Mode Mock
// ============================================================================

function createSafariPrivateModeStorage(): Storage {
  return {
    get length() {
      return 0;
    },
    key: () => null,
    getItem: () => null,
    setItem: () => {
      const error = new Error(
        'Private mode: localStorage is not available in private browsing mode'
      );
      (error as any).name = 'SecurityError';
      throw error;
    },
    removeItem: () => {
      throw new Error('Private mode: localStorage is not available');
    },
    clear: () => {
      throw new Error('Private mode: localStorage is not available');
    },
  } as Storage;
}

// ============================================================================
// Tests
// ============================================================================

describe('useAppSettings - Realistic Browser Behavior', () => {
  let mockStorage: RealisticLocalStorage;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    mockStorage = createRealisticLocalStorage();

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    // Clear storage before each test
    mockStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default settings when localStorage is empty', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.language).toBe('en');
      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.fieldMode).toBe(false);
    });

    it('should load settings from localStorage', () => {
      const storedSettings = {
        language: 'ar',
        theme: 'dark',
        fieldMode: true,
      };
      mockStorage.setItem(SETTINGS_KEY, JSON.stringify(storedSettings));

      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.language).toBe('ar');
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.fieldMode).toBe(true);
    });

    it('should merge stored settings with defaults', () => {
      const storedSettings = { language: 'zh' };
      mockStorage.setItem(SETTINGS_KEY, JSON.stringify(storedSettings));

      const { result } = renderHook(() => useAppSettings());

      // Stored value used
      expect(result.current.settings.language).toBe('zh');
      // Defaults preserved for unset values
      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.fieldMode).toBe(false);
    });

    it('should handle corrupted JSON in localStorage', () => {
      mockStorage.setItem(SETTINGS_KEY, 'not-valid-json{{}');

      const { result } = renderHook(() => useAppSettings());

      // Should fall back to defaults
      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.language).toBe('en');
    });

    it('should handle null localStorage values', () => {
      // localStorage returns null for non-existent keys
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.language).toBe('en');
    });
  });

  describe('Settings Updates', () => {
    it('should persist settings to localStorage on update', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({ language: 'ar' });
      });

      const stored = mockStorage.getItem(SETTINGS_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.language).toBe('ar');
    });

    it('should update individual settings via updateSettings', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({ language: 'zh' });
      });

      expect(result.current.settings.language).toBe('zh');

      act(() => {
        result.current.updateSettings({ theme: 'dark' });
      });

      expect(result.current.settings.theme).toBe('dark');
    });

    it('should update multiple settings at once', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          language: 'ar',
          theme: 'dark',
          fieldMode: true,
        });
      });

      expect(result.current.settings.language).toBe('ar');
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.fieldMode).toBe(true);
    });

    it('should toggle field mode', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.fieldMode).toBe(false);

      act(() => {
        result.current.toggleFieldMode();
      });

      expect(result.current.settings.fieldMode).toBe(true);

      act(() => {
        result.current.toggleFieldMode();
      });

      expect(result.current.settings.fieldMode).toBe(false);
    });

    it('should reset settings to defaults', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          language: 'ar',
          theme: 'dark',
          fieldMode: true,
        });
      });

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings.language).toBe('en');
      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.fieldMode).toBe(false);
    });
  });

  describe('Quota Exceeded Error Handling', () => {
    it('should handle QuotaExceededError gracefully', () => {
      const { result } = renderHook(() => useAppSettings());

      // Fill storage to near capacity
      mockStorage._fillToNearQuota('filler-data');

      // Attempt to save large setting
      act(() => {
        result.current.updateSettings({
          metadataTemplate: ['x'.repeat(10000)],
        });
      });

      // Should not crash, settings should persist in memory
      expect(result.current.settings.metadataTemplate).toEqual(['x'.repeat(10000)]);
    });

    it('should maintain in-memory state when storage fails', () => {
      const { result } = renderHook(() => useAppSettings());

      // Fill storage to capacity
      mockStorage._fillToNearQuota('filler');

      act(() => {
        result.current.updateSettings({ language: 'ar' });
      });

      // In-memory state should still reflect change
      expect(result.current.settings.language).toBe('ar');

      // But storage should not have the new value (or should have old value)
      const stored = mockStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Either not stored or has old value
        expect(parsed.language).not.toBe('ar');
      }
    });
  });

  describe('Safari Private Mode Handling', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: createSafariPrivateModeStorage(),
        writable: true,
        configurable: true,
      });
    });

    it('should initialize when localStorage is disabled', () => {
      const { result } = renderHook(() => useAppSettings());

      // Should not crash
      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.language).toBe('en');
    });

    it('should maintain settings in memory when storage unavailable', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({ language: 'ar' });
      });

      // Settings should still work in memory
      expect(result.current.settings.language).toBe('ar');
    });
  });

  describe('Complex Data Types', () => {
    it('should handle abstractionLevel updates', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          abstractionLevel: 'advanced',
        });
      });

      expect(result.current.settings.abstractionLevel).toBe('advanced');
    });

    it('should preserve map configuration', () => {
      const { result } = renderHook(() => useAppSettings());

      const newMapConfig = {
        ...result.current.settings.mapConfig,
        defaultZoom: 15,
      };

      act(() => {
        result.current.updateSettings({ mapConfig: newMapConfig });
      });

      expect(result.current.settings.mapConfig.defaultZoom).toBe(15);
    });

    it('should handle metadata template array', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          metadataTemplate: ['Title', 'Creator', 'Date', 'Description'],
        });
      });

      expect(result.current.settings.metadataTemplate).toEqual([
        'Title',
        'Creator',
        'Date',
        'Description',
      ]);
    });
  });

  describe('Serialization Edge Cases', () => {
    it('should handle settings with special characters', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          defaultBaseUrl: 'https://example.com/path?query="value"&special=<>&\'',
        });
      });

      expect(result.current.settings.defaultBaseUrl).toBe(
        'https://example.com/path?query="value"&special=<>&\''
      );

      // Should be retrievable after re-render
      const { result: result2 } = renderHook(() => useAppSettings());
      expect(result2.current.settings.defaultBaseUrl).toBe(
        'https://example.com/path?query="value"&special=<>&\''
      );
    });

    it('should handle unicode characters', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          language: 'ar',
          metadataTemplate: ['عنوان', 'مؤلف', 'تاريخ'],
        });
      });

      expect(result.current.settings.metadataTemplate).toEqual([
        'عنوان',
        'مؤلف',
        'تاريخ',
      ]);
    });

    it('should handle empty strings', () => {
      const { result } = renderHook(() => useAppSettings());

      act(() => {
        result.current.updateSettings({
          defaultBaseUrl: '',
        });
      });

      expect(result.current.settings.defaultBaseUrl).toBe('');
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings).toMatchObject({
        language: 'en',
        theme: 'light',
        fieldMode: false,
        abstractionLevel: 'standard',
        autoSaveInterval: 30,
        showTechnicalIds: false,
      });
    });

    it('should have defined map config defaults', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.mapConfig).toBeDefined();
      expect(result.current.settings.mapConfig.defaultZoom).toBeDefined();
      expect(result.current.settings.mapConfig.defaultCenter).toBeDefined();
    });

    it('should have defined zoom config defaults', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.zoomConfig).toBeDefined();
      expect(result.current.settings.zoomConfig.min).toBeDefined();
      expect(result.current.settings.zoomConfig.max).toBeDefined();
    });
  });
});
