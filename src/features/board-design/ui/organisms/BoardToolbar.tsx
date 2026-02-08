/**
 * BoardToolbar Organism
 *
 * Sidebar toolbar for the board-design feature.
 * Shows tool options and item actions.
 *
 * IDEAL OUTCOME: Quick access to tools and selected item actions
 * FAILURE PREVENTED: Unclear selection state, hard-to-find actions
 */

import React from 'react';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';

export interface BoardToolbarProps {
  /** Currently active tool */
  activeTool: 'select' | 'connect' | 'note';
  /** Called when tool changes */
  onToolChange: (tool: 'select' | 'connect' | 'note') => void;
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** Delete callback */
  onDelete: () => void;
  /** Group callback — creates a group from currently selected items */
  onGroup?: () => void;
  /** Whether grouping is available (needs selection) */
  canGroup?: boolean;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
  };
  /** Current field mode */
  fieldMode: boolean;
}

const tools = [
  {
    id: 'select' as const,
    icon: 'mouse',
    label: 'Select',
    shortcut: 'V',
  },
  {
    id: 'connect' as const,
    icon: 'timeline',
    label: 'Connect',
    shortcut: 'C',
  },
  {
    id: 'note' as const,
    icon: 'sticky_note_2',
    label: 'Note',
    shortcut: 'N',
  },
];

/**
 * BoardToolbar Organism
 */
export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  activeTool,
  onToolChange,
  selectedItemId,
  onDelete,
  onGroup,
  canGroup = false,
  cx: _cx,
  fieldMode: _fieldMode,
}) => {
  return (
    <div
      className={`
        w-16 flex flex-col items-center py-4 gap-2 border-r
        ${_fieldMode ? 'bg-nb-black border-nb-black/80' : 'bg-nb-white border-nb-black/20'}
      `}
    >
      {/* Tools */}
      {tools.map((tool) => (
        <IconButton
          key={tool.id}
          icon={tool.icon}
          ariaLabel={tool.label}
          onClick={() => onToolChange(tool.id)}
          variant="ghost"
          isActive={activeTool === tool.id}
          shortcut={tool.shortcut}
          size="md"
          className="w-10 h-10"
        />
      ))}

      {/* Divider */}
      <div className={`w-8 h-px my-2 ${_fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`} />

      {/* Selected Item Actions */}
      <IconButton
        icon="group_work"
        ariaLabel="Group selected items"
        onClick={canGroup ? onGroup || (() => {}) : () => {}}
        variant="ghost"
        disabled={!canGroup}
        shortcut="G"
        size="md"
        className="w-10 h-10"
      />

      <IconButton
        icon="delete"
        ariaLabel="Delete selected"
        onClick={selectedItemId ? onDelete : () => {}}
        variant="ghost"
        disabled={!selectedItemId}
        shortcut="Delete"
        size="md"
        className="w-10 h-10"
      />
    </div>
  );
};

export default BoardToolbar;
