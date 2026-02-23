/**
 * GroupedArchiveGrid Molecule
 *
 * Renders canvases grouped by parent manifest with collapsible sections.
 * Each section has a manifest header with collapse toggle and item count.
 *
 * @module features/archive/ui/molecules/GroupedArchiveGrid
 */

import React, { useCallback, useState } from 'react';
import { getIIIFValue, type IIIFCanvas } from '@/src/shared/types';
import { type ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { type ManifestGroup, getFileDNA } from '../../model';
import { BlurUpThumbnail } from './BlurUpThumbnail';
import type { GridDensity } from '../organisms/ArchiveGrid';

export interface GroupedArchiveGridProps {
  groups: ManifestGroup[];
  isSelected: (id: string) => boolean;
  onItemClick: (e: React.MouseEvent, asset: IIIFCanvas) => void;
  onToggleSelect?: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    textMuted: string;
    [key: string]: string | undefined;
  };
  fieldMode: boolean;
  density?: GridDensity;
}

export const GroupedArchiveGrid: React.FC<GroupedArchiveGridProps> = ({
  groups,
  isSelected,
  onItemClick,
  onToggleSelect,
  onContextMenu,
  validationIssues,
  cx,
  fieldMode,
  density = 'comfortable',
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((manifestId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(manifestId)) next.delete(manifestId);
      else next.add(manifestId);
      return next;
    });
  }, []);

  const gridColsClass = fieldMode
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  const densityClasses = {
    compact: 'gap-2',
    comfortable: 'gap-4',
    spacious: 'gap-6',
  };

  const paddingClasses = {
    compact: 'p-1',
    comfortable: 'p-2',
    spacious: 'p-3',
  };

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className={`text-lg font-medium ${cx.text} mb-2`}>No groups found</div>
        <p className={`text-sm ${cx.textMuted}`}>Your archive has no manifests to group by.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.manifestId);

        return (
          <div key={group.manifestId}>
            {/* Section header */}
            <Button
              variant="ghost"
              size="bare"
              onClick={() => toggleCollapse(group.manifestId)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 mb-3 border transition-nb ${
                fieldMode
                  ? 'bg-nb-yellow/10 border-nb-yellow/30 hover:bg-nb-yellow/20'
                  : 'bg-nb-cream/50 border-nb-black/10 hover:bg-nb-cream'
              }`}
            >
              <Icon
                name={isCollapsed ? 'chevron_right' : 'expand_more'}
                className={`text-lg transition-transform ${
                  fieldMode ? 'text-nb-yellow' : 'text-nb-black/50'
                }`}
              />
              <Icon
                name="auto_stories"
                className={`text-sm ${fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/40'}`}
              />
              <span className={`text-sm font-bold flex-1 text-left truncate ${
                fieldMode ? 'text-nb-yellow' : cx.text
              }`}>
                {group.manifestLabel}
              </span>
              <span className={`text-xs font-mono px-2 py-0.5 ${
                fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-black/5 text-nb-black/50'
              }`}>
                {group.canvases.length}
              </span>
            </Button>

            {/* Grid content */}
            {!isCollapsed && (
              <div className={`grid ${densityClasses[density]} ${gridColsClass}`}>
                {group.canvases.map((asset) => {
                  const selected = isSelected(asset.id);
                  const thumbUrls = resolveHierarchicalThumbs(asset, 200);
                  const config = RESOURCE_TYPE_CONFIG['Canvas'];

                  return (
                    <div
                      key={asset.id}
                      data-grid-item
                      data-item-id={asset.id}
                      onClick={(e) => onItemClick(e, asset)}
                      onContextMenu={(e) => onContextMenu(e, asset.id)}
                      className={`
                        group relative transition-nb cursor-pointer
                        ${paddingClasses[density]}
                        ${selected
                          ? 'bg-nb-orange/20 border-2 border-nb-orange shadow-brutal-sm'
                          : 'bg-nb-black border border-nb-black/20 hover:shadow-brutal hover:border-nb-black/20'
                        }
                      `}
                    >
                      <div className="aspect-square overflow-hidden flex items-center justify-center mb-2 relative bg-nb-black">
                        {selected && (
                          <div className="absolute inset-0 bg-nb-orange/10 z-10 pointer-events-none" />
                        )}
                        {/* Validation dot */}
                        {validationIssues?.[asset.id] && (
                          <div className="absolute top-2 left-2 z-20" title={`${validationIssues[asset.id].length} issue(s)`}>
                            <div className={`w-2.5 h-2.5 rounded-full shadow-brutal-sm ${
                              validationIssues[asset.id].some(i => i.level === 'error') ? 'bg-nb-red' : 'bg-nb-orange'
                            }`} />
                          </div>
                        )}
                        {/* Checkmark */}
                        <Button variant="ghost" size="bare"
                          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(asset.id); }}
                          className={`absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center transition-nb shadow-brutal-sm cursor-pointer ${
                            selected
                              ? fieldMode ? 'bg-nb-yellow text-white scale-100' : 'bg-nb-orange text-white scale-100'
                              : 'bg-nb-white/90 text-nb-black/40 scale-0 group-hover:scale-100 hover:bg-nb-cream'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </Button>

                        {thumbUrls.length <= 1 ? (
                          <BlurUpThumbnail
                            lowResUrl={resolveHierarchicalThumbs(asset, 50)[0] || ''}
                            highResUrl={thumbUrls[0] || ''}
                            fallbackIcon={config.icon}
                            cx={cx}
                            fieldMode={fieldMode}
                          />
                        ) : (
                          <img
                            src={thumbUrls[0]}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="px-1 min-w-0 h-6 flex items-center">
                        <div className={`text-nb-xs font-medium truncate ${cx.text ?? 'text-nb-black'}`} title={getIIIFValue(asset.label)}>
                          {getIIIFValue(asset.label)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedArchiveGrid;
