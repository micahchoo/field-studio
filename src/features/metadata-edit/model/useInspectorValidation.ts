/**
 * Inspector Validation Hook
 *
 * Provides validation logic for IIIF resources in the inspector panel.
 * Checks for common issues and provides auto-fix suggestions.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Domain-specific hook
 * - Returns validation state and fix functions
 * - No UI rendering
 *
 * @module features/metadata-edit/model/useInspectorValidation
 */

import { useCallback, useMemo } from 'react';
import type { IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest } from '@/src/shared/types';
import { isValidNavDate, formatNavDate, isValidRightsUri, isValidHttpUri } from '@/utils/iiifTypes';
import { isBehaviorValidForType, findBehaviorConflicts, getDisjointSetForBehavior } from '@/utils/iiifBehaviors';
import { containsDangerousContent, sanitizeHTML } from '@/utils/sanitization';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /** Unique identifier for the issue */
  id: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Field path (e.g., 'label', 'metadata[0].value') */
  field: string;
  /** Whether this issue can be auto-fixed */
  autoFixable: boolean;
  /** Suggested fix action description */
  fixSuggestion?: string;
  /** Current value causing the issue */
  currentValue?: unknown;
}

export interface ValidationResult {
  /** All validation issues */
  issues: ValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Info count */
  infoCount: number;
  /** Auto-fixable issues */
  autoFixableIssues: ValidationIssue[];
  /** Whether validation passed (no errors) */
  isValid: boolean;
}

export interface UseInspectorValidationReturn extends ValidationResult {
  /** Apply auto-fix for a specific issue */
  fixIssue: (issueId: string) => Partial<IIIFItem> | null;
  /** Apply all auto-fixes */
  fixAll: () => Partial<IIIFItem> | null;
}

/**
 * Validation rules for IIIF resources
 */
