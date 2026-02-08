import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./ui/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'text-nb-blue',
    'text-nb-red',
    'text-nb-yellow',
    'text-nb-green',
    'text-nb-pink',
    'text-nb-orange',
    'text-nb-purple',
    'bg-nb-blue',
    'bg-nb-red',
    'bg-nb-yellow',
    'bg-nb-green',
    'bg-nb-pink',
    'bg-nb-cream',
    'border-nb-black',
    'border-nb-yellow',
    'shadow-brutal',
    'shadow-brutal-sm',
    'shadow-brutal-lg',
    'shadow-brutal-active',
    // Legacy mode-accent classes still used in some components
    'text-mode-accent',
    'bg-mode-accent',
    'border-mode-accent',
    // Theme-aware classes
    'bg-theme-surface',
    'bg-theme-surface-alt',
    'text-theme-text',
    'text-theme-text-muted',
    'text-theme-accent',
    'border-theme-border',
    'shadow-theme',
    'shadow-theme-sm',
    'shadow-theme-lg',
  ],
  darkMode: 'class',
  theme: {
    // Override default border radius to 0
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px', // keep for circular avatars
    },
    extend: {
      colors: {
        // Neobrutalist palette
        'nb-black': '#000000',
        'nb-white': '#FFFFFF',
        'nb-cream': '#FFF8E7',
        'nb-blue': '#0055FF',
        'nb-red': '#FF3333',
        'nb-yellow': '#FFE500',
        'nb-green': '#00CC66',
        'nb-pink': '#FF66B2',
        'nb-orange': '#FF8800',
        'nb-purple': '#8833FF',
        // Legacy IIIF colors (still referenced in some model code)
        'iiif-blue': '#005596',
        'iiif-red': '#E31C24',
        // Mode accent (CSS variable driven)
        'mode-accent': 'var(--nb-accent)',

        // ── Theme-aware semantic aliases (driven by --theme-* CSS vars) ──
        'theme-surface':     'var(--theme-surface-primary)',
        'theme-surface-alt': 'var(--theme-surface-secondary)',
        'theme-surface-elevated': 'var(--theme-surface-elevated)',
        'theme-text':        'var(--theme-text-primary)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-muted':  'var(--theme-text-muted)',
        'theme-text-inverse': 'var(--theme-text-inverse)',
        'theme-accent':      'var(--theme-accent-primary)',
        'theme-accent-hover': 'var(--theme-accent-hover)',
        'theme-accent-subtle': 'var(--theme-accent-subtle)',
        'theme-border':      'var(--theme-border-default)',
        'theme-border-subtle': 'var(--theme-border-subtle)',
        'theme-border-focus': 'var(--theme-border-focus)',
        'theme-success':     'var(--theme-success-color)',
        'theme-warning':     'var(--theme-warning-color)',
        'theme-error':       'var(--theme-error-color)',
        'theme-info':        'var(--theme-info-color)',
        'theme-selection-bg': 'var(--theme-selection-bg)',
        'theme-selection-text': 'var(--theme-selection-text)',
        // IIIF resource type colors
        'theme-resource-collection': 'var(--theme-resource-collection)',
        'theme-resource-manifest':   'var(--theme-resource-manifest)',
        'theme-resource-canvas':     'var(--theme-resource-canvas)',
        'theme-resource-range':      'var(--theme-resource-range)',
        'theme-resource-annotation': 'var(--theme-resource-annotation)',
        // Form input colors
        'theme-input-bg': 'var(--theme-input-bg)',
        'theme-input-border': 'var(--theme-input-border)',
        'theme-input-placeholder': 'var(--theme-input-placeholder)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '1px',
        '0': '0',
        '1': '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
        // Theme-aware border widths
        'theme-thin': 'var(--theme-border-width-thin)',
        'theme-thick': 'var(--theme-border-width-thick)',
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0 0 #000',
        'brutal': '4px 4px 0 0 #000',
        'brutal-lg': '6px 6px 0 0 #000',
        'brutal-active': '1px 1px 0 0 #000',
        // Field mode brutal shadows (yellow)
        'brutal-field-sm': '2px 2px 0 0 #FFE500',
        'brutal-field': '4px 4px 0 0 #FFE500',
        'brutal-field-lg': '6px 6px 0 0 #FFE500',
        'brutal-field-active': '1px 1px 0 0 #FFE500',
        // Theme-aware shadows (driven by --theme-* CSS vars)
        'theme-sm': 'var(--theme-shadow-sm)',
        'theme': 'var(--theme-shadow-base)',
        'theme-lg': 'var(--theme-shadow-lg)',
        'theme-active': 'var(--theme-shadow-active)',
      },
      spacing: {
        'header': 'var(--header-h)',
        'header-compact': 'var(--header-compact-h)',
        'status-bar': 'var(--status-bar-h)',
        'inspector': 'var(--inspector-w)',
        'filmstrip': 'var(--filmstrip-w)',
        // Theme-aware spacing
        'theme-xs': 'var(--theme-spacing-xs)',
        'theme-sm': 'var(--theme-spacing-sm)',
        'theme-md': 'var(--theme-spacing-md)',
        'theme-lg': 'var(--theme-spacing-lg)',
        'theme-xl': 'var(--theme-spacing-xl)',
      },
      fontSize: {
        // Neobrutalist type scale — weight controlled independently via font-* classes
        'nb-micro':   ['0.5625rem', { lineHeight: '1.3' }],   // 9px
        'nb-caption':  ['0.625rem',  { lineHeight: '1.3' }],   // 10px
        'nb-xs':      ['0.75rem',   { lineHeight: '1.2' }],   // 12px
        'nb-sm':      ['0.875rem',  { lineHeight: '1.3' }],   // 14px
        'nb-base':    ['1rem',      { lineHeight: '1.4' }],   // 16px
        'nb-lg':      ['1.25rem',   { lineHeight: '1.3' }],   // 20px
        'nb-xl':      ['1.5rem',    { lineHeight: '1.2' }],   // 24px
        'nb-2xl':     ['2rem',      { lineHeight: '1.1' }],   // 32px
        'nb-3xl':     ['2.5rem',    { lineHeight: '1.0' }],   // 40px
        // Theme-aware type scale
        'theme-xs': 'var(--theme-font-size-xs)',
        'theme-sm': 'var(--theme-font-size-sm)',
        'theme-md': 'var(--theme-font-size-md)',
        'theme-lg': 'var(--theme-font-size-lg)',
      },
      transitionDuration: {
        '100': '100ms',
      },
      transitionTimingFunction: {
        'linear': 'linear',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Neobrutalist utility plugin
    plugin(function({ addUtilities }) {
      addUtilities({
        '.nb-border': {
          border: '2px solid #000',
        },
        '.nb-border-4': {
          border: '4px solid #000',
        },
        '.nb-shadow': {
          boxShadow: '4px 4px 0 0 #000',
        },
        '.nb-shadow-sm': {
          boxShadow: '2px 2px 0 0 #000',
        },
        '.nb-shadow-lg': {
          boxShadow: '6px 6px 0 0 #000',
        },
        '.nb-hover': {
          transition: 'all 0.1s linear',
          '&:hover': {
            transform: 'translate(-1px, -1px)',
            boxShadow: '5px 5px 0 0 #000',
          },
        },
        '.nb-active': {
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: '1px 1px 0 0 #000',
          },
        },
        // Field mode variants (deprecated — prefer nb-border-theme etc.)
        '.nb-border-field': {
          border: '2px solid #FFE500',
        },
        '.nb-shadow-field': {
          boxShadow: '4px 4px 0 0 #FFE500',
        },
        '.nb-hover-field': {
          transition: 'all 0.1s linear',
          '&:hover': {
            transform: 'translate(-1px, -1px)',
            boxShadow: '5px 5px 0 0 #FFE500',
          },
        },
        '.nb-active-field': {
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: '1px 1px 0 0 #FFE500',
          },
        },
        // ── Theme-aware utilities (driven by --theme-* CSS vars) ──
        '.nb-border-theme': {
          border: '2px solid var(--theme-border-default)',
        },
        '.nb-border-theme-4': {
          border: '4px solid var(--theme-border-default)',
        },
        '.nb-shadow-theme': {
          boxShadow: 'var(--theme-shadow-base)',
        },
        '.nb-shadow-theme-sm': {
          boxShadow: 'var(--theme-shadow-sm)',
        },
        '.nb-shadow-theme-lg': {
          boxShadow: 'var(--theme-shadow-lg)',
        },
        '.nb-hover-theme': {
          transition: 'all 0.1s linear',
          '&:hover': {
            transform: 'translate(-1px, -1px)',
            boxShadow: 'var(--theme-shadow-lg)',
          },
        },
        '.nb-active-theme': {
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: 'var(--theme-shadow-active)',
          },
        },
        // Uppercase monospace label utility
        '.nb-label': {
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '0.6875rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
        // Small label utility (9px, semibold, mono, uppercase)
        '.nb-border-subtle': {
          border: 'var(--theme-border-width-thin) solid var(--theme-border-subtle)',
        },
        '.nb-label-sm': {
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '0.5625rem',
          fontWeight: '600',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
      });
    }),
  ],
}
