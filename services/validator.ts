
import { IIIFItem, IIIFManifest, IIIFCollection, IIIFCanvas } from '../types';

export interface ValidationIssue {
  id: string;
  itemId: string;
  itemLabel: string;
  level: 'error' | 'warning';
  message: string;
}

export class ValidationService {
  
  validateTree(root: IIIFItem | null): Record<string, ValidationIssue[]> {
      const issueMap: Record<string, ValidationIssue[]> = {};
      if (!root) return issueMap;

      const traverse = (item: IIIFItem) => {
          const issues = this.validateItem(item);
          if (issues.length > 0) {
              issueMap[item.id] = issues;
          }
          if (item.items) {
              item.items.forEach(traverse);
          }
          // Also check specific properties that contain items
          if (item.type === 'Manifest' && (item as IIIFManifest).structures) {
              (item as IIIFManifest).structures!.forEach(traverse);
          }
      };

      traverse(root);
      return issueMap;
  }

  validateItem(item: IIIFItem): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const addIssue = (level: 'error' | 'warning', message: string) => {
        issues.push({
            id: Math.random().toString(36).substr(2, 9),
            itemId: item.id,
            itemLabel: item.label?.['none']?.[0] || item.label?.['en']?.[0] || 'Untitled',
            level,
            message
        });
    };

    // 1. Universal Checks
    this.checkRequiredProperties(item, addIssue);

    // 2. Type-specific Checks
    if (item.type === 'Manifest') this.validateManifest(item as IIIFManifest, addIssue);
    else if (item.type === 'Collection') this.validateCollection(item as IIIFCollection, addIssue);
    else if (item.type === 'Canvas') this.validateCanvas(item as IIIFCanvas, addIssue);

    return issues;
  }

  private checkRequiredProperties(item: IIIFItem, addIssue: (l: 'error'|'warning', m: string) => void) {
    if (!item.id) {
        addIssue('error', 'Resource missing "id" property.');
    }
    if (!item.type) {
        addIssue('error', 'Resource missing "type" property.');
    }
    if (!item.label) {
        addIssue('error', 'Resource must have a "label" map.');
    } else {
        const hasLang = Object.keys(item.label).length > 0;
        if (!hasLang) addIssue('error', 'Label map cannot be empty.');
    }
    
    // @context check for top-level resources (Manifest/Collection) usually checked at root level only, 
    // but here we might check if it's missing on assumed root. Skipped for individual item check context.
  }

  private validateManifest(manifest: IIIFManifest, addIssue: (l: 'error'|'warning', m: string) => void) {
    if (!manifest.items || manifest.items.length === 0) {
        addIssue('error', 'Manifest must contain at least one Canvas.');
    } else {
        const hasNonCanvas = manifest.items.some(i => i.type !== 'Canvas');
        if (hasNonCanvas) {
            addIssue('error', 'Manifest "items" must only contain Canvases.');
        }
    }
  }

  private validateCollection(collection: IIIFCollection, addIssue: (l: 'error'|'warning', m: string) => void) {
      if (!collection.items) {
          addIssue('warning', 'Collection should have an "items" property, even if empty.');
      }
  }

  private validateCanvas(canvas: IIIFCanvas, addIssue: (l: 'error'|'warning', m: string) => void) {
      // Dimension Rules
      if (canvas.width && !canvas.height) {
          addIssue('error', 'Canvas has width but missing height.');
      }
      if (canvas.height && !canvas.width) {
          addIssue('error', 'Canvas has height but missing width.');
      }
      if (!canvas.width && !canvas.height && !canvas.duration) {
          addIssue('error', 'Canvas must have dimensions (width/height) or duration.');
      }

      // Content Rules
      let hasContent = false;
      if (canvas.items && canvas.items.length > 0) {
          for (const page of canvas.items) {
              if (page.items && page.items.length > 0) {
                  hasContent = true;
                  break;
              }
          }
      }
      
      if (!hasContent) {
          addIssue('warning', 'Canvas has no painting annotations (empty content).');
      }

      // 3.0 Constraint: Placeholder/Accompanying cannot nest
      if (canvas.placeholderCanvas && (canvas.placeholderCanvas.placeholderCanvas || canvas.placeholderCanvas.accompanyingCanvas)) {
          addIssue('error', 'placeholderCanvas cannot have its own placeholder/accompanying canvas.');
      }
  }
  
  // Legacy single validate for backward compat if needed, but we encourage validateTree
  validate(item: IIIFItem | null): ValidationIssue[] {
      return item ? this.validateItem(item) : [];
  }
}

export const validator = new ValidationService();
