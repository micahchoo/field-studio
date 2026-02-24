/**
 * @fileoverview Surface `@migration` stub comments in CI/lint output.
 *
 * Reports a single summary warning per file containing `@migration` comments.
 * This is an awareness rule — it does not block CI, just makes stubs visible
 * so they get tracked and resolved over time.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Report files containing @migration stub comments',
      category: 'Migration',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          countThreshold: {
            type: 'number',
            default: 1,
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      migrationStubs:
        'File contains {{count}} @migration stub(s). These should be resolved to complete the Svelte migration.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const threshold = options.countThreshold ?? 1;

    return {
      Program(node) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const comments = sourceCode.getAllComments();

        const migrationComments = comments.filter(
          (comment) => comment.value.includes('@migration'),
        );

        if (migrationComments.length >= threshold) {
          // Report on the first migration comment location for easy navigation
          context.report({
            node: migrationComments[0],
            messageId: 'migrationStubs',
            data: { count: String(migrationComments.length) },
          });
        }
      },
    };
  },
};

export default rule;
