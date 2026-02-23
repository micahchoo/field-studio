/**
 * @fileoverview Rule to enforce that molecules accept cx? and fieldMode? props
 * Adapted for Svelte: checks `export let` declarations (Svelte 4) and $props() destructuring (Svelte 5)
 * Also checks co-located .ts files with exported Props interfaces
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
      missingCx: '[ARCHITECTURE] Molecule {{name}} should accept optional cx prop for contextual styling.',
      missingFieldMode: '[ARCHITECTURE] Molecule {{name}} should accept optional fieldMode prop for high-contrast support.',
      missingBoth: '[ARCHITECTURE] Molecule {{name}} should accept optional cx and fieldMode props for theming.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const requireCx = options.requireCx !== false;
    const requireFieldMode = options.requireFieldMode !== false;
    const allowExceptions = options.allowExceptions || [];

    const filename = context.getFilename();
    const isMoleculeFile = /molecules[\\/][^\\/]+\.(ts|tsx|svelte)$/.test(filename);

    if (!isMoleculeFile) {
      return {};
    }

    const componentName = filename.split(/[\\/]/).pop().replace(/\.(ts|tsx|svelte)$/, '');
    if (allowExceptions.includes(componentName)) {
      return {};
    }

    const isSvelteFile = filename.endsWith('.svelte');

    let hasPropsInterface = false;
    let hasCxProp = false;
    let hasFieldModeProp = false;
    let hasThemeProp = false;
    let interfaceNode = null;
    let componentNameFromExport = null;

    // For Svelte files: track `export let` declarations and $props() destructuring
    let hasExportLetCx = false;
    let hasExportLetFieldMode = false;
    let hasExportLetTheme = false;
    let hasPropsDestructuring = false;
    let firstExportLetNode = null;

    return {
      // === TypeScript Props interface/type (for .ts co-located files) ===

      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.id) {
          componentNameFromExport = node.declaration.id.name;
        }
      },

      TSInterfaceDeclaration(node) {
        if (node.id.name.endsWith('Props') && node.parent && node.parent.type === 'ExportNamedDeclaration') {
          hasPropsInterface = true;
          interfaceNode = node;

          if (requireCx) {
            hasCxProp = node.body.body.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'cx'
            );
          }

          if (requireFieldMode) {
            hasFieldModeProp = node.body.body.some(
              (member) =>
                member.type === 'TSPropertySignature' &&
                member.key &&
                member.key.name === 'fieldMode'
            );
          }

          hasThemeProp = node.body.body.some(
            (member) =>
              member.type === 'TSPropertySignature' &&
              member.key &&
              member.key.name === 'theme'
          );
        }
      },

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

          hasThemeProp = members.some(
            (member) =>
              member.type === 'TSPropertySignature' &&
              member.key &&
              member.key.name === 'theme'
          );
        }
      },

      // === Svelte 4: `export let cx`, `export let fieldMode` ===

      // LabeledStatement covers `export let` in Svelte script blocks
      // In the parsed AST from eslint-plugin-svelte, exported props appear as
      // ExportNamedDeclaration > VariableDeclaration > VariableDeclarator
      VariableDeclarator(node) {
        if (!isSvelteFile) return;

        // Check if parent chain is ExportNamedDeclaration
        const varDecl = node.parent;
        if (!varDecl || varDecl.type !== 'VariableDeclaration') return;
        const exportDecl = varDecl.parent;
        if (!exportDecl || exportDecl.type !== 'ExportNamedDeclaration') return;

        const name = node.id && node.id.type === 'Identifier' ? node.id.name : null;
        if (!name) return;

        if (!firstExportLetNode) firstExportLetNode = node;

        if (name === 'cx') hasExportLetCx = true;
        if (name === 'fieldMode') hasExportLetFieldMode = true;
        if (name === 'theme') hasExportLetTheme = true;
      },

      // === Svelte 5: `let { cx, fieldMode } = $props()` ===

      CallExpression(node) {
        if (!isSvelteFile) return;

        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === '$props'
        ) {
          hasPropsDestructuring = true;

          // Check parent for destructured names
          const parent = node.parent;
          if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'ObjectPattern') {
            for (const prop of parent.id.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                if (prop.key.name === 'cx') hasExportLetCx = true;
                if (prop.key.name === 'fieldMode') hasExportLetFieldMode = true;
                if (prop.key.name === 'theme') hasExportLetTheme = true;
              }
            }
          }
        }
      },

      'Program:exit'(node) {
        // For Svelte files, check export let / $props() declarations
        if (isSvelteFile) {
          const hasSvelteProps = firstExportLetNode || hasPropsDestructuring;
          if (!hasSvelteProps) return; // No props declared, skip

          if (hasExportLetTheme) return; // theme is acceptable alternative

          const name = componentName;
          const reportNode = firstExportLetNode || node;

          if (requireCx && requireFieldMode && !hasExportLetCx && !hasExportLetFieldMode) {
            context.report({ node: reportNode, messageId: 'missingBoth', data: { name } });
          } else if (requireCx && !hasExportLetCx) {
            context.report({ node: reportNode, messageId: 'missingCx', data: { name } });
          } else if (requireFieldMode && !hasExportLetFieldMode) {
            context.report({ node: reportNode, messageId: 'missingFieldMode', data: { name } });
          }
          return;
        }

        // For .ts files, check TypeScript Props interface
        if (!hasPropsInterface) return;
        if (hasThemeProp) return;

        const name = componentNameFromExport || componentName;

        if (requireCx && requireFieldMode && !hasCxProp && !hasFieldModeProp) {
          context.report({ node: interfaceNode, messageId: 'missingBoth', data: { name } });
        } else if (requireCx && !hasCxProp) {
          context.report({ node: interfaceNode, messageId: 'missingCx', data: { name } });
        } else if (requireFieldMode && !hasFieldModeProp) {
          context.report({ node: interfaceNode, messageId: 'missingFieldMode', data: { name } });
        }
      },
    };
  },
};

export default rule;
