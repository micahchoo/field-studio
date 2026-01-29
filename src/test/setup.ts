/**
 * Vitest Test Setup
 * 
 * This file runs before all tests. Use it to:
 * - Configure global mocks
 * - Set up test environment
 * - Add custom matchers
 */

import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';

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

// Mock DOMPurify for sanitization tests
const mockDOMPurify = {
  sanitize: (input: string | unknown, config?: unknown): string | unknown => {
    if (typeof input !== 'string') {
      return String(input || '');
    }
    
    // Basic HTML sanitization for tests
    if (typeof config === 'object' && config !== null) {
      const configObj = config as Record<string, unknown>;
      
      // If ALLOWED_TAGS is empty or not present, strip all HTML
      if (configObj.ALLOWED_TAGS === undefined || 
          (Array.isArray(configObj.ALLOWED_TAGS) && configObj.ALLOWED_TAGS.length === 0)) {
        // Strip all HTML tags
        return input.replace(/<[^>]*>/g, '');
      }
      
      // If specific tags are allowed, keep them and remove script tags
      const allowedTags = configObj.ALLOWED_TAGS as string[] || [];
      
      // Remove script tags and their content
      let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove event handlers from all tags
      sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '');
      sanitized = sanitized.replace(/\son\w+='[^']*'/gi, '');
      
      // Remove javascript: URLs
      sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');
      
      // For annotation config, handle TextualBody objects
      if (allowedTags.includes('p')) {
        // Keep allowed tags, remove others
        const tagPattern = new RegExp(`<(?!/?(?:${allowedTags.join('|')})[^>]*)[^>]+>`, 'gi');
        sanitized = sanitized.replace(tagPattern, '');
      }
      
      return sanitized;
    }
    
    // Default: basic HTML sanitization
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

// Mock window object if needed
if (typeof window !== 'undefined') {
  (window as any).DOMPurify = mockDOMPurify;
}

// Also mock it for module imports
(global as any).DOMPurify = mockDOMPurify;

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
