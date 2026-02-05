/**
 * @field-studio/eslint-plugin
 * Custom ESLint rules for Atomic Design + FSD architecture enforcement
 */

import moleculePropsValidation from './rules/molecule-props-validation.js';
import useEffectRestrictions from './rules/useeffect-restrictions.js';
import templateConstraints from './rules/template-constraints.js';
import maxLinesFeature from './rules/max-lines-feature.js';
import noNativeHtmlInMolecules from './rules/no-native-html-in-molecules.js';

const plugin = {
  meta: {
    name: '@field-studio/eslint-plugin',
    version: '1.0.0',
  },
  rules: {
    'molecule-props-validation': moleculePropsValidation,
    'useeffect-restrictions': useEffectRestrictions,
    'template-constraints': templateConstraints,
    'max-lines-feature': maxLinesFeature,
    'no-native-html-in-molecules': noNativeHtmlInMolecules,
  },
  configs: {
    recommended: {
      plugins: ['@field-studio'],
      rules: {
        '@field-studio/molecule-props-validation': 'warn',
        '@field-studio/useeffect-restrictions': 'error',
        '@field-studio/template-constraints': 'error',
        '@field-studio/max-lines-feature': 'warn',
        '@field-studio/no-native-html-in-molecules': 'error',
      },
    },
    strict: {
      plugins: ['@field-studio'],
      rules: {
        '@field-studio/molecule-props-validation': 'error',
        '@field-studio/useeffect-restrictions': 'error',
        '@field-studio/template-constraints': 'error',
        '@field-studio/max-lines-feature': 'error',
        '@field-studio/no-native-html-in-molecules': 'error',
      },
    },
  },
};

export default plugin;
