/**
 * @fileoverview Rule to enforce that molecules accept cx? and fieldMode? props
 * P2 Priority: Molecules should accept optional cx and fieldMode props for styling
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce molecules accept optional cx and fieldMode props for contextual styling',
      category: 'Atomic Design',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          requireCx: {
            type: 'boolean',
            default: true,
          },
          requireFieldMode: {
            type: 'boolean',
            default: true,
          },
          allowExceptions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingCx: '[ARCHITECTURE] Molecule {{name}} should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface.',
      missingFieldMode: '[ARCHITECTURE] Molecule {{name}} should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface.',
      missingBoth: '[ARCHITECTURE] Molecule {{name}} should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const requireCx = options.requireCx !== false;
    const requireFieldMode = options.requireFieldMode !== false;
    const allowExceptions = options.allowExceptions || [];

    // Track if we're in a molecule file
    const filename = context.getFilename();
    const isMoleculeFile = /molecules[\\/][^\\/]+\.(ts|tsx)$/.test(filename);

    if (!isMoleculeFile) {
      return {};
    }

    // Check if component is in exceptions list
    const componentName = filename.split(/[\\/]/).pop().replace(/\.(ts|tsx)$/, '');
    if (allowExceptions.includes(componentName)) {
      return {};
    }

    let hasPropsInterface = false;
    let hasCxProp = false;
    let hasFieldModeProp = false;
    let hasThemeProp = false; // theme?: ThemeTokens is an acceptable alternative
    let interfaceNode = null;
    let componentNameFromExport = null;

    return {
      // Track exported component name
      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.id) {
          componentNameFromExport = node.declaration.id.name;
        }
      },

      // Track interface declarations (exported only — internal sub-component Props are exempt)
      TSInterfaceDeclaration(node) {
        if (node.id.name.endsWith('Props') && node.parent && node.parent.type === 'ExportNamedDeclaration') {
          hasPropsInterface = true;
          interfaceNode = node;

          // Check for cx property
          if (requireCx) {
            hasCxProp = node.body.body.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'cx'
            );
          }

          // Check for fieldMode property
          if (requireFieldMode) {
            hasFieldModeProp = node.body.body.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'fieldMode'
            );
          }

          // Check for theme property (acceptable alternative to cx + fieldMode)
          hasThemeProp = node.body.body.some(
            (member) =>
              member.type === 'TSPropertySignature' &&
              member.key &&
              member.key.name === 'theme'
          );
        }
      },

      // Track type alias declarations (exported only)
      TSTypeAliasDeclaration(node) {
        if (node.id.name.endsWith('Props') && node.typeAnnotation.type === 'TSTypeLiteral' && node.parent && node.parent.type === 'ExportNamedDeclaration') {
          hasPropsInterface = true;
          interfaceNode = node;

          const members = node.typeAnnotation.members;

          if (requireCx) {
            hasCxProp = members.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'cx'
            );
          }

          if (requireFieldMode) {
            hasFieldModeProp = members.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'fieldMode'
            );
          }

          // Check for theme property (acceptable alternative)
          hasThemeProp = members.some(
            (member) =>
              member.type === 'TSPropertySignature' &&
              member.key &&
              member.key.name === 'theme'
          );
        }
      },

      // Report on program exit
      'Program:exit'() {
        if (!hasPropsInterface) {
          // Skip if no props interface found (might use inline props)
          return;
        }

        // theme?: ThemeTokens is an acceptable alternative to cx + fieldMode
        if (hasThemeProp) {
          return;
        }

        const name = componentNameFromExport || componentName;

        if (requireCx && requireFieldMode && !hasCxProp && !hasFieldModeProp) {
          context.report({
            node: interfaceNode,
            messageId: 'missingBoth',
            data: { name },
          });
        } else if (requireCx && !hasCxProp) {
          context.report({
            node: interfaceNode,
            messageId: 'missingCx',
            data: { name },
          });
        } else if (requireFieldMode && !hasFieldModeProp) {
          context.report({
            node: interfaceNode,
            messageId: 'missingFieldMode',
            data: { name },
          });
        }
      },
    };
  },
};

export default rule;
