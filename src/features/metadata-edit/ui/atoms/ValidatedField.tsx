/**
 * ValidatedField Atom
 *
 * Wraps DebouncedField with inline validation feedback.
 *
 * @module features/metadata-edit/ui/atoms/ValidatedField
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { DebouncedField } from './DebouncedField';
import type { AppSettings } from '@/src/shared/types';
import type { ValidationIssue } from '../../model/useInspectorValidation';

export interface ValidatedFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  issues: ValidationIssue[];
  settings: AppSettings;
  inputType: 'input' | 'textarea';
  rows?: number;
}

export const ValidatedField: React.FC<ValidatedFieldProps> = ({
  label, value, onChange, issues, settings, inputType, rows
}) => {
  const hasError = issues.some(i => i.severity === 'error');
  const hasWarning = issues.some(i => i.severity === 'warning');

  const borderColor = hasError
    ? 'border-nb-red'
    : hasWarning
      ? 'border-nb-orange'
      : (settings.fieldMode ? 'border-nb-black focus:border-nb-yellow' : 'border-nb-black/20 focus:ring-2 focus:ring-nb-blue');

  const inputClass = `w-full text-sm p-3 outline-none border ${borderColor} ${
    settings.fieldMode ? 'bg-nb-black text-white' : 'bg-nb-white'
  }`;

  return (
    <div>
      <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${
        settings.fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
      }`}>
        {label}
        {hasError && <Icon name="error" className="text-nb-red ml-1 text-xs" />}
        {hasWarning && !hasError && <Icon name="warning" className="text-nb-orange ml-1 text-xs" />}
      </label>
      <DebouncedField
        inputType={inputType}
        value={value}
        onChange={onChange}
        rows={inputType === 'textarea' ? (rows || 3) : undefined}
        className={`${inputClass}${inputType === 'textarea' ? ' resize-none' : ''}`}
      />
      {issues.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {issues.map((issue, idx) => (
            <div key={idx} className={`text-[10px] flex items-center gap-1 ${
              issue.severity === 'error' ? 'text-nb-red' :
              issue.severity === 'warning' ? 'text-nb-orange' :
              'text-nb-blue'
            }`}>
              <Icon name={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'} className="text-[10px]" />
              {issue.title}
              {issue.autoFixable && (
                <Button variant="ghost" size="bare"
                  onClick={() => {/* handled by parent */}}
                  className="ml-1 text-nb-green hover:underline"
                >
                  Fix
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidatedField;
