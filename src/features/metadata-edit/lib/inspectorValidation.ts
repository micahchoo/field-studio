/**
 * Inspector Validation -- Pure computation (Category 1)
 *
 * Replaces useInspectorValidation React hook.
 * Architecture doc S4 Cat 1: plain functions.
 *
 * IIIF resource validation with 18 rules and auto-fix suggestions.
 * All functions are pure -- no side effects, no framework dependencies.
 *
 * Public API signatures use `IIIFItem` (validateResource / fixIssue / fixAll / RuleFn).
 * Remaining `any`: sanitizeLabelValue handles unknown LanguageMap shapes (see TYPE_DEBT there).
 * getMetadataValues parameter kept as any[] for now — see TYPE_DEBT at definition site.
 *
 * Usage:
 *   import { validateResource, fixIssue, fixAll } from './inspectorValidation';
 *   const result = validateResource(manifest, 'Manifest');
 *   if (!result.isValid) { ... }
 *   const fixed = fixAll(manifest, result.autoFixableIssues);
 */

import { isManifest, type IIIFItem, type FieldValidationIssue } from '@/src/shared/types';

// ------------------------------------------------------------------
// Types — re-exported from shared/types (canonical)
// ------------------------------------------------------------------

export type ValidationIssue = FieldValidationIssue;

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  autoFixableIssues: ValidationIssue[];
  isValid: boolean;
}

// ------------------------------------------------------------------
// Constants: known valid IIIF rights URIs
// ------------------------------------------------------------------

/** Known Creative Commons and Rights Statements URIs */
const VALID_RIGHTS_URIS: string[] = [
  // Creative Commons
  'http://creativecommons.org/licenses/by/4.0/',
  'http://creativecommons.org/licenses/by-nc/4.0/',
  'http://creativecommons.org/licenses/by-nc-nd/4.0/',
  'http://creativecommons.org/licenses/by-nc-sa/4.0/',
  'http://creativecommons.org/licenses/by-nd/4.0/',
  'http://creativecommons.org/licenses/by-sa/4.0/',
  'http://creativecommons.org/publicdomain/mark/1.0/',
  'http://creativecommons.org/publicdomain/zero/1.0/',
  // RightsStatements.org
  'http://rightsstatements.org/vocab/CNE/1.0/',
  'http://rightsstatements.org/vocab/InC/1.0/',
  'http://rightsstatements.org/vocab/InC-EDU/1.0/',
  'http://rightsstatements.org/vocab/InC-NC/1.0/',
  'http://rightsstatements.org/vocab/InC-OW-EU/1.0/',
  'http://rightsstatements.org/vocab/InC-RUU/1.0/',
  'http://rightsstatements.org/vocab/NoC-CR/1.0/',
  'http://rightsstatements.org/vocab/NoC-NC/1.0/',
  'http://rightsstatements.org/vocab/NoC-OKLR/1.0/',
  'http://rightsstatements.org/vocab/NoC-US/1.0/',
  'http://rightsstatements.org/vocab/NKC/1.0/',
  'http://rightsstatements.org/vocab/UND/1.0/',
];

/** All valid rights URIs including https variants */
const ALL_VALID_RIGHTS: Set<string> = new Set([
  ...VALID_RIGHTS_URIS,
  ...VALID_RIGHTS_URIS.map(uri => uri.replace('http://', 'https://')),
]);

// ------------------------------------------------------------------
// Constants: valid IIIF behaviors by resource type
// ------------------------------------------------------------------

/** Valid IIIF behaviors by resource type (IIIF Presentation API 3.0) */
const VALID_BEHAVIORS: Record<string, string[]> = {
  Collection: [
    'auto-advance', 'continuous', 'individuals', 'multi-part',
    'no-auto-advance', 'no-nav', 'paged', 'together', 'unordered',
  ],
  Manifest: [
    'auto-advance', 'continuous', 'individuals', 'multi-part',
    'no-auto-advance', 'no-nav', 'paged', 'together', 'unordered',
    'sequence', 'thumbnail-nav', 'no-repeat',
  ],
  Canvas: [
    'auto-advance', 'facing-pages', 'no-auto-advance', 'non-paged',
  ],
  Range: [
    'auto-advance', 'continuous', 'individuals', 'multi-part',
    'no-auto-advance', 'no-nav', 'sequence', 'thumbnail-nav', 'no-repeat',
  ],
  AnnotationPage: [],
  Annotation: [],
};

