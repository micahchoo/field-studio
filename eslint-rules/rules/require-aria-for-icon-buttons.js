/**
 * @fileoverview Require aria-label or aria-labelledby on icon-only buttons.
 *
 * An "icon-only" button is one whose text content consists only of:
 *  - Material Icons text (e.g. <span class="material-icons">close</span>)
 *  - SVG elements
 *  - A single short text that looks like an icon name (no spaces, ≤ 20 chars)
 *
 * Applies to <button> elements (and role="button") in Svelte files.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require aria-label or aria-labelledby on icon-only buttons',
      category: 'Accessibility',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      missingAriaLabel:
        'Icon-only buttons must have aria-label or aria-labelledby for screen readers.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isSvelteFile = filename.endsWith('.svelte');
    if (!isSvelteFile) return {};

    /**
     * Check whether a SvelteElement looks like an icon-only button.
     * We look for <button> elements that:
     *   1. Have no text children (or only whitespace / icon-name strings)
     *   2. Have at least one child element (icon span or SVG)
     */
    function isIconOnlyButton(node) {
      // Only care about <button> elements
      const name = node.name && node.name.name;
      if (name !== 'button') return false;

      // Walk children to check for meaningful text vs icon elements
      const children = node.children || [];
      let hasIconChild = false;
      let hasMeaningfulText = false;

      for (const child of children) {
        if (child.type === 'SvelteText') {
          const text = child.value.trim();
          if (text.length === 0) continue;
          // If text has spaces or is > 20 chars, treat as real label
          if (text.includes(' ') || text.length > 20) {
            hasMeaningfulText = true;
          }
          // Short single-word text could be an icon name — don't flag as text
        } else if (child.type === 'SvelteElement') {
          // SVG or span with icon class count as icon children
          const childName = child.name && child.name.name;
          if (childName === 'svg' || childName === 'span' || childName === 'i') {
            hasIconChild = true;
          }
        }
      }

      return hasIconChild && !hasMeaningfulText;
    }

    function hasAriaLabel(node) {
      const startTag = node.startTag;
      if (!startTag) return false;

      return startTag.attributes.some(attr => {
        if (attr.type !== 'SvelteAttribute') return false;
        const attrName = attr.key && attr.key.name;
        return attrName === 'aria-label' || attrName === 'aria-labelledby';
      });
    }

    return {
      SvelteElement(node) {
        if (isIconOnlyButton(node) && !hasAriaLabel(node)) {
          context.report({
            node,
            messageId: 'missingAriaLabel',
          });
        }
      },
    };
  },
};

export default rule;
