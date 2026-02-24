/**
 * Contextual Class Names (cx) Contract Tests
 *
 * Verifies that all theme class maps (LIGHT, FIELD, THEME) provide every key
 * defined in the ContextualClassNames interface. Catches: a new theme variant
 * forgets to define a key that a component references.
 */

import { describe, it, expect } from 'vitest';
import type { ContextualClassNames } from '../contextual-styles';
import {
  LIGHT_CLASSES,
  FIELD_CLASSES,
  THEME_CLASSES,
  getContextualClasses,
} from '../contextual-styles';

// ═══════════════════════════════════════════════════════════════════════
// Required keys from ContextualClassNames interface
// ═══════════════════════════════════════════════════════════════════════

/**
 * All keys that the ContextualClassNames interface defines.
 * 3 required (surface, text, accent) + all optional keys.
 * If a new key is added to the interface, it must be added here too —
 * the "interface keys match" test below will catch discrepancies.
 */
const REQUIRED_KEYS: (keyof ContextualClassNames)[] = ['surface', 'text', 'accent'];

const ALL_KEYS: (keyof ContextualClassNames)[] = [
  // Required
  'surface', 'text', 'accent',
  // Optional tokens used by components
  'textMuted', 'border', 'input', 'label', 'divider',
  'active', 'inactive', 'warningBg', 'headerBg',
  'danger', 'dangerHover', 'subtleBg', 'subtleText',
  'kbd', 'iconButton', 'accentBadge', 'searchInput',
  'thumbnailBg', 'headingSize', 'pageBg',
  'svgStroke', 'svgFill',
  'canvasBg', 'gridBg', 'gridLine',
  'buttonSurface', 'placeholderBg', 'placeholderIcon',
  'separator', 'focusRing', 'svgAccent',
  'viewTitle', 'sectionHeading', 'bodyText', 'captionText', 'microLabel',
  'selected', 'selectedText',
];

// ═══════════════════════════════════════════════════════════════════════
// Contract: all theme maps provide every key
// ═══════════════════════════════════════════════════════════════════════

describe('cx contract completeness', () => {
  const themes: [string, ContextualClassNames][] = [
    ['LIGHT_CLASSES', LIGHT_CLASSES],
    ['FIELD_CLASSES', FIELD_CLASSES],
    ['THEME_CLASSES', THEME_CLASSES],
  ];

  for (const [name, classes] of themes) {
    describe(name, () => {
      it('provides all required keys with non-empty values', () => {
        for (const key of REQUIRED_KEYS) {
          expect(classes[key], `${name}.${key} should be a non-empty string`).toBeTruthy();
        }
      });

      it('provides all optional keys with non-empty values', () => {
        for (const key of ALL_KEYS) {
          expect(classes[key], `${name}.${key} should be defined`).toBeDefined();
          expect(typeof classes[key], `${name}.${key} should be a string`).toBe('string');
          expect(classes[key], `${name}.${key} should not be empty`).not.toBe('');
        }
      });
    });
  }

  it('all theme maps have identical key sets', () => {
    const lightKeys = Object.keys(LIGHT_CLASSES).sort();
    const fieldKeys = Object.keys(FIELD_CLASSES).sort();
    const themeKeys = Object.keys(THEME_CLASSES).sort();

    expect(lightKeys).toEqual(fieldKeys);
    expect(lightKeys).toEqual(themeKeys);
  });

  it('ALL_KEYS matches actual keys in LIGHT_CLASSES', () => {
    const actualKeys = Object.keys(LIGHT_CLASSES).sort();
    const expectedKeys = [...ALL_KEYS].sort();
    expect(expectedKeys).toEqual(actualKeys);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Contract: no key has undefined or null value
// ═══════════════════════════════════════════════════════════════════════

describe('cx value constraints', () => {
  const themes: [string, ContextualClassNames][] = [
    ['LIGHT_CLASSES', LIGHT_CLASSES],
    ['FIELD_CLASSES', FIELD_CLASSES],
    ['THEME_CLASSES', THEME_CLASSES],
  ];

  for (const [name, classes] of themes) {
    it(`${name}: no value is null or undefined`, () => {
      for (const [key, value] of Object.entries(classes)) {
        expect(value, `${name}.${key}`).not.toBeNull();
        expect(value, `${name}.${key}`).not.toBeUndefined();
      }
    });

    it(`${name}: surface classes contain bg- token`, () => {
      expect(classes.surface).toMatch(/bg-/);
    });

    it(`${name}: text classes contain text- token`, () => {
      expect(classes.text).toMatch(/text-/);
    });

    it(`${name}: accent classes contain text- token`, () => {
      expect(classes.accent).toMatch(/text-/);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Contract: getContextualClasses returns valid theme
// ═══════════════════════════════════════════════════════════════════════

describe('getContextualClasses always returns complete theme', () => {
  const themeNames = ['light', 'field', 'dark', 'custom', 'nonexistent'];

  for (const name of themeNames) {
    it(`"${name}" theme provides all keys`, () => {
      const classes = getContextualClasses(name);
      for (const key of ALL_KEYS) {
        expect(classes[key], `getContextualClasses("${name}").${key}`).toBeDefined();
      }
    });
  }
});
