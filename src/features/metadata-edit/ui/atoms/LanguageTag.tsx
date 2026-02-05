/**
 * LanguageTag Atom
 *
 * Language code badge/selector for metadata mappings.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/LanguageTag
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface LanguageOption {
  code: string;
  label: string;
}

export interface LanguageTagProps {
  /** Available language options */
  languages: LanguageOption[];
  /** Currently selected language code */
  value: string;
  /** Called when language changes */
  onChange: (code: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const LanguageTag: React.FC<LanguageTagProps> = ({
  languages,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-700 ${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
      }`}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageTag;
