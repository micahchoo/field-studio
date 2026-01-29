/**
 * Vitest Test Setup
 * 
 * This file runs before all tests. Use it to:
 * - Configure global mocks
 * - Set up test environment
 * - Add custom matchers
 */

import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';
import { vi } from 'vitest';

// Mock DOMPurify module before any imports use it
const mockDOMPurify = {
  sanitize: (input: string | unknown, config?: unknown): string | unknown => {
    if (typeof input !== 'string') {
      return String(input || '');
    }
    
    // Basic HTML sanitization for tests
    if (typeof config === 'object' && config !== null) {
      const configObj = config as Record<string, unknown>;
      
      // If ALLOWED_TAGS is empty array, strip all HTML
      if (Array.isArray(configObj.ALLOWED_TAGS) && configObj.ALLOWED_TAGS.length === 0) {
        return input.replace(/<[^>]*>/g, '');
      }
      
      // If specific tags are allowed, keep them and remove script tags
      const allowedTags = configObj.ALLOWED_TAGS as string[] || [];
      
      // Remove script tags and their content first
      let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove event handlers from all tags
      sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '');
      sanitized = sanitized.replace(/\son\w+='[^']*'/gi, '');
      
      // Remove javascript: URLs
      sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');
      
      // Keep only allowed tags - simple iterative approach
      if (allowedTags.length > 0) {
        const allowedSet = new Set(allowedTags.map(t => t.toLowerCase()));
        const allTagsPattern = /<(\/?)(\w+)[^>]*>/gi;
        sanitized = sanitized.replace(allTagsPattern, (match, slash, tagName) => {
          if (allowedSet.has(tagName.toLowerCase())) {
            return match;
          }
          return '';
        });
      }
      
      return sanitized;
    }
    
    // Default: basic HTML sanitization - remove script tags only
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  },
  addHook: () => {},
  removeHook: () => {},
  removeAllHooks: () => {},
  isValid: () => true,
  version: '3.0.0',
  removed: [],
  isSupported: true,
};

vi.mock('dompurify', () => ({
  default: mockDOMPurify,
}));

// Also set it globally for any direct access
(global as any).DOMPurify = mockDOMPurify;

// Ensure indexedDB is available globally for the idb library
global.indexedDB = indexedDB;
global.IDBKeyRange = indexedDB.IDBKeyRange;

// Mock crypto.randomUUID for consistent testing
if (!global.crypto) {
  global.crypto = {} as Crypto;
}
if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => 'test-uuid-1234-5678-90ab-cdef12345678',
    writable: true,
    configurable: true,
  });
}

// Mock window object if needed
if (typeof window !== 'undefined') {
  (window as any).DOMPurify = mockDOMPurify;
}

// Mock console methods to reduce noise during tests
// Uncomment to suppress console output during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

// Add any global test utilities here
export {};
