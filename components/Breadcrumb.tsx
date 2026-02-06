/**
 * Breadcrumb - Hierarchical navigation component
 * 
 * Provides visual path through archive hierarchy with clickable segments
 * and smart truncation for deep paths.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export interface BreadcrumbSegment {
  /** Unique identifier for the segment */
  id: string;
  /** Display label (truncated if too long) */
  label: string;
  /** Full label for tooltip */
  fullLabel?: string;
  /** Item type for icon */
  type: 'Collection' | 'Manifest' | 'Canvas' | 'Range' | string;
  /** Whether this is the current/active segment */
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  /** Array of path segments from root to current */
  path: BreadcrumbSegment[];
  /** Callback when a segment is clicked */
  onNavigate: (id: string) => void;
  /** Maximum number of segments to show before truncating */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
  /** Home/root icon click handler */
  onHomeClick?: () => void;
}

/**
 * Breadcrumb navigation component
 * 
 * @example
 * <Breadcrumb
 *   path={[
 *     { id: '1', label: 'Field Archive', type: 'Collection' },
 *     { id: '2', label: '2024 Collections', type: 'Collection' },
 *     { id: '3', label: 'Spring Survey', type: 'Manifest', isCurrent: true }
 *   ]}
 *   onNavigate={(id) => handleSelect(id)}
 *   maxVisible={4}
 * />
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  path,
  onNavigate,
  maxVisible = 4,
  className = '',
  onHomeClick
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if we need to truncate
  const shouldTruncate = path.length > maxVisible;
  
  // Calculate visible segments
  let visibleSegments: BreadcrumbSegment[];
  let truncatedSegments: BreadcrumbSegment[] = [];
  
  if (shouldTruncate) {
    // Always show first, last 2, and ellipsis in middle
    const firstSegment = path[0];
    const lastSegments = path.slice(-2);
    truncatedSegments = path.slice(1, -2);
    visibleSegments = [firstSegment, ...lastSegments];
  } else {
    visibleSegments = path;
  }

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'Collection': return 'folder';
      case 'Manifest': return 'menu_book';
      case 'Canvas': return 'crop_original';
      case 'Range': return 'list';
      default: return 'folder';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'Collection': return 'text-amber-600';
      case 'Manifest': return 'text-emerald-600';
      case 'Canvas': return 'text-blue-600';
      case 'Range': return 'text-purple-600';
      default: return 'text-slate-500';
    }
  };

  return (
    <nav 
      className={`flex items-center gap-1 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {/* Home/Root icon */}
      <button
        onClick={onHomeClick}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-iiif-blue/50 focus:ring-offset-1"
        title="Go to root"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onHomeClick?.();
          }
        }}
      >
        <Icon name="home" className="text-lg" />
      </button>

      {path.length > 0 && (
        <span className="text-slate-300 mx-1">
          <Icon name="chevron_right" className="text-sm" />
        </span>
      )}

      {/* Visible segments */}
      {visibleSegments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === visibleSegments.length - 1;
        const showEllipsis = shouldTruncate && index === 1;

        if (showEllipsis) {
          return (
            <React.Fragment key={`ellipsis-${segment.id}`}>
                {/* Truncation dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-iiif-blue/50 focus:ring-offset-1"
                    title="Show more"
                    tabIndex={0}
                    aria-expanded={showDropdown}
                    aria-haspopup="menu"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowDropdown(!showDropdown);
                      } else if (e.key === 'Escape' && showDropdown) {
                        setShowDropdown(false);
                      }
                    }}
                  >
                    ...
                  </button>
                
                {showDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[200px] z-50"
                    role="menu"
                  >
                    {truncatedSegments.map((truncated, idx) => (
                      <button
                        key={truncated.id}
                        onClick={() => {
                          onNavigate(truncated.id);
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm focus:outline-none focus:bg-slate-100 focus:ring-2 focus:ring-inset focus:ring-iiif-blue/30"
                        title={truncated.fullLabel || truncated.label}
                        role="menuitem"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigate(truncated.id);
                            setShowDropdown(false);
                          } else if (e.key === 'Escape') {
                            setShowDropdown(false);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const nextButton = dropdownRef.current?.querySelectorAll('button[role="menuitem"]')[idx + 1] as HTMLElement;
                            nextButton?.focus();
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (idx === 0) {
                              setShowDropdown(false);
                            } else {
                              const prevButton = dropdownRef.current?.querySelectorAll('button[role="menuitem"]')[idx - 1] as HTMLElement;
                              prevButton?.focus();
                            }
                          }
                        }}
                      >
                        <Icon
                          name={getTypeIcon(truncated.type)}
                          className={`text-xs ${getTypeColor(truncated.type)}`}
                        />
                        <span className="truncate">{truncated.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-slate-300 mx-1">
                <Icon name="chevron_right" className="text-sm" />
              </span>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={segment.id}>
            {!isFirst && !showEllipsis && (
              <span className="text-slate-300 mx-1">
                <Icon name="chevron_right" className="text-sm" />
              </span>
            )}
            
            <button
              onClick={() => !segment.isCurrent && onNavigate(segment.id)}
              disabled={segment.isCurrent}
              tabIndex={segment.isCurrent ? -1 : 0}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all
                focus:outline-none focus:ring-2 focus:ring-iiif-blue/50 focus:ring-offset-1
                ${segment.isCurrent
                  ? 'font-semibold text-slate-800 bg-slate-100 cursor-default'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }
              `}
              title={segment.fullLabel || segment.label}
              aria-current={segment.isCurrent ? 'page' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!segment.isCurrent) {
                    onNavigate(segment.id);
                  }
                }
              }}
            >
              <Icon
                name={getTypeIcon(segment.type)}
                className={`text-xs ${getTypeColor(segment.type)}`}
              />
              <span className="truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                {segment.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/**
 * Helper function to build breadcrumb path from IIIF tree
 */
export function buildBreadcrumbPath(
  root: any | null,
  targetId: string,
  getLabel: (item: any) => string
): BreadcrumbSegment[] {
  if (!root) return [];
  
  const path: BreadcrumbSegment[] = [];
  
  const findPath = (item: any, currentPath: BreadcrumbSegment[]): boolean => {
    const segment: BreadcrumbSegment = {
      id: item.id,
      label: getLabel(item.label) || 'Untitled',
      fullLabel: getLabel(item.label) || 'Untitled',
      type: item.type,
      isCurrent: item.id === targetId
    };
    
    const newPath = [...currentPath, segment];
    
    if (item.id === targetId) {
      path.push(...newPath);
      return true;
    }
    
    const children = item.items || [];
    for (const child of children) {
      if (findPath(child, newPath)) {
        return true;
      }
    }
    
    return false;
  };
  
  findPath(root, []);
  return path;
}

export default Breadcrumb;
