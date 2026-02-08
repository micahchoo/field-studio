import { getIIIFValue, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, isCollection, isManifest } from '@/src/shared/types';
import {
  getRecommendedProperties,
  IIIF_SCHEMA,
  isBehaviorAllowed,
  validateResource as schemaValidateResource
} from '@/utils/iiifSchema';
import { isValidHttpUri } from '@/utils';
import {
  doesInheritBehavior,
  findBehaviorConflicts,
  validateBehaviors
} from '@/utils/iiifBehaviors';

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
                  id: crypto.randomUUID().slice(0, 9),
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

      // Use word boundaries to avoid matching substrings (e.g., 'id' in 'width')
      const errLower = err.toLowerCase();
      if (/\bid\b/.test(errLower) || /\btype\b/.test(errLower)) {
        category = 'Identity';
        fixable = true;
      } else if (/\bwidth\b/.test(errLower) || /\bheight\b/.test(errLower) || /\bduration\b/.test(errLower)) {
        category = 'Content';
        fixable = true;
      } else if (/\bbehaviou?r\b/i.test(err)) {
        category = 'Structure';
        fixable = true;
      }

      return {
        id: crypto.randomUUID().slice(0, 9),
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
            id: crypto.randomUUID().slice(0, 9),
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

/**
 * Field validation result for a single field
 */
export interface FieldValidation {
  status: 'pristine' | 'valid' | 'invalid' | 'validating';
  message?: string;
  fix?: () => void;
  fixDescription?: string;
}

/**
 * Get validation state for a specific field from a list of issues.
 * Maps validation issues to field-level validation state.
 *
 * @param issues - Array of validation issues from validator.validateItem()
 * @param fieldPath - Field path to check (e.g., 'label', 'summary', 'metadata', 'id')
 * @param onFix - Optional callback to invoke when fix is triggered
 * @returns FieldValidation object or null if no issues apply
 */
export function getValidationForField(
  issues: ValidationIssue[],
  fieldPath: string,
  onFix?: (issue: ValidationIssue) => void
): FieldValidation | null {
  if (!issues || issues.length === 0) {
    return { status: 'pristine' };
  }

  // Map field paths to issue message patterns
  const fieldPatterns: Record<string, string[]> = {
    'label': ['label', 'missing required', 'must have'],
    'summary': ['summary'],
    'metadata': ['metadata'],
    'id': ['id', 'duplicate id', 'http', 'uri'],
    'type': ['type', 'missing required field: type'],
    'items': ['items', 'must have at least one'],
    'rights': ['rights'],
    'behavior': ['behavior'],
    'thumbnail': ['thumbnail'],
    'width': ['width', 'dimensions'],
    'height': ['height', 'dimensions'],
    'duration': ['duration'],
    'viewingDirection': ['viewingdirection', 'viewing direction'],
    'navDate': ['navdate', 'nav date'],
    'navPlace': ['navplace', 'nav place'],
    'provider': ['provider'],
    'requiredStatement': ['requiredstatement', 'required statement'],
    '@context': ['@context', 'context'],
    'structures': ['structures'],
    'annotations': ['annotations'],
  };

  const patterns = fieldPatterns[fieldPath.toLowerCase()];
  if (!patterns) {
    return { status: 'pristine' };
  }

  // Find issues that match this field
  const matchingIssues = issues.filter(issue => {
    const msg = (issue.message || '').toLowerCase();
    return patterns.some(pattern => msg.includes(pattern.toLowerCase()));
  });

  if (matchingIssues.length === 0) {
    return { status: 'pristine' };
  }

  // Find the most severe issue (error > warning)
  const errorIssue = matchingIssues.find(i => i.level === 'error');
  const warningIssue = matchingIssues.find(i => i.level === 'warning');
  const primaryIssue = errorIssue || warningIssue;

  if (!primaryIssue) {
    return { status: 'pristine' };
  }

  // Build the field validation result
  const result: FieldValidation = {
    status: primaryIssue.level === 'error' ? 'invalid' : 'valid',
    message: primaryIssue.message,
  };

  // Add fix function if the issue is fixable and callback provided
  if (primaryIssue.fixable && onFix) {
    result.fix = () => onFix(primaryIssue);
    result.fixDescription = getFixDescription(primaryIssue);
  }

  return result;
}

/**
 * Get a human-readable description of what fix will be applied.
 * Re-exported from validationHealer for convenience.
 */
function getFixDescription(issue: ValidationIssue): string {
  const msg = (issue.message || '').toLowerCase();

  // Identity fixes
  if (msg.includes('missing required field: type')) return 'Add default resource type';
  if (msg.includes('missing required field: id')) return 'Generate valid HTTP URI ID';
  if (msg.includes('id must be a valid http')) return 'Convert ID to HTTP(S) URI';
  if (msg.includes('duplicate id')) return 'Append unique suffix to ID';
  if (msg.includes('canvas id must not contain a fragment')) return 'Remove fragment identifier from Canvas ID';

  // Label fixes
  if (msg.includes('label') && msg.includes('required')) return 'Add label derived from ID';
  if (msg.includes('label') && msg.includes('language map')) return 'Convert label to language map format';

  // Summary fixes
  if (msg.includes('summary')) return 'Add placeholder summary';

  // Metadata fixes
  if (msg.includes('metadata') && msg.includes('label and value')) return 'Fix metadata entry structure';
  if (msg.includes('metadata')) return 'Initialize metadata array';

  // Dimension fixes
  if (msg.includes('dimensions') || msg.includes('width') || msg.includes('height')) {
    if (issue.itemLabel?.toLowerCase().includes('canvas')) return 'Set default canvas dimensions';
    if (issue.itemLabel?.toLowerCase().includes('image')) return 'Set default image dimensions';
    return 'Set default dimensions';
  }

  // Duration fixes
  if (msg.includes('duration')) return 'Add duration field (update value manually)';

  // Items fixes
  if (msg.includes('items') && msg.includes('must have at least one')) return 'Add placeholder item';
  if (msg.includes('items') && msg.includes('invalid type')) return 'Remove items with invalid types';
  if (msg.includes('items')) return 'Initialize items array';

  // Structure fixes
  if (msg.includes('structures') && issue.itemLabel?.toLowerCase().includes('collection')) return 'Remove invalid structures property';
  if (msg.includes('structures')) return 'Remove structures from invalid resource type';

  // Rights & Attribution
  if (msg.includes('rights')) return 'Add CC0 rights statement';
  if (msg.includes('requiredstatement') || msg.includes('required statement')) return 'Add default attribution statement';
  if (msg.includes('provider')) return 'Add default provider/institution';

  // Behavior fixes
  if (msg.includes('behavior') && msg.includes('not allowed')) return 'Remove invalid behaviors for resource type';
  if (msg.includes('behavior') && msg.includes('conflict')) return 'Resolve conflicting behaviors (keep first from each group)';
  if (msg.includes('behavior')) return 'Clear or fix behaviors';

  // Viewing direction
  if (msg.includes('viewingdirection') && msg.includes('not allowed')) return 'Remove viewingDirection from this resource type';
  if (msg.includes('viewingdirection')) return 'Set default viewingDirection to left-to-right';

  // NavDate
  if (msg.includes('navdate') && msg.includes('not allowed')) return 'Remove navDate from this resource type';
  if (msg.includes('navdate')) return 'Set navDate to current date';

  // Thumbnail
  if (msg.includes('thumbnail')) return 'Add placeholder thumbnail reference';

  // Format
  if (msg.includes('format') && msg.includes('not allowed')) return 'Remove format from invalid resource type';
  if (msg.includes('format')) return 'Add default format based on content type';

  // Context
  if (msg.includes('@context') && msg.includes('must have')) return 'Add IIIF Presentation API 3.0 context';
  if (msg.includes('@context')) return 'Remove @context from embedded resource';

  // Motivation
  if (msg.includes('motivation') && msg.includes('not allowed')) return 'Remove motivation from invalid resource type';
  if (msg.includes('motivation')) return 'Set default motivation to painting';

  // Annotations
  if (msg.includes('annotations') && msg.includes('not allowed')) return 'Remove annotations from invalid resource type';

  // Service
  if (msg.includes('service') && msg.includes('not allowed')) return 'Remove service from invalid resource type';

  // Language map
  if (msg.includes('must be a language map')) return 'Convert to valid language map format';

  // HTTP URI
  if (msg.includes('http') && msg.includes('uri')) return 'Generate valid HTTP URI';

  return 'Auto-fix available';
}

export const validator = new ValidationService();
