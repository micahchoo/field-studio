/**
 * BreadcrumbNav Molecule
 *
 * Composes: Links + dropdown menus + icons
 *
 * Provides hierarchical wayfinding with quick navigation
 * to parent, sibling, and child items.
 *
 * COMMUNICATIVE DESIGN:
 * - Shows user's current location in archive hierarchy
 * - Enables quick jumps to related items via dropdowns
 * - Visual distinction between current location and navigation paths
 * - Truncates long paths intelligently
 *
 * IDEAL OUTCOME: Users always know where they are and how to navigate
 * FAILURE PREVENTED: Getting lost in deep hierarchies, no way back
 */

import React, { useState } from 'react';
import { Button, Icon } from '../atoms';
import { BreadcrumbSiblingMenu } from './BreadcrumbSiblingMenu';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { BreadcrumbItem } from './breadcrumbTypes';

export type { BreadcrumbItem };

export interface BreadcrumbNavProps {
  /** Breadcrumb path from root to current */
  items: BreadcrumbItem[];
  /** Current/active item (last in path) */
  currentItem?: BreadcrumbItem;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Terminology function */
  t: (key: string) => string;
  /** Current field mode */
  fieldMode?: boolean;
  /** Max items to show before truncating */
  maxItems?: number;
  /** Callback when home/root is clicked */
  onHomeClick?: () => void;
  /** Custom separator between items */
  separator?: React.ReactNode;
}

/**
 * BreadcrumbNav Molecule
 *
 * @example
 * <BreadcrumbNav
 *   items={[
 *     { id:'root', label:'My Archive', type:'root', icon:'home' },
 *     { id:'bidri', label:'BIDRI', type:'collection' },
 *   ]}
 *   currentItem={{ id:'laxmi', label:'LAXMIBAI (BAI)', type:'manifest' }}
 *   cx={cx}
 *   t={t}
 * />
 */
