/**
 * TemplateItemPicker Molecule
 *
 * Two-step wizard: after selecting a board template, the user picks
 * which archive items to include. Shows a scrollable thumbnail grid
 * with toggle-selection + a spotlight preview panel for the focused item.
 *
 * @module features/board-design/ui/molecules/TemplateItemPicker
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { ModalDialog } from '@/src/shared/ui/molecules/ModalDialog';
import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
import { resolveHierarchicalThumb } from '@/utils/imageSourceResolver';
import type { BoardTemplate } from '../organisms/BoardOnboarding';

export interface TemplateItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  template: BoardTemplate;
  availableItems: IIIFItem[];
  onConfirm: (template: BoardTemplate, selectedItems: IIIFItem[]) => void;
  cx: {
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    border: string;
    headerBg: string;
  };
  fieldMode: boolean;
}

export const TemplateItemPicker: React.FC<TemplateItemPickerProps> = ({
  isOpen,
  onClose,
  template,
  availableItems,
  onConfirm,
  cx,
  fieldMode,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  // Pre-select first N items when modal opens
  useEffect(() => {
    if (isOpen && availableItems.length > 0) {
      const preselect = new Set(
        availableItems.slice(0, template.itemCount).map(item => item.id)
      );
      setSelectedIds(preselect);
      setSpotlightId(availableItems[0]?.id || null);
    }
  }, [isOpen, template.itemCount, availableItems]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(availableItems.map(item => item.id)));
  }, [availableItems]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = useMemo(
    () => availableItems.filter(item => selectedIds.has(item.id)),
    [availableItems, selectedIds]
  );

  const spotlightItem = useMemo(
    () => spotlightId ? availableItems.find(item => item.id === spotlightId) || null : null,
    [availableItems, spotlightId]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(template, selectedItems);
  }, [template, selectedItems, onConfirm]);

  const spotlightThumb = spotlightItem ? resolveHierarchicalThumb(spotlightItem, 600) : null;
  const spotlightLabel = spotlightItem ? (getIIIFValue(spotlightItem.label) || spotlightItem.id) : '';
  const spotlightSummary = spotlightItem ? getIIIFValue(spotlightItem.summary) : '';
  const spotlightIsSelected = spotlightId ? selectedIds.has(spotlightId) : false;

  // Gather metadata pairs for spotlight
  const spotlightMeta: Array<{ key: string; value: string }> = [];
  if (spotlightItem) {
    spotlightMeta.push({ key: 'Type', value: spotlightItem.type });
    if (spotlightItem.navDate) spotlightMeta.push({ key: 'Date', value: spotlightItem.navDate.split('T')[0] });
    if (spotlightItem.rights) spotlightMeta.push({ key: 'Rights', value: spotlightItem.rights });
    if (spotlightItem.metadata) {
      for (const pair of spotlightItem.metadata.slice(0, 4)) {
        const k = getIIIFValue(pair.label);
        const v = getIIIFValue(pair.value);
        if (k && v) spotlightMeta.push({ key: k, value: v });
      }
    }
  }

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={template.name}
      subtitle={`${template.description} — Recommended: ${template.itemCount} items`}
      icon="dashboard"
      iconColor="bg-nb-orange/20 text-nb-orange"
      size="xl"
      fieldMode={fieldMode}
      footer={
        <div className="flex items-center justify-between">
          <span className={`text-sm ${cx.textMuted}`}>
            {selectedIds.size} of {availableItems.length} items selected
          </span>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="bare"
              onClick={onClose}
              className={`px-4 py-2 font-medium transition-nb ${
                fieldMode ? 'text-nb-black/40 hover:text-nb-black/20' : 'text-nb-black/60 hover:text-nb-black'
              }`}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="bare"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`px-4 py-2 font-medium transition-nb ${
                selectedIds.size === 0
                  ? 'opacity-40 cursor-not-allowed bg-nb-orange/50 text-white'
                  : fieldMode
                    ? 'bg-nb-orange hover:bg-nb-orange text-white'
                    : 'bg-nb-orange hover:bg-nb-orange text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="dashboard" className="text-lg" />
                Create Board ({selectedIds.size})
              </span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-[400px]">
        {/* Left: Item grid */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-nb-black/10">
          {/* Bulk actions */}
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="bare"
              onClick={selectAll}
              className={`text-xs px-2 py-1 transition-nb ${
                fieldMode ? 'text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black' : 'text-nb-black/60 hover:text-nb-black hover:bg-nb-cream'
              }`}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="bare"
              onClick={selectNone}
              className={`text-xs px-2 py-1 transition-nb ${
                fieldMode ? 'text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black' : 'text-nb-black/60 hover:text-nb-black hover:bg-nb-cream'
              }`}
            >
              Select None
            </Button>
          </div>

          {/* Item grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {availableItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isSpotlit = spotlightId === item.id;
              const label = getIIIFValue(item.label) || item.id;
              const thumb = resolveHierarchicalThumb(item, 200);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  onMouseEnter={() => setSpotlightId(item.id)}
                  onFocus={() => setSpotlightId(item.id)}
                  className={`relative group text-left p-1.5 border transition-nb cursor-pointer ${
                    isSpotlit
                      ? fieldMode
                        ? 'ring-2 ring-nb-orange border-nb-orange'
                        : 'ring-2 ring-nb-orange border-nb-orange'
                      : ''
                  } ${
                    isSelected
                      ? 'border-nb-blue bg-nb-blue/10'
                      : fieldMode
                        ? 'border-nb-black/70 hover:border-nb-blue/60 hover:bg-nb-black'
                        : 'border-nb-black/10 hover:border-nb-blue/40 hover:bg-nb-cream bg-nb-white'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className={`aspect-square mb-1 overflow-hidden flex items-center justify-center ${
                    fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
                  }`}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Icon name="image" className={`text-xl ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/30'}`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className={`text-[10px] leading-tight truncate ${isSelected ? 'font-medium' : ''} ${cx.text}`} title={label}>
                    {label}
                  </div>

                  {/* Selection indicator */}
                  <div className={`absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center transition-nb ${
                    isSelected ? 'bg-nb-blue text-white' : `${fieldMode ? 'bg-nb-black/80 text-nb-black/40' : 'bg-nb-white border border-nb-black/20 text-transparent'} group-hover:border-nb-blue/40`
                  }`}>
                    {isSelected && <Icon name="check" className="text-xs" />}
                  </div>
                </button>
              );
            })}
          </div>

          {availableItems.length === 0 && (
            <div className={`text-center py-12 ${cx.textMuted}`}>
              <Icon name="photo_library" className="text-4xl mb-2" />
              <p>No items in archive yet. Import some files first.</p>
            </div>
          )}
        </div>

        {/* Right: Spotlight preview */}
        <div className={`w-[280px] shrink-0 flex flex-col ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream/50'}`}>
          {spotlightItem ? (
            <>
              {/* Large thumbnail */}
              <div className={`aspect-square overflow-hidden flex items-center justify-center ${
                fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
              }`}>
                {spotlightThumb ? (
                  <img
                    src={spotlightThumb}
                    alt={spotlightLabel}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Icon name="image" className={`text-5xl ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/20'}`} />
                )}
              </div>

              {/* Item details */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* Label */}
                <h3 className={`text-sm font-bold mb-1 ${cx.text}`}>{spotlightLabel}</h3>

                {/* Summary */}
                {spotlightSummary && (
                  <p className={`text-xs mb-3 line-clamp-3 ${cx.textMuted}`}>{spotlightSummary}</p>
                )}

                {/* Metadata fields */}
                <div className="space-y-1.5">
                  {spotlightMeta.map((m, i) => (
                    <div key={i}>
                      <dt className={`text-[10px] uppercase tracking-wider font-semibold ${cx.textMuted}`}>{m.key}</dt>
                      <dd className={`text-xs truncate ${cx.text}`} title={m.value}>{m.value}</dd>
                    </div>
                  ))}
                </div>

                {/* Selection toggle */}
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="bare"
                    onClick={() => spotlightId && toggleItem(spotlightId)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-nb border ${
                      spotlightIsSelected
                        ? 'bg-nb-blue/20 border-nb-blue text-nb-blue'
                        : fieldMode
                          ? 'border-nb-black/70 text-nb-black/40 hover:border-nb-blue/60'
                          : 'border-nb-black/20 text-nb-black/60 hover:border-nb-blue/40'
                    }`}
                  >
                    <Icon name={spotlightIsSelected ? 'check_circle' : 'radio_button_unchecked'} className="text-sm" />
                    {spotlightIsSelected ? 'Selected' : 'Select for board'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-center p-4 text-center ${cx.textMuted}`}>
              <div>
                <Icon name="touch_app" className="text-3xl mb-2" />
                <p className="text-xs">Hover an item to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};

export default TemplateItemPicker;
