/**
 * @fileoverview Ban legacy Svelte 4 patterns in a Svelte 5 runes codebase.
 * Catches: $: reactive labels, on: event directives, <slot> elements.
 * Import-level bans (svelte/store, createEventDispatcher) are handled
 * via no-restricted-imports in eslint.config.js.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban legacy Svelte 4 patterns ($: labels, on: directives, <slot>)',
      category: 'Svelte 5 Migration',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowSlotInWebComponents: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noReactiveLabel:
        '[SVELTE5] `$: {{ expression }}` is a Svelte 4 reactive declaration. Use $derived() for computed values or $effect() for side effects.',
      noOnDirective:
        '[SVELTE5] `on:{{ name }}` is a Svelte 4 event directive. Use the `on{{ name }}` callback prop (lowercase attribute) instead.',
      noSlotElement:
        '[SVELTE5] <slot> is deprecated in Svelte 5. Accept a Snippet prop via $props() and render with {@render snippet()}.',
      noSlotAttribute:
        '[SVELTE5] The `slot` attribute is deprecated in Svelte 5. Pass named snippets via {#snippet name()}...{/snippet} instead.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowSlotInWebComponents = options.allowSlotInWebComponents || false;
    const filename = context.getFilename();
    const isSvelteFile = filename.endsWith('.svelte');

    if (!isSvelteFile) {
      return {};
    }

    return {
      // --- $: reactive labels ---
      // svelte-eslint-parser emits SvelteReactiveStatement (not LabeledStatement)
      // for `$: doubled = count * 2` declarations.
      SvelteReactiveStatement(node) {
        const src = context.getSourceCode();
        const text = src.getText(node.body).slice(0, 40);
        context.report({
          node,
          messageId: 'noReactiveLabel',
          data: { expression: text + (text.length >= 40 ? '...' : '') },
        });
      },

      // --- on: event directives ---
      // svelte-eslint-parser emits SvelteDirective with kind 'EventHandler'.
      // The key.name is a SvelteName object with a .name string property.
      SvelteDirective(node) {
        if (node.kind === 'EventHandler') {
          // key is SvelteDirectiveKey, key.name is SvelteName { name: string }
          const keyName = node.key && node.key.name;
          let eventName = '';

          if (typeof keyName === 'string') {
            eventName = keyName;
          } else if (keyName && typeof keyName === 'object' && typeof keyName.name === 'string') {
            eventName = keyName.name;
          }

          if (eventName) {
            context.report({
              node,
              messageId: 'noOnDirective',
              data: { name: eventName },
            });
          }
        }
      },

      // --- <slot> elements ---
      SvelteElement(node) {
        const elementName = node.name && node.name.name;
        if (elementName === 'slot') {
          if (allowSlotInWebComponents) return;
          context.report({
            node,
            messageId: 'noSlotElement',
          });
        }
      },

      // --- slot="name" attributes on child elements ---
      SvelteAttribute(node) {
        if (
          node.key &&
          node.key.name === 'slot' &&
          node.parent &&
          node.parent.type === 'SvelteStartTag'
        ) {
          context.report({
            node,
            messageId: 'noSlotAttribute',
          });
        }
      },
    };
  },
};

export default rule;
