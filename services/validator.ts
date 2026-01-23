import { IIIFItem, IIIFManifest, IIIFCollection, IIIFCanvas, getIIIFValue } from '../types';

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

    // Behavior inheritance validation (spec §3.4)
    if (item.behavior && parentType) {
        // Manifests DO NOT inherit from Collections
        if (item.type === 'Manifest' && parentType === 'Collection') {
            // This is OK - no inheritance expected
        }
        // Canvases inherit from Manifest, NOT from Ranges
        if (item.type === 'Canvas' && parentType === 'Range') {
            addIssue('warning', 'Structure', 'Canvas behavior should inherit from Manifest, not Range. Check behavior consistency.', false);
        }
        // Collections inherit from parent Collection
        if (item.type === 'Collection' && parentType === 'Collection' && parent?.behavior) {
            const parentBehaviors = new Set(parent.behavior);
            const conflicting = item.behavior.filter(b => {
                const opposites: Record<string, string> = {
                    'auto-advance': 'no-auto-advance',
                    'no-auto-advance': 'auto-advance',
                    'repeat': 'no-repeat',
                    'no-repeat': 'repeat'
                };
                return opposites[b] && parentBehaviors.has(opposites[b]);
            });
            if (conflicting.length > 0) {
                addIssue('warning', 'Structure', `Behavior conflicts with parent: ${conflicting.join(', ')}. Child overrides parent.`, false);
            }
        }
    }

    if (!item.id) addIssue('error', 'Identity', 'Required property "id" is missing.', true);
    if (!item.type) addIssue('error', 'Identity', 'Required property "type" is missing.');
    
    if (item.id && !item.id.startsWith('http')) {
        addIssue('error', 'Identity', 'ID must be a valid HTTP(S) URI.', true);
    }

    const isMajorResource = ['Collection', 'Manifest', 'Range'].includes(item.type);
    
    if (!this.hasContent(item.label)) {
        if (isMajorResource) {
            addIssue('error', 'Metadata', `Required property "label" is missing or empty on ${item.type}.`, true);
        } else if (item.type === 'Canvas') {
            addIssue('warning', 'Metadata', 'A Canvas should have a label for navigation.', true);
        }
    }

    const raw = item as any;
    
    if (item.type === 'Collection') {
        if (raw.structures) addIssue('error', 'Structure', 'Property "structures" is not allowed on a Collection.', true);
        if (raw.height || raw.width) addIssue('error', 'Content', 'Spatial dimensions are not allowed on a Collection.', true);
        if (!raw.items) addIssue('error', 'Structure', 'Collection must have an "items" array.', true);
    }

    if (item.type === 'Manifest') {
        if (raw.height || raw.width) addIssue('error', 'Content', 'Spatial dimensions are not allowed on a Manifest. Use Canvases.', true);
        if (!raw.items || raw.items.length === 0) addIssue('error', 'Structure', 'Manifest MUST have at least one Canvas in "items".', true);
    }

    if (item.type === 'Canvas') {
        if ((raw.width && !raw.height) || (!raw.width && raw.height)) {
            addIssue('error', 'Content', 'Canvas dimensions MUST include both width and height.', true);
        }
        if (!raw.width && !raw.height && !raw.duration) {
            addIssue('error', 'Content', 'Canvas missing all dimensions.', true);
        }
        const hasPainting = raw.items?.some((p: any) => p.items?.some((a: any) => a.motivation === 'painting'));
        if (!hasPainting) {
            addIssue('warning', 'Content', 'Canvas has no "painting" content. It will appear blank.');
        }
    }

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