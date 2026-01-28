/**
 * SelectionToolbar - Standardized selection toolbar component
 * 
 * Provides consistent selection UI for ArchiveView, CollectionsView,
 * and other views that support multi-selection.
 */

import React from 'react';
import { Icon } from './Icon';

export interface SelectionToolbarAction {
  /** Icon name from the Icon component */
  icon: string;
  /** Action label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'danger';
  /** Whether the action is disabled */
  disabled?: boolean;
}

export interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Clear selection handler */
  onClear: () => void;
  /** Action buttons */
  actions: SelectionToolbarAction[];
  /** Toolbar position variant */
  position?: 'header' | 'floating' | 'bottom';
  /** Field mode styling */
  fieldMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardized selection toolbar component
 * 
 * @example
 * <SelectionToolbar
 *   count={selectedIds.size}
 *   onClear={() => clearSelection()}
 *   actions={[
 *     { icon: "auto_stories", label: "Group", onClick: handleGroup },
 *     { icon: "delete", label: "Delete", variant: "danger", onClick: handleDelete }
 *   ]}
 * />
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  onClear,
  actions,
  position = 'header',
  fieldMode = false,
  className = ''
}) => {
  if (count === 0) return null;

  const isFloating = position === 'floating';
  const isBottom = position === 'bottom';

  const variantClasses = {
    default: fieldMode 
      ? 'text-white hover:bg-slate-700' 
      : 'text-slate-600 hover:bg-slate-100',
    primary: fieldMode 
      ? 'text-yellow-400 hover:bg-slate-700' 
      : 'text-iiif-blue hover:bg-slate-100',
    danger: fieldMode 
      ? 'text-red-400 hover:bg-red-500/20' 
      : 'text-red-600 hover:bg-red-50'
  };

  if (isFloating) {
    return (
      <div 
        className={`
          absolute z-[100] animate-in slide-in-from-bottom-4 duration-300 
          bottom-8 left-4 right-4 translate-x-0
          ${className}
        `}
      >
        <div className={`
          backdrop-blur-md border shadow-2xl rounded-2xl p-1 
          flex items-center gap-1 ring-4 ring-black/10 
          overflow-x-auto no-scrollbar max-w-full
          ${fieldMode 
            ? 'bg-slate-900/95 border-slate-700' 
            : 'bg-slate-900/95 border-slate-700'
          }
        `}>
          <div className="flex p-1 gap-1 shrink-0">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl transition-all 
                  whitespace-nowrap text-white group
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${variantClasses[action.variant || 'default']}
                `}
              >
                <Icon 
                  name={action.icon} 
                  className={`
                    ${action.variant === 'primary' ? 'text-yellow-400' : ''}
                    ${action.variant === 'danger' ? 'text-red-400' : ''}
                    ${!action.variant ? 'text-green-400' : ''}
                  `} 
                />
                <div className="text-left">
                  <div className="text-xs font-bold">{action.label}</div>
                </div>
              </button>
            ))}

            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            
            <button 
              onClick={onClear}
              className="p-3 text-slate-500 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBottom) {
    return (
      <div 
        className={`
          h-14 border-t flex items-center justify-between px-4 
          shrink-0 shadow-lg
          ${fieldMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
          }
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${fieldMode ? 'text-white' : 'text-slate-700'}`}>
            {count} selected
          </span>
          <button
            onClick={onClear}
            className={`text-xs ${fieldMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Clear selection
          </button>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold 
                rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[action.variant || 'default']}
              `}
            >
              <Icon name={action.icon} className="text-sm" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Header position (default)
  return (
    <div 
      className={`
        w-full px-6 py-2 border-b z-10 animate-in slide-in-from-top-2 
        flex items-center gap-4
        ${fieldMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-slate-800 border-slate-700'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-white">
          {count} selected
        </span>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 
              hover:bg-slate-700 rounded-lg transition-all 
              text-white text-xs font-medium whitespace-nowrap
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Icon 
              name={action.icon} 
              className={`
                text-sm
                ${action.variant === 'primary' ? 'text-green-400' : ''}
                ${action.variant === 'danger' ? 'text-red-400' : ''}
                ${!action.variant ? 'text-blue-400' : ''}
              `} 
            />
            {action.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1"></div>
      
      <button 
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
        title="Clear selection"
      >
        <Icon name="close" className="text-sm" />
      </button>
    </div>
  );
};

export default SelectionToolbar;
