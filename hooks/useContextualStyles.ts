/**
 * useContextualStyles
 *
 * Unified contextual styling utility.  Returns pre-computed Tailwind
 * className strings for the most common UI patterns, keyed by semantic
 * role.  All values branch on fieldMode — the single most pervasive
 * conditional in the codebase.
 *
 * Usage:
 *   const cx = useContextualStyles(settings.fieldMode);
 *   <div className={cx.surface}>...</div>
 *
 * This eliminates the recurring `fieldMode ? 'dark-class' : 'light-class'`
 * ternaries scattered across components.
 */

import { useMemo } from 'react';

export interface ContextualClassNames {
  /** Card / panel surface (background + border) */
  surface: string;
  /** Primary text */
  text: string;
  /** Secondary / muted text */
  textMuted: string;
  /** Default border */
  border: string;
  /** Text input field (bg + border + focus ring) */
  input: string;
  /** Field label (uppercase micro-label above inputs) */
  label: string;
  /** Horizontal rule / section divider border */
  divider: string;
  /** Active / selected tab or button */
  active: string;
  /** Inactive / default tab or button */
  inactive: string;
  /** Accent / primary-action text colour */
  accent: string;
  /** Validation warning surface */
  warningBg: string;
  /** Header bar background */
  headerBg: string;
}

export function useContextualStyles(fieldMode: boolean): ContextualClassNames {
  return useMemo(() => {
    if (fieldMode) {
      return {
        surface:   'bg-slate-900 border-slate-800',
        text:      'text-white',
        textMuted: 'text-slate-400',
        border:    'border-slate-800',
        input:     'bg-slate-900 text-white border-slate-800 focus:border-yellow-400',
        label:     'text-slate-500',
        divider:   'border-slate-800',
        active:    'text-yellow-400 border-yellow-400',
        inactive:  'text-slate-400 hover:text-slate-200',
        accent:    'text-yellow-400',
        warningBg: 'bg-slate-900 border-slate-800',
        headerBg:  'bg-black border-slate-800',
      };
    }

    return {
      surface:   'bg-white border-slate-200',
      text:      'text-slate-800',
      textMuted: 'text-slate-500',
      border:    'border-slate-300',
      input:     'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500',
      label:     'text-slate-400',
      divider:   'border-slate-100',
      active:    'text-blue-600 border-blue-600 bg-blue-50/20',
      inactive:  'text-slate-400 hover:text-slate-600',
      accent:    'text-blue-600',
      warningBg: 'bg-orange-50 border-orange-200',
      headerBg:  'bg-slate-50 border-slate-200',
    };
  }, [fieldMode]);
}
