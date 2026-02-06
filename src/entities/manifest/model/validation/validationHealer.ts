import { getIIIFValue, IIIFItem, isCanvas, isCollection, isManifest } from '@/src/shared/types';
import { ValidationIssue } from './validator';
import { createLanguageMap, findNodeById, generateValidUri } from '@/utils';
import { DEFAULT_INGEST_PREFS, IIIF_SPEC } from '@/src/shared/constants';
import {
  COMMON_RIGHTS_URIS,
  getMinimumTemplate,
  getPropertyRequirement,
  getValidItemTypes,
  isBehaviorAllowed,
  isValidViewingDirection,
  VIEWING_DIRECTIONS
} from '@/utils/iiifSchema';
import {
  findBehaviorConflicts,
  getDefaultBehavior,
  getDisjointSetForBehavior,
  getValidBehaviorsForType
} from '@/utils/iiifBehaviors';

/**
 * ValidationHealer provides auto-fix capabilities for common IIIF validation issues.
 *
 * This service is used by both the Inspector and QCDashboard to provide consistent
 * healing behavior across the application.
 *
 * Comprehensive healing covers:
 * - Identity & ID fixes (duplicate IDs, malformed URIs, missing type)
 * - Metadata fixes (label, summary, metadata array structure)
 * - Structure fixes (items array, structures placement, containment)
 * - Content fixes (canvas dimensions, duration, thumbnails)
 * - Rights & Attribution fixes (rights, requiredStatement, provider)
 * - Behavior fixes (invalid behaviors, conflicts, inheritance)
 * - Technical fixes (viewingDirection, navDate, navPlace, format)
 * - Language map fixes (invalid label/summary format)
 */

export interface HealResult {
  success: boolean;
  updatedItem?: IIIFItem;
  message?: string;
  error?: string;
}

// ============================================================================
// Safe JSON Clone with Error Handling
// ============================================================================

/**
 * Safely clone an object using JSON serialization with error handling
 * Falls back to structuredClone if available, or manual deep clone
 */
function safeClone<T>(obj: T): T | null {
  try {
    // Try structuredClone first (handles more types, no circular ref issues)
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
  } catch (e) {
    // structuredClone failed, fall through to JSON method
  }

  try {
    // Fallback to JSON method
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    // JSON serialization failed (circular references, undefined values, etc.)
    console.error('[ValidationHealer] Failed to clone item:', e);
    return null;
  }
}

/**
 * Deep clone using manual recursion as final fallback
 */
function manualDeepClone<T>(obj: T, seen = new WeakMap()): T | null {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const clone: any[] = [];
    seen.set(obj, clone);
    for (let i = 0; i < obj.length; i++) {
      const clonedItem = manualDeepClone(obj[i], seen);
      if (clonedItem === null && obj[i] !== null) {
        // Failed to clone an item, use original (risky but better than crash)
        clone[i] = obj[i];
      } else {
        clone[i] = clonedItem;
      }
    }
    return clone as unknown as T;
  }

  // Handle Object
  const clone: any = {};
  seen.set(obj, clone);
  for (const key of Object.keys(obj)) {
    if (obj.hasOwnProperty(key)) {
      const value = (obj as any)[key];
      // Skip undefined values (they're not JSON serializable)
      if (value !== undefined) {
        const clonedValue = manualDeepClone(value, seen);
        if (clonedValue === null && value !== null) {
          // Failed to clone, use original
          clone[key] = value;
        } else {
          clone[key] = clonedValue;
        }
      }
    }
  }
  return clone;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensure a value is a valid language map
 */
function ensureLanguageMap(value: any, defaultValue: string, language: string = 'none'): Record<string, string[]> {
  if (!value) {
    return createLanguageMap(defaultValue, language);
  }
  if (typeof value === 'string') {
    return createLanguageMap(value, language);
  }
  if (Array.isArray(value)) {
    return { [language]: value.filter(v => typeof v === 'string') };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Check if it's already a valid language map
    const hasLanguageKeys = Object.keys(value).some(k => 
      typeof k === 'string' && (k === 'none' || k.includes('-') || /^[a-z]{2}$/.test(k))
    );
    if (hasLanguageKeys && Object.values(value).every(v => Array.isArray(v))) {
      return value as Record<string, string[]>;
    }
    // Try to convert object values
    const converted: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(value)) {
      if (Array.isArray(val)) {
        converted[key] = val.filter(v => typeof v === 'string') as string[];
      } else if (typeof val === 'string') {
        converted[key] = [val];
      }
    }
    if (Object.keys(converted).length > 0) {
      return converted;
    }
  }
  return createLanguageMap(defaultValue, language);
}

