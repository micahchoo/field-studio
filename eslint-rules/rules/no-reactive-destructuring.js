/**
 * @fileoverview Prevent destructuring of reactive module singletons.
 * In Svelte 5, destructuring a reactive object captures the value at that point —
 * it does NOT create a live binding. This is the #1 source of "why isn't my
 * component updating?" bugs.
 *
 * Catches:
 *   import { vault } from './stores/vault.svelte';
 *   const { state, rootId } = vault;  // ERROR — captured, not reactive
 *
 * Does NOT fire on:
 *   vault.state                       — property access is tracked
 *   const { a, b } = $props();        — compiler-transformed, always reactive
 *   function handle() {
 *     const { state } = vault;        — inside a function, one-shot read is fine
 *   }
 *   const { parse } = JSON;           — not from a .svelte.ts module
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent destructuring of imports from .svelte.ts/.svelte.js reactive modules at module scope',
      category: 'Svelte 5 Reactivity',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          additionalModulePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional module specifier patterns (regex strings) to treat as reactive',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDestructuring:
        '[REACTIVITY] Destructuring `{{ name }}` from a reactive module breaks reactivity. Access properties directly (e.g. `{{ name }}.{{ property }}`) in templates and $derived blocks instead.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const additionalPatterns = (options.additionalModulePatterns || []).map(
      (p) => new RegExp(p)
    );

    // Track which local binding names come from reactive modules
    const reactiveBindings = new Set();

    function isReactiveSource(source) {
      if (!source || typeof source !== 'string') return false;

      // .svelte.ts and .svelte.js files are reactive by convention.
      // Import specifiers often omit the .ts/.js extension, so also match
      // bare .svelte imports (e.g. './stores/vault.svelte' → vault.svelte.ts)
      if (/\.svelte(\.(ts|js))?$/.test(source)) return true;

      // Check additional patterns
      return additionalPatterns.some((re) => re.test(source));
    }

    /**
     * Check if a node is at module scope (not inside any function/arrow/method).
     * In Svelte files, the top-level <script> block's body is the module scope.
     */
    function isModuleScope(node) {
      let current = node.parent;
      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression' ||
          current.type === 'MethodDefinition'
        ) {
          return false;
        }
        // $derived.by(() => { ... }) — destructuring inside is still tracked,
        // but it's a one-shot computation. Allow it since the outer $derived
        // re-runs when dependencies change.
        if (
          current.type === 'CallExpression' &&
          current.callee &&
          (
            (current.callee.type === 'Identifier' && current.callee.name === '$derived') ||
            (current.callee.type === 'MemberExpression' &&
              current.callee.object &&
              current.callee.object.name === '$derived' &&
              current.callee.property &&
              current.callee.property.name === 'by')
          )
        ) {
          return false;
        }
        current = current.parent;
      }
      return true;
    }

    return {
      // Track default and named imports from reactive modules
      ImportDeclaration(node) {
        const source = node.source && node.source.value;
        if (!isReactiveSource(source)) return;

        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportDefaultSpecifier' ||
            specifier.type === 'ImportSpecifier'
          ) {
            reactiveBindings.add(specifier.local.name);
          }
          // ImportNamespaceSpecifier (import * as ns) — also reactive
          if (specifier.type === 'ImportNamespaceSpecifier') {
            reactiveBindings.add(specifier.local.name);
          }
        }
      },

      // Detect destructuring of reactive bindings
      VariableDeclarator(node) {
        // Only care about object destructuring patterns
        if (node.id.type !== 'ObjectPattern') return;

        // The init must reference a reactive binding
        if (!node.init) return;

        let bindingName = null;

        if (node.init.type === 'Identifier') {
          bindingName = node.init.name;
        }
        // Handle: const { x } = vault.something — still flag it
        // since vault.something returns a reactive proxy
        if (
          node.init.type === 'MemberExpression' &&
          node.init.object.type === 'Identifier'
        ) {
          bindingName = node.init.object.name;
        }

        if (!bindingName || !reactiveBindings.has(bindingName)) return;

        // Skip $props() destructuring — compiler handles reactivity
        if (
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === '$props'
        ) {
          return;
        }

        // Only flag at module scope
        if (!isModuleScope(node)) return;

        // Extract the first property name for a helpful message
        const firstProp = node.id.properties[0];
        const propName =
          firstProp &&
          firstProp.type === 'Property' &&
          firstProp.key &&
          firstProp.key.type === 'Identifier'
            ? firstProp.key.name
            : '...';

        context.report({
          node,
          messageId: 'noDestructuring',
          data: {
            name: bindingName,
            property: propName,
          },
        });
      },
    };
  },
};

export default rule;
