/**
 * @fileoverview Prefer type guard functions over `as IIIFSubtype` casts.
 *
 * Type guards (`isCanvas()`, `isManifest()`, `isCollection()`, `isRange()`)
 * exist at `src/shared/types/index.ts` and correctly narrow the type at runtime.
 * Single `as IIIFCanvas` casts skip runtime checking and can hide type mismatches.
 *
 * Flags: `as IIIFCanvas`, `as IIIFManifest`, `as IIIFCollection`, `as IIIFRange`
 *
 * Does NOT flag:
 * - `as unknown as T` double-casts (handled by no-unsafe-type-cast-in-props)
 * - Casts in .d.ts files
 * - Casts in __tests__/ files
 * - Casts where the target type includes `&` intersection (e.g. `as IIIFCanvas & { duration?: number }`)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer type guard functions over `as IIIFSubtype` casts',
      category: 'Type Safety',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
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
      preferTypeGuard:
        'Use `{{guard}}()` type guard instead of `as {{type}}`. ' +
        'Type guards provide runtime safety. If this cast is intentional, ' +
        'add an eslint-disable comment explaining why.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = (options.allowedPatterns || []).map(
      (/** @type {string} */ p) => new RegExp(p),
    );

    // Only flag these specific IIIF subtypes that have corresponding type guards
    const GUARDED_TYPES = new Map([
      ['IIIFCanvas', 'isCanvas'],
      ['IIIFManifest', 'isManifest'],
      ['IIIFCollection', 'isCollection'],
      ['IIIFRange', 'isRange'],
    ]);

    // Skip .d.ts and test files
    const filename = context.getFilename?.() || context.filename || '';
    if (filename.endsWith('.d.ts') || filename.includes('__tests__')) {
      return {};
    }

    /**
     * Check a TSAsExpression node for single `as IIIFSubtype` casts.
     */
    function checkAsExpression(node) {
      // Skip if this is the inner part of a double-cast (`as unknown as T`)
      // i.e., if this node's parent is also a TSAsExpression
      const parent = node.parent;
      if (parent && parent.type === 'TSAsExpression') return;

      // Skip if this node IS the outer part of a double-cast
      // i.e., if node.expression is also a TSAsExpression with TSUnknownKeyword
      if (
        node.expression &&
        node.expression.type === 'TSAsExpression' &&
        node.expression.typeAnnotation &&
        node.expression.typeAnnotation.type === 'TSUnknownKeyword'
      ) {
        return;
      }

      const typeAnnotation = node.typeAnnotation;
      if (!typeAnnotation) return;

      // Only match simple TSTypeReference (not intersections, unions, etc.)
      if (typeAnnotation.type !== 'TSTypeReference') return;

      // Get the type name
      const typeName = typeAnnotation.typeName?.name;
      if (!typeName) return;

      // Check if it's a guarded type
      const guardName = GUARDED_TYPES.get(typeName);
      if (!guardName) return;

      // Check allowed patterns
      const sourceCode = context.sourceCode || context.getSourceCode();
      const castText = sourceCode.getText(node);
      if (allowedPatterns.some((re) => re.test(castText))) return;

      context.report({
        node,
        messageId: 'preferTypeGuard',
        data: { type: typeName, guard: guardName },
      });
    }

    return {
      TSAsExpression: checkAsExpression,
    };
  },
};

export default rule;
