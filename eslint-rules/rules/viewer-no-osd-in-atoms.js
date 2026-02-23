/**
 * @fileoverview Prevent importing OpenSeadragon (OSD) in viewer atom components.
 *
 * Atoms are small, reusable, stateless components that should not depend on
 * heavy third-party libraries like OpenSeadragon. OSD integration belongs in
 * organisms (ViewerCanvas, OSDViewer) or dedicated hooks/services.
 *
 * This rule errors if a file under src/features/viewer/ui/atoms/ (or
 * src/shared/ui/atoms/) imports openseadragon or the openseadragon-shim.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent importing OpenSeadragon in viewer atom components',
      category: 'Architecture',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noOsdInAtoms:
        'Atom components must not import OpenSeadragon. Move OSD integration to an organism or a dedicated hook/service.',
    },
  },

  create(context) {
    const filename = context.getFilename();

    // Only apply to files under atoms/ directories in the viewer feature or shared ui
    const isAtomFile =
      /src[/\\]features[/\\]viewer[/\\]ui[/\\]atoms[/\\]/.test(filename) ||
      /src[/\\]shared[/\\]ui[/\\]atoms[/\\]/.test(filename);

    if (!isAtomFile) return {};

    // OSD-related import sources to flag
    const OSD_PATTERNS = [
      /^openseadragon$/,
      /openseadragon-shim/,
      /openseadragon-filtering/,
      /@annotorious\/openseadragon/,
    ];

    function isOSDImport(source) {
      return OSD_PATTERNS.some(pattern => pattern.test(source));
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (isOSDImport(source)) {
          context.report({
            node,
            messageId: 'noOsdInAtoms',
          });
        }
      },
    };
  },
};

export default rule;
