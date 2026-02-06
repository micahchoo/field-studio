/**
 * ResizablePanel - Consistent resizable panel component
 *
 * Provides organized, intentional, and consistent panel behavior across:
 * - Sidebar (left panel)
 * - Inspector (right panel)
 * - Split panes (horizontal/vertical dividers)
 *
 * Features:
 * - Drag handle with visual feedback
 * - Keyboard accessible
 * - Touch friendly
 * - Collapse/expand support
 * - Persistence to localStorage
 * - Consistent styling across the app
 */

import React, { forwardRef } from 'react';
import { ResizablePanelConfig, useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { Icon } from '@/src/shared/ui/atoms/Icon';

// ============================================================================
// Types
// ============================================================================

export interface ResizablePanelProps {
  /** Panel configuration */
  config: Omit<ResizablePanelConfig, 'onCollapse' | 'onExpand'>;
  /** Panel content */
  children: React.ReactNode;
  /** Additional CSS classes for the panel container */
  className?: string;
  /** Whether the panel is visible (external control) */
  visible?: boolean;
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Whether to show the collapse button */
  showCollapseButton?: boolean;
  /** Custom collapse button content */
  collapseButtonContent?: React.ReactNode;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Aria label for the panel */
  'aria-label'?: string;
}

export interface ResizeHandleProps {
  /** Direction of resize */
  direction: 'horizontal' | 'vertical';
  /** Which side the handle is on */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Whether resize is in progress */
  isResizing: boolean;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Props from useResizablePanel */
  handleProps: ReturnType<typeof useResizablePanel>['handleProps'];
}

// ============================================================================
// ResizeHandle Component
// ============================================================================

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  side,
  isResizing,
  fieldMode = false,
  handleProps,
}) => {
  const isHorizontal = direction === 'horizontal';
  const isLeft = side === 'left';
  const isRight = side === 'right';
  const isTop = side === 'top';
  const isBottom = side === 'bottom';

  // Position classes
  const positionClasses = isHorizontal
    ? isLeft
      ? 'left-0 top-0 bottom-0 -ml-1'
      : 'right-0 top-0 bottom-0 -mr-1'
    : isTop
      ? 'top-0 left-0 right-0 -mt-1'
      : 'bottom-0 left-0 right-0 -mb-1';

  // Size classes
  const sizeClasses = isHorizontal
    ? 'w-2 cursor-col-resize'
    : 'h-2 cursor-row-resize';

  // Visual indicator classes
  const indicatorClasses = isHorizontal
    ? 'w-1 h-8 rounded-full'
    : 'h-1 w-8 rounded-full';

  const baseColor = fieldMode
    ? 'bg-slate-700 group-hover:bg-yellow-400 group-focus:bg-yellow-400'
    : 'bg-slate-300 group-hover:bg-iiif-blue group-focus:bg-iiif-blue';

  const activeColor = fieldMode
    ? 'bg-yellow-400'
    : 'bg-iiif-blue';

  return (
    <div
      {...handleProps}
      className={`
        absolute z-30 group
        ${positionClasses}
        ${sizeClasses}
        flex items-center justify-center
        transition-colors duration-150
        hover:bg-slate-500/10
        focus:outline-none focus:bg-slate-500/10
        ${handleProps.className}
      `}
      style={{
        ...handleProps.style,
      }}
    >
      {/* Visual drag indicator */}
      <div
        className={`
          ${indicatorClasses}
          ${isResizing ? activeColor : baseColor}
          transition-all duration-150
          opacity-0 group-hover:opacity-100 group-focus:opacity-100
          ${isResizing ? 'opacity-100 scale-110' : ''}
        `}
      />
      {/* Expanded hit area for touch */}
      <div
        className={`
          absolute
          ${isHorizontal ? 'w-4 h-full' : 'w-full h-4'}
        `}
      />
    </div>
  );
};

// ============================================================================
// ResizablePanel Component
// ============================================================================

