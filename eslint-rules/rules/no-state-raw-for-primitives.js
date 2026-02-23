/**
 * @fileoverview Warn when $state.raw() is used with primitive values.
 *
 * $state.raw() opts out of deep reactivity tracking, which is wasteful
 * for primitives (number, string, boolean, null, undefined) — they don't
 * benefit from deep tracking and $state() is cleaner.
 *
 * Correct: $state.raw([...]) or $state.raw({})
 * Wrong:   $state.raw(0), $state.raw(''), $state.raw(false), $state.raw(null)
 *
 * Applies to both .svelte and .svelte.ts files.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when $state.raw() is used with primitive values',
      category: 'Svelte 5 Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      primitiveStateRaw:
        '$state.raw() with a primitive value is unnecessary. Use $state({{ value }}) instead.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isSvelteRelated = filename.endsWith('.svelte') || filename.endsWith('.svelte.ts');
    if (!isSvelteRelated) return {};

    function isPrimitiveLiteral(node) {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          // string, number, boolean, null, regex
          return typeof node.value !== 'object' || node.value === null;
        case 'UnaryExpression':
          // handles -1, +0, !false, void 0 etc.
          return node.operator === '-' || node.operator === '+' || node.operator === '!' || node.operator === 'void';
        case 'Identifier':
          // undefined
          return node.name === 'undefined';
        default:
          return false;
      }
    }

    function getValueText(node) {
      const src = context.getSourceCode();
      return src.getText(node);
    }

    return {
      // Match: $state.raw(primitiveArg)
      CallExpression(node) {
        const { callee, arguments: args } = node;

        // Check for $state.raw(...)
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === '$state' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'raw' &&
          args.length >= 1 &&
          isPrimitiveLiteral(args[0])
        ) {
          const valueText = getValueText(args[0]);
          context.report({
            node,
            messageId: 'primitiveStateRaw',
            data: { value: valueText },
            fix(fixer) {
              // Replace $state.raw(x) with $state(x)
              return fixer.replaceText(node, `$state(${valueText})`);
            },
          });
        }
      },
    };
  },
};

export default rule;
