/**
 * @fileoverview Rule to enforce templates are context providers only
 * Adapted for Svelte: checks for setContext/getContext instead of useContext,
 * and onMount with fetch instead of useEffect with fetch
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce templates are context providers only with no data fetching',
      category: 'Atomic Design',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['setContext', 'getContext', 'hasContext', 'getAllContexts', 'onMount', 'onDestroy'],
          },
          forbiddenImports: {
            type: 'array',
            items: { type: 'string' },
            default: ['@/services', '@/services'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDataFetching: '[ARCHITECTURE] Templates should not fetch data. Data fetching belongs in Organisms. Move {{name}} call to an organism.',
      noServiceImports: '[ARCHITECTURE] Templates should not import services. Services belong in organisms.',
      noBusinessLogic: '[ARCHITECTURE] Templates should only provide context, not contain business logic.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedFunctions = options.allowedFunctions || [
      'setContext', 'getContext', 'hasContext', 'getAllContexts',
      'onMount', 'onDestroy',
    ];
    const forbiddenImports = options.forbiddenImports || ['@/services', '@/services'];

    const filename = context.getFilename();
    const isTemplateFile = /templates[\\/][^\\/]+\.(ts|tsx|svelte)$/.test(filename);

    if (!isTemplateFile) {
      return {};
    }

    return {
      // Check for data fetching in onMount (Svelte equivalent of useEffect)
      'CallExpression[callee.name="onMount"]'(node) {
        const callbackArg = node.arguments[0];
        if (!callbackArg || !callbackArg.body) return;

        const body = callbackArg.body.type === 'BlockStatement' ? callbackArg.body.body : [];

        for (const statement of body) {
          if (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression'
          ) {
            const call = statement.expression;
            if (call.callee.type === 'Identifier' && call.callee.name === 'fetch') {
              context.report({
                node: call,
                messageId: 'noDataFetching',
                data: { name: 'fetch' },
              });
            }
          }

          if (statement.type === 'VariableDeclaration') {
            for (const decl of statement.declarations) {
              if (
                decl.init &&
                decl.init.type === 'CallExpression' &&
                decl.init.callee.type === 'Identifier' &&
                decl.init.callee.name === 'fetch'
              ) {
                context.report({
                  node: decl.init,
                  messageId: 'noDataFetching',
                  data: { name: 'fetch' },
                });
              }
            }
          }
        }
      },

      // Also check useEffect for hybrid/compat scenarios
      'CallExpression[callee.name="useEffect"]'(node) {
        const effectFn = node.arguments[0];
        if (!effectFn || !effectFn.body) return;

        const body = effectFn.body.type === 'BlockStatement' ? effectFn.body.body : [];

        for (const statement of body) {
          if (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression'
          ) {
            const call = statement.expression;
            if (call.callee.type === 'Identifier' && call.callee.name === 'fetch') {
              context.report({
                node: call,
                messageId: 'noDataFetching',
                data: { name: 'fetch' },
              });
            }
          }
        }
      },

      // Check for forbidden imports
      ImportDeclaration(node) {
        const source = node.source.value;

        for (const forbidden of forbiddenImports) {
          if (source.startsWith(forbidden)) {
            context.report({
              node,
              messageId: 'noServiceImports',
            });
            return;
          }
        }

        if (
          /service/i.test(source) ||
          /api/i.test(source) ||
          /client/i.test(source)
        ) {
          context.report({
            node,
            messageId: 'noServiceImports',
          });
        }
      },

      // Check for hook/function usage
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        const fnName = node.callee.name;

        // Allow known Svelte functions
        if (allowedFunctions.includes(fnName)) return;

        // Block data-related functions
        if (
          fnName.includes('Data') ||
          fnName.includes('Fetch') ||
          fnName.includes('Load') ||
          fnName.includes('Query') ||
          fnName.includes('Mutation')
        ) {
          context.report({
            node,
            messageId: 'noDataFetching',
            data: { name: fnName },
          });
        }

        // Block React-style data hooks if present (hybrid scenario)
        if (fnName.startsWith('use') && (
          fnName.includes('Data') ||
          fnName.includes('Fetch') ||
          fnName.includes('Load') ||
          fnName.includes('Query') ||
          fnName.includes('Mutation')
        )) {
          context.report({
            node,
            messageId: 'noDataFetching',
            data: { name: fnName },
          });
        }
      },
    };
  },
};

export default rule;
