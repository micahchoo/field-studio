
import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useSharedSelection } from '@/src/shared/lib/hooks/useSharedSelection';

interface StatusBarProps {
  totalItems: number;
  selectedItem: IIIFItem | null;
  validationIssues: ValidationIssue[];
  storageUsage: { usage: number; quota: number } | null;
  onOpenQC: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
  /** Optional external selection state (if not using global shared selection) */
  selectionCount?: number;
  /** Show cross-view selection count */
  showSelectionCount?: boolean;
  /** Callback to clear selection */
  onClearSelection?: () => void;
}

const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const StatusBar: React.FC<StatusBarProps> = ({
  totalItems,
  selectedItem,
  validationIssues,
  storageUsage,
  onOpenQC,
  saveStatus,
  selectionCount,
  showSelectionCount = true,
  onClearSelection
}) => {
  const errorCount = validationIssues.filter(i => i.level === 'error').length;
  const warningCount = validationIssues.filter(i => i.level === 'warning').length;
  
  const statusColor = errorCount > 0 ? 'text-nb-red' : warningCount > 0 ? 'text-nb-orange' : 'text-nb-green';
  const statusIcon = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'verified';
  const statusText = errorCount > 0 ? `${errorCount} Errors` : warningCount > 0 ? `${warningCount} Warnings` : 'IIIF Valid';

  const usagePercent = storageUsage && storageUsage.quota > 0
    ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)
    : 0;

  // Try to get selection from shared hook if not provided externally
  let sharedSelectionCount = 0;
  try {
    const sharedSelection = useSharedSelection();
    sharedSelectionCount = sharedSelection.count;
  } catch {
    // Hook not available in context, use prop
  }
  
  const effectiveSelectionCount = selectionCount ?? sharedSelectionCount;
  const hasMultiSelection = effectiveSelectionCount > 0;

  return (
    <div className="h-7 bg-nb-black border-t border-nb-black flex items-center justify-between px-3 text-[11px] text-nb-black/40 select-none z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-nb-black/20 cursor-pointer transition-nb" title="Total items in archive">
            <Icon name="inventory_2" className="text-[14px]" />
            <span>{totalItems} Items</span>
        </div>
        
        {showSelectionCount && hasMultiSelection && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-nb-black">
            <Icon name="check_box" className="text-[14px] text-iiif-blue" />
            <span className="text-iiif-blue font-medium">{effectiveSelectionCount} selected</span>
            {onClearSelection && (
              <Button variant="ghost" size="bare"
                onClick={onClearSelection}
                className="ml-1 hover:text-white transition-nb"
                title="Clear selection"
              >
                <Icon name="close" className="text-[12px]" />
              </Button>
            )}
          </div>
        )}
        
        {selectedItem && !hasMultiSelection && (
             <div className="flex items-center gap-1.5 pl-3 border-l border-nb-black text-nb-black/30">
                <Icon name="check_circle" className="text-[14px] text-nb-green" />
                <span className="truncate max-w-[200px]">Selected: {getIIIFValue(selectedItem.label, 'none') || 'Untitled'}</span>
            </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 px-3 border-r border-nb-black" title="Project Save Status">
            {saveStatus === 'saving' && <Icon name="sync" className="text-[14px] animate-spin text-nb-blue"/>}
            {saveStatus === 'saved' && <Icon name="cloud_done" className="text-[14px] text-nb-black/50"/>}
            {saveStatus === 'error' && <Icon name="cloud_off" className="text-[14px] text-nb-red"/>}
            <span className={saveStatus === 'error' ? 'text-nb-red' : saveStatus === 'saving' ? 'text-nb-blue' : 'text-nb-black/50'}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save Failed' : 'Saved'}
            </span>
        </div>

        <div 
            className={`flex items-center gap-1.5 font-medium cursor-pointer hover:underline ${statusColor}`}
            title="Click to open QC Dashboard"
            onClick={onOpenQC}
        >
            <Icon name={statusIcon} className="text-[14px]" />
            <span>{statusText}</span>
        </div>
        
        <div className="pl-3 border-l border-nb-black flex items-center gap-2" title={storageUsage ? `${formatBytes(storageUsage.usage)} / ${formatBytes(storageUsage.quota)}` : 'Storage unknown'}>
             <span>Storage</span>
             <div className="w-16 h-1.5 bg-nb-black overflow-hidden">
                 <div 
                    className={`h-full ${usagePercent > 80 ? 'bg-nb-red' : usagePercent > 50 ? 'bg-nb-orange' : 'bg-nb-black/40'}`} 
                    style={{ width: `${usagePercent}%` }}
                 ></div>
             </div>
             {storageUsage && <span className="text-[9px]">{formatBytes(storageUsage.usage)}</span>}
        </div>
      </div>
    </div>
  );
};
