/**
 * ContentTypeIcon Atom
 *
 * Content type icon overlay (Image/Video/Audio/Text/Dataset/Model).
 *
 * @module features/board-design/ui/atoms/ContentTypeIcon
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { IIIFContentType } from '../../model';

const CONTENT_ICONS: Record<IIIFContentType, string> = {
  Image: 'image',
  Video: 'videocam',
  Audio: 'audiotrack',
  Text: 'article',
  Dataset: 'dataset',
  Model: 'view_in_ar',
  Unknown: 'help_outline',
};

export interface ContentTypeIconProps {
  contentType: IIIFContentType;
  size?: 'sm' | 'md';
  cx: { surface: string; text: string };
  fieldMode: boolean;
}

export const ContentTypeIcon: React.FC<ContentTypeIconProps> = ({
  contentType,
  size = 'sm',
  fieldMode,
}) => {
  if (contentType === 'Unknown' || contentType === 'Image') return null;

  const iconName = CONTENT_ICONS[contentType];
  const sizeClass = size === 'sm' ? 'text-sm p-0.5' : 'text-base p-1';
  const bgClass = fieldMode
    ? 'bg-nb-black/80 text-nb-yellow'
    : 'bg-nb-black/70 text-nb-white';

  return (
    <span className={`inline-flex items-center justify-center ${sizeClass} ${bgClass}`} title={contentType}>
      <Icon name={iconName} className={size === 'sm' ? 'text-xs' : 'text-sm'} aria-hidden="true" />
    </span>
  );
};
