/**
 * useInspectorValidation
 *
 * Encapsulates the validation lifecycle for the Inspector panel:
 * - Runs validation whenever the resource changes
 * - Exposes per-issue and batch fix actions that return the healed item
 *   (caller decides how to apply it — typically via onUpdateResource)
 */

import { useCallback, useEffect, useState } from 'react';
import { IIIFItem } from '../types';
import { healIssue, ValidationIssue, validator } from '../services';

export function useInspectorValidation(resource: IIIFItem | null) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
    setIssues(resource ? validator.validateItem(resource) : []);
  }, [resource]);

  /** Attempt to fix a single issue. Returns the updated item or null on failure. */
  const fixIssue = useCallback((issue: ValidationIssue): IIIFItem | null => {
    if (!resource || !issue.fixable) return null;
    const result = healIssue(resource, issue);
    return result.success && result.updatedItem ? result.updatedItem : null;
  }, [resource]);

  /** Attempt to fix every fixable issue in one pass. Returns the updated item or null. */
  const fixAllIssues = useCallback(async (): Promise<IIIFItem | null> => {
    if (!resource) return null;
    const fixable = issues.filter(i => i.fixable);
    if (fixable.length === 0) return null;

    const { safeHealAll } = await import('../services/validationHealer');
    const result = safeHealAll(resource, fixable);
    return result.success && result.updatedItem ? result.updatedItem : null;
  }, [resource, issues]);

  return { issues, fixIssue, fixAllIssues };
}
