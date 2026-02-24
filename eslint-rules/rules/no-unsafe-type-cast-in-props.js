/**
 * @fileoverview Flag `as unknown as T` casts used in component prop bindings.
 *
 * This pattern suppresses TypeScript's type checker at prop boundaries, which
 * is how the IngestProgressPanel crash slipped through: `ingestStore` (with
 * `status: 'running'`) was cast as `IngestProgress` (expecting `stage: IngestStage`),
 * so STAGE_CONFIG['running'] returned undefined at runtime.
 *
 * Flags patterns matching:  /as unknown as\s+\S+/
 * in Svelte file script sections and JSX-like attribute expressions.
 *
 * Allowed exceptions (annotate with // eslint-disable-next-line):
 * - External library interop (Annotorious, OpenSeadragon type adapters)
 * - Intentional discriminated-union narrowing with a comment explaining why
 *
 * Does NOT flag:
 * - `as T` single-step casts (widening casts, usually safe)
 * - `as unknown` terminal casts (just broadening, no downstream type assumed)
 * - Casts inside type declaration files (.d.ts)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow `as unknown as T` casts in component prop bindings',
      category: 'Type Safety',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          // Allow specific patterns for external lib interop
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unsafeCast:
        '[TYPE-SAFETY] `as unknown as {{type}}` hides a type mismatch at a component boundary. ' +
        'Build an adapter or widen the prop type instead. ' +
        'If this is genuine external-lib interop, add an eslint-disable comment explaining why.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = (options.allowedPatterns || []).map(
      (/** @type {string} */ p) => new RegExp(p),
    );

    /**
     * Check a TypeScript `as` expression node.
     * We want to flag: TSAsExpression > TSUnknownKeyword
     * where the parent is ALSO a TSAsExpression (double cast = `as unknown as T`).
     */
    function checkAsExpression(node) {
      // node is TSAsExpression: { expression, typeAnnotation }
      // The `as unknown` part: typeAnnotation is TSUnknownKeyword
      // The outer `as T` part: this node is the expression of a parent TSAsExpression

      const parent = node.parent;
      if (!parent || parent.type !== 'TSAsExpression') return;

      // node.typeAnnotation should be TSUnknownKeyword
      if (!node.typeAnnotation || node.typeAnnotation.type !== 'TSUnknownKeyword') return;

      // parent.typeAnnotation is the target type T
      const targetType = context.getSourceCode
        ? context.getSourceCode().getText(parent.typeAnnotation)
        : (parent.typeAnnotation?.name ?? '?');

      // Check allowed patterns
      if (allowedPatterns.some((re) => re.test(targetType))) return;

      context.report({
        node: parent,
        messageId: 'unsafeCast',
        data: { type: targetType },
      });
    }

    return {
      TSAsExpression: checkAsExpression,
    };
  },
};

export default rule;
