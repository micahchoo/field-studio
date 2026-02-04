/**
 * Validation Web Worker
 * 
 * Offloads IIIF validation from the main thread to prevent UI blocking.
 * Handles large manifests and collections without freezing the interface.
 */

import type { IIIFItem } from '../types';

// Validation issue type defined locally for worker
interface ValidationIssue {
  id: string;
  itemId: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  fixable: boolean;
  suggestion?: string;
}

// Message types for worker communication
interface ValidateMessage {
  type: 'VALIDATE';
  payload: {
    root: IIIFItem;
    options?: {
      strict?: boolean;
      checkIds?: boolean;
      maxDepth?: number;
    };
  };
  id: string;
}

interface ValidateResponse {
  type: 'VALIDATE_RESULT';
  payload: {
    issues: ValidationIssue[];
    stats: {
      checked: number;
      errors: number;
      warnings: number;
    };
  };
  id: string;
}

interface ProgressMessage {
  type: 'PROGRESS';
  payload: {
    processed: number;
    total: number;
    currentItem?: string;
  };
}

// Validation logic that runs in the worker
function validateItem(item: any, path: string, options: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Basic structure validation
  if (!item.id) {
    issues.push({
      id: `missing-id-${path}`,
      itemId: path,
      type: 'error',
      category: 'structure',
      message: 'Item is missing required "id" property',
      fixable: false
    });
  }
  
  if (!item.type) {
    issues.push({
      id: `missing-type-${path}`,
      itemId: item.id || path,
      type: 'error',
      category: 'structure', 
      message: 'Item is missing required "type" property',
      fixable: false
    });
  }
  
  // ID format validation
  if (item.id && !item.id.startsWith('http')) {
    issues.push({
      id: `invalid-id-${item.id}`,
      itemId: item.id,
      type: 'warning',
      category: 'structure',
      message: 'ID should be a valid HTTP(S) URI',
      fixable: false
    });
  }
  
  return issues;
}

function traverseAndValidate(
  item: any, 
  path: string = '', 
  options: any,
  onProgress?: (processed: number, total: number) => void
): { issues: ValidationIssue[]; count: number } {
  const issues: ValidationIssue[] = [];
  let count = 1;
  
  // Validate current item
  issues.push(...validateItem(item, path, options));
  
  // Recursively validate children
  const children = item.items || [];
  const annotations = item.annotations || [];
  const allChildren = [...children, ...annotations];
  
  for (let i = 0; i < allChildren.length; i++) {
    const child = allChildren[i];
    const childPath = `${path}/items[${i}]`;
    const result = traverseAndValidate(child, childPath, options, onProgress);
    issues.push(...result.issues);
    count += result.count;
  }
  
  return { issues, count };
}

// Worker message handler
self.onmessage = (event: MessageEvent<ValidateMessage>) => {
  const { type, payload, id } = event.data;
  
  if (type === 'VALIDATE') {
    const { root, options = {} } = payload;
    
    // Perform validation
    const startTime = performance.now();
    const { issues, count } = traverseAndValidate(root, '', options);
    const duration = performance.now() - startTime;
    
    // Categorize issues
    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;
    
    // Send progress update
    const progressMessage: ProgressMessage = {
      type: 'PROGRESS',
      payload: {
        processed: count,
        total: count,
        currentItem: 'Validation complete'
      }
    };
    self.postMessage(progressMessage);
    
    // Send result
    const response: ValidateResponse = {
      type: 'VALIDATE_RESULT',
      payload: {
        issues,
        stats: {
          checked: count,
          errors,
          warnings
        }
      },
      id
    };
    self.postMessage(response);
  }
};

// Export for TypeScript
export {};
