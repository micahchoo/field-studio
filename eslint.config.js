/**
 * ESLint Configuration - IIIF Field Archive Studio
 * 
 * Includes prop naming standardization rules:
 * - Enforce `onChange`, `onAction`, `onUpdate`, `onExecute` naming patterns
 * - TypeScript and React specific rules
 */

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
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
      
      // Prop Naming Standardization (Phase 8.1)
      // Enforce consistent handler naming patterns
      '@typescript-eslint/naming-convention': [
        'error',
        {
          // Enforce onChange, onAction, onUpdate, onExecute naming for event handlers
          selector: 'property',
          format: ['camelCase'],
          filter: {
            regex: '^(onChange|onAction|onUpdate|onExecute|on[A-Z][a-zA-Z]+)$',
            match: true,
          },
          leadingUnderscore: 'allow',
        },
        {
          // Enforce camelCase for all other properties
          selector: 'property',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          // Enforce PascalCase for type names and enum members
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          // Enforce camelCase for function names
          selector: 'function',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          // Enforce camelCase or UPPER_CASE for variables
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
      ],
      
      // Prefer specific handler patterns in JSX
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXAttribute[name.name=/^on[A-Z]/]:not([name.name=/^(onChange|onAction|onUpdate|onExecute|onClick|onSubmit|onKeyDown|onKeyUp|onFocus|onBlur|onMouseEnter|onMouseLeave|onScroll|onResize)$/])',
          message: 'Event handler props should follow naming conventions: onChange, onAction, onUpdate, onExecute, or standard DOM handlers (onClick, onSubmit, etc.)',
        },
      ],
      
      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      
      // Additional best practices for IIIF Field Archive Studio
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
  {
    // Allow any in test files
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];