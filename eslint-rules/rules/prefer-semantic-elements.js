/**
 * @fileoverview Prefer native HTML elements over ARIA role reconstructions.
 * Detects <div> or <span> with an interactive ARIA role and suggests the
 * appropriate native element instead.
 *
 * Catches:
 *   <div role="button">        → use <button>
 *   <span role="link">         → use <a>
 *   <div role="tab">           → use <button role="tab">
 *   <div role="textbox">       → use <input> or <textarea>
 *
 * Does NOT fire on:
 *   <div role="region">        — non-interactive role, legitimate use
 *   <nav role="navigation">    — native element already used
 *   <button role="tab">        — native interactive element, fine
 */

/**
 * Interactive ARIA roles and their suggested native replacements.
 */
const INTERACTIVE_ROLES = {
  button: '<button>',
  link: '<a>',
  tab: '<button role="tab">',
  menuitem: '<button role="menuitem">',
  menuitemcheckbox: '<input type="checkbox"> or <button>',
  menuitemradio: '<input type="radio"> or <button>',
  option: '<option>',
  switch: '<button role="switch"> or <input type="checkbox">',
  checkbox: '<input type="checkbox">',
  radio: '<input type="radio">',
  textbox: '<input> or <textarea>',
  slider: '<input type="range">',
  spinbutton: '<input type="number">',
  searchbox: '<input type="search">',
  combobox: '<input> with <datalist> or <select>',
};

/** Non-interactive elements that should not carry interactive roles. */
const NON_INTERACTIVE_ELEMENTS = ['div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'p', 'li'];

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer native HTML elements over non-interactive elements with interactive ARIA roles',
      category: 'Accessibility',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          additionalRoles: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {},
          },
          ignoreElements: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferNative:
        '[A11Y] <{{ element }} role="{{ role }}"> should use {{ replacement }}. Native elements provide keyboard and screen reader support for free.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const additionalRoles = options.additionalRoles || {};
    const ignoreElements = options.ignoreElements || [];
    const allRoles = { ...INTERACTIVE_ROLES, ...additionalRoles };

    const filename = context.getFilename();
    if (!filename.endsWith('.svelte')) return {};

    return {
      SvelteElement(node) {
        const elementName = node.name && node.name.name;
        if (!elementName || typeof elementName !== 'string') return;

        // Skip components (PascalCase), svelte: specials, and ignored elements
        if (elementName[0] === elementName[0].toUpperCase()) return;
        if (elementName.startsWith('svelte:')) return;
        if (ignoreElements.includes(elementName)) return;

        // Only check non-interactive elements
        if (!NON_INTERACTIVE_ELEMENTS.includes(elementName)) return;

        // Find the role attribute
        if (!node.startTag || !node.startTag.attributes) return;

        const roleAttr = node.startTag.attributes.find(
          (attr) =>
            attr.type === 'SvelteAttribute' &&
            attr.key &&
            attr.key.name === 'role'
        );

        if (!roleAttr || !roleAttr.value || !roleAttr.value.length) return;

        // Extract the role value — only check static string values
        const val = roleAttr.value[0];
        let roleValue = null;

        if (val.type === 'SvelteLiteral') {
          roleValue = val.value;
        }

        if (!roleValue) return;

        // Check if the role is in our interactive roles map
        const replacement = allRoles[roleValue];
        if (!replacement) return;

        context.report({
          node,
          messageId: 'preferNative',
          data: {
            element: elementName,
            role: roleValue,
            replacement,
          },
        });
      },
    };
  },
};

export default rule;
