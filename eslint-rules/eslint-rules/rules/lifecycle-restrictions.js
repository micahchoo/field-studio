/**
 * @fileoverview Rule to restrict lifecycle hook usage in molecules
 * Adapted for Svelte: detects onMount/onDestroy/beforeUpdate/afterUpdate instead of useEffect
 * Prevents molecules from calling external services or performing async operations in lifecycle hooks
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict Svelte lifecycle hooks in molecules from calling external services or domain logic',
      category: 'Atomic Design',
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
            default: ['^set', '^clear', '^addEventListener', '^removeEventListener'],
          },
          forbiddenPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['^fetch', '^load', '^get', '^save', '^update', '^delete', '^create', '^api', '^request'],
          },
          lifecycleHooks: {
            type: 'array',
            items: { type: 'string' },
            default: ['onMount', 'onDestroy', 'beforeUpdate', 'afterUpdate', '$effect'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noExternalCalls: '[ARCHITECTURE] {{hook}} in molecules should not call external services ({{callee}}). Move to organism or use props callback.',
      noAsyncLifecycle: '[ARCHITECTURE] {{hook}} in molecules should not be async or contain async operations. Use props to receive data.',
      noServiceCalls: '[ARCHITECTURE] {{hook}} in molecules should not call service methods ({{callee}}). Services belong in organisms.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = (options.allowedPatterns || ['^set', '^clear', '^addEventListener', '^removeEventListener']).map(
      (p) => new RegExp(p)
    );
    const forbiddenPatterns = (options.forbiddenPatterns || ['^fetch', '^load', '^get', '^save', '^update', '^delete', '^create', '^api', '^request']).map(
      (p) => new RegExp(p)
    );
    const lifecycleHooks = options.lifecycleHooks || ['onMount', 'onDestroy', 'beforeUpdate', 'afterUpdate', '$effect'];

    const filename = context.getFilename();
    const isMoleculeFile = /molecules[\\/][^\\/]+\.(ts|tsx|svelte)$/.test(filename);

    if (!isMoleculeFile) {
      return {};
    }

    let insideLifecycle = false;
    let lifecycleDepth = 0;
    let currentHookName = '';
    let lifecycleCallNode = null;

    function isAllowed(name) {
      return allowedPatterns.some((pattern) => pattern.test(name));
    }

    function isForbidden(name) {
      return forbiddenPatterns.some((pattern) => pattern.test(name));
    }

    function isLifecycleHook(name) {
      return lifecycleHooks.includes(name);
    }

    function checkCallExpression(node) {
      if (!insideLifecycle) return;

      let calleeName = '';

      if (node.callee.type === 'Identifier') {
        calleeName = node.callee.name;
      } else if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier'
      ) {
        calleeName = node.callee.property.name;
      }

      if (!calleeName) return;

      // Check for forbidden patterns
      if (isForbidden(calleeName) && !isAllowed(calleeName)) {
        context.report({
          node,
          messageId: 'noExternalCalls',
          data: { callee: calleeName, hook: currentHookName },
        });
      }

      // Check for service-like calls
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier'
      ) {
        const objectName = node.callee.object.name;
        if (
          /service$/i.test(objectName) ||
          /api$/i.test(objectName) ||
          /client$/i.test(objectName) ||
          /store$/i.test(objectName)
        ) {
          context.report({
            node,
            messageId: 'noServiceCalls',
            data: { callee: `${objectName}.${calleeName}`, hook: currentHookName },
          });
        }
      }
    }

    return {
      // Detect entering a Svelte lifecycle hook
      CallExpression(node) {
        // Handle $effect (Identifier) and $effect.pre (MemberExpression)
        const isEffectPre =
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === '$effect' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'pre';

        const directName =
          node.callee.type === 'Identifier' ? node.callee.name : null;

        const hookName = isEffectPre ? '$effect.pre' : directName;

        if (
          hookName &&
          (isLifecycleHook(hookName) || (isEffectPre && isLifecycleHook('$effect')))
        ) {
          insideLifecycle = true;
          lifecycleDepth = 1;
          currentHookName = hookName;
          lifecycleCallNode = node;

          // Check if the callback is async
          const callbackArg = node.arguments[0];
          if (callbackArg && callbackArg.async) {
            context.report({
              node: callbackArg,
              messageId: 'noAsyncLifecycle',
              data: { hook: currentHookName },
            });
          }

          // Check for async IIFE inside the callback body
          if (
            callbackArg &&
            (callbackArg.type === 'ArrowFunctionExpression' || callbackArg.type === 'FunctionExpression') &&
            callbackArg.body &&
            callbackArg.body.type === 'BlockStatement'
          ) {
            for (const statement of callbackArg.body.body) {
              if (
                statement.type === 'ExpressionStatement' &&
                statement.expression.type === 'CallExpression' &&
                statement.expression.callee.type === 'ArrowFunctionExpression' &&
                statement.expression.callee.async
              ) {
                context.report({
                  node: statement.expression,
                  messageId: 'noAsyncLifecycle',
                  data: { hook: currentHookName },
                });
              }
            }
          }
        }

        // Check call expressions inside lifecycle hooks
        checkCallExpression(node);
      },

      // Reset lifecycle state when exiting the lifecycle call
      'CallExpression:exit'(node) {
        if (node === lifecycleCallNode) {
          insideLifecycle = false;
          lifecycleDepth = 0;
          currentHookName = '';
          lifecycleCallNode = null;
        }
      },

      // Track nested function boundaries
      ':matches(FunctionExpression, ArrowFunctionExpression, FunctionDeclaration)'() {
        if (insideLifecycle) {
          lifecycleDepth++;
        }
      },

      ':matches(FunctionExpression, ArrowFunctionExpression, FunctionDeclaration):exit'() {
        if (insideLifecycle) {
          lifecycleDepth--;
          if (lifecycleDepth === 0) {
            insideLifecycle = false;
            currentHookName = '';
          }
        }
      },
    };
  },
};

export default rule;