// ------------------------------------------------------------------
// Constants: disjoint (mutually exclusive) behavior sets
// ------------------------------------------------------------------

/** Disjoint behavior sets -- only one from each group may appear */
const DISJOINT_BEHAVIORS: string[][] = [
  ['individuals', 'continuous', 'paged'],
  ['auto-advance', 'no-auto-advance'],
  ['together', 'sequence'],
  ['unordered', 'individuals', 'continuous', 'paged'],
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Extract a plain-text label from an IIIF label object */
function extractLabel(label: unknown): string {
  if (!label) return '';
  if (typeof label === 'string') return label;
  if (typeof label === 'object') {
    const values = Object.values(label as Record<string, string[]>);
    return values[0]?.[0] ?? '';
  }
  return '';
}

/** Check if a string looks like it could contain HTML */
function containsHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Very basic HTML tag stripping (for auto-fix; production uses DOMPurify) */
function stripUnsafeHtml(value: string): string {
  // Allow only <a>, <b>, <i>, <em>, <strong>, <br>, <p>, <span>, <ul>, <ol>, <li>
  const allowed = new Set([
    'a', 'b', 'i', 'em', 'strong', 'br', 'p', 'span', 'ul', 'ol', 'li', 'img',
  ]);
  return value.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    return allowed.has(tag.toLowerCase()) ? match : '';
  });
}

