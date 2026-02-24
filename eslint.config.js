import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import fieldStudioPlugin from './eslint-rules/index.js';

// =============================================================================
// Shared: Svelte 4 import bans (used by both .ts and .svelte file configs)
// =============================================================================
const svelte4ImportBans = {
  paths: [
    {
      name: 'svelte/store',
      message: 'Svelte 4 stores are banned. Use $state/$derived runes in .svelte.ts modules instead.',
    },
    {
      name: 'svelte',
      importNames: ['createEventDispatcher'],
      message: 'createEventDispatcher is Svelte 4. Use callback props (e.g. onclick) instead.',
    },
  ],
};

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // ============================================================================
  // Global ignores
  // ============================================================================
  {
    ignores: ['node_modules/**', 'dist/**', '*.config.js', '*.config.ts', 'eslint-rules/**'],
  },

  // ============================================================================
  // TypeScript files
  // ============================================================================
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // FSD architecture rules
      '@field-studio/max-lines-feature': ['warn', { moleculeMax: 300, organismMax: 500 }],

      // Svelte 5 convention rules (apply to .ts too for reactive modules)
      '@field-studio/no-reactive-destructuring': 'error',
      '@field-studio/no-effect-for-derived': 'warn',
      '@field-studio/typed-context-keys': 'warn',

      // Exhaustiveness enforcement
      '@field-studio/exhaustive-switch': 'warn',

      // Migration tracking
      '@field-studio/no-migration-stub': 'warn',

      // FSD layer import restrictions + Svelte 4 bans
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/entities/*', '@/src/features/*', '@/src/widgets/*', '@/src/app/*'],
            message: 'Shared layer cannot import from higher FSD layers.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // Svelte files
  // ============================================================================
  {
    files: ['src/**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      svelte: sveltePlugin,
      '@typescript-eslint': tsPlugin,
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      // Svelte rules
      ...sveltePlugin.configs.recommended.rules,

      // FSD architecture rules
      '@field-studio/max-lines-feature': ['warn', { moleculeMax: 300, organismMax: 500 }],
      '@field-studio/component-props-validation': 'warn',
      '@field-studio/lifecycle-restrictions': 'error',
      '@field-studio/no-native-html-in-molecules': 'error',

      // Svelte 5 convention rules
      '@field-studio/no-svelte4-patterns': 'error',
      '@field-studio/no-tailwind-interpolation': 'warn',
      '@field-studio/prefer-semantic-elements': 'warn',
      '@field-studio/no-reactive-destructuring': 'error',
      '@field-studio/no-effect-for-derived': 'warn',
      '@field-studio/typed-context-keys': 'warn',

      // Accessibility & best practices
      '@field-studio/require-aria-for-icon-buttons': 'warn',
      '@field-studio/no-state-raw-for-primitives': 'warn',

      // Type safety at component boundaries
      '@field-studio/no-unsafe-type-cast-in-props': 'warn',

      // Exhaustiveness enforcement
      '@field-studio/exhaustive-switch': 'warn',

      // Type safety — prefer type guards over `as IIIFSubtype` casts
      '@field-studio/prefer-type-guards': 'warn',

      // Migration tracking
      '@field-studio/no-migration-stub': 'warn',

      // FSD layer import restrictions + Svelte 4 bans
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/entities/*', '@/src/features/*', '@/src/widgets/*', '@/src/app/*'],
            message: 'Shared layer cannot import from higher FSD layers.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // Viewer atom override — prevent OSD imports in atoms
  // ============================================================================
  {
    files: [
      'src/features/viewer/ui/atoms/**/*.ts',
      'src/features/viewer/ui/atoms/**/*.svelte',
      'src/shared/ui/atoms/**/*.ts',
      'src/shared/ui/atoms/**/*.svelte',
    ],
    plugins: {
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      '@field-studio/viewer-no-osd-in-atoms': 'error',
    },
  },

  // ============================================================================
  // Entity layer overrides — can import shared, not features/widgets/app
  // ============================================================================
  {
    files: ['src/entities/**/*.ts', 'src/entities/**/*.svelte'],
    rules: {
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/features/*', '@/src/widgets/*', '@/src/app/*'],
            message: 'Entity layer cannot import from features, widgets, or app layers.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // Feature layer overrides — can import shared + entities, not widgets/app
  // ============================================================================
  {
    files: ['src/features/**/*.ts', 'src/features/**/*.svelte'],
    rules: {
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/widgets/*', '@/src/app/*'],
            message: 'Feature layer cannot import from widgets or app layers.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // Widget layer overrides — can import shared + entities + features, not app
  // ============================================================================
  {
    files: ['src/widgets/**/*.ts', 'src/widgets/**/*.svelte'],
    rules: {
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/app/*'],
            message: 'Widget layer cannot import from app layer.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // App layer overrides — can import from all lower layers
  // ============================================================================
  {
    files: ['src/app/**/*.ts', 'src/app/**/*.svelte'],
    rules: {
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        // App layer has no FSD restrictions (top of the hierarchy)
      }],
    },
  },

  // ============================================================================
  // Store bridge — intentionally imports from entities (vault adapter)
  // Svelte 4 import bans still apply here
  // ============================================================================
  {
    files: ['src/shared/stores/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
        patterns: [
          {
            group: ['@/src/features/*', '@/src/widgets/*', '@/src/app/*'],
            message: 'Shared stores can import from entities (vault adapter) but not from features, widgets, or app layers.',
          },
        ],
      }],
    },
  },

  // ============================================================================
  // Test files — relaxed rules
  // ============================================================================
  {
    files: ['**/__tests__/**', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@field-studio/max-lines-feature': 'off',
      '@field-studio/component-props-validation': 'off',
      '@field-studio/lifecycle-restrictions': 'off',
      '@field-studio/no-native-html-in-molecules': 'off',
      '@field-studio/no-reactive-destructuring': 'off',
      '@field-studio/no-effect-for-derived': 'off',
      '@field-studio/typed-context-keys': 'off',
      '@field-studio/prefer-type-guards': 'off',
      '@field-studio/no-migration-stub': 'off',
      // Test files can import from any FSD layer
      'no-restricted-imports': ['error', {
        ...svelte4ImportBans,
      }],
    },
  },
];
