/**
 * ViewContainer Molecule
 *
 * Composes: Header + filter input + view toggle + content area
 *
 * Standardized wrapper for views (archive, collections, etc).
 * Provides consistent header layout, filtering, and view mode switching.
 *
 * IDEAL OUTCOME: All views have consistent header with filter and view toggle
 * FAILURE PREVENTED: Inconsistent header layouts across different views
 */

import React from 'react';
import { Icon } from '../atoms';
import { SearchField } from './SearchField';
import { ViewToggle, ViewToggleOption } from './ViewToggle';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface ViewContainerProps {
  /** View title */
  title: string;
  /** Icon name for the view */
  icon: string;
  /** Optional filter configuration */
  filter?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Optional subtitle or status text */
  subtitle?: string;
  /** Action buttons for the header */
  actions?: React.ReactNode;
  /** View toggle buttons */
  viewToggle?: {
    options: ViewToggleOption[];
    value: string;
    onChange: (value: string) => void;
  };
  /** Children content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ViewContainer Molecule
 *
 * @example
 * <ViewContainer
 *   title="Archive"
 *   icon="inventory_2"
 *   filter={{ value: filter, onChange: setFilter }}
 *   viewToggle={{ value: mode, onChange: setMode, options: viewOptions }}
 * >
 *   <Grid items={items} />
 * </ViewContainer>
 */
export const ViewContainer: React.FC<ViewContainerProps> = ({
  title,
  icon,
  filter,
  subtitle,
  actions,
  viewToggle,
  children,
  className = '',
}) => {
  // No fieldMode prop — get from context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  return (
    <div
      className={`
        flex flex-col h-full overflow-hidden
        ${settings.fieldMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}
        ${className}
      `}
    >
      {/* Header */}
      <div
        className={`
          h-16 border-b px-6 flex items-center justify-between
          shadow-sm z-10 shrink-0
          ${
            settings.fieldMode
              ? 'bg-slate-900 border-slate-700'
              : 'bg-white border-slate-200'
          }
        `}
      >
        <div className="flex items-center gap-4">
          {/* Icon Badge */}
          <div
            className={`
              p-2 rounded-lg
              ${
                settings.fieldMode
                  ? 'bg-yellow-400/20 text-yellow-400'
                  : 'bg-iiif-blue/10 text-iiif-blue'
              }
            `}
          >
            <Icon name={icon} className="text-xl" aria-hidden="true" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2
              className={`
                font-bold
                ${
                  settings.fieldMode
                    ? 'text-xl text-yellow-400'
                    : 'text-lg text-slate-800'
                }
              `}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={`
                  text-xs
                  ${settings.fieldMode ? 'text-slate-500' : 'text-slate-500'}
                `}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Filter + View Toggle + Actions */}
        <div className="flex items-center gap-3">
          {/* Filter Input */}
          {filter && <SearchField value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} />}

          {/* View Toggle */}
          {viewToggle && (
            <ViewToggle
              value={viewToggle.value}
              onChange={viewToggle.onChange}
              options={viewToggle.options}
            />
          )}

          {/* Custom Actions */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
};

export default ViewContainer;
