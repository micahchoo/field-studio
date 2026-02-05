/**
 * @fileoverview Rule to enforce maximum lines in feature molecules and organisms
 * Enforces Atomic Design size constraints per layer
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce maximum lines in feature molecules and organisms',
      category: 'Atomic Design',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          moleculeMax: {
            type: 'number',
            default: 200,
          },
          organismMax: {
            type: 'number',
            default: 300,
          },
          skipBlankLines: {
            type: 'boolean',
            default: true,
          },
          skipComments: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      moleculeTooLarge: '[ARCHITECTURE] Molecule {{name}} has {{lineCount}} lines (max {{max}}). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md',
      organismTooLarge: '[ARCHITECTURE] Organism {{name}} has {{lineCount}} lines (max {{max}}). Extract molecules or decompose. See docs/atomic-design-feature-audit.md',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const moleculeMax = options.moleculeMax || 200;
    const organismMax = options.organismMax || 300;
    const skipBlankLines = options.skipBlankLines !== false;
    const skipComments = options.skipComments !== false;

    const filename = context.getFilename();
    const isMoleculeFile = /features\/[^\/]+\/ui\/molecules\//.test(filename);
    const isOrganismFile = /features\/[^\/]+\/ui\/organisms\//.test(filename);

    if (!isMoleculeFile && !isOrganismFile) {
      return {};
    }

    const sourceCode = context.getSourceCode();
    const lines = sourceCode.lines;
    const componentName = filename.split(/[\\/]/).pop().replace(/\.(ts|tsx)$/, '');

    // Count lines
    let lineCount = lines.length;

    if (skipBlankLines || skipComments) {
      let skippedLines = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        if (skipBlankLines && trimmed === '') {
          skippedLines++;
          continue;
        }

        if (skipComments) {
          // Skip single-line comments
          if (trimmed.startsWith('//')) {
            skippedLines++;
            continue;
          }
          // Note: Multi-line comments require more complex parsing
          // This is a simplified check
          if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '*/') {
            skippedLines++;
            continue;
          }
        }
      }

      lineCount -= skippedLines;
    }

    // Report on program exit
    return {
      'Program:exit'(node) {
        if (isMoleculeFile && lineCount > moleculeMax) {
          context.report({
            node,
            messageId: 'moleculeTooLarge',
            data: {
              name: componentName,
              lineCount,
              max: moleculeMax,
            },
          });
        }

        if (isOrganismFile && lineCount > organismMax) {
          context.report({
            node,
            messageId: 'organismTooLarge',
            data: {
              name: componentName,
              lineCount,
              max: organismMax,
            },
          });
        }
      },
    };
  },
};

export default rule;
