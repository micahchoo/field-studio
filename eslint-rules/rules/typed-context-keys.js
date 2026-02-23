/**
 * @fileoverview Enforce typed context keys instead of string literals.
 * String keys in setContext/getContext cause key collisions and lose type safety.
 *
 * Catches:
 *   setContext('theme', value)         — string literal key
 *   getContext('theme')                — string literal key
 *   setContext(`my-${key}`, value)     — template literal key
 *
 * Does NOT fire on:
 *   setContext(THEME_KEY, value)       — variable/symbol key
 *   setContext(Symbol('theme'), value) — symbol key
 *   getContext<ThemeContext>(key)       — variable key
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce Symbol or variable keys in setContext/getContext instead of string literals',
      category: 'Svelte 5 Migration',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedStringKeys: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'String keys explicitly allowed (e.g. for third-party library interop)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noStringKey:
        '[CONTEXT] setContext/getContext with string key \'{{ key }}\' is fragile. Use a typed Symbol key exported from a shared module. See architecture doc section 8.D.',
      noTemplateLiteralKey:
        '[CONTEXT] setContext/getContext with template literal key is fragile. Use a typed Symbol key exported from a shared module.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedStringKeys = new Set(options.allowedStringKeys || []);

    return {
      CallExpression(node) {
        // Match setContext(...) and getContext(...)
        if (node.callee.type !== 'Identifier') return;
        const fnName = node.callee.name;
        if (fnName !== 'setContext' && fnName !== 'getContext') return;

        // First argument is the key
        const keyArg = node.arguments[0];
        if (!keyArg) return;

        if (keyArg.type === 'Literal' && typeof keyArg.value === 'string') {
          if (allowedStringKeys.has(keyArg.value)) return;
          context.report({
            node: keyArg,
            messageId: 'noStringKey',
            data: { key: keyArg.value },
          });
          return;
        }

        if (keyArg.type === 'TemplateLiteral') {
          context.report({
            node: keyArg,
            messageId: 'noTemplateLiteralKey',
          });
        }
      },
    };
  },
};

export default rule;
