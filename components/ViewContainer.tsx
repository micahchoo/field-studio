/**
 * ViewContainer - Standardized view wrapper component
 * 
 * Provides consistent header, filter, and layout structure
 * across all views following the iiif-component skill patterns.
 */

import React from 'react';
import { Icon } from './Icon';

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
    options: Array<{
      value: string;
      icon: string;
      label?: string;
    }>;
    value: string;
    onChange: (value: string) => void;
  };
  /** Field mode styling */
  fieldMode?: boolean;
  /** Children content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardized view container component
 * 
 * @example
 * <ViewContainer
 *   title="Archive"
 *   icon="inventory_2"
 *   filter={{ value: filter, onChange: setFilter, placeholder: "Filter items..." }}
 *   actions={<button>Create</button>}
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
  fieldMode = false,
  children,
  className = ''
}) => {
  return (
    <div 
      className={`
        flex flex-col h-full overflow-hidden
        ${fieldMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}
        ${className}
      `}
    >
      {/* Header */}
      <div 
        className={`
          h-16 border-b px-6 flex items-center justify-between 
          shadow-sm z-10 shrink-0
          ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}
        `}
      >
        <div className="flex items-center gap-4">
          <div className={`
            p-2 rounded-lg
            ${fieldMode ? 'bg-yellow-400/20 text-yellow-400' : 'bg-iiif-blue/10 text-iiif-blue'}
          `}>
            <Icon name={icon} className="text-xl" />
          </div>
          <div>
            <h2 className={`font-bold ${fieldMode ? 'text-xl text-yellow-400' : 'text-lg text-slate-800'}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Input */}
          {filter && (
            <div className="relative">
              <Icon 
                name="search" 
                className={`
                  absolute left-3 top-2.5 text-lg
                  ${fieldMode ? 'text-slate-500' : 'text-slate-400'}
                `} 
              />
              <input
                type="text"
                placeholder={filter.placeholder || "Filter..."}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className={`
                  pl-10 pr-3 py-2 border rounded-md text-sm outline-none transition-all w-64
                  ${fieldMode 
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' 
                    : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'
                  }
                `}
              />
            </div>
          )}

          {/* View Toggle */}
          {viewToggle && (
            <div className={`flex p-1 rounded-md ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              {viewToggle.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => viewToggle.onChange(option.value)}
                  title={option.label || option.value}
                  className={`
                    p-2 rounded transition-all
                    ${viewToggle.value === option.value 
                      ? (fieldMode 
                          ? 'bg-yellow-400 text-black font-bold' 
                          : 'bg-white text-iiif-blue shadow-sm')
                      : 'text-slate-400 hover:text-slate-600'
                    }
                  `}
                >
                  <Icon name={option.icon} />
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ViewContainer;