const validationRules = [
  // Check for missing label
  {
    id: 'missing-label',
    field: 'label',
    severity: 'error' as const,
    title: 'Missing Label',
    description: 'The resource has no label. Labels are required for accessibility.',
    check: (item: IIIFItem) => {
      if (!item.label) return true;
      const values = Object.values(item.label).flat();
      return values.length === 0 || values.every((v) => !v.trim());
    },
    autoFix: null, // Cannot auto-generate a meaningful label
  },

  // Check for missing rights statement
  {
    id: 'missing-rights',
    field: 'rights',
    severity: 'warning' as const,
    title: 'Missing Rights Statement',
    description: 'No rights statement is defined. Consider adding usage rights.',
    check: (item: IIIFItem) => !item.rights,
    autoFix: null,
  },

  // Check for short label (likely uninformative)
  {
    id: 'short-label',
    field: 'label',
    severity: 'warning' as const,
    title: 'Short Label',
    description: 'The label is very short. Consider providing a more descriptive label.',
    check: (item: IIIFItem) => {
      if (!item.label) return false;
      const values = Object.values(item.label).flat();
      return values.some((v) => v.length > 0 && v.length < 3);
    },
    autoFix: null,
  },

  // Check for missing summary on Manifest/Collection
  {
    id: 'missing-summary',
    field: 'summary',
    severity: 'info' as const,
    title: 'Missing Summary',
    description: 'Consider adding a summary to help users understand the content.',
    check: (item: IIIFItem) => {
      if (item.type !== 'Manifest' && item.type !== 'Collection') return false;
      return !item.summary || Object.values(item.summary).flat().every((v) => !v.trim());
    },
    autoFix: null,
  },

  // Check for empty metadata values
  {
    id: 'empty-metadata',
    field: 'metadata',
    severity: 'warning' as const,
    title: 'Empty Metadata Values',
    description: 'Some metadata fields have empty values. Consider removing them.',
    check: (item: IIIFItem) => {
      if (!item.metadata) return false;
      return item.metadata.some((m: { value: Record<string, string[]> }) => {
        const values = Object.values(m.value).flat();
        return values.length === 0 || values.every((v) => !v.trim());
      });
    },
    autoFix: (item: IIIFItem) => ({
      metadata: item.metadata?.filter((m: { value: Record<string, string[]> }) => {
        const values = Object.values(m.value).flat();
        return values.length > 0 && values.some((v) => v.trim());
      }),
    }),
  },

  // Check for missing viewing direction on Manifest
  {
    id: 'missing-viewing-direction',
    field: 'viewingDirection',
    severity: 'info' as const,
    title: 'No Viewing Direction',
    description: 'Manifest has no explicit viewing direction. Defaults to left-to-right.',
    check: (item: IIIFItem) => {
      if (item.type !== 'Manifest') return false;
      return !(item as IIIFManifest).viewingDirection;
    },
    autoFix: (_item: IIIFItem): Partial<IIIFItem> => ({
      viewingDirection: 'left-to-right' as const,
    }),
  },

  // Check for collection with no items
  {
    id: 'empty-collection',
    field: 'items',
    severity: 'error' as const,
    title: 'Empty Collection',
    description: 'This collection contains no items. Add manifests or sub-collections.',
    check: (item: IIIFItem) => {
      if (item.type !== 'Collection') return false;
      const {items} = (item as IIIFCollection);
      return !items || items.length === 0;
    },
    autoFix: null,
  },

  // Check for manifest with no canvases
  {
    id: 'empty-manifest',
    field: 'items',
    severity: 'error' as const,
    title: 'Empty Manifest',
    description: 'This manifest contains no canvases. Add at least one canvas.',
    check: (item: IIIFItem) => {
      if (item.type !== 'Manifest') return false;
      const {items} = (item as IIIFManifest);
      return !items || items.length === 0;
    },
    autoFix: null,
  },

  // Check for duplicate metadata labels
  {
    id: 'duplicate-metadata-labels',
    field: 'metadata',
    severity: 'warning' as const,
    title: 'Duplicate Metadata Labels',
    description: 'Multiple metadata entries have the same label. Consider merging them.',
    check: (item: IIIFItem) => {
      if (!item.metadata) return false;
      const labels = item.metadata.map((m: { label: Record<string, string[]> }) =>
        Object.values(m.label).flat().join(',')
      );
      return new Set(labels).size !== labels.length;
    },
    autoFix: null, // Would need complex merging logic
  },

  // Check for missing required id
  {
    id: 'missing-id',
    field: 'id',
    severity: 'error' as const,
    title: 'Missing ID',
    description: 'The resource has no identifier. All IIIF resources require an ID.',
    check: (item: IIIFItem) => !item.id,
    autoFix: null,
  },

  // Check for non-HTTPS ID
  {
    id: 'non-https-id',
    field: 'id',
    severity: 'warning' as const,
    title: 'Non-HTTPS ID',
    description: 'The resource ID uses HTTP. Consider using HTTPS for security.',
    check: (item: IIIFItem) => {
      if (!item.id) return false;
      return item.id.startsWith('http://');
    },
    autoFix: (item: IIIFItem) => ({
      id: item.id.replace(/^http:\/\//, 'https://'),
    }),
  },

  // Check for invalid navDate format (must be ISO 8601 with timezone)
  {
    id: 'invalid-navdate-format',
    field: 'navDate',
    severity: 'error' as const,
    title: 'Invalid navDate Format',
    description: 'navDate must be ISO 8601 with timezone (e.g. 2024-01-15T00:00:00Z).',
    check: (item: IIIFItem) => {
      if (!item.navDate) return false;
      return !isValidNavDate(item.navDate);
    },
    autoFix: (item: IIIFItem) => {
      const d = new Date(item.navDate!);
      if (isNaN(d.getTime())) return { navDate: undefined };
      return { navDate: formatNavDate(d) };
    },
  },

  // Check for behaviors invalid for the resource type
  {
    id: 'invalid-behavior-for-type',
    field: 'behavior',
    severity: 'warning' as const,
    title: 'Invalid Behavior for Resource Type',
    description: 'Some behaviors are not valid for this resource type per IIIF spec.',
    check: (item: IIIFItem) => {
      if (!item.behavior?.length) return false;
      return item.behavior.some(b => !isBehaviorValidForType(b, item.type));
    },
    autoFix: (item: IIIFItem) => ({
      behavior: item.behavior?.filter(b => isBehaviorValidForType(b, item.type)),
    }),
  },

  // Check for conflicting behaviors from the same disjoint set
  {
    id: 'conflicting-behaviors',
    field: 'behavior',
    severity: 'warning' as const,
    title: 'Conflicting Behaviors',
    description: 'Behaviors from the same disjoint set are active. Only the first will be kept.',
    check: (item: IIIFItem) => {
      if (!item.behavior?.length) return false;
      return findBehaviorConflicts(item.behavior).length > 0;
    },
    autoFix: (item: IIIFItem) => {
      const seen = new Set<string>();
      const kept = (item.behavior || []).filter(b => {
        const set = getDisjointSetForBehavior(b);
        if (!set) return true;
        if (seen.has(set.name)) return false;
        seen.add(set.name);
        return true;
      });
      return { behavior: kept.length ? kept : undefined };
    },
  },

  // Check for behaviors that need dimensions or duration on Canvas
  {
    id: 'behavior-missing-precondition',
    field: 'behavior',
    severity: 'info' as const,
    title: 'Behavior May Need Additional Properties',
    description: 'Some behaviors expect dimensions or duration on canvases.',
    check: (item: IIIFItem) => {
      if (!item.behavior?.length) return false;
      if (item.type !== 'Canvas') return false;
      const needsDimensions = ['continuous', 'paged', 'facing-pages', 'non-paged'];
      const needsDuration = ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat'];
      const rec = item as unknown as Record<string, unknown>;
      const hasDims = !!(rec.width && rec.height);
      const hasDur = !!rec.duration;
      for (const b of item.behavior) {
        if (needsDimensions.includes(b) && !hasDims) return true;
        if (needsDuration.includes(b) && !hasDur) return true;
      }
      return false;
    },
    autoFix: null,
  },

  // Check for invalid rights URI (must be HTTP/HTTPS)
  {
    id: 'invalid-rights-uri',
    field: 'rights',
    severity: 'error' as const,
    title: 'Invalid Rights URI',
    description: 'Rights must be an HTTP(S) URI, preferably from Creative Commons or RightsStatements.org.',
    check: (item: IIIFItem) => {
      if (!item.rights) return false;
      return !isValidHttpUri(item.rights);
    },
    autoFix: null,
  },

  // Check for non-standard (but valid) rights URI
  {
    id: 'unknown-rights-uri',
    field: 'rights',
    severity: 'info' as const,
    title: 'Non-Standard Rights URI',
    description: 'Rights URI is valid but not from Creative Commons or RightsStatements.org.',
    check: (item: IIIFItem) => {
      if (!item.rights || !isValidHttpUri(item.rights)) return false;
      const result = isValidRightsUri(item.rights);
      return result.valid && !!result.warning;
    },
    autoFix: null,
  },

  // Check for unsafe HTML in metadata/requiredStatement values
  {
    id: 'unsafe-html-content',
    field: 'metadata',
    severity: 'warning' as const,
    title: 'Unsafe HTML in Content',
    description: 'Metadata values or requiredStatement contains potentially dangerous HTML.',
    check: (item: IIIFItem) => {
      if (item.metadata?.some(m =>
        Object.values(m.value).flat().some(v => containsDangerousContent(v))
      )) return true;
      if (item.requiredStatement) {
        const vals = Object.values(item.requiredStatement.value).flat();
        if (vals.some(v => containsDangerousContent(v))) return true;
      }
      return false;
    },
    autoFix: (item: IIIFItem) => {
      const fixes: Partial<IIIFItem> = {};
      if (item.metadata?.some(m =>
        Object.values(m.value).flat().some(v => containsDangerousContent(v))
      )) {
        fixes.metadata = item.metadata.map(m => ({
          label: m.label,
          value: Object.fromEntries(
            Object.entries(m.value).map(([lang, vals]) => [
              lang, vals.map(v => containsDangerousContent(v) ? sanitizeHTML(v) : v)
            ])
          ),
        }));
      }
      if (item.requiredStatement) {
        const rs = item.requiredStatement;
        const hasUnsafe = Object.values(rs.value).flat().some(v => containsDangerousContent(v));
        if (hasUnsafe) {
          fixes.requiredStatement = {
            label: rs.label,
            value: Object.fromEntries(
              Object.entries(rs.value).map(([lang, vals]) => [
                lang, vals.map(v => containsDangerousContent(v) ? sanitizeHTML(v) : v)
              ])
            ),
          };
        }
      }
      return fixes;
    },
  },
];

/**
 * Hook for IIIF resource validation in the inspector
 *
 * @param resource - The IIIF resource to validate
 * @returns Validation result and fix functions
 */
export function useInspectorValidation(
  resource: IIIFItem | null
): UseInspectorValidationReturn {
  // Run validation rules
  const issues = useMemo(() => {
    if (!resource) return [];

    return validationRules
      .map((rule) => {
        if (rule.check(resource)) {
          return {
            id: rule.id,
            severity: rule.severity,
            title: rule.title,
            description: rule.description,
            field: rule.field,
            autoFixable: !!rule.autoFix,
            currentValue: (resource as unknown as Record<string, unknown>)[rule.field],
          };
        }
        return null;
      })
      .filter((issue): issue is NonNullable<typeof issue> => issue !== null) as ValidationIssue[];
  }, [resource]);

  // Count by severity
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  const autoFixableIssues = issues.filter((i) => i.autoFixable);

  // Fix a single issue
  const fixIssue = useCallback(
    (issueId: string): Partial<IIIFItem> | null => {
      if (!resource) return null;

      const rule = validationRules.find((r) => r.id === issueId);
      if (!rule?.autoFix) return null;

      return rule.autoFix(resource);
    },
    [resource]
  );

  // Fix all auto-fixable issues
  const fixAll = useCallback((): Partial<IIIFItem> | null => {
    if (!resource || autoFixableIssues.length === 0) return null;

    const fixes: Partial<IIIFItem> = {};

    autoFixableIssues.forEach((issue) => {
      const rule = validationRules.find((r) => r.id === issue.id);
      if (rule?.autoFix) {
        const fix = rule.autoFix(resource);
        Object.assign(fixes, fix);
      }
    });

    return fixes;
  }, [resource, autoFixableIssues]);

  return {
    issues,
    errorCount,
    warningCount,
    infoCount,
    autoFixableIssues,
    isValid: errorCount === 0,
    fixIssue,
    fixAll,
  };
}

export default useInspectorValidation;
