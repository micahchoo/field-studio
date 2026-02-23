/**
 * @field-studio/eslint-plugin (Svelte edition)
 * Custom ESLint rules for Atomic Design + FSD architecture enforcement
 * Adapted from React version for Svelte components
 */

import componentPropsValidation from './rules/component-props-validation.js';
import lifecycleRestrictions from './rules/lifecycle-restrictions.js';
import templateConstraints from './rules/template-constraints.js';
import maxLinesFeature from './rules/max-lines-feature.js';
import noNativeHtmlInMolecules from './rules/no-native-html-in-molecules.js';
import noSvelte4Patterns from './rules/no-svelte4-patterns.js';
import noTailwindInterpolation from './rules/no-tailwind-interpolation.js';
import preferSemanticElements from './rules/prefer-semantic-elements.js';
import noReactiveDestructuring from './rules/no-reactive-destructuring.js';
import noEffectForDerived from './rules/no-effect-for-derived.js';
import typedContextKeys from './rules/typed-context-keys.js';
import requireAriaForIconButtons from './rules/require-aria-for-icon-buttons.js';
import noStateRawForPrimitives from './rules/no-state-raw-for-primitives.js';
import viewerNoOsdInAtoms from './rules/viewer-no-osd-in-atoms.js';

const plugin = {
  meta: {
    name: '@field-studio/eslint-plugin',
    version: '4.0.0',
  },
  rules: {
    // FSD / Atomic Design
    'component-props-validation': componentPropsValidation,
    'lifecycle-restrictions': lifecycleRestrictions,
    'template-constraints': templateConstraints,
    'max-lines-feature': maxLinesFeature,
    'no-native-html-in-molecules': noNativeHtmlInMolecules,

    // Svelte 5 conventions
    'no-svelte4-patterns': noSvelte4Patterns,
    'no-tailwind-interpolation': noTailwindInterpolation,
    'prefer-semantic-elements': preferSemanticElements,
    'no-reactive-destructuring': noReactiveDestructuring,

    // Reactivity & context
    'no-effect-for-derived': noEffectForDerived,
    'typed-context-keys': typedContextKeys,

    // Accessibility & best practices
    'require-aria-for-icon-buttons': requireAriaForIconButtons,
    'no-state-raw-for-primitives': noStateRawForPrimitives,

    // Architecture
    'viewer-no-osd-in-atoms': viewerNoOsdInAtoms,
  },
  configs: {
    recommended: {
      plugins: ['@field-studio'],
      rules: {
        '@field-studio/component-props-validation': 'warn',
        '@field-studio/lifecycle-restrictions': 'error',
        '@field-studio/template-constraints': 'error',
        '@field-studio/max-lines-feature': 'warn',
        '@field-studio/no-native-html-in-molecules': 'error',
        '@field-studio/no-svelte4-patterns': 'error',
        '@field-studio/no-tailwind-interpolation': 'warn',
        '@field-studio/prefer-semantic-elements': 'warn',
        '@field-studio/no-reactive-destructuring': 'error',
        '@field-studio/no-effect-for-derived': 'warn',
        '@field-studio/typed-context-keys': 'warn',
        '@field-studio/require-aria-for-icon-buttons': 'warn',
        '@field-studio/no-state-raw-for-primitives': 'warn',
        '@field-studio/viewer-no-osd-in-atoms': 'error',
      },
    },
    strict: {
      plugins: ['@field-studio'],
      rules: {
        '@field-studio/component-props-validation': 'error',
        '@field-studio/lifecycle-restrictions': 'error',
        '@field-studio/template-constraints': 'error',
        '@field-studio/max-lines-feature': 'error',
        '@field-studio/no-native-html-in-molecules': 'error',
        '@field-studio/no-svelte4-patterns': 'error',
        '@field-studio/no-tailwind-interpolation': 'error',
        '@field-studio/prefer-semantic-elements': 'error',
        '@field-studio/no-reactive-destructuring': 'error',
        '@field-studio/no-effect-for-derived': 'error',
        '@field-studio/typed-context-keys': 'error',
        '@field-studio/require-aria-for-icon-buttons': 'error',
        '@field-studio/no-state-raw-for-primitives': 'error',
        '@field-studio/viewer-no-osd-in-atoms': 'error',
      },
    },
  },
};

export default plugin;
