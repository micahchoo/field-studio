/**
 * @fileoverview Rule to restrict native HTML elements in feature molecules
 * Enforces use of atoms instead of native elements like <select>, <input type="range">
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
    
    // Only check feature molecules (not atoms, organisms, or shared)
    const isFeatureMolecule = /features\/[^\/]+\/ui\/molecules\//.test(filename);
    const isSharedMolecule = /shared\/ui\/molecules\//.test(filename);
    
    // Skip if not a molecule file
    if (!isFeatureMolecule && !isSharedMolecule) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        const elementName = node.name.name;

        // Check for forbidden elements
        if (forbiddenElements.includes(elementName)) {
          const messageId = elementName === 'select' 
            ? 'noNativeSelect' 
            : elementName === 'textarea' 
              ? 'noNativeTextarea' 
              : 'noNativeElement';

          context.report({
            node,
            messageId,
            data: { element: elementName },
          });
          return;
        }

        // Check for forbidden input types
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
      },
    };
  },
};

module.exports = rule;
