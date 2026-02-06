/**
 * FloatingSelectionToolbar Molecule
 *
 * Composes: Thumbnail strip + action buttons + selection count
 *
 * Appears near selected items (not at top of screen), providing
 * contextual bulk actions with visual connection to selection.
 *
 * COMMUNICATIVE DESIGN:
 * - Floats near selection to maintain spatial relationship
 * - Shows thumbnail previews of selected items
 * - Groups actions by intent (view, organize, create)
 * - Uses progressive disclosure for advanced actions
 *
 * IDEAL OUTCOME: Users always know what's selected and what they can do
 * FAILURE PREVENTED: Spatial disconnect between selection and actions
 */

import React, { useState } from 'react';
import { Button, Icon } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/types';

export interface FloatingSelectionToolbarProps {
  /** Selected canvas items */
  selectedItems: IIIFCanvas[];
  /** Action handlers */
  onClear: () => void;
  onOpenViewer?: () => void;
  onEditMetadata?: () => void;
  onGroupIntoManifest?: () => void;
  onComposeOnBoard?: () => void;
  onViewOnMap?: () => void;
  /** Whether GPS data is available in selection */
  hasGPS?: boolean;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Terminology function */
  t: (key: string) => string;
  /** Current field mode */
  fieldMode?: boolean;
  /** Position relative to viewport (for floating behavior) */
  position?: 'top' | 'bottom' | 'near-selection';
}

type ActionGroup = 'view' | 'organize' | 'create' | 'navigate';

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  group: ActionGroup;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  description?: string;
}

/**
 * FloatingSelectionToolbar Molecule
 *
 * @example
 * <FloatingSelectionToolbar
 *   selectedItems={selectedCanvases}
 *   onClear={() => setSelectedIds([])}
 *   onOpenViewer={handleOpenViewer}
 *   onEditMetadata={handleEditMetadata}
 *   cx={cx}
 *   t={t}
 * />
 */
