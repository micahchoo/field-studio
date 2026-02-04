import React, { useCallback, useState } from 'react';
import { Icon } from './Icon';

interface StackedThumbnailProps {
  urls: string[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  icon?: string;
  placeholderBg?: string;
}

export const StackedThumbnail: React.FC<StackedThumbnailProps> = ({
  urls,
  size = 'md',
  className = '',
  icon = 'image',
  placeholderBg = 'bg-slate-100'
}) => {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((url: string) => {
    setFailedUrls(prev => new Set([...prev, url]));
  }, []);

  const containerSizes = {
    xs: 'w-6 h-6 rounded',
    sm: 'w-10 h-10 rounded-lg',
    md: 'w-16 h-16 rounded-xl',
    lg: 'w-24 h-24 rounded-2xl',
    xl: 'w-32 h-32 rounded-3xl'
  };

  // Filter out failed URLs
  const validUrls = urls.filter(url => url && !failedUrls.has(url));
  const urlCount = validUrls.length;

  // Show placeholder if no valid URLs
  if (urlCount === 0) {
    return (
      <div className={`${containerSizes[size]} ${placeholderBg} flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/50 ${className}`}>
        <Icon name={icon} className="text-slate-300" />
      </div>
    );
  }

  // Single image
  if (urlCount === 1) {
    return (
      <div className={`${containerSizes[size]} bg-slate-900 shrink-0 overflow-hidden border border-slate-200/50 ${className}`}>
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
    <div className={`${containerSizes[size]} bg-slate-200 shrink-0 overflow-hidden border border-slate-200/50 grid grid-cols-2 grid-rows-2 gap-0.5 ${className}`}>
      {validUrls.slice(0, 4).map((url, i) => (
        <div
          key={i}
          className={`bg-slate-900 ${urlCount === 2 && i === 0 ? 'col-span-1 row-span-2' : ''} ${urlCount === 2 && i === 1 ? 'col-span-1 row-span-2' : ''} ${urlCount === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}`}
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
        <div className="bg-slate-800 flex items-center justify-center">
           <Icon name={icon} className="text-[10px] text-slate-600" />
        </div>
      )}
    </div>
  );
};
