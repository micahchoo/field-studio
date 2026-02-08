/**
 * HeaderBreadcrumb Component
 *
 * Displays breadcrumb navigation for IIIF items.
 *
 * @widget
 */

import React from 'react';
import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';

export interface HeaderBreadcrumbProps {
  /** Root item for breadcrumb */
  rootItem: IIIFItem | null;
  /** Current breadcrumb path */
  breadcrumbPath?: IIIFItem[];
  /** Callback when breadcrumb item is clicked */
  onBreadcrumbClick?: (item: IIIFItem) => void;
  /** Contextual muted text color class */
  textMutedColor: string;
  /** Terminology function */
  t: (key: string) => string;
}

/**
 * HeaderBreadcrumb displays navigation breadcrumbs for the current location.
 *
 * @example
 * <HeaderBreadcrumb
 *   rootItem={root}
 *   breadcrumbPath={path}
 *   onBreadcrumbClick={handleClick}
 *   textMutedColor="text-nb-black/50"
 *   t={t}
 * />
 */
export const HeaderBreadcrumb: React.FC<HeaderBreadcrumbProps> = ({
  rootItem,
  breadcrumbPath = [],
  onBreadcrumbClick,
  textMutedColor,
  t,
}) => {
  if (!rootItem) {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-1 text-sm min-w-0"
      aria-label="Breadcrumb"
    >
      <Button
        onClick={() => onBreadcrumbClick?.(rootItem)}
        variant="ghost"
        size="sm"
        style={{
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {getIIIFValue(rootItem.label) || t('home') || 'Home'}
      </Button>
      {breadcrumbPath.map((item, index) => (
        <React.Fragment key={item.id}>
          <Icon name="chevron_right" className={`text-xs ${textMutedColor}`} />
          <Button
            onClick={() => onBreadcrumbClick?.(item)}
            variant="ghost"
            size="sm"
            style={{
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            aria-current={index === breadcrumbPath.length - 1 ? 'page' : undefined}
          >
            {getIIIFValue(item.label) || item.id}
          </Button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default HeaderBreadcrumb;
