import { IIIFItem, IIIFManifest, IIIFCollection, IIIFCanvas, getIIIFValue, isCanvas, isManifest, isCollection } from '../types';
import {
  validateResource as schemaValidateResource,
  IIIF_SCHEMA,
  isBehaviorAllowed,
  getRecommendedProperties
} from '../utils/iiifSchema';
import { isValidHttpUri } from '../utils';
import {
  validateBehaviors,
  doesInheritBehavior,
  findBehaviorConflicts
} from '../utils/iiifBehaviors';

export type IssueCategory = 'Identity' | 'Structure' | 'Metadata' | 'Content';

export interface ValidationIssue {
  id: string;
  itemId: string;
  itemLabel: string;
  level: 'error' | 'warning';
  message: string;
  category: IssueCategory;
  fixable: boolean;
}

/**
 * ValidationService provides tree-aware IIIF validation.
 *
 * This service builds on the centralized schema validation from utils/iiifSchema.ts
 * and adds tree-context validation:
 * - Duplicate ID detection across the tree
 * - Behavior inheritance conflicts
 * - Content presence checks (painting annotations)
 * - UX-focused warnings for recommended properties
 */
export class ValidationService {

  validateTree(root: IIIFItem | null): Record<string, ValidationIssue[]> {
      const issueMap: Record<string, ValidationIssue[]> = {};
      if (!root) return issueMap;

      const seenIds = new Set<string>();

      const traverse = (item: IIIFItem, parent?: IIIFItem, parentType?: string) => {
          const issues = this.validateItem(item, parent, parentType);

          if (seenIds.has(item.id)) {
              issues.push({
                  id: Math.random().toString(36).substr(2, 9),
                  itemId: item.id,
                  itemLabel: getIIIFValue(item.label) || 'Unknown',
                  level: 'error',
                  category: 'Identity',
                  message: 'CRITICAL: Duplicate ID detected. This will break most IIIF viewers.',
                  fixable: true
              });
          }
          seenIds.add(item.id);

          if (issues.length > 0) {
              issueMap[item.id] = (issueMap[item.id] || []).concat(issues);
          }

          const children = (item as any).items || (item as any).annotations || (item as any).structures || [];
          children.forEach((child: any) => {
              if (child && typeof child === 'object') traverse(child, item, item.type);
          });
      };

      traverse(root);
      return issueMap;
  }

  private hasContent(map?: Record<string, string[]>): boolean {
    if (!map) return false;
    return Object.values(map).some(arr => arr.some(s => s && s.trim().length > 0));
  }

  /**
   * Map schema validation errors to ValidationIssue format
   */
  private mapSchemaErrors(item: IIIFItem, schemaErrors: string[]): ValidationIssue[] {
    return schemaErrors.map(err => {
      let category: IssueCategory = 'Structure';
      let fixable = false;

      if (err.includes('id') || err.includes('type')) {
        category = 'Identity';
        fixable = true;
      } else if (err.includes('width') || err.includes('height') || err.includes('duration')) {
        category = 'Content';
        fixable = true;
      } else if (err.includes('behavior') || err.includes('Behavior')) {
        category = 'Structure';
        fixable = true;
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        itemId: item.id,
        itemLabel: getIIIFValue(item.label) || 'Untitled',
        level: 'error' as const,
        category,
        message: err,
        fixable
      };
    });
  }

  validateItem(item: IIIFItem, parent?: IIIFItem, parentType?: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const addIssue = (level: 'error' | 'warning', category: IssueCategory, message: string, fixable: boolean = false) => {
        issues.push({
            id: Math.random().toString(36).substr(2, 9),
            itemId: item.id,
            itemLabel: getIIIFValue(item.label) || 'Untitled',
            level,
            category,
            message,
            fixable
        });
    };

    // Run centralized schema validation first
    const schemaErrors = schemaValidateResource(item);
    issues.push(...this.mapSchemaErrors(item, schemaErrors));

    // Behavior validation using centralized behavior utilities
    if (item.behavior) {
        // Use the comprehensive behavior validation
        const behaviorValidation = validateBehaviors(
            item.type,
            item.behavior,
            parentType,
            parent?.behavior
        );

        // Add behavior errors
        for (const err of behaviorValidation.errors) {
            addIssue('error', 'Structure', err, true);
        }

        // Add behavior warnings
        for (const warn of behaviorValidation.warnings) {
            addIssue('warning', 'Structure', warn, false);
        }

        // Check for disjoint set conflicts
        const conflicts = findBehaviorConflicts(item.behavior);
        for (const conflict of conflicts) {
            addIssue('error', 'Structure', conflict, true);
        }
    }

    // Check behavior inheritance context
    if (parentType) {
        // Canvases should inherit from Manifest, not Range
        if (isCanvas(item) && parentType === 'Range') {
            addIssue('warning', 'Structure', 'Canvas behavior should inherit from Manifest, not Range. Check behavior consistency.', false);
        }

        // Check if inheritance is expected
        if (item.behavior && parent?.behavior && doesInheritBehavior(item.type, parentType)) {
            // Inheritance is expected - already handled by validateBehaviors
        }
    }

    // ID must be HTTP(S) URI
    if (item.id && !item.id.startsWith('http')) {
        addIssue('error', 'Identity', 'ID must be a valid HTTP(S) URI.', true);
    }

    const isMajorResource = ['Collection', 'Manifest', 'Range'].includes(item.type);

    // Label requirements - add friendly messages beyond schema validation
    if (!this.hasContent(item.label)) {
        if (isMajorResource) {
            // Schema already catches required label, but we add context
        } else if (isCanvas(item)) {
            addIssue('warning', 'Metadata', 'A Canvas should have a label for navigation.', true);
        }
    }

    // Canvas-specific: check for painting content
    if (isCanvas(item)) {
        const raw = item as IIIFCanvas;
        const hasPainting = raw.items?.some((p: any) => p.items?.some((a: any) => a.motivation === 'painting'));
        if (!hasPainting) {
            addIssue('warning', 'Content', 'Canvas has no "painting" content. It will appear blank.');
        }
    }

    // Manifest-specific: check for at least one canvas
    if (isManifest(item)) {
        const raw = item as IIIFManifest;
        if (!raw.items || raw.items.length === 0) {
            addIssue('error', 'Structure', 'Manifest MUST have at least one Canvas in "items".', true);
        }
    }

    // Collection-specific: check for items
    if (isCollection(item)) {
        const raw = item as IIIFCollection;
        if (!raw.items) {
            addIssue('error', 'Structure', 'Collection must have an "items" array.', true);
        }
    }

    // Recommended properties warnings
    if (isMajorResource && !this.hasContent(item.summary)) {
        addIssue('warning', 'Metadata', 'Adding a "summary" improves search.', true);
    }
    if (isMajorResource && !item.thumbnail) {
        addIssue('warning', 'Metadata', 'Adding a "thumbnail" is recommended.', false);
    }

    return issues;
  }
}

export const validator = new ValidationService();
