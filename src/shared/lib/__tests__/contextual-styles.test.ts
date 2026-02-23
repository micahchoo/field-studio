/**
 * Contextual Styles Tests
 *
 * Tests the framework-agnostic theme class maps and getter function.
 * Pure TypeScript — no DOM required.
 */

import { describe, it, expect } from 'vitest';
import {
  LIGHT_CLASSES,
  FIELD_CLASSES,
  THEME_CLASSES,
  getContextualClasses,
  type ContextualClassNames,
} from '../contextual-styles';

describe('ContextualClassNames', () => {
  describe('LIGHT_CLASSES', () => {
    it('has all required properties', () => {
      expect(LIGHT_CLASSES.surface).toBeTruthy();
      expect(LIGHT_CLASSES.text).toBeTruthy();
      expect(LIGHT_CLASSES.accent).toBeTruthy();
    });

    it('uses nb-white/nb-black for light theme surface', () => {
      expect(LIGHT_CLASSES.surface).toContain('bg-nb-white');
      expect(LIGHT_CLASSES.surface).toContain('border-nb-black');
    });

    it('uses nb-black for text', () => {
      expect(LIGHT_CLASSES.text).toBe('text-nb-black');
    });

    it('uses nb-blue for accent', () => {
      expect(LIGHT_CLASSES.accent).toBe('text-nb-blue');
    });

    it('has header with cream bg and black border', () => {
      expect(LIGHT_CLASSES.headerBg).toContain('bg-nb-cream');
      expect(LIGHT_CLASSES.headerBg).toContain('border-nb-black');
    });

    it('has hex values for SVG tokens', () => {
      expect(LIGHT_CLASSES.svgStroke).toBe('#000000');
      expect(LIGHT_CLASSES.svgFill).toBe('#000000');
      expect(LIGHT_CLASSES.svgAccent).toBe('#0055FF');
    });

    it('uses nb-orange for selected state', () => {
      expect(LIGHT_CLASSES.selected).toContain('nb-orange');
    });
  });

  describe('FIELD_CLASSES', () => {
    it('uses nb-black/nb-yellow for field theme surface', () => {
      expect(FIELD_CLASSES.surface).toContain('bg-nb-black');
      expect(FIELD_CLASSES.surface).toContain('border-nb-yellow');
    });

    it('uses nb-yellow for text', () => {
      expect(FIELD_CLASSES.text).toBe('text-nb-yellow');
    });

    it('uses nb-yellow for accent', () => {
      expect(FIELD_CLASSES.accent).toBe('text-nb-yellow');
    });

    it('has yellow SVG tokens', () => {
      expect(FIELD_CLASSES.svgStroke).toBe('#FFE500');
      expect(FIELD_CLASSES.svgFill).toBe('#FFE500');
      expect(FIELD_CLASSES.svgAccent).toBe('#FFE500');
    });

    it('uses yellow for selected state', () => {
      expect(FIELD_CLASSES.selected).toContain('nb-yellow');
    });

    it('uses larger heading size', () => {
      expect(FIELD_CLASSES.headingSize).toBe('text-nb-xl');
    });
  });

  describe('THEME_CLASSES', () => {
    it('uses CSS custom property aliases', () => {
      expect(THEME_CLASSES.surface).toContain('bg-theme-surface');
      expect(THEME_CLASSES.text).toContain('text-theme-text');
      expect(THEME_CLASSES.accent).toContain('text-theme-accent');
    });

    it('uses var() for SVG tokens', () => {
      expect(THEME_CLASSES.svgStroke).toContain('var(--theme-');
      expect(THEME_CLASSES.svgFill).toContain('var(--theme-');
    });
  });

  describe('getContextualClasses', () => {
    it('returns LIGHT_CLASSES for "light"', () => {
      expect(getContextualClasses('light')).toBe(LIGHT_CLASSES);
    });

    it('returns FIELD_CLASSES for "field"', () => {
      expect(getContextualClasses('field')).toBe(FIELD_CLASSES);
    });

    it('returns THEME_CLASSES for "dark"', () => {
      expect(getContextualClasses('dark')).toBe(THEME_CLASSES);
    });

    it('returns THEME_CLASSES for custom themes', () => {
      expect(getContextualClasses('custom-theme')).toBe(THEME_CLASSES);
    });

    it('returns THEME_CLASSES for unknown themes', () => {
      expect(getContextualClasses('anything-else')).toBe(THEME_CLASSES);
    });
  });

  describe('all class sets have matching keys', () => {
    const lightKeys = Object.keys(LIGHT_CLASSES).sort();
    const fieldKeys = Object.keys(FIELD_CLASSES).sort();
    const themeKeys = Object.keys(THEME_CLASSES).sort();

    it('light and field have same keys', () => {
      expect(lightKeys).toEqual(fieldKeys);
    });

    it('light and theme have same keys', () => {
      expect(lightKeys).toEqual(themeKeys);
    });
  });
});
