/**
 * UrlBar Atom
 *
 * Displays the IIIF Image API URL with colored segments.
 * Includes copy functionality.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (copied indicator)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/UrlBar
 */

import React, { useCallback, useState } from 'react';
import { IconButton } from '@/src/shared/ui/molecules';
import { UrlSegment } from './UrlSegment';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface UrlBarProps {
  /** Base image ID/service URL */
  imageId: string;
  /** Region parameter */
  region: string;
  /** Size parameter */
  size: string;
  /** Rotation parameter */
  rotation: string;
  /** Quality parameter */
  quality: string;
  /** Format parameter */
  format: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const UrlBar: React.FC<UrlBarProps> = ({
  imageId,
  region,
  size,
  rotation,
  quality,
  format,
  cx: _cx,
  fieldMode = false,
}) => {
  const [showCopied, setShowCopied] = useState(false);

  const url = `${imageId}/${region}/${size}/${rotation}/${quality}.${format}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  }, [url]);

  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="p-3 bg-slate-950 font-mono text-xs border-t border-white/10 shrink-0">
      <div className="flex items-center gap-1">
        <span className={`${mutedTextClass} truncate max-w-[150px]`}>{imageId}/</span>
        <UrlSegment value={region} label="Region" color="green" fieldMode={fieldMode} />
        <span className={mutedTextClass}>/</span>
        <UrlSegment value={size} label="Size" color="blue" fieldMode={fieldMode} />
        <span className={mutedTextClass}>/</span>
        <UrlSegment value={rotation} label="Rotation" color="orange" fieldMode={fieldMode} />
        <span className={mutedTextClass}>/</span>
        <UrlSegment value={quality} label="Quality" color="purple" fieldMode={fieldMode} />
        <span className={mutedTextClass}>.</span>
        <UrlSegment value={format} label="Format" color="yellow" fieldMode={fieldMode} />
        <div className="flex-1" />
        <IconButton
          icon="content_copy"
          ariaLabel="Copy URL"
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="!text-white/60 hover:!text-white"
        />
        {showCopied && <span className="text-green-400 text-xs">Copied!</span>}
      </div>
    </div>
  );
};

export default UrlBar;
