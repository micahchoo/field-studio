/**
 * ContextMenu - Comprehensive right-click menu component
 * 
 * Provides organized sections, icons, keyboard shortcuts, and support for
 * both single and multi-selection contexts. Used across ArchiveView,
 * CollectionsView, and other components that need context actions.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Icon } from './Icon';

export interface ContextMenuItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label */
  label: string;
  /** Material icon name */
  icon?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Visual variant */
  variant?: 'default' | 'danger' | 'primary';
  /** Keyboard shortcut to display (e.g., "Ctrl+C") */
  shortcut?: string;
  /** Tooltip/description */
  description?: string;
}

export interface ContextMenuSection {
  /** Section title (optional) */
  title?: string;
  /** Items in this section */
  items: ContextMenuItem[];
}

export interface ContextMenuProps {
  /** Menu position */
  x: number;
  y: number;
  /** Menu sections (separated by dividers) */
  sections: ContextMenuSection[];
  /** Close handler */
  onClose: () => void;
  /** Whether to show the menu */
  isOpen: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height before scrolling */
  maxHeight?: number;
  /** Whether this is a multi-selection menu */
  selectionCount?: number;
}

/**
 * Comprehensive context menu component with sections and rich items
 * 
 * @example
 * <ContextMenu
 *   isOpen={contextMenu !== null}
 *   x={contextMenu?.x || 0}
 *   y={contextMenu?.y || 0}
 *   onClose={() => setContextMenu(null)}
 *   sections={[
 *     {
 *       items: [
 *         { id: 'open', label: 'Open', icon: 'visibility', onClick: handleOpen },
 *         { id: 'edit', label: 'Edit', icon: 'edit', shortcut: 'Ctrl+E', onClick: handleEdit }
 *       ]
 *     },
 *     {
 *       title: 'Organize',
 *       items: [
 *         { id: 'duplicate', label: 'Duplicate', icon: 'content_copy', onClick: handleDuplicate },
 *         { id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger', onClick: handleDelete }
 *       ]
 *     }
 *   ]}
 * />
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  sections,
  onClose,
  isOpen,
  className = '',
  maxHeight = 400,
  selectionCount = 1
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid immediate close from the context menu event itself
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Calculate position to keep menu on screen
  const getAdjustedPosition = useCallback(() => {
    if (!menuRef.current) return { x, y };

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust if menu goes off right edge
    if (x + rect.width > viewportWidth) {
      adjustedX = x - rect.width;
    }

    // Adjust if menu goes off bottom edge
    if (y + rect.height > viewportHeight) {
      adjustedY = y - rect.height;
    }

    // Ensure minimum padding from edges
    adjustedX = Math.max(8, adjustedX);
    adjustedY = Math.max(8, adjustedY);

    return { x: adjustedX, y: adjustedY };
  }, [x, y]);

  // Update position after render
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const pos = getAdjustedPosition();
      menuRef.current.style.left = `${pos.x}px`;
      menuRef.current.style.top = `${pos.y}px`;
    }
  }, [isOpen, getAdjustedPosition]);

  if (!isOpen) return null;

  // Filter out empty sections
  const validSections = sections.filter(section => 
    section.items.some(item => !item.disabled)
  );

  if (validSections.length === 0) return null;

  const getItemClasses = (item: ContextMenuItem) => {
    const baseClasses = 'w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors rounded-lg mx-1';
    
    if (item.disabled) {
      return `${baseClasses} opacity-40 cursor-not-allowed text-slate-500`;
    }

    switch (item.variant) {
      case 'danger':
        return `${baseClasses} text-red-600 hover:bg-red-50`;
      case 'primary':
        return `${baseClasses} text-iiif-blue hover:bg-iiif-blue/10`;
      default:
        return `${baseClasses} text-slate-700 hover:bg-slate-100`;
    }
  };

  const getIconClasses = (item: ContextMenuItem) => {
    const baseClasses = 'text-lg';
    if (item.disabled) return `${baseClasses} text-slate-400`;
    
    switch (item.variant) {
      case 'danger':
        return `${baseClasses} text-red-400`;
      case 'primary':
        return `${baseClasses} text-iiif-blue`;
      default:
        return `${baseClasses} text-slate-400`;
    }
  };

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-[1000] 
        bg-white border border-slate-200 
        shadow-2xl rounded-xl py-2 min-w-[220px]
        animate-in fade-in zoom-in-95 duration-100
        ${className}
      `}
      style={{ 
        left: x, 
        top: y,
        maxHeight,
        overflowY: 'auto'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Selection count badge for multi-select */}
      {selectionCount > 1 && (
        <div className="px-3 py-1.5 mb-2 mx-1 bg-slate-100 rounded-lg">
          <span className="text-xs font-bold text-slate-600">
            {selectionCount} items selected
          </span>
        </div>
      )}

      {validSections.map((section, sectionIndex) => (
        <React.Fragment key={section.title || `section-${sectionIndex}`}>
          {/* Section divider (except before first section) */}
          {sectionIndex > 0 && (
            <div className="h-px bg-slate-200 my-1.5 mx-3" />
          )}

          {/* Section title */}
          {section.title && (
            <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {section.title}
            </div>
          )}

          {/* Section items */}
          <div className="px-1">
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className={getItemClasses(item)}
                title={item.description}
              >
                {item.icon && (
                  <Icon name={item.icon} className={getIconClasses(item)} />
                )}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Hook for managing context menu state
 */
export function useContextMenu() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    targetId: null
  });

  const open = useCallback((e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    open,
    close
  };
}

export default ContextMenu;