export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  selectedItems,
  onClear,
  onOpenViewer,
  onEditMetadata,
  onGroupIntoManifest,
  onComposeOnBoard,
  onViewOnMap,
  hasGPS = false,
  cx,
  t,
  fieldMode = false,
  position = 'bottom',
}) => {
  const [expandedGroup, setExpandedGroup] = useState<ActionGroup | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const count = selectedItems.length;

  // Don't render if nothing selected
  if (count === 0) {
    return null;
  }

  const itemLabel = count === 1 ? t('Canvas') : `${t('Canvas')}s`;

  // Build action groups
  const actions: ActionItem[] = [
    // View actions
    ...(onOpenViewer ? [{
      id: 'view',
      label: 'View',
      icon: 'visibility',
      onClick: onOpenViewer,
      group: 'view' as ActionGroup,
      variant: 'primary' as const,
      description: 'Open in fullscreen viewer',
    }] : []),

    // Organize actions
    ...(onGroupIntoManifest ? [{
      id: 'group',
      label: 'Group',
      icon: 'folder_special',
      onClick: onGroupIntoManifest,
      group: 'organize' as ActionGroup,
      variant: 'secondary' as const,
      description: `Create ${t('Manifest')} from selection`,
    }] : []),

    // Create actions
    ...(onComposeOnBoard ? [{
      id: 'board',
      label: 'Board',
      icon: 'dashboard',
      onClick: onComposeOnBoard,
      group: 'create' as ActionGroup,
      variant: 'secondary' as const,
      description: 'Add to composition board',
    }] : []),

    // Navigate actions (conditional)
    ...(onViewOnMap && hasGPS ? [{
      id: 'map',
      label: 'Map',
      icon: 'explore',
      onClick: onViewOnMap,
      group: 'navigate' as ActionGroup,
      variant: 'ghost' as const,
      description: 'View on geographic map',
    }] : []),

    // Metadata editing
    ...(onEditMetadata ? [{
      id: 'metadata',
      label: 'Edit',
      icon: 'edit',
      onClick: onEditMetadata,
      group: 'organize' as ActionGroup,
      variant: 'secondary' as const,
      description: 'Edit metadata',
    }] : []),
  ];

  const groupLabels: Record<ActionGroup, string> = {
    view: 'View',
    organize: 'Organize',
    create: 'Create',
    navigate: 'Navigate',
  };

  const positionClasses = {
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    'near-selection': 'sticky bottom-4 mx-auto',
  };

  // Get thumbnails for first 5 selected items
  const visibleThumbnails = selectedItems.slice(0, 5);
  const remainingCount = Math.max(0, count - 5);

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        max-w-4xl w-[calc(100%-2rem)] mx-4
        animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
      role="region"
      aria-label="Selection toolbar"
      aria-live="polite"
    >
      <div
        className={`
          rounded-2xl shadow-2xl border
          ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}
          overflow-hidden
        `}
      >
        {/* Thumbnail strip */}
        {showThumbnails && visibleThumbnails.length > 0 && (
          <div
            className={`
              flex items-center gap-2 p-3 border-b
              ${fieldMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}
            `}
          >
            <div className="flex items-center gap-1">
              {visibleThumbnails.map((item, idx) => (
                <div
                  key={item.id}
                  className={`
                    w-10 h-10 rounded-lg overflow-hidden border-2
                    ${fieldMode ? 'border-slate-600' : 'border-white shadow-sm'}
                    ${idx === 0 ? 'ring-2 ring-blue-500' : ''}
                  `}
                  title={item.label?.en?.[0] || item.id}
                >
                  {item.thumbnail?.[0]?.id ? (
                    <img
                      src={item.thumbnail[0].id}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <Icon name="image" className="text-xs opacity-50" />
                    </div>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium
                    ${fieldMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}
                  `}
                >
                  +{remainingCount}
                </div>
              )}
            </div>

            <div className={`h-8 w-px mx-2 ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

            {/* Selection count */}
            <div className="flex items-center gap-2">
              <Icon name="check_circle" className={`text-sm ${fieldMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`font-medium ${fieldMode ? 'text-white' : 'text-slate-900'}`}>
                {count} {itemLabel}
              </span>
            </div>

            <button
              onClick={() => setShowThumbnails(false)}
              className={`
                ml-auto p-1 rounded hover:bg-black/10 transition-colors
                ${fieldMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}
              `}
              aria-label="Hide thumbnails"
            >
              <Icon name="expand_less" className="text-sm" />
            </button>
          </div>
        )}

        {/* Collapsed thumbnail toggle */}
        {!showThumbnails && (
          <button
            onClick={() => setShowThumbnails(true)}
            className={`
              w-full p-2 flex items-center justify-center gap-2 text-xs
              border-b hover:bg-black/5 transition-colors
              ${fieldMode ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}
            `}
          >
            <Icon name="expand_more" className="text-sm" />
            Show {count} selected
          </button>
        )}

        {/* Action groups */}
        <div className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary actions - always visible */}
            {actions
              .filter(a => a.variant === 'primary')
              .map(action => (
                <Button
                  key={action.id}
                  variant="primary"
                  size="sm"
                  icon={<Icon name={action.icon} className="text-sm" />}
                  onClick={action.onClick}
                  title={action.description}
                >
                  {action.label}
                </Button>
              ))}

            {/* Secondary actions - grouped */}
            {(['organize', 'create', 'navigate'] as ActionGroup[]).map(group => {
              const groupActions = actions.filter(a => a.group === group && a.variant !== 'primary');
              if (groupActions.length === 0) return null;

              const isExpanded = expandedGroup === group;

              return (
                <div key={group} className="relative">
                  {groupActions.length === 1 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Icon name={groupActions[0].icon} className="text-sm" />}
                      onClick={groupActions[0].onClick}
                      title={groupActions[0].description}
                    >
                      {groupActions[0].label}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Icon name={groupActions[0].icon} className="text-sm" />}
                        onClick={() => setExpandedGroup(isExpanded ? null : group)}
                        aria-expanded={isExpanded}
                        aria-haspopup="menu"
                      >
                        {groupLabels[group]}
                        <Icon name={isExpanded ? 'expand_less' : 'expand_more'} className="text-sm ml-1" />
                      </Button>

                      {/* Dropdown for group actions */}
                      {isExpanded && (
                        <div
                          className={`
                            absolute bottom-full left-0 mb-2 min-w-[160px]
                            rounded-xl shadow-xl border overflow-hidden
                            ${fieldMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}
                            animate-in fade-in slide-in-from-bottom-2
                          `}
                          role="menu"
                        >
                          {groupActions.map(action => (
                            <button
                              key={action.id}
                              onClick={() => {
                                action.onClick();
                                setExpandedGroup(null);
                              }}
                              disabled={action.disabled}
                              className={`
                                w-full flex items-center gap-3 px-4 py-3 text-left
                                transition-colors
                                ${fieldMode
                                  ? 'hover:bg-slate-700 text-slate-200 disabled:text-slate-600'
                                  : 'hover:bg-slate-50 text-slate-700 disabled:text-slate-400'
                                }
                              `}
                              role="menuitem"
                            >
                              <Icon name={action.icon} className="text-sm opacity-70" />
                              <span className="text-sm">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Clear selection - always at end */}
            <div className={`h-6 w-px mx-1 ${fieldMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="close" className="text-sm" />}
              onClick={onClear}
              aria-label={`Clear selection of ${count} ${itemLabel}`}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingSelectionToolbar;