/**
 * Get a valid rights URI or default to CC0
 */
function getDefaultRightsUri(): string {
  return COMMON_RIGHTS_URIS['CC0 1.0'];
}

/**
 * Create a minimal provider/agent structure
 */
function createMinimalProvider(item: IIIFItem): any {
  try {
    const label = getIIIFValue(item.label) || 'Untitled Resource';
    return [{
      id: generateValidUri('Agent'),
      type: 'Agent',
      label: createLanguageMap('Unknown Institution')
    }];
  } catch (e) {
    return [{
      id: `http://archive.local/iiif/agent/${Date.now()}`,
      type: 'Agent',
      label: { none: ['Unknown Institution'] }
    }];
  }
}

/**
 * Create a minimal thumbnail reference
 */
function createMinimalThumbnail(): any[] {
  return [{
    id: 'http://archive.local/iiif/thumbnail/placeholder',
    type: 'Image',
    format: 'image/jpeg'
  }];
}

/**
 * Create a minimal requiredStatement
 */
function createMinimalRequiredStatement(): { label: Record<string, string[]>; value: Record<string, string[]> } {
  return {
    label: createLanguageMap('Attribution'),
    value: createLanguageMap('Provided by Example Institution')
  };
}

/**
 * Validate that an item has the minimum required structure
 */
function validateItemStructure(item: IIIFItem): { valid: boolean; error?: string } {
  if (!item) {
    return { valid: false, error: 'Item is null or undefined' };
  }
  if (typeof item !== 'object') {
    return { valid: false, error: 'Item is not an object' };
  }
  if (!item.type) {
    return { valid: false, error: 'Item has no type' };
  }
  return { valid: true };
}

// ============================================================================
// Main Healing Function with Error Boundaries
// ============================================================================

/**
 * Attempt to automatically fix a validation issue on an item.
 * Returns a new item with the fix applied, or null if the issue cannot be auto-fixed.
 * 
 * This function is wrapped in comprehensive error handling to prevent crashes
 * during batch healing operations.
 */
export function healIssue(item: IIIFItem, issue: ValidationIssue): HealResult {
  // Defensive: Check inputs
  if (!item) {
    return { success: false, error: 'Cannot heal null item' };
  }
  
  if (!issue) {
    return { success: false, error: 'Cannot heal without issue' };
  }

  if (!issue.fixable) {
    return { success: false, message: 'Issue is not auto-fixable' };
  }

  try {
    // Validate item structure
    const structureCheck = validateItemStructure(item);
    if (!structureCheck.valid) {
      return { success: false, error: structureCheck.error };
    }

    // Store original ID for verification
    const originalId = item.id;

    // Determine if original ID is valid and should be preserved
    // Only preserve valid IDs to maintain vault sync - broken IDs can be fixed
    const shouldPreserveId = originalId &&
                             typeof originalId === 'string' &&
                             originalId.length > 0 &&
                             originalId.startsWith('http') &&
                             !originalId.includes('#'); // Fragments should be removed

    // Clone the item to avoid mutations
    const healed = safeClone(item);
    if (!healed) {
      // Try manual clone as fallback
      const manualClone = manualDeepClone(item);
      if (!manualClone) {
        return { success: false, error: 'Failed to clone item for healing' };
      }
      const result = performHealing(manualClone, issue);
      // Only restore ID if original was valid (preserves vault references)
      if (result.success && result.updatedItem && shouldPreserveId && result.updatedItem.id !== originalId) {
        console.warn(`[ValidationHealer] ID changed during healing, restoring original to preserve vault references: ${originalId}`);
        result.updatedItem.id = originalId;
      }
      return result;
    }

    const result = performHealing(healed, issue);
    // Only restore ID if original was valid (preserves vault references)
    if (result.success && result.updatedItem && shouldPreserveId && result.updatedItem.id !== originalId) {
      console.warn(`[ValidationHealer] ID changed during healing, restoring original to preserve vault references: ${originalId}`);
      result.updatedItem.id = originalId;
    }
    return result;
  } catch (error) {
    console.error('[ValidationHealer] Unexpected error during healing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during healing' 
    };
  }
}

