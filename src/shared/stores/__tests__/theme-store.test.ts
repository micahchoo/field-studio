/**
 * Theme Reactive Module Tests
 *
 * Validates the Svelte 5 reactive module for theme state.
 * Tests reactive getters, setTheme mutations, token resolution,
 * custom overrides, and CSS var injection utilities.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { theme, applyTokensToElement } from '@/src/shared/stores/theme.svelte';
import { LIGHT_CLASSES, FIELD_CLASSES, THEME_CLASSES } from '@/src/shared/lib/contextual-styles';
import { lightTheme } from '@/src/shared/config/themes/light';
import { darkTheme } from '@/src/shared/config/themes/dark';
import { fieldTheme } from '@/src/shared/config/themes/field';

beforeEach(() => {
  // Reset to default theme
  theme.setTheme('light');
});

describe('theme.name', () => {
  it('defaults to "light"', () => {
    expect(theme.name).toBe('light');
  });

  it('updates when setTheme is called', () => {
    theme.setTheme('field');
    expect(theme.name).toBe('field');
  });

  it('accepts custom theme names', () => {
    theme.setTheme('my-custom-dark');
    expect(theme.name).toBe('my-custom-dark');
  });
});

describe('theme.cx', () => {
  it('returns LIGHT_CLASSES for light theme', () => {
    theme.setTheme('light');
    expect(theme.cx).toBe(LIGHT_CLASSES);
  });

  it('returns FIELD_CLASSES for field theme', () => {
    theme.setTheme('field');
    expect(theme.cx).toBe(FIELD_CLASSES);
  });

  it('returns THEME_CLASSES for dark theme', () => {
    theme.setTheme('dark');
    expect(theme.cx).toBe(THEME_CLASSES);
  });

  it('returns THEME_CLASSES for custom themes', () => {
    theme.setTheme('my-custom');
    expect(theme.cx).toBe(THEME_CLASSES);
  });

  it('updates cx when theme changes', () => {
    expect(theme.cx).toBe(LIGHT_CLASSES);
    theme.setTheme('field');
    expect(theme.cx).toBe(FIELD_CLASSES);
    theme.setTheme('dark');
    expect(theme.cx).toBe(THEME_CLASSES);
  });
});

describe('theme.fieldMode', () => {
  it('is false for light theme', () => {
    theme.setTheme('light');
    expect(theme.fieldMode).toBe(false);
  });

  it('is true for field theme', () => {
    theme.setTheme('field');
    expect(theme.fieldMode).toBe(true);
  });

  it('is false for dark theme', () => {
    theme.setTheme('dark');
    expect(theme.fieldMode).toBe(false);
  });

  it('is false for custom themes', () => {
    theme.setTheme('my-custom');
    expect(theme.fieldMode).toBe(false);
  });
});

describe('theme.tokens', () => {
  it('returns lightTheme tokens for light theme', () => {
    theme.setTheme('light');
    expect(theme.tokens).toEqual(lightTheme);
  });

  it('returns darkTheme tokens for dark theme', () => {
    theme.setTheme('dark');
    expect(theme.tokens).toEqual(darkTheme);
  });

  it('returns fieldTheme tokens for field theme', () => {
    theme.setTheme('field');
    expect(theme.tokens).toEqual(fieldTheme);
  });

  it('applies custom overrides', () => {
    theme.setTheme('custom', { surfacePrimary: '#FF0000' });
    expect(theme.tokens.surfacePrimary).toBe('#FF0000');
    // Other tokens from light base
    expect(theme.tokens.textPrimary).toBe(lightTheme.textPrimary);
  });

  it('updates tokens on theme change', () => {
    expect(theme.tokens.textPrimary).toBe('#000000'); // light
    theme.setTheme('dark');
    expect(theme.tokens.textPrimary).toBe('#F0F0F0'); // dark
    theme.setTheme('field');
    expect(theme.tokens.textPrimary).toBe('#FFE500'); // field
  });
});

describe('theme.getToken', () => {
  it('returns a specific token value', () => {
    theme.setTheme('light');
    expect(theme.getToken('accentPrimary')).toBe('#0055FF');
  });

  it('reflects current theme', () => {
    theme.setTheme('field');
    expect(theme.getToken('accentPrimary')).toBe('#FFE500');
  });
});

describe('theme.setTheme with custom overrides', () => {
  it('applies overrides to custom theme', () => {
    theme.setTheme('custom', { textPrimary: '#123456' });
    expect(theme.tokens.textPrimary).toBe('#123456');
  });

  it('clears overrides on next setTheme without overrides', () => {
    theme.setTheme('custom', { textPrimary: '#123456' });
    theme.setTheme('light');
    expect(theme.tokens.textPrimary).toBe('#000000');
  });

  it('replaces overrides on subsequent setTheme with different overrides', () => {
    theme.setTheme('custom', { textPrimary: '#111' });
    theme.setTheme('custom', { textPrimary: '#222' });
    expect(theme.tokens.textPrimary).toBe('#222');
  });
});

describe('theme cx tokens for atom consumption', () => {
  it('provides border token for Tag', () => {
    theme.setTheme('light');
    expect(theme.cx.border).toBe('border-nb-black');

    theme.setTheme('field');
    expect(theme.cx.border).toBe('border-nb-yellow');
  });

  it('provides separator token for Divider', () => {
    theme.setTheme('light');
    expect(theme.cx.separator).toBe('bg-nb-black');

    theme.setTheme('field');
    expect(theme.cx.separator).toBe('bg-nb-yellow');
  });

  it('provides active/inactive tokens for TabButtonBase', () => {
    theme.setTheme('light');
    expect(theme.cx.active).toContain('bg-nb-black');

    theme.setTheme('field');
    expect(theme.cx.active).toContain('bg-nb-yellow');
  });

  it('provides surface token for Panel', () => {
    theme.setTheme('light');
    expect(theme.cx.surface).toContain('bg-nb-white');

    theme.setTheme('field');
    expect(theme.cx.surface).toContain('bg-nb-black');
  });
});

describe('applyTokensToElement', () => {
  it('applies CSS custom properties to an element', () => {
    const el = document.createElement('div');
    applyTokensToElement(el, lightTheme, 'light');

    expect(el.style.getPropertyValue('--theme-text-primary')).toBe('#000000');
    expect(el.style.getPropertyValue('--theme-surface-primary')).toBe('#FFFFFF');
    expect(el.style.getPropertyValue('--theme-accent-primary')).toBe('#0055FF');
  });

  it('sets data-theme attribute', () => {
    const el = document.createElement('div');
    applyTokensToElement(el, darkTheme, 'dark');
    expect(el.dataset.theme).toBe('dark');
  });

  it('applies all tokens', () => {
    const el = document.createElement('div');
    applyTokensToElement(el, fieldTheme, 'field');

    // Spot check a few tokens
    expect(el.style.getPropertyValue('--theme-text-primary')).toBe('#FFE500');
    expect(el.style.getPropertyValue('--theme-border-default')).toBe('#FFE500');
  });
});
