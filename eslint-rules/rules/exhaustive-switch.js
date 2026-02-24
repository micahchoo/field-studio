/**
 * exhaustive-switch
 *
 * Flags switch statements on named discriminated-union types that have no
 * default branch. A switch without default on a discriminated union can
 * silently fall through when new variants are added.
 *
 * Rule fires when:
 *   - The switch discriminant is a member expression or identifier
 *   - The expression is an access on a variable with a name matching a
 *     known discriminated-union field (type, stage, status, kind, intent)
 *   - The switch has NO default case
 *
 * Rationale: all case branches in business-logic switches (vault actions,
 * ingest stages, operation statuses) must be exhaustive. The absence of a
 * default is the bug: new variants silently do nothing.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a default branch in switch statements on discriminated-union fields ' +
        '(type, stage, status, kind, intent). Prevents silent fall-through when new variants are added.',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Additional field names to treat as discriminant sentinels
          additionalFields: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingDefault:
        'Switch on discriminated-union field "{{field}}" has no default branch. ' +
        'Add a default case (or an exhaustive never-check) to handle future variants.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const additionalFields = options.additionalFields || [];

    // Discriminated-union field names that trigger the rule
    const SENTINEL_FIELDS = new Set([
      'type',
      'stage',
      'status',
      'kind',
      'intent',
      'motivation',
      'level',
      'severity',
      ...additionalFields,
    ]);

    /**
     * Extract the field name from the switch discriminant expression.
     * Returns null if it's not a recognized sentinel pattern.
     *
     * Patterns matched:
     *   switch (action.type)       → "type"
     *   switch (progress.stage)    → "stage"
     *   switch (op.status)         → "status"
     *   switch (type)              → "type"   (bare identifier)
     *   switch (status)            → "status"
     */
    function getDiscriminantField(node) {
      if (node.type === 'MemberExpression' && !node.computed) {
        return node.property.name;
      }
      if (node.type === 'Identifier') {
        return node.name;
      }
      return null;
    }

    return {
      SwitchStatement(node) {
        const field = getDiscriminantField(node.discriminant);
        if (!field || !SENTINEL_FIELDS.has(field)) return;

        const hasDefault = node.cases.some((c) => c.test === null);
        if (!hasDefault) {
          context.report({
            node,
            messageId: 'missingDefault',
            data: { field },
          });
        }
      },
    };
  },
};