/**
 * Internal healing logic - separated for better error isolation
 */
function performHealing(healed: IIIFItem, issue: ValidationIssue): HealResult {
  const msg = (issue.message || '').toLowerCase();

  // ==========================================================================
  // IDENTITY & ID FIXES
  // ==========================================================================

  // Missing or invalid type
  if (msg.includes('missing required field: type') || msg.includes('type is required')) {
    if (!healed.type) {
      (healed as any).type = 'ContentResource';
    }
    return { success: true, updatedItem: healed, message: 'Added default type' };
  }

  // Missing or invalid ID
  if (msg.includes('missing required field: id') || msg.includes('id is required')) {
    if (!healed.id) {
      healed.id = generateValidUri(healed.type || 'Resource');
    }
    return { success: true, updatedItem: healed, message: 'Generated valid ID' };
  }

  // ID must be HTTP(S) URI
  if (msg.includes('id must be a valid http') || (msg.includes('http') && msg.includes('uri'))) {
    if (!healed.id || !healed.id.startsWith('http')) {
      const suffix = healed.id || generateValidUri('Resource').split('/').pop();
      healed.id = generateValidUri(healed.type || 'Resource', encodeURIComponent(suffix || 'item'));
    }
    return { success: true, updatedItem: healed, message: 'Converted ID to valid HTTP URI' };
  }

  // Duplicate ID fixes
  // NOTE: We don't change the ID here because that would break vault's typeIndex.
  // The duplicate ID issue should be fixed at the tree level (validateTree)
  // or by the user manually renaming. Changing IDs here causes vault sync issues.
  if (msg.includes('duplicate id')) {
    // Log a warning that this needs manual intervention
    console.warn(`[ValidationHealer] Duplicate ID detected: ${healed.id}. This requires manual fix to avoid breaking references.`);
    return { success: false, message: 'Duplicate ID requires manual fix - ID must remain stable for vault sync' };
  }

  // Canvas ID contains fragment
  if (msg.includes('canvas id must not contain a fragment')) {
    healed.id = healed.id.split('#')[0];
    return { success: true, updatedItem: healed, message: 'Removed fragment from Canvas ID' };
  }

  // ==========================================================================
  // LABEL FIXES
  // ==========================================================================

  // Label fixes - missing or malformed
  if (msg.includes('label')) {
    // Check if label is required but missing
    if (msg.includes('missing required') || msg.includes('must have')) {
      const fallbackLabel = healed.id ? healed.id.split('/').pop() || 'Untitled' : 'Untitled Resource';
      healed.label = createLanguageMap(fallbackLabel, 'none');
      return { success: true, updatedItem: healed, message: 'Added required label from ID' };
    }

    // Label must be a language map
    if (msg.includes('must be a language map') || msg.includes('language map')) {
      const labelText = typeof healed.label === 'string' 
        ? healed.label 
        : (healed.id ? healed.id.split('/').pop() : 'Untitled');
      healed.label = createLanguageMap(labelText || 'Untitled', 'none');
      return { success: true, updatedItem: healed, message: 'Converted label to language map' };
    }
  }

  // ==========================================================================
  // SUMMARY FIXES
  // ==========================================================================

  // Summary fixes
  if (msg.includes('summary')) {
    const labelText = getIIIFValue(healed.label) || healed.type || 'resource';
    (healed as any).summary = createLanguageMap(`Summary for ${labelText}`, 'none');
    return { success: true, updatedItem: healed, message: 'Added placeholder summary' };
  }

  // ==========================================================================
  // METADATA FIXES
  // ==========================================================================

  // Metadata structure fixes
  if (msg.includes('metadata')) {
    if (msg.includes('must have both label and value')) {
      // Fix malformed metadata entries
      if (Array.isArray((healed as any).metadata)) {
        (healed as any).metadata = (healed as any).metadata
          .filter((entry: any) => entry && (entry.label || entry.value))
          .map((entry: any) => ({
            label: ensureLanguageMap(entry.label, 'Field', 'en'),
            value: ensureLanguageMap(entry.value, '', 'none')
          }));
      }
      return { success: true, updatedItem: healed, message: 'Fixed metadata entry structure' };
    }

    // Initialize empty metadata array
    if (!(healed as any).metadata) {
      (healed as any).metadata = [];
      return { success: true, updatedItem: healed, message: 'Initialized empty metadata array' };
    }
  }

  // ==========================================================================
  // DIMENSION FIXES (Canvas)
  // ==========================================================================

  // Canvas dimension fixes (width/height)
  if (msg.includes('dimensions') || msg.includes('width') || msg.includes('height')) {
    if (isCanvas(healed)) {
      // If only one dimension is present, set the other to match
      if ((healed as any).width && !(healed as any).height) {
        (healed as any).height = (healed as any).width;
        return { success: true, updatedItem: healed, message: 'Set height to match width' };
      }
      if ((healed as any).height && !(healed as any).width) {
        (healed as any).width = (healed as any).height;
        return { success: true, updatedItem: healed, message: 'Set width to match height' };
      }
      // Set default dimensions
      (healed as any).width = DEFAULT_INGEST_PREFS.defaultCanvasWidth;
      (healed as any).height = DEFAULT_INGEST_PREFS.defaultCanvasHeight;
      return { success: true, updatedItem: healed, message: 'Set default canvas dimensions' };
    }
  }

  // Duration fixes
  if (msg.includes('duration')) {
    if (isCanvas(healed) && !(healed as any).duration) {
      // Canvas with time-based content should have duration
      (healed as any).duration = 0;
      return { success: true, updatedItem: healed, message: 'Added zero duration (update manually)' };
    }
  }

  // ==========================================================================
  // ITEMS ARRAY FIXES
  // ==========================================================================

  // Empty items array fix
  if (msg.includes('items')) {
    if (msg.includes('must have at least one item') || msg.includes('items array')) {
      if (!healed.items) healed.items = [];

      if (isManifest(healed) && healed.items.length === 0) {
        const canvasId = `${healed.id}/canvas/1`;
        healed.items.push({
          id: canvasId,
          type: 'Canvas' as const,
          label: createLanguageMap('Page 1', 'none'),
          width: DEFAULT_INGEST_PREFS.defaultCanvasWidth,
          height: DEFAULT_INGEST_PREFS.defaultCanvasHeight,
          items: []
        });
        return { success: true, updatedItem: healed, message: 'Added placeholder canvas to empty Manifest' };
      }

      if (isCollection(healed) && healed.items.length === 0) {
        // Create a placeholder manifest
        const manifestId = `${healed.id}/manifest/1`;
        healed.items.push({
          id: manifestId,
          type: 'Manifest' as const,
          label: createLanguageMap('Placeholder Manifest', 'none'),
          items: []
        });
        return { success: true, updatedItem: healed, message: 'Added placeholder manifest to empty Collection' };
      }

      return { success: true, updatedItem: healed, message: 'Initialized items array' };
    }

    // Invalid item type in items array
    if (msg.includes('invalid type') && msg.includes('parent type')) {
      // Filter out invalid items or fix their types
      const validTypes = getValidItemTypes(healed.type);
      if (validTypes.length > 0 && healed.items) {
        healed.items = healed.items.filter((item: any) => {
          return item && validTypes.includes(item.type);
        });
        return { success: true, updatedItem: healed, message: 'Removed items with invalid types' };
      }
    }
  }

  // ==========================================================================
  // STRUCTURE FIXES
  // ==========================================================================

  // Collection structures fix (structures not allowed on Collection)
  if (msg.includes('structures') && isCollection(healed)) {
    delete (healed as any).structures;
    return { success: true, updatedItem: healed, message: 'Removed invalid structures property from Collection' };
  }

  // Structures on non-Manifest types
  if (msg.includes('structures') && healed.type !== 'Manifest') {
    delete (healed as any).structures;
    return { success: true, updatedItem: healed, message: `Removed structures from ${healed.type}` };
  }

  // ==========================================================================
  // RIGHTS & ATTRIBUTION FIXES
  // ==========================================================================

  // Rights fixes
  if (msg.includes('rights')) {
    (healed as any).rights = getDefaultRightsUri();
    return { success: true, updatedItem: healed, message: 'Added CC0 rights statement' };
  }

  // Required statement fixes
  if (msg.includes('requiredstatement') || msg.includes('required statement')) {
    (healed as any).requiredStatement = createMinimalRequiredStatement();
    return { success: true, updatedItem: healed, message: 'Added default required statement' };
  }

  // Provider fixes
  if (msg.includes('provider')) {
    (healed as any).provider = createMinimalProvider(healed);
    return { success: true, updatedItem: healed, message: 'Added default provider' };
  }

  // ==========================================================================
  // BEHAVIOR FIXES
  // ==========================================================================

  // Invalid behavior for type
  if (msg.includes('behavior not allowed') || msg.includes('not valid for')) {
    if (healed.behavior) {
      const validBehaviors = getValidBehaviorsForType(healed.type);
      healed.behavior = healed.behavior.filter(b => validBehaviors.includes(b as any));
      if (healed.behavior.length === 0) {
        delete (healed as any).behavior;
      }
      return { success: true, updatedItem: healed, message: 'Removed invalid behaviors for resource type' };
    }
  }

  // Behavior conflict fixes
  if (msg.includes('behavior') && msg.includes('conflict')) {
    if (healed.behavior) {
      // Keep the first behavior from each disjoint set, remove conflicts
      const seenSets = new Set<string>();
      const cleanedBehaviors: string[] = [];

      for (const behavior of healed.behavior) {
        const set = getDisjointSetForBehavior(behavior);
        if (!set) {
          // Not part of a disjoint set, keep it
          cleanedBehaviors.push(behavior);
        } else if (!seenSets.has(set.name)) {
          // First behavior from this set, keep it
          seenSets.add(set.name);
          cleanedBehaviors.push(behavior);
        }
        // Otherwise skip (conflict)
      }

      healed.behavior = cleanedBehaviors.length > 0 ? cleanedBehaviors : undefined;
      return { success: true, updatedItem: healed, message: 'Resolved behavior conflicts' };
    }
  }

  // ==========================================================================
  // VIEWING DIRECTION FIXES
  // ==========================================================================

  if (msg.includes('viewingdirection') || msg.includes('viewing direction')) {
    if (msg.includes('not allowed')) {
      delete (healed as any).viewingDirection;
      return { success: true, updatedItem: healed, message: 'Removed viewingDirection from invalid resource type' };
    }
    if (msg.includes('invalid')) {
      (healed as any).viewingDirection = 'left-to-right';
      return { success: true, updatedItem: healed, message: 'Set default viewingDirection to left-to-right' };
    }
  }

  // ==========================================================================
  // NAVDATE FIXES
  // ==========================================================================

  if (msg.includes('navdate') || msg.includes('nav date')) {
    if (msg.includes('not allowed')) {
      delete (healed as any).navDate;
      return { success: true, updatedItem: healed, message: 'Removed navDate from invalid resource type' };
    }
    // Set to current date as placeholder
    (healed as any).navDate = new Date().toISOString();
    return { success: true, updatedItem: healed, message: 'Set navDate to current date' };
  }

  // ==========================================================================
  // THUMBNAIL FIXES
  // ==========================================================================

  if (msg.includes('thumbnail')) {
    (healed as any).thumbnail = createMinimalThumbnail();
    return { success: true, updatedItem: healed, message: 'Added placeholder thumbnail' };
  }

  // ==========================================================================
  // FORMAT FIXES (Content Resources)
  // ==========================================================================

  if (msg.includes('format')) {
    if (msg.includes('not allowed')) {
      delete (healed as any).format;
      return { success: true, updatedItem: healed, message: 'Removed format from invalid resource type' };
    }
    // Set default format based on type
    const type = (healed.type || '').toLowerCase();
    if (type.includes('image')) {
      (healed as any).format = 'image/jpeg';
    } else if (type.includes('video')) {
      (healed as any).format = 'video/mp4';
    } else if (type.includes('sound') || type.includes('audio')) {
      (healed as any).format = 'audio/mp3';
    } else if (type.includes('text')) {
      (healed as any).format = 'text/html';
    } else {
      (healed as any).format = 'application/octet-stream';
    }
    return { success: true, updatedItem: healed, message: 'Added default format' };
  }

  // ==========================================================================
  // CONTEXT FIXES
  // ==========================================================================

  if (msg.includes('@context') || msg.includes('context')) {
    if (msg.includes('must have') || msg.includes('missing')) {
      if (isCollection(healed) || isManifest(healed)) {
        (healed as any)['@context'] = IIIF_SPEC.PRESENTATION_3.CONTEXT;
        return { success: true, updatedItem: healed, message: 'Added IIIF Presentation API 3.0 context' };
      }
    }
    if (msg.includes('should only be on top-level')) {
      delete (healed as any)['@context'];
      return { success: true, updatedItem: healed, message: 'Removed @context from embedded resource' };
    }
  }

  // ==========================================================================
  // MOTIVATION FIXES
  // ==========================================================================

  if (msg.includes('motivation')) {
    if (msg.includes('not allowed')) {
      delete (healed as any).motivation;
      return { success: true, updatedItem: healed, message: 'Removed motivation from invalid resource type' };
    }
    if (msg.includes('invalid') || msg.includes('missing')) {
      (healed as any).motivation = 'painting';
      return { success: true, updatedItem: healed, message: 'Set default motivation to painting' };
    }
  }

  // ==========================================================================
  // ANNOTATIONS FIXES
  // ==========================================================================

  if (msg.includes('annotations') && msg.includes('not allowed')) {
    delete (healed as any).annotations;
    return { success: true, updatedItem: healed, message: 'Removed annotations from invalid resource type' };
  }

  // ==========================================================================
  // SERVICE FIXES
  // ==========================================================================

  if (msg.includes('service') && msg.includes('not allowed')) {
    delete (healed as any).service;
    return { success: true, updatedItem: healed, message: 'Removed service from invalid resource type' };
  }

  // ==========================================================================
  // LANGUAGE MAP FIELD FIXES
  // ==========================================================================

  // Fix language map fields (label, summary, requiredStatement.label, requiredStatement.value)
  const langMapFields = ['label', 'summary'];
  for (const field of langMapFields) {
    if (msg.includes(field) && msg.includes('must be a language map')) {
      const currentValue = (healed as any)[field];
      (healed as any)[field] = ensureLanguageMap(currentValue, field === 'label' ? 'Untitled' : '');
      return { success: true, updatedItem: healed, message: `Converted ${field} to valid language map` };
    }
  }

  // ==========================================================================
  // CONTENT RESOURCE SPECIFIC FIXES
  // ==========================================================================

  // For Image resources missing height/width
  if (msg.includes('image') && (msg.includes('height') || msg.includes('width'))) {
    if ((healed as any).type === 'Image') {
      if (!(healed as any).width) (healed as any).width = 1000;
      if (!(healed as any).height) (healed as any).height = 800;
      return { success: true, updatedItem: healed, message: 'Added default image dimensions' };
    }
  }

  // ==========================================================================
  // FALLBACK
  // ==========================================================================

  return { success: false, message: 'No auto-fix available for this issue type' };
}

