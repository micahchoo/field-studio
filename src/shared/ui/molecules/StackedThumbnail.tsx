/**
 * StackedThumbnail Molecule
 *
 * Displays a single thumbnail or a grid of up to 4 thumbnails.
 * Used for showing collection/manifest previews.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no context
 * - Local state only (failed image tracking)
 * - Uses Icon atom
 */

import React, { useCallback, useState } from 'react';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface StackedThumbnailProps {
  /** URLs of images to display */
  urls: string[];
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Icon to show when no images */
  icon?: string;
  /** Background class for placeholder */
  placeholderBg?: string;
  /** Contextual styles from template (optional, for theming) */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

const containerSizes = {
  xs: 'w-6 h-6 rounded',
  sm: 'w-10 h-10 rounded-lg',
  md: 'w-16 h-16 rounded-xl',
  lg: 'w-full h-full rounded-lg',
  xl: 'w-40 h-40 rounded-3xl',
};

export const StackedThumbnail: React.FC<StackedThumbnailProps> = ({
  urls,
  size = 'md',
  className = '',
  icon = 'image',
  placeholderBg,
  cx,
  fieldMode: _fieldMode,
}) => {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((url: string) => {
    setFailedUrls((prev) => new Set([...prev, url]));
  }, []);

  const bgClass = placeholderBg || cx?.subtleBg || 'bg-slate-100';
  const iconColor = cx?.textMuted || 'text-slate-300';

  // Filter out failed URLs
  const validUrls = urls.filter((url) => url && !failedUrls.has(url));
  const urlCount = validUrls.length;

  // Show placeholder if no valid URLs
  if (urlCount === 0) {
    return (
      <div
        className={`${containerSizes[size]} ${bgClass} flex items-center justify-center shrink-0 overflow-hidden border ${cx?.border || 'border-slate-200/50'} ${className}`}
      >
        <Icon name={icon} className={iconColor} />
      </div>
    );
  }

  // Single image
  if (urlCount === 1) {
    return (
      <div
        className={`${containerSizes[size]} bg-slate-900 shrink-0 overflow-hidden border ${cx?.border || 'border-slate-200/50'} ${className}`}
      >
        <img
          src={validUrls[0]}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => handleImageError(validUrls[0])}
        />
      </div>
    );
  }

  // Grid layout for 2-4 images
  return (
    <div
      className={`${containerSizes[size]} ${cx?.separator || 'bg-slate-200'} shrink-0 overflow-hidden ${cx?.border || 'border-slate-200/50'} grid grid-cols-2 grid-rows-2 gap-0.5 ${className}`}
    >
      {validUrls.slice(0, 4).map((url, i) => (
        <div
          key={i}
          className={`bg-slate-900 ${
            urlCount === 2 && i === 0 ? 'col-span-1 row-span-2' : ''
          } ${
            urlCount === 2 && i === 1 ? 'col-span-1 row-span-2' : ''
          } ${urlCount === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}`}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => handleImageError(url)}
          />
        </div>
      ))}
      {/* Fill empty cells if we have 3 images */}
      {urlCount === 3 && (
        <div className={`${cx?.subtleBg || 'bg-slate-800'} flex items-center justify-center`}>
          <Icon name={icon} className={`text-[10px] ${cx?.textMuted || 'text-slate-500'}`} />
        </div>
      )}
    </div>
  );
};