/** Check whether a string is a valid ISO 8601 / xsd:dateTime */
function isValidNavDate(value: string): boolean {
  // IIIF navDate must be xsd:dateTime: YYYY-MM-DDThh:mm:ssZ
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/** Attempt to reformat a navDate string into valid xsd:dateTime */
function reformatNavDate(value: string): string | null {
  // Try parsing as a Date and formatting back
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Return the resource type, preferring an explicit typeHint over the item's own type field. */
function detectType(resource: IIIFItem, typeHint?: string): string {
  return typeHint ?? resource.type;
}

/** Get all string values from an IIIF metadata array */
function getMetadataValues(metadata: NonNullable<IIIFItem['metadata']>): Array<{ label: string; value: string; index: number }> {
  const result: Array<{ label: string; value: string; index: number }> = [];
  for (let i = 0; i < metadata.length; i++) {
    const entry = metadata[i];
    const label = extractLabel(entry?.label);
    const value = extractLabel(entry?.value);
    result.push({ label, value, index: i });
  }
  return result;
}

// ------------------------------------------------------------------
// Validation rules
//
// Each rule function pushes zero or more ValidationIssue objects
// into the issues array. The rule number corresponds to the
// documented 18-rule set.
// ------------------------------------------------------------------

type RuleFn = (resource: IIIFItem, type: string, issues: ValidationIssue[]) => void;

// Rule 1: missing-label (error)
const rule01_missingLabel: RuleFn = (resource, _type, issues) => {
  const label = extractLabel(resource.label);
  if (!label) {
    issues.push({
      kind: 'field',
      id: 'missing-label',
      severity: 'error',
      title: 'Missing label',
      description: 'Every IIIF resource should have a human-readable label.',
      field: 'label',
      autoFixable: false,
    });
  }
};

// Rule 2: missing-rights (warning)
const rule02_missingRights: RuleFn = (resource, _type, issues) => {
  if (!resource.rights) {
    issues.push({
      kind: 'field',
      id: 'missing-rights',
      severity: 'warning',
      title: 'Missing rights statement',
      description: 'A rights statement URI should be provided to inform users of usage rights.',
      field: 'rights',
      autoFixable: false,
    });
  }
};

// Rule 3: short-label (warning) - < 3 chars
const rule03_shortLabel: RuleFn = (resource, _type, issues) => {
  const label = extractLabel(resource.label);
  if (label && label.length < 3) {
    issues.push({
      kind: 'field',
      id: 'short-label',
      severity: 'warning',
      title: 'Very short label',
      description: `Label "${label}" is fewer than 3 characters. Consider a more descriptive label.`,
      field: 'label',
      autoFixable: false,
      currentValue: label,
    });
  }
};

// Rule 4: missing-summary (info)
const rule04_missingSummary: RuleFn = (resource, _type, issues) => {
  const summary = extractLabel(resource.summary);
  if (!summary) {
    issues.push({
      kind: 'field',
      id: 'missing-summary',
      severity: 'info',
      title: 'Missing summary',
      description: 'Adding a summary provides users with a description of the resource.',
      field: 'summary',
      autoFixable: false,
    });
  }
};

// Rule 5: empty-metadata (warning, auto-fix: remove)
const rule05_emptyMetadata: RuleFn = (resource, _type, issues) => {
  const metadata = resource.metadata;
  if (!Array.isArray(metadata)) return;

  for (let i = 0; i < metadata.length; i++) {
    const entry = metadata[i];
    const label = extractLabel(entry?.label);
    const value = extractLabel(entry?.value);
    if (!label && !value) {
      issues.push({
        kind: 'field',
        id: `empty-metadata-${i}`,
        severity: 'warning',
        title: 'Empty metadata entry',
        description: `Metadata entry at index ${i} has no label or value.`,
        field: `metadata[${i}]`,
        autoFixable: true,
        fixSuggestion: 'Remove the empty metadata entry.',
        currentValue: entry,
      });
    }
  }
};

// Rule 6: missing-viewing-direction (info, auto-fix: set ltr)
const rule06_missingViewingDirection: RuleFn = (resource, type, issues) => {
  if (type !== 'Manifest' && type !== 'Collection') return;
  if (!resource.viewingDirection) {
    issues.push({
      kind: 'field',
      id: 'missing-viewing-direction',
      severity: 'info',
      title: 'Missing viewing direction',
      description: 'No viewingDirection set. Defaults to left-to-right.',
      field: 'viewingDirection',
      autoFixable: true,
      fixSuggestion: 'Set viewingDirection to "left-to-right".',
    });
  }
};

// Rule 7: empty-collection (error) - no members
const rule07_emptyCollection: RuleFn = (resource, type, issues) => {
  if (type !== 'Collection') return;
  // `members` is a IIIF v2 Collection property not on IIIFItem; cast to access for compatibility
  const members = (resource as unknown as Record<string, unknown>).members;
  const items = resource.items ?? (Array.isArray(members) ? members : []);
  if (items.length === 0) {
    issues.push({
      kind: 'field',
      id: 'empty-collection',
      severity: 'error',
      title: 'Empty collection',
      description: 'This collection has no members. Add manifests or sub-collections.',
      field: 'items',
      autoFixable: false,
    });
  }
};

// Rule 8: empty-manifest (error) - no canvases
const rule08_emptyManifest: RuleFn = (resource, type, issues) => {
  if (type !== 'Manifest') return;
  const items = resource.items ?? [];
  if (items.length === 0) {
    issues.push({
      kind: 'field',
      id: 'empty-manifest',
      severity: 'error',
      title: 'Empty manifest',
      description: 'This manifest has no canvases. Add at least one canvas.',
      field: 'items',
      autoFixable: false,
    });
  }
};

// Rule 9: duplicate-metadata-labels (warning)
const rule09_duplicateMetadataLabels: RuleFn = (resource, _type, issues) => {
  const metadata = resource.metadata;
  if (!Array.isArray(metadata) || metadata.length < 2) return;

  const entries = getMetadataValues(metadata);
  const labelCounts = new Map<string, number[]>();

  for (const entry of entries) {
    if (!entry.label) continue;
    const key = entry.label.toLowerCase();
    if (!labelCounts.has(key)) labelCounts.set(key, []);
    labelCounts.get(key)!.push(entry.index);
  }

  for (const [label, indices] of labelCounts) {
    if (indices.length > 1) {
      issues.push({
        kind: 'field',
        id: `duplicate-metadata-labels-${label}`,
        severity: 'warning',
        title: 'Duplicate metadata labels',
        description: `Label "${label}" appears ${indices.length} times (indices: ${indices.join(', ')}).`,
        field: 'metadata',
        autoFixable: false,
        currentValue: indices,
      });
    }
  }
};

// Rule 10: missing-id (error)
const rule10_missingId: RuleFn = (resource, _type, issues) => {
  if (!resource.id) {
    issues.push({
      kind: 'field',
      id: 'missing-id',
      severity: 'error',
      title: 'Missing resource ID',
      description: 'Every IIIF resource must have an id property.',
      field: 'id',
      autoFixable: false,
    });
  }
};

// Rule 11: non-https-id (warning, auto-fix: upgrade to https)
const rule11_nonHttpsId: RuleFn = (resource, _type, issues) => {
  if (typeof resource.id === 'string' && resource.id.startsWith('http://')) {
    issues.push({
      kind: 'field',
      id: 'non-https-id',
      severity: 'warning',
      title: 'Non-HTTPS resource ID',
      description: 'Resource IDs should use HTTPS for security.',
      field: 'id',
      autoFixable: true,
      fixSuggestion: 'Upgrade the id to use https://.',
      currentValue: resource.id,
    });
  }
};

// Rule 12: invalid-navdate-format (error, auto-fix: reformat)
const rule12_invalidNavDateFormat: RuleFn = (resource, _type, issues) => {
  if (!resource.navDate) return;
  if (typeof resource.navDate !== 'string') return;
  if (!isValidNavDate(resource.navDate)) {
    const reformatted = reformatNavDate(resource.navDate);
    issues.push({
      kind: 'field',
      id: 'invalid-navdate-format',
      severity: 'error',
      title: 'Invalid navDate format',
      description: `navDate "${resource.navDate}" is not valid xsd:dateTime (YYYY-MM-DDThh:mm:ssZ).`,
      field: 'navDate',
      autoFixable: reformatted !== null,
      fixSuggestion: reformatted ? `Reformat to "${reformatted}".` : undefined,
      currentValue: resource.navDate,
    });
  }
};

// Rule 13: invalid-behavior-for-type (warning, auto-fix: filter)
const rule13_invalidBehaviorForType: RuleFn = (resource, type, issues) => {
  const behaviors = resource.behavior;
  if (!Array.isArray(behaviors) || behaviors.length === 0) return;
  const valid = VALID_BEHAVIORS[type];
  if (!valid) return;

  const invalid = behaviors.filter((b: string) => !valid.includes(b));
  if (invalid.length > 0) {
    issues.push({
      kind: 'field',
      id: 'invalid-behavior-for-type',
      severity: 'warning',
      title: 'Invalid behavior for resource type',
      description: `Behavior(s) [${invalid.join(', ')}] are not valid for ${type}.`,
      field: 'behavior',
      autoFixable: true,
      fixSuggestion: `Remove invalid behaviors, keeping only: [${behaviors.filter((b: string) => valid.includes(b)).join(', ')}].`,
      currentValue: behaviors,
    });
  }
};

// Rule 14: conflicting-behaviors (warning, auto-fix: keep first)
const rule14_conflictingBehaviors: RuleFn = (resource, _type, issues) => {
  const behaviors = resource.behavior;
  if (!Array.isArray(behaviors) || behaviors.length < 2) return;

  for (const group of DISJOINT_BEHAVIORS) {
    const present = behaviors.filter((b: string) => group.includes(b));
    if (present.length > 1) {
      issues.push({
        kind: 'field',
        id: `conflicting-behaviors-${present.join('-')}`,
        severity: 'warning',
        title: 'Conflicting behaviors',
        description: `Behaviors [${present.join(', ')}] are mutually exclusive. Only one should be set.`,
        field: 'behavior',
        autoFixable: true,
        fixSuggestion: `Keep "${present[0]}" and remove the rest.`,
        currentValue: behaviors,
      });
    }
  }
};

// Rule 15: behavior-missing-precondition (info)
const rule15_behaviorMissingPrecondition: RuleFn = (resource, type, issues) => {
  const behaviors = resource.behavior;
  if (!Array.isArray(behaviors)) return;

  // 'paged' on Manifest requires at least 2 canvases
  if (behaviors.includes('paged') && type === 'Manifest' && isManifest(resource)) {
    if (resource.items.length < 2) {
      issues.push({
        kind: 'field',
        id: 'behavior-missing-precondition-paged',
        severity: 'info',
        title: 'Paged behavior with too few canvases',
        description: 'The "paged" behavior works best with at least 2 canvases.',
        field: 'behavior',
        autoFixable: false,
      });
    }
  }

  // 'auto-advance' without duration on canvases
  if (behaviors.includes('auto-advance') && type === 'Manifest' && isManifest(resource)) {
    const anyMissingDuration = resource.items.some(
      (canvas) => canvas.duration == null,
    );
    if (anyMissingDuration) {
      issues.push({
        kind: 'field',
        id: 'behavior-missing-precondition-auto-advance',
        severity: 'info',
        title: 'Auto-advance without canvas durations',
        description:
          'The "auto-advance" behavior requires canvases to have a duration property for timed advancement.',
        field: 'behavior',
        autoFixable: false,
      });
    }
  }
};

// Rule 16: invalid-rights-uri (error)
const rule16_invalidRightsUri: RuleFn = (resource, _type, issues) => {
  if (!resource.rights || typeof resource.rights !== 'string') return;
  const uri = resource.rights;

  // Must be a URI
  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    issues.push({
      kind: 'field',
      id: 'invalid-rights-uri',
      severity: 'error',
      title: 'Invalid rights URI',
      description: `Rights value "${uri}" is not a valid HTTP(S) URI.`,
      field: 'rights',
      autoFixable: false,
      currentValue: uri,
    });
  }
};

// Rule 17: unknown-rights-uri (info)
const rule17_unknownRightsUri: RuleFn = (resource, _type, issues) => {
  if (!resource.rights || typeof resource.rights !== 'string') return;
  const uri = resource.rights;

  // Only check if it IS a valid URI but is not a known one
  if (
    (uri.startsWith('http://') || uri.startsWith('https://')) &&
    !ALL_VALID_RIGHTS.has(uri)
  ) {
    issues.push({
      kind: 'field',
      id: 'unknown-rights-uri',
      severity: 'info',
      title: 'Unknown rights URI',
      description:
        'The rights URI is not a recognized Creative Commons or RightsStatements.org URI. It may still be valid for your use case.',
      field: 'rights',
      autoFixable: false,
      currentValue: uri,
    });
  }
};

// Rule 18: unsafe-html-content (warning, auto-fix: sanitize)
const rule18_unsafeHtmlContent: RuleFn = (resource, _type, issues) => {
  // Check summary
  const summary = extractLabel(resource.summary);
  if (summary && containsHtml(summary)) {
    const sanitized = stripUnsafeHtml(summary);
    if (sanitized !== summary) {
      issues.push({
        kind: 'field',
        id: 'unsafe-html-content-summary',
        severity: 'warning',
        title: 'Potentially unsafe HTML in summary',
        description: 'The summary contains HTML tags that may not be in the IIIF allowed set.',
        field: 'summary',
        autoFixable: true,
        fixSuggestion: 'Remove disallowed HTML tags from the summary.',
        currentValue: summary,
      });
    }
  }

  // Check metadata values
  const metadata = resource.metadata;
  if (Array.isArray(metadata)) {
    for (let i = 0; i < metadata.length; i++) {
      const value = extractLabel(metadata[i]?.value);
      if (value && containsHtml(value)) {
        const sanitized = stripUnsafeHtml(value);
        if (sanitized !== value) {
          issues.push({
            kind: 'field',
            id: `unsafe-html-content-metadata-${i}`,
            severity: 'warning',
            title: `Potentially unsafe HTML in metadata[${i}]`,
            description: `Metadata value at index ${i} contains HTML tags not in the IIIF allowed set.`,
            field: `metadata[${i}].value`,
            autoFixable: true,
            fixSuggestion: 'Remove disallowed HTML tags from the metadata value.',
            currentValue: value,
          });
        }
      }
    }
  }

  // Check requiredStatement
  if (resource.requiredStatement) {
    const rsValue = extractLabel(resource.requiredStatement?.value);
    if (rsValue && containsHtml(rsValue)) {
      const sanitized = stripUnsafeHtml(rsValue);
      if (sanitized !== rsValue) {
        issues.push({
          kind: 'field',
          id: 'unsafe-html-content-requiredStatement',
          severity: 'warning',
          title: 'Potentially unsafe HTML in requiredStatement',
          description: 'The requiredStatement value contains HTML tags not in the IIIF allowed set.',
          field: 'requiredStatement.value',
          autoFixable: true,
          fixSuggestion: 'Remove disallowed HTML tags from the requiredStatement value.',
          currentValue: rsValue,
        });
      }
    }
  }
};

// ------------------------------------------------------------------
// All rules array
// ------------------------------------------------------------------

const ALL_RULES: RuleFn[] = [
  rule01_missingLabel,
  rule02_missingRights,
  rule03_shortLabel,
  rule04_missingSummary,
  rule05_emptyMetadata,
  rule06_missingViewingDirection,
  rule07_emptyCollection,
  rule08_emptyManifest,
  rule09_duplicateMetadataLabels,
  rule10_missingId,
  rule11_nonHttpsId,
  rule12_invalidNavDateFormat,
  rule13_invalidBehaviorForType,
  rule14_conflictingBehaviors,
  rule15_behaviorMissingPrecondition,
  rule16_invalidRightsUri,
  rule17_unknownRightsUri,
  rule18_unsafeHtmlContent,
];

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Validate an IIIF resource and return all issues.
 *
 * 18 validation rules:
 *  1. missing-label (error)
 *  2. missing-rights (warning)
 *  3. short-label (warning) - < 3 chars
 *  4. missing-summary (info)
 *  5. empty-metadata (warning, auto-fix: remove)
 *  6. missing-viewing-direction (info, auto-fix: set ltr)
 *  7. empty-collection (error) - no members
 *  8. empty-manifest (error) - no canvases
 *  9. duplicate-metadata-labels (warning)
 * 10. missing-id (error)
 * 11. non-https-id (warning, auto-fix: upgrade to https)
 * 12. invalid-navdate-format (error, auto-fix: reformat)
 * 13. invalid-behavior-for-type (warning, auto-fix: filter)
 * 14. conflicting-behaviors (warning, auto-fix: keep first)
 * 15. behavior-missing-precondition (info)
 * 16. invalid-rights-uri (error)
 * 17. unknown-rights-uri (info)
 * 18. unsafe-html-content (warning, auto-fix: sanitize)
 */
export function validateResource(resource: IIIFItem | null | undefined, type?: string): ValidationResult {
  if (!resource) {
    return {
      issues: [],
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      autoFixableIssues: [],
      isValid: true,
    };
  }

  const resolvedType = detectType(resource, type);
  const issues: ValidationIssue[] = [];

  // Run all 18 rules
  for (const rule of ALL_RULES) {
    rule(resource, resolvedType, issues);
  }

  // Aggregate results
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const autoFixableIssues = issues.filter(i => i.autoFixable);

  return {
    issues,
    errorCount,
    warningCount,
    infoCount,
    autoFixableIssues,
    isValid: errorCount === 0,
  };
}

/**
 * Apply an auto-fix for a specific issue on a resource.
 * Returns the updated resource (immutable -- original is not modified).
 */
export function fixIssue(resource: IIIFItem, issue: ValidationIssue): IIIFItem {
  if (!issue.autoFixable) return resource;

  const fixed = { ...resource };

  switch (true) {
    // Rule 5: empty-metadata -- remove the empty entry
    case issue.id.startsWith('empty-metadata-'): {
      const index = parseInt(issue.id.replace('empty-metadata-', ''), 10);
      if (Array.isArray(fixed.metadata)) {
        fixed.metadata = fixed.metadata.filter((_, i) => i !== index);
      }
      break;
    }

    // Rule 6: missing-viewing-direction -- set to left-to-right
    case issue.id === 'missing-viewing-direction': {
      fixed.viewingDirection = 'left-to-right';
      break;
    }

    // Rule 11: non-https-id -- upgrade http to https
    case issue.id === 'non-https-id': {
      if (typeof fixed.id === 'string') {
        fixed.id = fixed.id.replace(/^http:\/\//, 'https://');
      }
      break;
    }

    // Rule 12: invalid-navdate-format -- reformat to xsd:dateTime
    case issue.id === 'invalid-navdate-format': {
      if (typeof fixed.navDate === 'string') {
        const reformatted = reformatNavDate(fixed.navDate);
        if (reformatted) {
          fixed.navDate = reformatted;
        }
      }
      break;
    }

    // Rule 13: invalid-behavior-for-type -- filter to valid behaviors only
    case issue.id === 'invalid-behavior-for-type': {
      if (Array.isArray(fixed.behavior)) {
        const type = detectType(resource);
        const valid = VALID_BEHAVIORS[type] ?? [];
        fixed.behavior = fixed.behavior.filter((b: string) => valid.includes(b));
      }
      break;
    }

    // Rule 14: conflicting-behaviors -- keep the first from each disjoint group
    case issue.id.startsWith('conflicting-behaviors-'): {
      if (Array.isArray(fixed.behavior)) {
        const newBehaviors = [...fixed.behavior];
        for (const group of DISJOINT_BEHAVIORS) {
          const present = newBehaviors.filter(b => group.includes(b));
          if (present.length > 1) {
            // Keep only the first occurrence, remove the rest
            const keepFirst = present[0];
            for (let i = newBehaviors.length - 1; i >= 0; i--) {
              if (group.includes(newBehaviors[i]) && newBehaviors[i] !== keepFirst) {
                newBehaviors.splice(i, 1);
              }
            }
          }
        }
        fixed.behavior = newBehaviors;
      }
      break;
    }

    // Rule 18: unsafe-html-content -- sanitize HTML
    case issue.id === 'unsafe-html-content-summary': {
      // rule18 only fires when extractLabel(resource.summary) is non-empty, so summary is defined
      fixed.summary = sanitizeLabelValue(fixed.summary!);
      break;
    }
    case issue.id.startsWith('unsafe-html-content-metadata-'): {
      const index = parseInt(issue.id.replace('unsafe-html-content-metadata-', ''), 10);
      if (Array.isArray(fixed.metadata) && fixed.metadata[index]) {
        fixed.metadata = [...fixed.metadata];
        fixed.metadata[index] = {
          ...fixed.metadata[index],
          value: sanitizeLabelValue(fixed.metadata[index].value),
        };
      }
      break;
    }
    case issue.id === 'unsafe-html-content-requiredStatement': {
      if (fixed.requiredStatement) {
        fixed.requiredStatement = {
          ...fixed.requiredStatement,
          value: sanitizeLabelValue(fixed.requiredStatement.value),
        };
      }
      break;
    }

    default:
      // Unknown auto-fix; return unmodified
      break;
  }

  return fixed;
}

/**
 * Apply all auto-fixable issues at once.
 * Issues are applied sequentially; each fix operates on the result of the previous.
 */
export function fixAll(resource: IIIFItem, issues: ValidationIssue[]): IIIFItem {
  const fixable = issues.filter(i => i.autoFixable);

  // Sort by descending index for metadata removals so indices stay valid
  const sorted = [...fixable].sort((a, b) => {
    const aIdx = extractIssueIndex(a.id);
    const bIdx = extractIssueIndex(b.id);
    if (aIdx !== null && bIdx !== null) return bIdx - aIdx; // descending
    return 0;
  });

  let result = resource;
  for (const issue of sorted) {
    result = fixIssue(result, issue);
  }
  return result;
}

// ------------------------------------------------------------------
// Internal helpers for fixIssue
// ------------------------------------------------------------------

/**
 * Sanitize an IIIF language map value by stripping unsafe HTML.
 * Handles both { en: ['<html>'] } objects and plain strings.
 */
// Generic so callers that pass Record<string,string[]> get Record<string,string[]> back.
// The string branch is retained for defensive robustness against malformed data.
function sanitizeLabelValue<T extends Record<string, string[]> | string>(value: T): T {
  if (typeof value === 'string') {
    return stripUnsafeHtml(value) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, string[]> = {};
    for (const [lang, strings] of Object.entries(value)) {
      if (Array.isArray(strings)) {
        result[lang] = (strings as string[]).map(s =>
          typeof s === 'string' ? stripUnsafeHtml(s) : s,
        );
      } else {
        result[lang] = strings as string[];
      }
    }
    return result as T;
  }
  return value;
}

/** Extract a numeric index from an issue ID like "empty-metadata-3" */
function extractIssueIndex(issueId: string): number | null {
  const match = issueId.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
