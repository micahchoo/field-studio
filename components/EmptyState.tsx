/**
 * EmptyState - Standardized empty state component
 * 
 * Provides consistent empty state UI across all views following
 * the iiif-component skill patterns.
 */

import React from 'react';
import { Icon } from './Icon';

export interface EmptyStateProps {
  /** Icon name from the Icon component */
  icon: string;
  /** Main title/message */
  title: string;
  /** Optional secondary message */
  message?: string;
  /** Optional action button */
  action?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
  /** Visual variant */
  variant?: 'default' | 'field-mode';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardized empty state component for use across all views
 * 
 * @example
 * <EmptyState 
 *   icon="inventory_2"
 *   title="No items found"
 *   message="Try adjusting your filters"
 * />
 * 
 * @example
 * <EmptyState 
 *   icon="create_new_folder"
 *   title="No collections yet"
 *   action={{ label: "Create Collection", onClick: handleCreate }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  variant = 'default',
  className = ''
}) => {
  const isFieldMode = variant === 'field-mode';

  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        min-h-[300px] p-8
        ${isFieldMode ? 'text-slate-500' : 'text-slate-400'}
        ${className}
      `}
    >
      <Icon 
        name={icon} 
        className={`
          text-6xl mb-4 
          ${isFieldMode ? 'opacity-30' : 'opacity-20'}
        `}
      />
      
      <p className={`
        font-bold uppercase tracking-widest text-xs
        ${isFieldMode ? 'text-yellow-400' : 'text-slate-600'}
      `}>
        {title}
      </p>
      
      {message && (
        <p className={`
          text-sm mt-2 max-w-md text-center
          ${isFieldMode ? 'text-slate-400' : 'text-slate-500'}
        `}>
          {message}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={`
            mt-6 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            flex items-center gap-2
            ${isFieldMode 
              ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
              : 'bg-iiif-blue text-white hover:bg-iiif-blue/90'
            }
          `}
        >
          {action.icon && <Icon name={action.icon} className="text-sm" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
