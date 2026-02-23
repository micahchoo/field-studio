/**
 * ConflictPanel Molecule
 *
 * Collapsible banner showing conflict summary for pre-ingest scan.
 * Lists duplicate filenames with resolve options (Rename, Skip, Keep Both).
 *
 * @module features/staging/ui/molecules/ConflictPanel
 */

import React, { useCallback, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { cn } from '@/src/shared/lib/cn';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { ConflictReport, DuplicateEntry } from '../../model/useConflictDetection';
import type { NodeAnnotations } from '../../model';

export interface ConflictPanelProps {
  conflicts: ConflictReport;
  onExcludePath: (path: string) => void;
  onDismiss: () => void;
  cx?: Partial<ContextualClassNames>;
  fieldMode?: boolean;
}

const DuplicateItem: React.FC<{
  entry: DuplicateEntry;
  onExclude: (path: string) => void;
  cx?: Partial<ContextualClassNames>;
}> = ({ entry, onExclude, cx }) => (
  <div className={cn('py-2 px-3 border-b last:border-b-0', cx?.border ?? 'border-nb-black/5')}>
    <div className="flex items-center gap-2 mb-1">
      <Icon name="content_copy" className="text-sm text-nb-orange" />
      <span className={cn('text-xs font-medium', cx?.text ?? 'text-nb-black/70')}>{entry.name}</span>
      <span className={cn('text-[10px]', cx?.textMuted ?? 'text-nb-black/40')}>({entry.paths.length} copies)</span>
    </div>
    <div className="ml-5 space-y-0.5">
      {entry.paths.map((path, i) => (
        <div key={path} className="flex items-center justify-between group text-[11px]">
          <span className={cn('truncate flex-1', cx?.textMuted ?? 'text-nb-black/50')} title={path}>{path}</span>
          {i > 0 && (
            <Button
              variant="ghost"
              size="bare"
              onClick={() => onExclude(path)}
              className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] text-nb-orange hover:bg-nb-orange/10"
            >
              Skip
            </Button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  conflicts,
  onExcludePath,
  onDismiss,
  cx,
  fieldMode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!conflicts.hasConflicts) return null;

  return (
    <div className={cn('flex-shrink-0 border-b border-nb-orange/30', cx?.surface ?? 'bg-nb-orange/5')}>
      {/* Summary bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Icon name="warning" className="text-nb-orange" />
          <span className="text-xs font-medium text-nb-orange">
            {conflicts.duplicateNames.length} duplicate filename{conflicts.duplicateNames.length !== 1 ? 's' : ''} detected
          </span>
          <span className={cn('text-[10px]', cx?.textMuted ?? 'text-nb-black/40')}>
            ({conflicts.totalDuplicates} files total)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="bare"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn('px-2 py-1 text-[10px]', cx?.textMuted ?? 'text-nb-black/50', 'hover:bg-nb-cream')}
          >
            {isExpanded ? 'Collapse' : 'Details'}
          </Button>
          <Button
            variant="ghost"
            size="bare"
            onClick={onDismiss}
            className={cn('p-1 hover:bg-nb-cream', cx?.textMuted ?? 'text-nb-black/40')}
          >
            <Icon name="close" className="text-sm" />
          </Button>
        </div>
      </div>

      {/* Expanded list */}
      {isExpanded && (
        <div className={cn('max-h-40 overflow-y-auto border-t', cx?.border ?? 'border-nb-orange/20')}>
          {conflicts.duplicateNames.map(entry => (
            <DuplicateItem
              key={entry.name}
              entry={entry}
              onExclude={onExcludePath}
              cx={cx}
            />
          ))}
        </div>
      )}
    </div>
  );
};

ConflictPanel.displayName = 'ConflictPanel';
