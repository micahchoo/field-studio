/**
 * CodePanel Atom
 *
 * Displays code examples (cURL, HTML) for IIIF Image API requests.
 * Used in the workbench code tab.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/CodePanel
 */

import React from 'react';
import { ActionButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface CodePanelProps {
  /** cURL command to display */
  curlCommand: string;
  /** HTML img tag to display */
  htmlTag: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const CodePanel: React.FC<CodePanelProps> = ({
  curlCommand,
  htmlTag,
  cx: _cx,
  fieldMode = false,
}) => {
  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';
  const preBg = fieldMode ? 'bg-slate-950' : 'bg-slate-900';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextClass}`}>cURL</label>
        <pre className={`${preBg} text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono`}>{curlCommand}</pre>
        <ActionButton label="Copy cURL" onClick={() => copyToClipboard(curlCommand)} variant="ghost" size="sm" />
      </div>
      <div className="space-y-2">
        <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextClass}`}>HTML</label>
        <pre className={`${preBg} text-blue-400 text-xs p-3 rounded-lg overflow-x-auto font-mono`}>{htmlTag}</pre>
        <ActionButton label="Copy HTML" onClick={() => copyToClipboard(htmlTag)} variant="ghost" size="sm" />
      </div>
    </div>
  );
};

export default CodePanel;
