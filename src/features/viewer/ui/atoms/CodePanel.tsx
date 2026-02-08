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
import { ActionButton } from '@/src/shared/ui/molecules/ActionButton';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  const mutedTextClass = fieldMode ? 'text-nb-black/40' : 'text-nb-black/50';
  const preBg = fieldMode ? 'bg-nb-black' : 'bg-nb-black';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextClass}`}>cURL</label>
        <pre className={`${preBg} text-nb-green text-xs p-3  overflow-x-auto font-mono`}>{curlCommand}</pre>
        <ActionButton label="Copy cURL" onClick={() => copyToClipboard(curlCommand)} variant="ghost" size="sm" />
      </div>
      <div className="space-y-2">
        <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextClass}`}>HTML</label>
        <pre className={`${preBg} text-nb-blue text-xs p-3  overflow-x-auto font-mono`}>{htmlTag}</pre>
        <ActionButton label="Copy HTML" onClick={() => copyToClipboard(htmlTag)} variant="ghost" size="sm" />
      </div>
    </div>
  );
};

export default CodePanel;
