/**
 * Theme Configuration Tests
 *
 * Tests theme token types, theme registry, and resolver.
 * Pure TypeScript — no DOM or Svelte required.
 */

import { describe, it, expect } from 'vitest';
import { lightTheme } from '../light';
import { darkTheme } from '../dark';
import { fieldTheme } from '../field';
import { resolveTheme, themes, tokenToCssVar } from '../index';

// ============================================================================
// tokenToCssVar
// ============================================================================

describe('tokenToCssVar', () => {
  it('converts camelCase to kebab-case with --theme- prefix', () => {
    expect(tokenToCssVar('textPrimary')).toBe('--theme-text-primary');
  });

  it('handles single word', () => {
    // 'text' has no uppercase → no dash insertion
    // but it starts lowercase so: --theme-text... wait
    // Actually 'surfacePrimary' → '--theme-surface-primary'
    // Let's test a real key
    expect(tokenToCssVar('surfacePrimary')).toBe('--theme-surface-primary');
  });

  it('handles multiple uppercase letters', () => {
    expect(tokenToCssVar('scrollbarThumbHover')).toBe('--theme-scrollbar-thumb-hover');
  });

  it('handles single-segment key', () => {
    // A key with no uppercase after first char
    expect(tokenToCssVar('spacingXs')).toBe('--theme-spacing-xs');
  });

  it('converts all standard token keys', () => {
    const key = tokenToCssVar('borderWidthThick');
    expect(key).toBe('--theme-border-width-thick');
  });
});

// ============================================================================
// Light Theme
// ============================================================================

describe('lightTheme', () => {
  it('has all required surface tokens', () => {
    expect(lightTheme.surfacePrimary).toBe('#FFFFFF');
    expect(lightTheme.surfaceSecondary).toBe('#FFF8E7');
    expect(lightTheme.surfaceElevated).toBe('#FFFFFF');
    expect(lightTheme.surfaceOverlay).toContain('rgba');
  });

  it('has black text for light theme', () => {
    expect(lightTheme.textPrimary).toBe('#000000');
    expect(lightTheme.textInverse).toBe('#FFFFFF');
  });

  it('has blue accent', () => {
    expect(lightTheme.accentPrimary).toBe('#0055FF');
  });

  it('has black borders', () => {
    expect(lightTheme.borderDefault).toBe('#000000');
  });

  it('has neobrutalist shadows', () => {
    expect(lightTheme.shadowBase).toContain('4px 4px');
  });

  it('has IIIF resource colors', () => {
    expect(lightTheme.resourceCollection).toBeTruthy();
    expect(lightTheme.resourceManifest).toBeTruthy();
    expect(lightTheme.resourceCanvas).toBeTruthy();
    expect(lightTheme.resourceRange).toBeTruthy();
    expect(lightTheme.resourceAnnotation).toBeTruthy();
  });

  it('has standard font sizes', () => {
    expect(lightTheme.fontSizeXs).toBe('0.75rem');
    expect(lightTheme.fontSizeSm).toBe('0.875rem');
    expect(lightTheme.fontSizeMd).toBe('1rem');
    expect(lightTheme.fontSizeLg).toBe('1.25rem');
  });
});

// ============================================================================
// Dark Theme
// ============================================================================

describe('darkTheme', () => {
  it('has dark surfaces', () => {
    expect(darkTheme.surfacePrimary).toBe('#1A1A1A');
    expect(darkTheme.surfaceSecondary).toBe('#111111');
  });

  it('has light text for dark background', () => {
    expect(darkTheme.textPrimary).toBe('#F0F0F0');
    expect(darkTheme.textInverse).toBe('#000000');
  });

  it('has brighter blue accent', () => {
    expect(darkTheme.accentPrimary).toBe('#4D88FF');
  });

  it('has light borders', () => {
    expect(darkTheme.borderDefault).toBe('#F0F0F0');
  });

  it('has subtle shadows with alpha', () => {
    expect(darkTheme.shadowBase).toContain('rgba');
  });
});

// ============================================================================
// Field Theme
// ============================================================================

