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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface BreadcrumbItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: string;
  /** Item type for styling */
  type?: 'root' | 'collection' | 'manifest' | 'canvas' | 'folder';
  /** Number of children (for badge) */
  childCount?: number;
  /** Sibling items for dropdown navigation */
  siblings?: BreadcrumbItem[];
  /** Click handler */
  onClick?: () => void;
}

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
 *     { id: 'root', label: 'My Archive', type: 'root', icon: 'home' },
 *     { id: 'bidri', label: 'BIDRI', type: 'collection' },
 *   ]}
 *   currentItem={{ id: 'laxmi', label: 'LAXMIBAI (BAI)', type: 'manifest' }}
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
        { id: 'ellipsis', label: '...', type: 'folder' } as BreadcrumbItem,
        ...allItems.slice(-(maxItems - 2)), // Show last N items
      ]
    : allItems;

  const renderSeparator = () =>
    separator || (
      <Icon
        name="chevron_right"
        className={`text-xs mx-1 ${fieldMode ? 'text-slate-600' : 'text-slate-400'}`}
        aria-hidden="true"
      />
    );

  const getItemStyles = (type?: string, isCurrent = false) => {
    const baseStyles = 'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors';

    if (isCurrent) {
      return `${baseStyles} font-medium ${fieldMode ? 'text-white bg-slate-800' : 'text-slate-900 bg-slate-100'}`;
    }

    switch (type) {
      case 'root':
        return `${baseStyles} ${fieldMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`;
      case 'collection':
        return `${baseStyles} ${fieldMode ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-800' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`;
      case 'manifest':
        return `${baseStyles} ${fieldMode ? 'text-green-400 hover:text-green-300 hover:bg-slate-800' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`;
      default:
        return `${baseStyles} ${fieldMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`;
    }
  };

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'root':
        return 'home';
      case 'collection':
        return 'folder';
      case 'manifest':
        return 'photo_album';
      case 'canvas':
        return 'image';
      case 'folder':
        return 'folder_open';
      default:
        return 'label';
    }
  };

  return (
    <nav
      className={`
        flex items-center flex-wrap gap-1 py-2 px-4
        ${fieldMode ? 'border-b border-slate-800' : 'border-b border-slate-200'}
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
        const isEllipsis = item.id === 'ellipsis';
        const hasSiblings = item.siblings && item.siblings.length > 0;
        const isExpanded = expandedItem === item.id;

        if (isEllipsis) {
          return (
            <React.Fragment key={item.id}>
              <span className={`px-2 ${fieldMode ? 'text-slate-600' : 'text-slate-400'}`}>...</span>
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
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.icon && <Icon name={item.icon} className="text-sm" />}
                    <span className="max-w-[150px] truncate">{item.label}</span>
                    <Icon
                      name={isExpanded ? 'expand_less' : 'expand_more'}
                      className="text-xs opacity-60"
                    />
                    {item.childCount !== undefined && item.childCount > 0 && (
                      <span
                        className={`
                          ml-1 px-1.5 py-0.5 text-xs rounded-full
                          ${fieldMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}
                        `}
                      >
                        {item.childCount}
                      </span>
                    )}
                  </Button>

                  {/* Siblings dropdown */}
                  {isExpanded && item.siblings && (
                    <div
                      className={`
                        absolute top-full left-0 mt-1 min-w-[200px] max-h-[300px]
                        rounded-xl shadow-xl border overflow-y-auto
                        ${fieldMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}
                        animate-in fade-in slide-in-from-top-2 z-50
                      `}
                      role="menu"
                    >
                      <div className={`px-3 py-2 text-xs font-medium ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        Siblings
                      </div>
                      {item.siblings.map(sibling => (
                        <Button variant="ghost" size="bare"
                          key={sibling.id}
                          onClick={() => {
                            sibling.onClick?.();
                            setExpandedItem(null);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                            transition-colors
                            ${sibling.id === item.id
                              ? (fieldMode ? 'bg-slate-700 text-white' : 'bg-blue-50 text-blue-700')
                              : (fieldMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50')
                            }
                          `}
                          role="menuitem"
                          aria-current={sibling.id === item.id ? 'true' : undefined}
                        >
                          <Icon
                            name={sibling.icon || getIconForType(sibling.type)}
                            className="text-sm opacity-60"
                          />
                          <span className="flex-1 truncate">{sibling.label}</span>
                          {sibling.childCount !== undefined && sibling.childCount > 0 && (
                            <span
                              className={`
                                px-1.5 py-0.5 text-xs rounded-full
                                ${fieldMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}
                              `}
                            >
                              {sibling.childCount}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Button variant="ghost" size="bare"
                  onClick={item.onClick}
                  disabled={isCurrent || !item.onClick}
                  className={getItemStyles(item.type, isCurrent)}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.icon && <Icon name={item.icon} className="text-sm" />}
                  <span className="max-w-[200px] truncate">{item.label}</span>
                  {item.childCount !== undefined && item.childCount > 0 && (
                    <span
                      className={`
                        ml-1 px-1.5 py-0.5 text-xs rounded-full
                        ${fieldMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}
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
        <div className={`ml-auto flex items-center gap-2 text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Icon name={getIconForType(currentItem.type)} className="text-sm" />
          <span className="capitalize">{currentItem.type || 'item'}</span>
        </div>
      )}
    </nav>
  );
};

export default BreadcrumbNav;
