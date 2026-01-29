/**
 * Unit Tests for hooks/useAppSettings.ts
 *
 * Tests app settings management with localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppSettings } from '../../../hooks/useAppSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAppSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useAppSettings());

    expect(result.current.settings).toBeDefined();
    expect(result.current.settings.language).toBe('en');
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.fieldMode).toBe(false);
    expect(result.current.settings.abstractionLevel).toBe('standard');
  });

  it('should load settings from localStorage', () => {
    const storedSettings = JSON.stringify({
      language: 'fr',
      theme: 'dark',
      fieldMode: true,
    });
    localStorageMock.getItem.mockReturnValue(storedSettings);

    const { result } = renderHook(() => useAppSettings());

    expect(result.current.settings.language).toBe('fr');
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.fieldMode).toBe(true);
  });

  it('should merge stored settings with defaults', () => {
    const storedSettings = JSON.stringify({
      language: 'de',
    });
    localStorageMock.getItem.mockReturnValue(storedSettings);

    const { result } = renderHook(() => useAppSettings());

    // Stored value
    expect(result.current.settings.language).toBe('de');
    // Default values
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.fieldMode).toBe(false);
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAppSettings());

    expect(result.current.settings).toBeDefined();
    expect(result.current.settings.language).toBe('en');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should persist settings to localStorage on update', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.updateSettings({ language: 'es' });
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Get the last call which should have the updated value
    const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
    const savedValue = JSON.parse(lastCall[1]);
    expect(savedValue.language).toBe('es');
  });

  it('should update individual settings', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.language).toBe('en'); // Unchanged
  });

  it('should update multiple settings at once', () => {
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.updateSettings({
        theme: 'dark',
        fieldMode: true,
        language: 'ja',
      });
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.fieldMode).toBe(true);
    expect(result.current.settings.language).toBe('ja');
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
        theme: 'dark',
        language: 'fr',
        fieldMode: true,
      });
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.language).toBe('en');
    expect(result.current.settings.fieldMode).toBe(false);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAppSettings());

    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should have correct default values', () => {
    const { result } = renderHook(() => useAppSettings());

    expect(result.current.settings).toMatchObject({
      language: 'en',
      theme: 'light',
      fieldMode: false,
      abstractionLevel: 'standard',
      showTechnicalIds: false,
      metadataComplexity: 'standard',
      autoSaveInterval: 30,
    });
  });
});