export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  items,
  currentItem,
  cx,
  t,
  fieldMode = false,
  maxItems = 4,
  onHomeClick,
  separator,
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Combine path and current
  const allItems = currentItem ? [...items, currentItem] : items;

  // Truncate if too many items
  const shouldTruncate = allItems.length > maxItems;
  const visibleItems = shouldTruncate
    ? [
        allItems[0], // Always show root
        { id:'ellipsis', label:'...', type:'folder' } as BreadcrumbItem,
        ...allItems.slice(-(maxItems - 2)), // Show last N items
      ]
    : allItems;

  const renderSeparator = () =>
    separator || (
      <Icon
        name="chevron_right"
        className={`text-xs mx-1 ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`}
        aria-hidden="true"
      />
    );

  const getItemStyles = (type?: string, isCurrent = false) => {
    const baseStyles ='flex items-center gap-1.5 px-2 py-1 text-sm transition-nb';

    if (isCurrent) {
      return`${baseStyles} font-medium ${fieldMode ?'text-white bg-nb-black' :'text-nb-black bg-nb-cream'}`;
    }

    switch (type) {
      case'root':
        return`${baseStyles} ${fieldMode ?'text-nb-black/40 hover:text-white hover:bg-nb-black' :'text-nb-black/50 hover:text-nb-black hover:bg-nb-cream'}`;
      case'collection':
        return`${baseStyles} ${fieldMode ?'text-nb-blue hover:text-nb-blue/60 hover:bg-nb-black' :'text-nb-blue hover:text-nb-blue hover:bg-nb-blue/10'}`;
      case'manifest':
        return`${baseStyles} ${fieldMode ?'text-nb-green hover:text-nb-green/60 hover:bg-nb-black' :'text-nb-green hover:text-nb-green hover:bg-nb-green/10'}`;
      default:
        return`${baseStyles} ${fieldMode ?'text-nb-black/40 hover:text-white hover:bg-nb-black' :'text-nb-black/50 hover:text-nb-black hover:bg-nb-cream'}`;
    }
  };

  const getIconForType = (type?: string) => {
    switch (type) {
      case'root':
        return'home';
      case'collection':
        return'folder';
      case'manifest':
        return'photo_album';
      case'canvas':
        return'image';
      case'folder':
        return'folder_open';
      default:
        return'label';
    }
  };

  return (
    <nav
      className={`
        flex items-center flex-wrap gap-1 py-2 px-4
        ${fieldMode ?'border-b border-nb-black' :'border-b border-nb-black/20'}
`}
      aria-label="Breadcrumb"
    >
      {/* Home button */}
      {onHomeClick && (
        <>
          <Button variant="ghost" size="bare"
            onClick={onHomeClick}
            className={getItemStyles('root')}
            aria-label={t('Archive')}
            title={`Go to ${t('Archive')}`}
          >
            <Icon name="home" className="text-sm" />
          </Button>
          {renderSeparator()}
        </>
      )}

      {/* Breadcrumb items */}
      {visibleItems.map((item, index) => {
        const isCurrent = index === visibleItems.length - 1;
        const isEllipsis = item.id ==='ellipsis';
        const hasSiblings = item.siblings && item.siblings.length > 0;
        const isExpanded = expandedItem === item.id;

        if (isEllipsis) {
          return (
            <React.Fragment key={item.id}>
              <span className={`px-2 ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`}>...</span>
              {renderSeparator()}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={item.id}>
            <div className="relative">
              {hasSiblings && !isCurrent ? (
                <>
                  <Button variant="ghost" size="bare"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className={getItemStyles(item.type, isCurrent)}
                    aria-expanded={isExpanded}
                    aria-haspopup="menu"
                    aria-current={isCurrent ?'page' : undefined}
                  >
                    {item.icon && <Icon name={item.icon} className="text-sm" />}
                    <span className="max-w-[150px] truncate">{item.label}</span>
                    <Icon
                      name={isExpanded ?'expand_less' :'expand_more'}
                      className="text-xs opacity-60"
                    />
                    {item.childCount !== undefined && item.childCount > 0 && (
                      <span
                        className={`
                          ml-1 px-1.5 py-0.5 text-xs 
                          ${fieldMode ?'bg-nb-black/80 text-nb-black/40' :'bg-nb-cream text-nb-black/60'}
`}
                      >
                        {item.childCount}
                      </span>
                    )}
                  </Button>

                  {/* Siblings dropdown */}
                  {isExpanded && item.siblings && (
                    <BreadcrumbSiblingMenu
                      currentItemId={item.id}
                      siblings={item.siblings}
                      onSelect={(sibling) => {
                        sibling.onClick?.();
                        setExpandedItem(null);
                      }}
                      fieldMode={fieldMode}
                      getIconForType={getIconForType}
                    />
                  )}
                </>
              ) : (
                <Button variant="ghost" size="bare"
                  onClick={item.onClick}
                  disabled={isCurrent || !item.onClick}
                  className={getItemStyles(item.type, isCurrent)}
                  aria-current={isCurrent ?'page' : undefined}
                >
                  {item.icon && <Icon name={item.icon} className="text-sm" />}
                  <span className="max-w-[200px] truncate">{item.label}</span>
                  {item.childCount !== undefined && item.childCount > 0 && (
                    <span
                      className={`
                        ml-1 px-1.5 py-0.5 text-xs 
                        ${fieldMode ?'bg-nb-black/80 text-nb-black/40' :'bg-nb-cream text-nb-black/60'}
`}
                    >
                      {item.childCount}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {index < visibleItems.length - 1 && renderSeparator()}
          </React.Fragment>
        );
      })}

      {/* View indicator */}
      {currentItem && (
        <div className={`ml-auto flex items-center gap-2 text-xs ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
          <Icon name={getIconForType(currentItem.type)} className="text-sm" />
          <span className="capitalize">{currentItem.type ||'item'}</span>
        </div>
      )}
    </nav>
  );
};

export default BreadcrumbNav;
