/**
 * ViewContainer Molecule
 *
 * Composes: Header + filter input + view toggle + content area
 *
 * Wraps any view with consistent layout, search/filter capabilities,
 * and view mode toggling. Fieldmode-aware theming throughout.
 *
 * IDEAL OUTCOME: Consistent view layout with integrated search and mode switching
 * FAILURE PREVENTED: Inconsistent view headers, missing search/filter patterns
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '../atoms';
import { SearchField } from './SearchField';
import { ViewToggle, type ViewToggleOption } from './ViewToggle';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ViewContainerProps {
  /** View title */
  title?: string;
  /** Icon name for header */
  icon?: string;
  /** Main content */
  children: React.ReactNode;
  /** Optional search/filter configuration */
  filter?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Optional view mode toggle configuration */
  viewToggle?: {
    value: string;
    onChange: (value: string) => void;
    options: ViewToggleOption[];
  };
  /** Optional header actions (buttons, etc.) */
  headerActions?: React.ReactNode;
  /** Optional custom header component (replaces default header) */
  header?: React.ReactNode;
  /** Additional CSS classes for container */
  className?: string;
  /** Additional CSS classes for content area */
  contentClassName?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * ViewContainer Molecule
 *
 * @example
 * <ViewContainer
 *   title="Archive"
 *   icon="inventory_2"
 *   filter={{ value: filter, onChange: setFilter, placeholder: "Search items..." }}
 *   viewToggle={{
 *     value: viewMode,
 *     onChange: setViewMode,
 *     options: [
 *       { value: 'grid', icon: 'grid_view', label: 'Grid' },
 *       { value: 'list', icon: 'list', label: 'List' },
 *     ]
 *   }}
 *   headerActions={<Button onClick={onCreate}>Create</Button>}
 * >
 *   <Grid items={items} />
 * </ViewContainer>
 */
const defaultCx: ContextualClassNames = {
  surface: 'bg-white dark:bg-slate-900',
  text: 'text-slate-900 dark:text-slate-100',
  accent: 'text-blue-600 dark:text-blue-400',
};

export const ViewContainer: React.FC<ViewContainerProps> = ({
  title,
  icon,
  children,
  filter,
  viewToggle,
  headerActions,
  header,
  className = '',
  contentClassName = '',
  cx = defaultCx,
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  const hasHeader = header || title || icon || filter || viewToggle || headerActions;

  return (
    <div
      className={`
        flex flex-col h-full
        ${cx.surface}
        rounded-lg overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      {hasHeader && (
        header ? (
          // Use custom header if provided
          header
        ) : (
          <div
            className={`
              flex items-center gap-4
              px-4 py-3
              border-b ${cx.border}
              ${cx.headerBg}
            `}
          >
            {/* Title */}
            {(title || icon) && (
              <div className="flex items-center gap-2 min-w-0">
                {icon && (
                  <Icon
                    name={icon}
                    className={`${cx.text} text-xl flex-shrink-0`}
                    aria-hidden="true"
                  />
                )}
                {title && (
                  <h2 className={`${cx.headingSize} ${cx.text} font-semibold truncate`}>
                    {title}
                  </h2>
                )}
              </div>
            )}

            {/* Filter/Search */}
            {filter && (
              <div className="flex-shrink-0">
                <SearchField
                  value={filter.value}
                  onChange={filter.onChange}
                  placeholder={filter.placeholder || 'Search...'}
                  showClear
                  cx={cx}
                  fieldMode={fieldMode}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* View Toggle */}
            {viewToggle && (
              <ViewToggle
                value={viewToggle.value}
                onChange={viewToggle.onChange}
                options={viewToggle.options}
                cx={cx}
                fieldMode={fieldMode}
              />
            )}

            {/* Header Actions */}
            {headerActions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        )
      )}

      {/* Content */}
      <div
        className={`
          flex-1 overflow-auto
          ${contentClassName}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewContainer;
