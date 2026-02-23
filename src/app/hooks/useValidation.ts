import { useEffect, useRef, useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import { type ValidationIssue, validator } from '@/src/entities/manifest/model/validation/validator';

export function useValidation(
  root: IIIFItem | null,
  debounceMs: number = 800
): Record<string, ValidationIssue[]> {
  const [validationIssuesMap, setValidationIssuesMap] = useState<Record<string, ValidationIssue[]>>({});
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!root) return;
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(() => {
      setValidationIssuesMap(validator.validateTree(root));
    }, debounceMs);
    return () => { if (validationTimerRef.current) clearTimeout(validationTimerRef.current); };
  }, [root, debounceMs]);

  return validationIssuesMap;
}
