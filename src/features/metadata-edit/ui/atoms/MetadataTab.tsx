/**
 * MetadataTab Atom
 *
 * Tab button for Metadata/Technical/Annotations tabs.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/MetadataTab
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';

// Reuse the ContextualStyles interface from MetadataEditorPanel
export interface ContextualStyles {
  surface: string;
  text: string;
  accent: string;
  border: string;
  divider: string;
  headerBg: string;
  textMuted: string;
  input: string;
  label: string;
  active: string;
}

export interface MetadataTabProps {
  /** Whether this tab is active */
  active: boolean;
  /** Called when tab is clicked */
  onClick: () => void;
  /** Tab label */
  label: string;
  /** Contextual styles from parent */
  cx: ContextualStyles;
  /** Field mode flag */
  fieldMode: boolean;
  /** Additional CSS class */
  className?: string;
}

export const MetadataTab: React.FC<MetadataTabProps> = ({
  active,
  onClick,
  label,
  cx,
  fieldMode,
  className = '',
}) => {
  return (
    <Button
      onClick={onClick}
      variant={active ? 'primary' : 'ghost'}
      size="sm"
      fullWidth
      className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${className} ${
        active
          ? `text-${cx.accent} border-b-2 border-${cx.accent}`
          : fieldMode
            ? 'text-slate-500 hover:text-slate-300'
            : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </Button>
  );
};

export default MetadataTab;