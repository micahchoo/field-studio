/**
 * BlurUpThumbnail Molecule
 *
 * Two-phase thumbnail loading: tiny blurred placeholder crossfades to sharp full-res.
 *
 * @module features/archive/ui/molecules/BlurUpThumbnail
 */

import React, { useCallback, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms';

export interface BlurUpThumbnailProps {
  /** Low-resolution thumbnail URL (tiny, loads eagerly) */
  lowResUrl: string;
  /** High-resolution thumbnail URL (full, loads lazily) */
  highResUrl: string;
  /** Fallback icon name when images fail */
  fallbackIcon?: string;
  /** Contextual styles */
  cx: { surface?: string; textMuted?: string };
  /** Field mode flag */
  fieldMode: boolean;
  /** Auth lock status — shows lock/unlock icon overlay */
  authStatus?: 'unknown' | 'locked' | 'unlocked';
}

export const BlurUpThumbnail: React.FC<BlurUpThumbnailProps> = ({
  lowResUrl,
  highResUrl,
  fallbackIcon = 'image',
  cx,
  fieldMode,
  authStatus,
}) => {
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [lowResFailed, setLowResFailed] = useState(false);
  const [highResFailed, setHighResFailed] = useState(false);

  const handleHighResLoad = useCallback(() => setHighResLoaded(true), []);

  const showFallback = (lowResFailed && highResFailed) || (!lowResUrl && !highResUrl);

  if (showFallback) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${
        fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream/80'
      }`}>
        <Icon name={fallbackIcon} className={`text-2xl ${cx.textMuted || 'text-nb-black/30'}`} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Low-res blurred placeholder */}
      {lowResUrl && !lowResFailed && (
        <img
          src={lowResUrl}
          alt=""
          loading="eager"
          onError={() => setLowResFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover scale-110 transition-[filter,opacity] duration-200 ${
            highResLoaded ? 'opacity-0 blur-0' : 'opacity-100 blur-[8px]'
          }`}
        />
      )}
      {/* High-res sharp image */}
      {highResUrl && !highResFailed && (
        <img
          src={highResUrl}
          alt=""
          loading="lazy"
          onLoad={handleHighResLoad}
          onError={() => setHighResFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            highResLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {/* Auth status icon overlay */}
      {authStatus && authStatus !== 'unknown' && (
        <div className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-sm ${
          authStatus === 'locked'
            ? fieldMode ? 'bg-nb-red/90 text-nb-yellow' : 'bg-nb-red/80 text-nb-white'
            : fieldMode ? 'bg-nb-green/90 text-nb-yellow' : 'bg-nb-green/80 text-nb-white'
        }`} title={authStatus === 'locked' ? 'Authentication required' : 'Authenticated'}>
          <Icon name={authStatus === 'locked' ? 'lock' : 'lock_open'} className="text-[12px]" />
        </div>
      )}
    </div>
  );
};

export default BlurUpThumbnail;
