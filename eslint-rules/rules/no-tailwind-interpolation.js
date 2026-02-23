/**
 * @fileoverview Detect Tailwind class name interpolation in Svelte templates.
 * Tailwind JIT scans for complete class strings at build time. Dynamic interpolation
 * like class="border-{width}" produces classes that don't exist in the output CSS.
 *
 * Catches:
 *   class="border-{width}"        — literal ending with hyphen + expression
 *   class="bg-{color}-500"        — literal-expression-literal forming a partial class
 *   class="text-{size} font-bold" — expression embedded within a hyphenated class
 *
 * Does NOT fire on:
 *   class={dynamicString}         — whole-attribute expressions (consumer's responsibility)
 *   class="fixed {conditional}"   — space-separated, expression is a complete class
 *   class="my-component"          — no interpolation
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow interpolation inside Tailwind class names in Svelte templates',
      category: 'Svelte 5 Migration',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noInterpolation:
        '[TAILWIND] Dynamic interpolation in class attribute (`{{ raw }}`) produces classes Tailwind JIT cannot detect. Use a static class map or conditional expression instead.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith('.svelte')) return {};

    return {
      SvelteAttribute(node) {
        // Only check `class` attributes
        if (!node.key || node.key.name !== 'class') return;

        // value is an array of SvelteLiteral and SvelteMustacheTag nodes
        const parts = node.value;
        if (!Array.isArray(parts) || parts.length < 2) return;

        for (let i = 0; i < parts.length - 1; i++) {
          const current = parts[i];
          const next = parts[i + 1];

          // Pattern 1: literal ending with hyphen followed by expression
          // e.g. "border-" + {width}
          if (
            current.type === 'SvelteLiteral' &&
            next.type === 'SvelteMustacheTag'
          ) {
            const text = current.value;
            // Check if the literal ends with a hyphen (no trailing space)
            // This catches: "border-", "bg-", "text-", "p-", "m-", etc.
            if (/-$/.test(text.trimEnd()) && !text.endsWith(' ')) {
              const raw = buildRawSnippet(parts, i, context);
              context.report({
                node: next,
                messageId: 'noInterpolation',
                data: { raw },
              });
            }
          }

          // Pattern 2: expression followed by literal starting with hyphen
          // e.g. {color} + "-500"
          if (
            current.type === 'SvelteMustacheTag' &&
            next.type === 'SvelteLiteral'
          ) {
            const text = next.value;
            // Check if the literal starts with a hyphen (no leading space)
            if (/^-/.test(text.trimStart()) && !text.startsWith(' ')) {
              const raw = buildRawSnippet(parts, i, context);
              context.report({
                node: current,
                messageId: 'noInterpolation',
                data: { raw },
              });
            }
          }
        }
      },
    };

    /**
     * Build a short source snippet around the interpolation for the error message.
     */
    function buildRawSnippet(parts, index, ctx) {
      const src = ctx.getSourceCode();
      // Grab up to 3 parts around the interpolation point
      const start = Math.max(0, index - 1);
      const end = Math.min(parts.length, index + 3);
      const segments = [];
      for (let j = start; j < end; j++) {
        const p = parts[j];
        if (p.type === 'SvelteLiteral') {
          segments.push(p.value);
        } else {
          segments.push('{' + src.getText(p).replace(/^\{|\}$/g, '') + '}');
        }
      }
      const raw = segments.join('');
      return raw.length > 50 ? raw.slice(0, 47) + '...' : raw;
    }
  },
};

export default rule;