// ============================================================================
// Batch Healing Functions with Error Boundaries
// ============================================================================

/**
 * Attempt to heal multiple issues on an item.
 * Returns the healed item with all applicable fixes applied.
 * 
 * This function applies fixes sequentially, updating the item after each fix
 * to ensure subsequent fixes operate on the updated state.
 */
export function healAllIssues(item: IIIFItem, issues: ValidationIssue[]): { item: IIIFItem; healed: number; failed: number; errors: string[] } {
  // Defensive: Validate inputs
  if (!item) {
    console.error('[ValidationHealer] healAllIssues called with null item');
    return { item: null as any, healed: 0, failed: 0, errors: ['Null item provided'] };
  }

  if (!Array.isArray(issues)) {
    console.error('[ValidationHealer] healAllIssues called with invalid issues array');
    return { item, healed: 0, failed: 0, errors: ['Invalid issues array'] };
  }

  let currentItem = item;
  let healed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Filter to only fixable issues
  const fixableIssues = issues.filter(i => i && i.fixable);

  for (const issue of fixableIssues) {
    try {
      const result = healIssue(currentItem, issue);
      if (result.success && result.updatedItem) {
        // Validate the healed item before accepting it
        const structureCheck = validateItemStructure(result.updatedItem);
        if (structureCheck.valid) {
          currentItem = result.updatedItem;
          healed++;
        } else {
          failed++;
          errors.push(`Structure validation failed after healing: ${structureCheck.error}`);
        }
      } else {
        failed++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Exception during healing: ${errorMsg}`);
      console.error('[ValidationHealer] Exception in healAllIssues:', error);
      // Continue with next issue rather than crashing
    }
  }

  return { item: currentItem, healed, failed, errors };
}

/**
 * Apply a healed item back to the tree.
 * Returns a new root with the item updated.
 * 
 * This function now includes error handling to prevent crashes during tree traversal.
 */
export function applyHealToTree(root: IIIFItem, itemId: string, healedItem: IIIFItem): IIIFItem | null {
  // Defensive: Validate inputs
  if (!root) {
    console.error('[ValidationHealer] applyHealToTree called with null root');
    return null;
  }
  if (!itemId) {
    console.error('[ValidationHealer] applyHealToTree called with null itemId');
    return null;
  }
  if (!healedItem) {
    console.error('[ValidationHealer] applyHealToTree called with null healedItem');
    return null;
  }

  try {
    // Validate healedItem before applying
    const structureCheck = validateItemStructure(healedItem);
    if (!structureCheck.valid) {
      console.error('[ValidationHealer] Cannot apply invalid healed item:', structureCheck.error);
      return null;
    }

    // Clone the root to avoid mutations
    const newRoot = safeClone(root);
    if (!newRoot) {
      console.error('[ValidationHealer] Failed to clone root in applyHealToTree');
      return null;
    }

    // Use centralized traversal to find the target node
    const targetNode = findNodeById(newRoot, itemId);
    
    if (!targetNode) {
      console.warn(`[ValidationHealer] Could not find item with ID ${itemId} in tree`);
      return newRoot;
    }

    // Apply the healed item properties
    try {
      Object.assign(targetNode, healedItem);
      return newRoot;
    } catch (e) {
      console.error('[ValidationHealer] Object.assign failed:', e);
      return null;
    }
  } catch (error) {
    console.error('[ValidationHealer] Exception in applyHealToTree:', error);
    return null;
  }
}

// ============================================================================
// Safe Batch Heal for "Heal All" Button
// ============================================================================

/**
 * Safely heal all issues on a single item and return the updated item.
 * This is the recommended function for the "Heal All" button in the Inspector.
 * 
 * Unlike calling healIssue in a forEach loop, this function properly sequences
 * the fixes and validates the result.
 */
export function safeHealAll(item: IIIFItem, issues: ValidationIssue[]): HealResult {
  if (!item) {
    return { success: false, error: 'No item to heal' };
  }

  if (!issues || issues.length === 0) {
    return { success: true, updatedItem: item, message: 'No issues to heal' };
  }

  try {
    const result = healAllIssues(item, issues);
    
    if (result.errors.length > 0) {
      console.warn('[ValidationHealer] Healing completed with errors:', result.errors);
    }

    if (result.healed === 0 && result.failed > 0) {
      return { 
        success: false, 
        error: `Failed to heal any issues. Errors: ${result.errors.join(', ')}` 
      };
    }

    return {
      success: true,
      updatedItem: result.item,
      message: `Healed ${result.healed} issues${result.failed > 0 ? `, ${result.failed} failed` : ''}`
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error in batch healing';
    console.error('[ValidationHealer] safeHealAll exception:', error);
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// Fix Description Functions
// ============================================================================

/**
 * Get a human-readable description of what fix will be applied.
 */
export function getFixDescription(issue: ValidationIssue): string {
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

/**
 * Get healing statistics for a set of issues
 */
export function getHealingStats(issues: ValidationIssue[]): {
  total: number;
  fixable: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};

  if (!Array.isArray(issues)) {
    return { total: 0, fixable: 0, byCategory: {} };
  }

  for (const issue of issues) {
    if (issue && issue.category) {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    }
  }

  return {
    total: issues.length,
    fixable: issues.filter(i => i && i.fixable).length,
    byCategory
  };
}

/**
 * Suggest healing priority based on issue severity
 */
export function getHealingPriority(issues: ValidationIssue[]): ValidationIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  return [...issues].sort((a, b) => {
    // Handle null/undefined issues
    if (!a) return 1;
    if (!b) return -1;

    // Errors before warnings
    if (a.level !== b.level) {
      return a.level === 'error' ? -1 : 1;
    }
    // Fixable before non-fixable
    if (a.fixable !== b.fixable) {
      return a.fixable ? -1 : 1;
    }
    // Identity issues first
    const aIsIdentity = a.category === 'Identity';
    const bIsIdentity = b.category === 'Identity';
    if (aIsIdentity !== bIsIdentity) {
      return aIsIdentity ? -1 : 1;
    }
    return 0;
  });
}
