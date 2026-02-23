/**
 * @fileoverview Detect $effect blocks that should be $derived instead.
 * The #1 migration mistake from React: using $effect to synchronize derived state.
 *
 * Catches:
 *   $effect(() => { doubled = count * 2; });      — single assignment, no side effects
 *   $effect(() => { label = items.length + ' items'; });
 *
 * Does NOT fire on:
 *   $effect(() => { document.title = name; });     — writing to external sink (DOM)
 *   $effect(() => { localStorage.setItem(...); }); — side effect
 *   $effect(() => { if (x) y = 1; });              — conditional (may be intentional)
 *   $effect(() => { a = 1; b = 2; });              — multiple statements (complex)
 *   $effect(() => { fetch(...).then(...); });       — async side effect
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest $derived instead of $effect for single-assignment reactive computations',
      category: 'Svelte 5 Reactivity',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      useDerived:
        '[REACTIVITY] This $effect only assigns to `{{ name }}`. Use `let {{ name }} = $derived(...)` instead — $effect is for side effects, $derived is for computed values.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Match $effect(() => { ... }) and $effect.pre(() => { ... })
        if (!isEffectCall(node)) return;

        const callback = node.arguments[0];
        if (!callback) return;
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) return;

        // Callback must not be async
        if (callback.async) return;

        // Body must be a block statement with exactly one statement
        if (!callback.body || callback.body.type !== 'BlockStatement') return;
        const body = callback.body.body;
        if (body.length !== 1) return;

        const stmt = body[0];

        // The single statement must be an assignment expression
        if (stmt.type !== 'ExpressionStatement') return;
        if (stmt.expression.type !== 'AssignmentExpression') return;

        const assignment = stmt.expression;

        // LHS must be a simple identifier (not a member expression like document.title)
        if (assignment.left.type !== 'Identifier') return;

        // RHS must not contain function calls that look like side effects
        // (fetch, console.log, localStorage, document.*, etc.)
        if (containsSideEffectCalls(assignment.right)) return;

        const name = assignment.left.name;

        context.report({
          node,
          messageId: 'useDerived',
          data: { name },
        });
      },
    };

    function isEffectCall(node) {
      // $effect(...)
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === '$effect'
      ) return true;

      // $effect.pre(...)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === '$effect' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'pre'
      ) return true;

      return false;
    }

    /**
     * Heuristic: check if an expression contains calls that look like side effects.
     * If it does, the $effect is probably intentional.
     */
    function containsSideEffectCalls(node) {
      if (!node || typeof node !== 'object') return false;

      if (node.type === 'CallExpression') {
        const callee = node.callee;

        // Direct call: fetch(), console.log(), etc.
        if (callee.type === 'Identifier') {
          const name = callee.name;
          if (/^(fetch|setTimeout|setInterval|requestAnimationFrame|alert|confirm|prompt)$/.test(name)) {
            return true;
          }
        }

        // Member call: document.*, localStorage.*, console.*, element.*
        if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
          const obj = callee.object.name;
          if (/^(document|window|localStorage|sessionStorage|console|navigator|history)$/.test(obj)) {
            return true;
          }
        }
      }

      // Recurse into child nodes
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && item.type && containsSideEffectCalls(item)) {
              return true;
            }
          }
        } else if (child && typeof child === 'object' && child.type) {
          if (containsSideEffectCalls(child)) return true;
        }
      }

      return false;
    }
  },
};

export default rule;