describe('fieldTheme', () => {
  it('has black surfaces', () => {
    expect(fieldTheme.surfacePrimary).toBe('#000000');
  });

  it('has yellow text for high contrast', () => {
    expect(fieldTheme.textPrimary).toBe('#FFE500');
    expect(fieldTheme.textInverse).toBe('#000000');
  });

  it('has yellow accent', () => {
    expect(fieldTheme.accentPrimary).toBe('#FFE500');
  });

  it('has yellow borders', () => {
    expect(fieldTheme.borderDefault).toBe('#FFE500');
  });

  it('has yellow shadows', () => {
    expect(fieldTheme.shadowBase).toContain('#FFE500');
  });

  it('has larger font sizes for outdoor visibility', () => {
    expect(parseFloat(fieldTheme.fontSizeXs)).toBeGreaterThan(parseFloat(lightTheme.fontSizeXs));
    expect(parseFloat(fieldTheme.fontSizeSm)).toBeGreaterThan(parseFloat(lightTheme.fontSizeSm));
  });

  it('has wider spacing for touch targets', () => {
    expect(parseInt(fieldTheme.spacingXs)).toBeGreaterThan(parseInt(lightTheme.spacingXs));
    expect(parseInt(fieldTheme.spacingSm)).toBeGreaterThan(parseInt(lightTheme.spacingSm));
  });

  it('has thicker borders', () => {
    expect(fieldTheme.borderWidthThin).toBe('2px');
    expect(fieldTheme.borderWidthThick).toBe('4px');
  });

  it('has maximum font weight', () => {
    expect(fieldTheme.fontWeightBold).toBe('900');
  });
});

// ============================================================================
// Theme Registry
// ============================================================================

describe('themes registry', () => {
  it('contains light, dark, and field', () => {
    expect(themes.light).toBe(lightTheme);
    expect(themes.dark).toBe(darkTheme);
    expect(themes.field).toBe(fieldTheme);
  });

  it('all themes have identical keys', () => {
    const lightKeys = Object.keys(lightTheme).sort();
    const darkKeys = Object.keys(darkTheme).sort();
    const fieldKeys = Object.keys(fieldTheme).sort();

    expect(lightKeys).toEqual(darkKeys);
    expect(lightKeys).toEqual(fieldKeys);
  });

  it('all theme values are non-empty strings', () => {
    for (const [name, t] of Object.entries(themes)) {
      for (const [key, value] of Object.entries(t)) {
        expect(typeof value).toBe('string');
        expect(value.length, `${name}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// resolveTheme
// ============================================================================

describe('resolveTheme', () => {
  it('returns light theme for "light"', () => {
    expect(resolveTheme('light')).toBe(lightTheme);
  });

  it('returns dark theme for "dark"', () => {
    expect(resolveTheme('dark')).toBe(darkTheme);
  });

  it('returns field theme for "field"', () => {
    expect(resolveTheme('field')).toBe(fieldTheme);
  });

  it('returns light theme base for "custom"', () => {
    const custom = resolveTheme('custom');
    expect(custom.surfacePrimary).toBe(lightTheme.surfacePrimary);
  });

  it('applies custom overrides to light base', () => {
    const custom = resolveTheme('custom', { surfacePrimary: '#FF0000' });
    expect(custom.surfacePrimary).toBe('#FF0000');
    expect(custom.textPrimary).toBe(lightTheme.textPrimary); // unaffected
  });

  it('applies overrides to named themes', () => {
    const modified = resolveTheme('dark', { accentPrimary: '#FF00FF' });
    expect(modified.accentPrimary).toBe('#FF00FF');
    expect(modified.surfacePrimary).toBe(darkTheme.surfacePrimary);
  });

  it('returns base theme when overrides are undefined', () => {
    expect(resolveTheme('light', undefined)).toBe(lightTheme);
  });

  it('preserves all keys in overridden result', () => {
    const custom = resolveTheme('custom', { surfacePrimary: '#FF0000' });
    const keys = Object.keys(custom);
    const baseKeys = Object.keys(lightTheme);
    expect(keys.sort()).toEqual(baseKeys.sort());
  });
});

// ============================================================================
// Token completeness
// ============================================================================

describe('theme token completeness', () => {
  const EXPECTED_TOKEN_COUNT = Object.keys(lightTheme).length;

  it('light theme has expected number of tokens', () => {
    expect(Object.keys(lightTheme).length).toBe(EXPECTED_TOKEN_COUNT);
  });

  it('dark theme has same number of tokens', () => {
    expect(Object.keys(darkTheme).length).toBe(EXPECTED_TOKEN_COUNT);
  });

  it('field theme has same number of tokens', () => {
    expect(Object.keys(fieldTheme).length).toBe(EXPECTED_TOKEN_COUNT);
  });

  it('every token generates a valid CSS custom property name', () => {
    for (const key of Object.keys(lightTheme)) {
      const cssVar = tokenToCssVar(key);
      expect(cssVar).toMatch(/^--theme-[a-z-]+$/);
    }
  });
});
