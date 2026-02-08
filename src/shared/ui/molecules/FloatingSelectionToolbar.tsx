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
import { SelectionThumbnailStrip } from './SelectionThumbnailStrip';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/src/shared/types';

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
  position?:'top' |'bottom' |'near-selection';
}

type ActionGroup ='view' |'organize' |'create' |'navigate';

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  group: ActionGroup;
  variant?:'primary' |'secondary' |'ghost';
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
  position ='bottom',
}) => {
  const [expandedGroup, setExpandedGroup] = useState<ActionGroup | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const count = selectedItems.length;

  // Don't render if nothing selected
  if (count === 0) {
    return null;
  }

  const itemLabel = count === 1 ? t('Canvas') :`${t('Canvas')}s`;

  // Build action groups
  const actions: ActionItem[] = [
    // View actions
    ...(onOpenViewer ? [{
      id:'view',
      label:'View',
      icon:'visibility',
      onClick: onOpenViewer,
      group:'view' as ActionGroup,
      variant:'primary' as const,
      description:'Open in fullscreen viewer',
    }] : []),

    // Organize actions
    ...(onGroupIntoManifest ? [{
      id:'group',
      label:'Group',
      icon:'folder_special',
      onClick: onGroupIntoManifest,
      group:'organize' as ActionGroup,
      variant:'secondary' as const,
      description:`Create ${t('Manifest')} from selection`,
    }] : []),

    // Create actions
    ...(onComposeOnBoard ? [{
      id:'board',
      label:'Board',
      icon:'dashboard',
      onClick: onComposeOnBoard,
      group:'create' as ActionGroup,
      variant:'secondary' as const,
      description:'Add to composition board',
    }] : []),

    // Navigate actions (conditional)
    ...(onViewOnMap && hasGPS ? [{
      id:'map',
      label:'Map',
      icon:'explore',
      onClick: onViewOnMap,
      group:'navigate' as ActionGroup,
      variant:'ghost' as const,
      description:'View on geographic map',
    }] : []),

    // Metadata editing
    ...(onEditMetadata ? [{
      id:'metadata',
      label:'Edit',
      icon:'edit',
      onClick: onEditMetadata,
      group:'organize' as ActionGroup,
      variant:'secondary' as const,
      description:'Edit metadata',
    }] : []),
  ];

  const groupLabels: Record<ActionGroup, string> = {
    view:'View',
    organize:'Organize',
    create:'Create',
    navigate:'Navigate',
  };

  const positionClasses = {
    top:'top-4 left-1/2 -translate-x-1/2',
    bottom:'bottom-4 left-1/2 -translate-x-1/2',
'near-selection':'sticky bottom-4 mx-auto',
  };

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        max-w-4xl w-[calc(100%-2rem)] mx-4
        animate-in fade-in slide-in-from-bottom-4 
`}
      role="region"
      aria-label="Selection toolbar"
      aria-live="polite"
    >
      <div
        className={`
           shadow-brutal-lg border
          ${fieldMode ?'bg-nb-black border-nb-black/80' :'bg-nb-white border-nb-black/20'}
          overflow-hidden
`}
      >
        {/* Thumbnail strip */}
        {showThumbnails && selectedItems.length > 0 && (
          <SelectionThumbnailStrip
            selectedItems={selectedItems}
            count={count}
            itemLabel={itemLabel}
            onHide={() => setShowThumbnails(false)}
            fieldMode={fieldMode}
          />
        )}

        {/* Collapsed thumbnail toggle */}
        {!showThumbnails && (
          <Button variant="ghost" size="bare"
            onClick={() => setShowThumbnails(true)}
            className={`
              w-full p-2 flex items-center justify-center gap-2 text-xs
              border-b hover:bg-nb-black/5 transition-nb
              ${fieldMode ?'border-nb-black/80 text-nb-black/40' :'border-nb-black/10 text-nb-black/50'}
`}
          >
            <Icon name="expand_more" className="text-sm" />
            Show {count} selected
          </Button>
        )}

        {/* Action groups */}
        <div className="p-3">
          <div className="flex flex-col items-stretch gap-2">
            {/* Primary actions - always visible */}
            {actions
              .filter(a => a.variant ==='primary')
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
            {(['organize','create','navigate'] as ActionGroup[]).map(group => {
              const groupActions = actions.filter(a => a.group === group && a.variant !=='primary');
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
                        <Icon name={isExpanded ?'expand_less' :'expand_more'} className="text-sm ml-1" />
                      </Button>

                      {/* Dropdown for group actions */}
                      {isExpanded && (
                        <div
                          className={`
                            absolute bottom-full left-0 mb-2 min-w-[160px]
                             shadow-brutal border overflow-hidden
                            ${fieldMode ?'bg-nb-black border-nb-black/80' :'bg-nb-white border-nb-black/20'}
                            animate-in fade-in slide-in-from-bottom-2
`}
                          role="menu"
                        >
                          {groupActions.map(action => (
                            <Button variant="ghost" size="bare"
                              key={action.id}
                              onClick={() => {
                                action.onClick();
                                setExpandedGroup(null);
                              }}
                              disabled={action.disabled}
                              className={`
                                w-full flex items-center gap-3 px-4 py-3 text-left
                                transition-nb
                                ${fieldMode
                                  ?'hover:bg-nb-black/80 text-nb-black/20 disabled:text-nb-black/60'
                                  :'hover:bg-nb-white text-nb-black/80 disabled:text-nb-black/40'
                                }
`}
                              role="menuitem"
                            >
                              <Icon name={action.icon} className="text-sm opacity-70" />
                              <span className="text-sm">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Clear selection - always at end */}
            <div className={`h-px w-full my-1 ${fieldMode ?'bg-nb-black/80' :'bg-nb-cream'}`} />
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="close" className="text-sm" />}
              onClick={onClear}
              aria-label={`Clear selection of ${count} ${itemLabel}`}
              className="w-full justify-center"
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
