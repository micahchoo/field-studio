/**
 * Vitest Test Setup
 *
 * Initializes testing environment for all test suites
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Initialize DOMPurify for test environment
import DOMPurify from 'dompurify';
if (typeof window !== 'undefined') {
  DOMPurify.setConfig({ RETURN_TRUSTED_TYPE: false });
}

// Cleanup after each test case (for React Testing Library)
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (for responsive hooks)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (for virtualization hooks)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// Mock ResizeObserver (for responsive components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;

// Mock URL.createObjectURL (for file handling)
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock crypto.subtle (for SHA-256 hashing in tests)
if (!global.crypto) {
  global.crypto = {} as Crypto;
}

if (!global.crypto.subtle) {
  const { subtle } = await import('node:crypto').then(crypto => ({
    subtle: crypto.webcrypto.subtle,
  }));
  global.crypto.subtle = subtle;
}

// Mock navigator.storage (for quota tests)
if (!global.navigator.storage) {
  Object.defineProperty(global.navigator, 'storage', {
    value: {
      estimate: vi.fn().mockResolvedValue({
        usage: 0,
        quota: 1000000000, // 1 GB default
      }),
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockResolvedValue(false),
    },
    writable: true,
  });
}

// Suppress console.warn/error in tests unless explicitly needed
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: unknown[]) => {
  // Allow through warnings about test data not being available
  if (args[0]?.toString().includes('not found') || args[0]?.toString().includes('not available')) {
    originalWarn(...args);
  }
  // Suppress other warnings
};

console.error = (...args: unknown[]) => {
  // Allow through actual test failures
  if (args[0]?.toString().includes('FAIL') || args[0]?.toString().includes('Error:')) {
    originalError(...args);
  }
  // Suppress React warnings and other noise
};
