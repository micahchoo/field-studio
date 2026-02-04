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

export default [
  // ============================================================================
  // GLOBAL RULES (all TypeScript/React files)
  // ============================================================================
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
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
        ],
      }],
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
    rules: {
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
        ],
      }],
    },
  },

  // ============================================================================
  // ORGANISM LAYER CONSTRAINTS (Architecture Section 5, Line 272)
  // "Domain hooks allowed; no routing context"
  // Organisms receive cx, fieldMode, t, isAdvanced from Template via props
  // ============================================================================
  {
    files: [
      'src/features/*/ui/organisms/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          // Block context hooks — organisms receive these via props from FieldModeTemplate
          { name: 'useAppSettings', message: 'Organisms must not import useAppSettings. Receive fieldMode via props from FieldModeTemplate.' },
          { name: 'useContextualStyles', message: 'Organisms must not import useContextualStyles. Receive cx via props from FieldModeTemplate.' },
          { name: 'useTerminology', message: 'Organisms must not import useTerminology. Receive t() via props from FieldModeTemplate.' },
          { name: 'useAbstractionLevel', message: 'Organisms must not import useAbstractionLevel. Receive isAdvanced via props from FieldModeTemplate.' },
        ],
        patterns: [
          // Block imports from app layer (except types)
          { group: ['@/src/app/routes/*', '@/src/app/providers/*'], message: 'Organisms cannot import from app layer. They receive context via props from Templates.' },
          // Block cross-feature imports
          { group: ['@/src/features/!(${PWD##*/})/*'], message: 'Organisms cannot import from other features. Use shared layer for cross-cutting concerns.' },
        ],
      }],
    },
  },

  // ============================================================================
  // SHARED LAYER CONSTRAINTS (FSD Dependency Rule)
  // "shared/* cannot import from features/* or app/*"
  // The shared layer is the foundation — no upward dependencies
  // ============================================================================
  {
    files: [
      'src/shared/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // Block imports from features layer
          { group: ['@/src/features/*', '@/src/features/**'], message: 'Shared layer cannot import from features. Shared is the foundation layer with no upward dependencies.' },
          // Block imports from app layer
          { group: ['@/src/app/*', '@/src/app/**'], message: 'Shared layer cannot import from app. Shared is the foundation layer with no upward dependencies.' },
          // Block imports from widgets layer
          { group: ['@/src/widgets/*', '@/src/widgets/**'], message: 'Shared layer cannot import from widgets. Shared is the foundation layer with no upward dependencies.' },
        ],
      }],
    },
  },

  // ============================================================================
  // FEATURES LAYER CONSTRAINTS (FSD Dependency Rule)
  // "features/* cannot import from other features/* or app/*"
  // Features are isolated vertical slices
  // ============================================================================
  {
    files: [
      'src/features/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // Block imports from app layer (except templates for type imports)
          { group: ['@/src/app/routes/*', '@/src/app/providers/*'], message: 'Features cannot import from app routes/providers. Features receive context via props from Templates.' },
        ],
      }],
    },
  },

  // ============================================================================
  // ENTITIES LAYER CONSTRAINTS (FSD Dependency Rule)
  // Entities can only import from shared layer
  // ============================================================================
  {
    files: [
      'src/entities/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // Block imports from features layer
          { group: ['@/src/features/*', '@/src/features/**'], message: 'Entities cannot import from features. Entities are domain models used BY features.' },
          // Block imports from app layer
          { group: ['@/src/app/*', '@/src/app/**'], message: 'Entities cannot import from app layer.' },
          // Block imports from widgets layer
          { group: ['@/src/widgets/*', '@/src/widgets/**'], message: 'Entities cannot import from widgets layer.' },
        ],
      }],
    },
  },

  // ============================================================================
  // WIDGETS LAYER CONSTRAINTS (FSD Dependency Rule)
  // Widgets compose organisms from multiple features — no business logic
  // ============================================================================
  {
    files: [
      'src/widgets/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // Block imports from app layer
          { group: ['@/src/app/routes/*', '@/src/app/providers/*'], message: 'Widgets cannot import from app routes/providers. Widgets compose feature organisms.' },
        ],
      }],
    },
  },

  // ============================================================================
  // LEGACY COMPONENTS MIGRATION GUIDANCE
  // Warn about imports from legacy locations to encourage migration
  // ============================================================================
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/ui/atoms/**', 'components/_archived/**'],
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
