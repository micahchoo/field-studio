/**
 * ESLint Configuration - IIIF Field Archive Studio
 *
 * Enforces Atomic Design + Feature-Sliced Design (FSD) architecture rules
 * from docs/Atomic System Architecture.md and docs/Atomic System Implementation plan.md
 *
 * QUALITY GATES (Section 5 of Architecture doc):
 * | Level     | Constraint                                    | Enforcement                          |
 * |-----------|-----------------------------------------------|--------------------------------------|
 * | Atoms     | No hook calls; only props + tokens            | no-restricted-imports for all hooks  |
 * | Molecules | Local state only; no context/domain hooks     | no-restricted-imports for context    |
 * | Organisms | Domain hooks OK; no context hooks             | no-restricted-imports for context    |
 * | Templates | Context providers only; no data fetching      | File location enforcement            |
 * | Pages     | Composition only                              | Code review                          |
 *
 * FSD DEPENDENCY RULES:
 * - shared/* cannot import from features/* or app/*
 * - features/* cannot import from other features/* or app/*
 * - Only app/* can import from features/*
 */

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import fieldStudioPlugin from './eslint-rules/index.js';

export default [
  // ============================================================================
  // GLOBAL IGNORES
  // ============================================================================
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '_archived/**',
      '.git/**',
      'coverage/**',
    ],
  },

  // ============================================================================
  // GLOBAL RULES (all TypeScript/React files)
  // ============================================================================
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript recommended rules
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Prop Naming Standardization
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'property',
          format: ['camelCase'],
          filter: {
            regex: '^(onChange|onAction|onUpdate|onExecute|on[A-Z][a-zA-Z]+)$',
            match: true,
          },
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // Prefer specific handler patterns in JSX
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXAttribute[name.name=/^on[A-Z]/]:not([name.name=/^(onChange|onAction|onUpdate|onExecute|onClick|onSubmit|onKeyDown|onKeyUp|onKeyPress|onFocus|onBlur|onMouseEnter|onMouseLeave|onMouseDown|onMouseUp|onScroll|onResize|onDragStart|onDragEnd|onDrop|onSelect|onLoad|onError)$/])',
          message: 'Event handler props should follow naming conventions: onChange, onAction, onUpdate, onExecute, or standard DOM handlers.',
        },
      ],

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'prefer-template': 'warn',
      'template-curly-spacing': 'error',
      'object-shorthand': ['warn', 'always'],
      'prefer-destructuring': ['warn', { object: true, array: false }],
      'no-unused-expressions': 'warn',
      'no-param-reassign': ['warn', { props: false }],
      'consistent-return': 'warn',
      'no-duplicate-imports': 'error',
      'sort-imports': ['warn', {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
      }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // ============================================================================
  // ATOM LAYER CONSTRAINTS (Architecture Section 5, Line 270)
  // "No hook calls; only props + tokens"
  // Atoms are pure functions — zero React hooks allowed
  // ============================================================================
  {
    files: [
      'src/shared/ui/atoms/**/*.{ts,tsx}',
      'ui/primitives/**/*.{ts,tsx}',
      'components/primitives/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          // Block ALL React hooks in atoms
          { name: 'react', importNames: ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue', 'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect'], message: 'Atoms must be pure functions with zero hooks. Move stateful logic to a Molecule.' },
        ],
        patterns: [
          // Block all custom hooks (any import starting with "use")
          { group: ['**/use*', '@/hooks/*', '@/src/shared/lib/use*'], message: 'Atoms cannot import hooks. They must be pure, props-driven components.' },
          // Block domain imports — atoms are UI primitives only
          { group: ['@/services/*', '@/services/**', '@/features/*', '@/features/**', '@/entities/*', '@/entities/**'], message: 'Atoms cannot import domain logic. They are UI primitives only — use props and design tokens.' },
        ],
      }],
      // Ban hook-like variable names (catches destructured hooks)
      'id-denylist': ['error', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext'],
    },
  },

  // ============================================================================
  // MOLECULE LAYER CONSTRAINTS (Architecture Section 5, Line 271)
  // "Local state only (useState, useDebouncedValue); no domain logic"
  // Molecules can use local UI hooks but NOT context or domain hooks
  // ============================================================================
  {
    files: [
      'src/shared/ui/molecules/**/*.{ts,tsx}',
      'src/features/*/ui/molecules/**/*.{ts,tsx}',
    ],
    plugins: {
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      // P2/P3: Custom plugin rules for molecule validation
      '@field-studio/molecule-props-validation': 'warn',
      '@field-studio/useeffect-restrictions': 'error',
      '@field-studio/max-lines-feature': 'warn',
      '@field-studio/no-native-html-in-molecules': 'error',
      'no-restricted-imports': ['error', {
        paths: [
          // Block context hooks — molecules receive these via props
          { name: 'useAppSettings', message: 'Molecules must not import useAppSettings. Receive fieldMode via props from the organism.' },
          { name: 'useContextualStyles', message: 'Molecules must not import useContextualStyles. Receive cx via props from the organism.' },
          { name: 'useTerminology', message: 'Molecules must not import useTerminology. Receive t() via props from the organism.' },
          { name: 'useAbstractionLevel', message: 'Molecules must not import useAbstractionLevel. Receive isAdvanced via props from the organism.' },
        ],
        patterns: [
          // Block imports from features (molecules are feature-agnostic)
          { group: ['@/src/features/*/model/*', '@/src/features/*/hooks/*', '@/services/*'], message: 'Molecules cannot import domain logic. They must be feature-agnostic and reusable.' },
          // Block imports from app layer
          { group: ['@/src/app/*'], message: 'Molecules cannot import from app layer. Context flows down via props.' },
          // Block molecules importing other molecules (compose atoms only)
          { group: ['@/src/shared/ui/molecules/*', '@/src/shared/ui/molecules', '../molecules/*', './[A-Z]*'], message: 'Molecules should compose atoms only. Import from ../atoms/ — organisms compose molecules.' },
        ],
      }],
      // Detect useEffect with potentially external reach (API calls, etc.)
      'no-restricted-syntax': [
        'warn',
        // Flag useEffect calling functions with suspicious names
        {
          selector: 'CallExpression[callee.name="useEffect"] BlockStatement CallExpression[callee.name=/^(fetch|loadData|getData|api|request)/]',
          message: 'useEffect in molecules should not call external services. Move to organism or use props callback.',
        },
      ],
    },
  },

  // ============================================================================
  // FSD DEPENDENCY RULES - Consolidated to prevent rule overriding
  // ============================================================================

  // SHARED: No upward dependencies (foundation layer)
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/src/features/*', '@/src/features/**'], message: '❌ SHARED: Cannot import from features. No upward dependencies.' },
          { group: ['@/src/app/*', '@/src/app/**'], message: '❌ SHARED: Cannot import from app. No upward dependencies.' },
          { group: ['@/src/widgets/*', '@/src/widgets/**'], message: '❌ SHARED: Cannot import from widgets. No upward dependencies.' },
          { group: ['@/src/entities/*', '@/src/entities/**'], message: '❌ SHARED: Cannot import from entities. No upward dependencies.' },
        ],
      }],
    },
  },

  // ENTITIES: Only shared (domain models, no feature logic)
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/src/features/*', '@/src/features/**'], message: '❌ ENTITIES: Cannot import from features. Entities are used BY features.' },
          { group: ['@/src/app/*', '@/src/app/**'], message: '❌ ENTITIES: Cannot import from app.' },
          { group: ['@/src/widgets/*', '@/src/widgets/**'], message: '❌ ENTITIES: Cannot import from widgets.' },
        ],
      }],
    },
  },

  // FEATURES: No app, no other features (isolated slices)
  // Organisms also have Atomic constraints (no context hooks)
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          // Atomic: Organisms must not use context hooks (receive via props)
          { name: 'useAppSettings', message: '❌ ATOMIC: Organisms must not import useAppSettings. Receive fieldMode via props from Template.' },
          { name: 'useContextualStyles', message: '❌ ATOMIC: Organisms must not import useContextualStyles. Receive cx via props from Template.' },
          { name: 'useTerminology', message: '❌ ATOMIC: Organisms must not import useTerminology. Receive t() via props from Template.' },
          { name: 'useAbstractionLevel', message: '❌ ATOMIC: Organisms must not import useAbstractionLevel. Receive isAdvanced via props from Template.' },
        ],
        patterns: [
          // FSD: No app imports
          { group: ['@/src/app/*', '@/src/app/**'], message: '❌ FSD: Features cannot import from app layer. Receive context via props from Templates.' },
          // FSD: No cross-feature imports (catches @/src/features/anything)
          { group: ['@/src/features/*'], message: '❌ FSD: Features cannot import from other features. Use shared layer for cross-cutting concerns.' },
        ],
      }],
    },
  },

  // ORGANISM LAYER: Max lines constraint
  {
    files: ['src/features/*/ui/organisms/**/*.{ts,tsx}'],
    plugins: {
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      '@field-studio/max-lines-feature': ['warn', {
        organismMax: 300,
        moleculeMax: 200,
      }],
    },
  },

  // FEATURE-SPECIFIC ATOM IMPORT ENFORCEMENT
  // Encourages features to create their own atoms instead of using primitives directly
  {
    files: [
      'src/features/viewer/ui/molecules/**/*.{ts,tsx}',
      'src/features/metadata-edit/ui/molecules/**/*.{ts,tsx}',
      'src/features/board-design/ui/molecules/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          // Discourage direct primitive imports in large molecules
          // (Allow list for atoms, warn for molecules)
          {
            group: ['@/ui/primitives/*', '@/ui/primitives/*'],
            message: '⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md'
          },
        ],
      }],
    },
  },

  // WIDGETS: Composition layer (can import features, but not app)
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/src/app/*', '@/src/app/**'], message: '❌ WIDGETS: Cannot import from app layer. Widgets compose feature organisms.' },
        ],
      }],
    },
  },

  // ============================================================================
  // ATOMIC BUTTON ENFORCEMENT
  // Zero tolerance for inline button elements outside of atomic Button component
  // ============================================================================
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/shared/ui/atoms/**/*.{ts,tsx}',
      'ui/primitives/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated.',
        },
      ],
    },
  },

  // ============================================================================
  // PAGE LAYER CONSTRAINTS (Architecture Section 5, Line 274)
  // "Composition only; max 50 lines"
  // Pages are route entry points — zero business logic
  // ============================================================================
  {
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/app/pages/**/*.{ts,tsx}',
      'src/app/routes/**/*Page.{ts,tsx}',
      'src/features/**/pages/**/*.{ts,tsx}',
      '**/Page.tsx',
    ],
    rules: {
      // P0: Page max-lines - Enforce a maximum line limit for page-level components
      'max-lines': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': ['error', {
        paths: [
          // Block state hooks in pages
          { name: 'react', importNames: ['useState', 'useReducer'], message: 'Pages must be composition-only. State belongs in Templates or Organisms (<50 lines, zero state).' },
        ],
        patterns: [
          // Block data fetching services
          { group: ['@/services/*', '@/services/**'], message: 'Pages must not call services directly. Data fetching belongs in Templates or Organisms.' },
        ],
      }],
    },
  },

  // ============================================================================
  // TEMPLATE LAYER CONSTRAINTS (Architecture Section 5)
  // "Context providers only; no data fetching"
  // Templates provide context to pages — no business logic or data fetching
  // ============================================================================
  {
    files: [
      'src/app/templates/**/*.{ts,tsx}',
    ],
    plugins: {
      '@field-studio': fieldStudioPlugin,
    },
    rules: {
      // P2: Custom plugin rule for template validation
      '@field-studio/template-constraints': 'error',
    },
  },

  // ============================================================================
  // DESIGN TOKEN ENFORCEMENT
  // "No magic numbers, no hardcoded values"
  // Detect hardcoded colors, spacing, timing that should use tokens
  // ============================================================================
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        // Hardcoded Tailwind colors (should use cx.* tokens)
        {
          selector: 'Literal[value=/(bg|text|border|ring)-(slate|gray|blue|red|green|yellow|purple|pink|orange|teal|cyan|indigo)-[0-9]{2,3}/]',
          message: 'Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors.',
        },
        // Hardcoded hex colors
        {
          selector: 'Literal[value=/#([0-9A-Fa-f]{3}){1,2}/]',
          message: 'Use COLORS from designSystem.ts instead of hardcoded hex colors.',
        },
        // Hardcoded pixel values (likely magic numbers)
        {
          selector: 'Literal[value=/^[0-9]+px$/]',
          message: 'Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values.',
        },
      ],
      // Ban magic numbers for timing (debounce, animation)
      'no-magic-numbers': ['warn', {
        ignore: [-1, 0, 1, 2, 10, 100],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false,
      }],
    },
  },

  // ============================================================================
  // LEGACY COMPONENTS MIGRATION GUIDANCE
  // Warn about imports from legacy locations to encourage migration
  // Must not override FSD rules — applied only to files not covered by stricter rules
  // ============================================================================
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/shared/ui/atoms/**',
      'src/shared/ui/molecules/**',
      'src/features/**',
      'src/entities/**',
      'src/widgets/**',
      'src/app/**',
      'components/_archived/**',
    ],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          // Encourage migration from legacy components/views
          { group: ['@/components/views/*'], message: 'Legacy views are deprecated. Import from src/features/*/ui/organisms/ instead.' },
        ],
      }],
    },
  },

  // ============================================================================
  // TEST FILES — Relaxed rules
  // ============================================================================
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off', // Tests may need to import anything for mocking
    },
  },
];