export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>(
  (
    {
      config,
      children,
      className = '',
      visible = true,
      onVisibilityChange,
      showCollapseButton = false,
      collapseButtonContent,
      fieldMode = false,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const {
      size,
      isCollapsed,
      isResizing,
      toggleCollapse,
      expand,
      collapse,
      handleProps,
      panelStyle,
    } = useResizablePanel({
      ...config,
      onCollapse: () => onVisibilityChange?.(false),
      onExpand: () => onVisibilityChange?.(true),
    });

    // External visibility control
    React.useEffect(() => {
      if (visible && isCollapsed) {
        expand();
      } else if (!visible && !isCollapsed) {
        collapse();
      }
    }, [visible, isCollapsed, expand, collapse]);

    const { direction, side } = config;
    const isHorizontal = direction === 'horizontal';

    // Container positioning for resize handle
    const containerStyle: React.CSSProperties = {
      ...panelStyle,
      position: 'relative',
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
    };

    // Determine handle position based on side
    const showHandle = !isCollapsed || config.collapseThreshold;

    return (
      <div
        ref={ref}
        className={`resizable-panel resizable-panel-${side} ${className}`}
        style={containerStyle}
        aria-label={ariaLabel || `${config.id} panel`}
        aria-expanded={!isCollapsed}
        data-panel-id={config.id}
        data-collapsed={isCollapsed}
        data-resizing={isResizing}
      >
        {/* Panel content */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Resize handle */}
        {showHandle && (
          <ResizeHandle
            direction={direction}
            side={side}
            isResizing={isResizing}
            fieldMode={fieldMode}
            handleProps={handleProps}
          />
        )}

        {/* Collapse button (optional) */}
        {showCollapseButton && (
          <button
            onClick={toggleCollapse}
            className={`
              absolute z-40
              ${side === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' : ''}
              ${side === 'right' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' : ''}
              ${side === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
              ${side === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
              w-6 h-6 rounded-full
              flex items-center justify-center
              transition-all duration-200
              ${fieldMode
                ? 'bg-slate-800 text-yellow-400 border border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-400 border border-slate-200 shadow-sm hover:text-slate-600 hover:shadow-md'
              }
            `}
            aria-label={isCollapsed ? `Expand ${config.id}` : `Collapse ${config.id}`}
          >
            {collapseButtonContent || (
              <Icon
                name={
                  isCollapsed
                    ? side === 'left' ? 'chevron_right' : side === 'right' ? 'chevron_left' : side === 'top' ? 'expand_more' : 'expand_less'
                    : side === 'left' ? 'chevron_left' : side === 'right' ? 'chevron_right' : side === 'top' ? 'expand_less' : 'expand_more'
                }
                className="text-xs"
              />
            )}
          </button>
        )}
      </div>
    );
  }
);

ResizablePanel.displayName = 'ResizablePanel';

// ============================================================================
// SplitPane Component - For horizontal/vertical split layouts
// ============================================================================

export interface SplitPaneProps {
  /** Unique ID for persistence */
  id: string;
  /** Split direction */
  direction: 'horizontal' | 'vertical';
  /** Primary (first) pane content */
  primary: React.ReactNode;
  /** Secondary (second) pane content */
  secondary: React.ReactNode;
  /** Default size of primary pane in pixels */
  defaultSize?: number;
  /** Minimum size of primary pane */
  minSize?: number;
  /** Maximum size of primary pane */
  maxSize?: number;
  /** Additional CSS classes */
  className?: string;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether primary pane is collapsible */
  collapsible?: boolean;
  /** Collapse threshold in pixels */
  collapseThreshold?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  id,
  direction,
  primary,
  secondary,
  defaultSize = 280,
  minSize = 180,
  maxSize = 600,
  className = '',
  fieldMode = false,
  collapsible = true,
  collapseThreshold = 0,
}) => {
  const {
    size,
    isCollapsed,
    isResizing,
    handleProps,
  } = useResizablePanel({
    id: `split-${id}`,
    defaultSize,
    minSize,
    maxSize,
    direction,
    side: direction === 'horizontal' ? 'right' : 'bottom',
    collapseThreshold: collapsible ? collapseThreshold : 0,
    persist: true,
  });

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`
        flex ${isHorizontal ? 'flex-row' : 'flex-col'}
        h-full w-full
        ${className}
      `}
      data-split-pane={id}
    >
      {/* Primary pane */}
      <div
        className="overflow-hidden shrink-0"
        style={{
          [isHorizontal ? 'width' : 'height']: isCollapsed ? 0 : size,
          transition: isResizing ? 'none' : 'width 200ms ease, height 200ms ease',
        }}
      >
        {primary}
      </div>

      {/* Resize handle */}
      <div
        {...handleProps}
        className={`
          relative shrink-0 group
          ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
          ${fieldMode ? 'bg-slate-800' : 'bg-slate-200'}
          hover:${fieldMode ? 'bg-yellow-400' : 'bg-iiif-blue'}
          transition-colors duration-150
          ${isResizing ? (fieldMode ? 'bg-yellow-400' : 'bg-iiif-blue') : ''}
          ${handleProps.className}
        `}
        style={{
          ...handleProps.style,
        }}
      >
        {/* Visual indicator */}
        <div
          className={`
            absolute
            ${isHorizontal ? 'left-0 top-1/2 -translate-y-1/2 w-1 h-12' : 'top-0 left-1/2 -translate-x-1/2 h-1 w-12'}
            rounded-full
            ${fieldMode ? 'bg-yellow-400/0 group-hover:bg-yellow-400' : 'bg-iiif-blue/0 group-hover:bg-iiif-blue'}
            ${isResizing ? (fieldMode ? 'bg-yellow-400' : 'bg-iiif-blue') : ''}
            transition-colors duration-150
          `}
        />
      </div>

      {/* Secondary pane */}
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {secondary}
      </div>
    </div>
  );
};

// ============================================================================
// Panel Layout Constants
// ============================================================================

export const PANEL_DEFAULTS = {
  sidebar: {
    id: 'sidebar',
    defaultSize: 256,
    minSize: 200,
    maxSize: 400,
    direction: 'horizontal' as const,
    side: 'right' as const,
    collapseThreshold: 100,
  },
  inspector: {
    id: 'inspector',
    defaultSize: 320,
    minSize: 280,
    maxSize: 480,
    direction: 'horizontal' as const,
    side: 'left' as const,
    collapseThreshold: 200,
  },
  collectionsTree: {
    id: 'collections-tree',
    defaultSize: 280,
    minSize: 200,
    maxSize: 500,
    direction: 'horizontal' as const,
    side: 'right' as const,
    collapseThreshold: 100,
  },
};

export default ResizablePanel;
