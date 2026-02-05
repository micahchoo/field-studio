/**
 * Structure View Feature
 *
 * Hierarchical tree view for IIIF collections, manifests, and canvases.
 * 
 * ATOMIC DESIGN:
 * - Atoms: StructureNodeIcon, ExpandButton, NodeLabel
 * - Molecules: TreeNodeItem, StructureToolbar, EmptyStructure
 * - Organisms: StructureTreeView
 * - Model: useStructureTree
 * 
 * Uses migrated utils from @/utils/organisms/iiif:
 * - Traversal: getAllCollections, getAllManifests, findNodeById, etc.
 * - Hierarchy: getRelationshipType, isValidChildType, etc.
 */

// Organism
export { StructureTreeView } from './ui/organisms/StructureTreeView';

// Model
export { useStructureTree } from './model/useStructureTree';
export type {
  StructureNode,
  StructureViewState,
  UseStructureTreeOptions,
  UseStructureTreeReturn,
} from './model/useStructureTree';
