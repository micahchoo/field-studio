/**
 * @fileoverview Rule to restrict native HTML elements in feature molecules
 * Adapted for Svelte: checks both JSX elements (JSXOpeningElement) and
 * Svelte template elements (SvelteElement) for forbidden native HTML
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict native HTML elements in feature molecules',
      category: 'Atomic Design',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenElements: {
            type: 'array',
            items: { type: 'string' },
            default: ['select', 'textarea'],
          },
          forbiddenInputTypes: {
            type: 'array',
            items: { type: 'string' },
            default: ['range', 'color'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNativeSelect: '[ARCHITECTURE] Native <select> not allowed in molecules. Use Select atom from shared or create feature-specific atom.',
      noNativeTextarea: '[ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom.',
      noNativeInputType: '[ARCHITECTURE] Native <input type="{{type}}"> not allowed in molecules. Use feature-specific atom.',
      noNativeElement: '[ARCHITECTURE] Native <{{element}}> not allowed in molecules. Use atomic component or feature-specific atom.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const forbiddenElements = options.forbiddenElements || ['select', 'textarea'];
    const forbiddenInputTypes = options.forbiddenInputTypes || ['range', 'color'];

    const filename = context.getFilename();

    const isFeatureMolecule = /features\/[^\/]+\/ui\/molecules\//.test(filename);
    const isSharedMolecule = /shared\/ui\/molecules\//.test(filename);
    const isFeatureOrganism = /features\/[^\/]+\/ui\/organisms\//.test(filename);
    const isSharedOrganism = /shared\/ui\/organisms\//.test(filename);

    if (!isFeatureMolecule && !isSharedMolecule && !isFeatureOrganism && !isSharedOrganism) {
      return {};
    }

    function getMessageId(elementName) {
      if (elementName === 'select') return 'noNativeSelect';
      if (elementName === 'textarea') return 'noNativeTextarea';
      return 'noNativeElement';
    }

    function checkJSXElement(node) {
      const elementName = node.name.name;
      if (!elementName) return; // Skip namespaced or member expressions

      if (forbiddenElements.includes(elementName)) {
        context.report({
          node,
          messageId: getMessageId(elementName),
          data: { element: elementName },
        });
        return;
      }

      if (elementName === 'input' && node.attributes) {
        const typeAttr = node.attributes.find(
          (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'type'
        );

        if (typeAttr && typeAttr.value) {
          let inputType = '';
          if (typeAttr.value.type === 'Literal') {
            inputType = typeAttr.value.value;
          } else if (
            typeAttr.value.type === 'JSXExpressionContainer' &&
            typeAttr.value.expression.type === 'Literal'
          ) {
            inputType = typeAttr.value.expression.value;
          }

          if (forbiddenInputTypes.includes(inputType)) {
            context.report({
              node,
              messageId: 'noNativeInputType',
              data: { type: inputType },
            });
          }
        }
      }
    }

    function checkSvelteElement(node) {
      // SvelteElement nodes from eslint-plugin-svelte have a `name` property
      // For native HTML elements, name.type === 'SvelteName' and name.name is the tag
      const elementName = node.name && node.name.name;
      if (!elementName || typeof elementName !== 'string') return;

      // Skip Svelte components (PascalCase) and special elements (svelte:*)
      if (elementName[0] === elementName[0].toUpperCase()) return;
      if (elementName.startsWith('svelte:')) return;

      if (forbiddenElements.includes(elementName)) {
        context.report({
          node,
          messageId: getMessageId(elementName),
          data: { element: elementName },
        });
        return;
      }

      if (elementName === 'input' && node.startTag && node.startTag.attributes) {
        const typeAttr = node.startTag.attributes.find(
          (attr) => attr.type === 'SvelteAttribute' && attr.key && attr.key.name === 'type'
        );

        if (typeAttr && typeAttr.value && typeAttr.value.length > 0) {
          const val = typeAttr.value[0];
          let inputType = '';

          if (val.type === 'SvelteLiteral') {
            inputType = val.value;
          } else if (val.type === 'SvelteMustacheTag' && val.expression && val.expression.type === 'Literal') {
            inputType = val.expression.value;
          }

          if (forbiddenInputTypes.includes(inputType)) {
            context.report({
              node,
              messageId: 'noNativeInputType',
              data: { type: inputType },
            });
          }
        }
      }
    }

    return {
      // JSX elements (for .tsx files if any)
      JSXOpeningElement: checkJSXElement,

      // Svelte template elements
      SvelteElement: checkSvelteElement,
    };
  },
};

export default rule;
