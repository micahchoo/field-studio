/**
 * RightsDropdown - Standardized rights/license selector
 * 
 * Addresses Issue 3.5: Rights dropdown options inconsistent between Inspector and Spreadsheet
 * Provides unified rights options from design system constants
 */

import React from 'react';
import { RIGHTS_OPTIONS } from '@/src/shared/constants';

interface RightsDropdownProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const RightsDropdown: React.FC<RightsDropdownProps> = ({
  value,
  onChange,
  className = '',
  id,
  disabled = false,
  placeholder = 'No rights statement'
}) => {
  return (
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(e.target.value || undefined)}
      disabled={disabled}
      className={`w-full text-xs p-3 rounded-lg outline-none font-bold shadow-sm border bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue ${className}`}
    >
      <option value="">{placeholder}</option>
      {RIGHTS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

// Field mode variant for high contrast
export const RightsDropdownFieldMode: React.FC<RightsDropdownProps> = ({
  value,
  onChange,
  className = '',
  id,
  disabled = false,
  placeholder = 'No rights statement'
}) => {
  return (
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(e.target.value || undefined)}
      disabled={disabled}
      className={`w-full text-xs p-3 rounded-lg outline-none font-bold shadow-sm border bg-slate-900 text-white border-slate-800 focus:border-yellow-400 ${className}`}
    >
      <option value="">{placeholder}</option>
      {RIGHTS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

// Compact variant for table cells
export const RightsDropdownCompact: React.FC<RightsDropdownProps> = ({
  value,
  onChange,
  className = '',
  id,
  disabled = false
}) => {
  return (
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(e.target.value || undefined)}
      disabled={disabled}
      className={`w-full h-full px-4 py-3 bg-transparent text-slate-800 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-iiif-blue outline-none transition-all font-medium border-none shadow-none text-xs ${className}`}
    >
      <option value="">(None)</option>
      {RIGHTS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

export default RightsDropdown;
