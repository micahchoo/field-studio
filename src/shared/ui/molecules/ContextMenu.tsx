/**
 * ContextMenu Molecule
 *
 * Comprehensive right-click menu component with sections and rich items.
 * Provides organized sections, icons, keyboard shortcuts, and support for
 * both single and multi-selection contexts.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no context
 * - Internal state only (positioning via refs)
 * - Composes: ContextMenuSection, ContextMenuSelectionBadge
 * - Uses Icon atom
 *
 * IDEAL OUTCOME: Accessible, positioned context menus with clear sections
 * FAILURE PREVENTED: Menus going off-screen, missing keyboard support
 *
 * @module shared/ui/molecules/ContextMenu
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ContextMenuSection } from './ContextMenuSection';
import { ContextMenuSelectionBadge } from './ContextMenuSelectionBadge';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

// Re-export types from sub-components for backwards compatibility
export type { ContextMenuItemProps as ContextMenuItem } from './ContextMenuItem';
export type { ContextMenuSectionProps as ContextMenuSection } from './ContextMenuSection';

// Keep interfaces here for backwards compatibility
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

export interface ContextMenuSectionType {
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
  sections: ContextMenuSectionType[];
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
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode (unused, kept for API compatibility) */
  fieldMode?: boolean;
}

/**
 * ContextMenu Component
 *
 * Positioned context menu with sections and keyboard support.
 *
 * @example
 * <ContextMenu
 *   x={100}
 *   y={200}
 *   isOpen={true}
 *   onClose={() => setOpen(false)}
 *   sections={[
 *     {
 *       items: [
 *         { id: 'open', label: 'Open', icon: 'visibility', onClick: () => {} },
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
  selectionCount = 1,
  cx = {},
  fieldMode: _fieldMode = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return undefined;

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
    if (!isOpen) return undefined;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Calculate position to keep menu on screen
  const computePosition = useCallback(() => {
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
      const pos = computePosition();
      menuRef.current.style.left = `${pos.x}px`;
      menuRef.current.style.top = `${pos.y}px`;
    }
  }, [isOpen, computePosition]);

  if (!isOpen) return null;

  // Filter out empty sections
  const validSections = sections.filter((section) => section.items.some((item) => !item.disabled));

  if (validSections.length === 0) return null;

  // Fallback background if cx.surface is not defined or transparent
  const bgClass = cx.surface || 'bg-white';
  const borderClass = cx.border || 'border-slate-200';

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-[1000]
        ${bgClass}
        ${borderClass}
        border shadow-2xl rounded-xl py-2 min-w-[220px]
        animate-in fade-in zoom-in-95 duration-100
        ${className}
      `}
      style={{
        left: x,
        top: x,
        maxHeight,
        overflowY: 'auto',
      }}
      onContextMenu={(e) => e.preventDefault()}
      role="menu"
    >
      {/* Selection count badge for multi-select */}
      <ContextMenuSelectionBadge count={selectionCount} cx={cx} />

      {/* Menu sections */}
      {validSections.map((section, sectionIndex) => (
        <ContextMenuSection
          key={section.title || `section-${sectionIndex}`}
          title={section.title}
          items={section.items}
          showDivider={sectionIndex > 0}
          cx={cx}
          onItemClick={() => onClose()}
        />
      ))}
    </div>
  );
};

export default ContextMenu;
