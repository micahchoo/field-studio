/**
 * EmptyState - Standardized empty state component
 *
 * Provides consistent empty state UI across all views following
 * the iiif-component skill patterns.
 *
 * i18n Support:
 * When FEATURE_FLAGS.USE_I18N is true, uses translation keys.
 * Falls back to hardcoded strings for backward compatibility.
 */

import React from 'react';
import { Icon } from './Icon';
import { FEATURE_FLAGS } from '../constants';
import { useTranslation } from 'react-i18next';

/**
 * Translation keys for EmptyState presets
 * Used when i18n is enabled
 */
export const EMPTY_STATE_KEYS = {
  NO_ITEMS: 'emptyStates.noItems',
  NO_RESULTS: 'emptyStates.noResults',
  NO_SELECTION: 'emptyStates.noSelection',
  ERROR: 'emptyStates.error',
  LOADING: 'emptyStates.loading',
  NO_DATA: 'emptyStates.noData'
} as const;

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

interface EmptyStatePresetOptions {
  onAction?: () => void;
  onRetry?: () => void;
}

interface EmptyStatePresetResult {
  icon: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
}

/**
 * i18n-enabled preset for common empty states
 * Automatically uses translations when USE_I18N is enabled
 *
 * @example
 * <EmptyState {...emptyStatePresets.noItems({ onAction: handleAdd })} />
 */
export const emptyStatePresets: Record<string, (options?: EmptyStatePresetOptions) => EmptyStatePresetResult> = {
  noItems: (options) => ({
    icon: 'inbox',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noItems.title' : 'No Items',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noItems.message' : 'This area is empty. Add items to get started.',
    action: options?.onAction ? {
      label: FEATURE_FLAGS.USE_I18N ? 'app.create' : 'Add Item',
      icon: 'add',
      onClick: options.onAction
    } : undefined
  }),
  
  noResults: (options) => ({
    icon: 'search_off',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noResults.title' : 'No Results',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noResults.message' : 'No items match your search. Try different terms or filters.',
    action: options?.onAction ? {
      label: FEATURE_FLAGS.USE_I18N ? 'actions.clearSearch' : 'Clear Filters',
      onClick: options.onAction
    } : undefined
  }),
  
  noSelection: () => ({
    icon: 'touch_app',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noSelection.title' : 'Nothing Selected',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noSelection.message' : 'Select an item from the list to view details and edit.'
  }),
  
  error: (options) => ({
    icon: 'error_outline',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.error.title' : 'Something Went Wrong',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.error.message' : 'We encountered an error. Please try again or contact support.',
    action: options?.onRetry ? {
      label: FEATURE_FLAGS.USE_I18N ? 'actions.retry' : 'Retry',
      icon: 'refresh',
      onClick: options.onRetry
    } : undefined
  }),
  
  loading: () => ({
    icon: 'hourglass_empty',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.loading.title' : 'Loading...',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.loading.message' : 'Please wait while we load your data.'
  }),
  
  noData: (options) => ({
    icon: 'cloud_upload',
    title: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noData.title' : 'No Data Yet',
    message: FEATURE_FLAGS.USE_I18N ? 'emptyStates.noData.message' : 'Import files or create new items to populate this view.',
    action: options?.onAction ? {
      label: FEATURE_FLAGS.USE_I18N ? 'actions.import' : 'Import',
      icon: 'upload_file',
      onClick: options.onAction
    } : undefined
  })
};

/**
 * Hook to get translated empty state props
 * Use this when FEATURE_FLAGS.USE_I18N is true
 *
 * @example
 * const emptyStateProps = useEmptyStateTranslation('noItems', { onAction: handleAdd });
 * return <EmptyState {...emptyStateProps} />;
 */
export function useEmptyStateTranslation(
  preset: keyof typeof emptyStatePresets,
  options?: EmptyStatePresetOptions
): EmptyStatePresetResult {
  const { t } = useTranslation();
  const presetFn = emptyStatePresets[preset];
  const props = presetFn(options);
  
  return {
    icon: props.icon,
    title: FEATURE_FLAGS.USE_I18N ? t(props.title) : props.title,
    message: props.message ? (FEATURE_FLAGS.USE_I18N ? t(props.message) : props.message) : undefined,
    action: props.action ? {
      label: FEATURE_FLAGS.USE_I18N ? t(props.action.label) : props.action.label,
      icon: props.action.icon,
      onClick: props.action.onClick
    } : undefined
  };
}

export default EmptyState;
