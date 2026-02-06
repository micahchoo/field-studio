
import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { ValidationIssue } from '../services/validator';
import { useSharedSelection } from '../hooks/useSharedSelection';

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
  
  const statusColor = errorCount > 0 ? 'text-red-500' : warningCount > 0 ? 'text-amber-500' : 'text-green-500';
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
    <div className="h-7 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 text-[11px] text-slate-400 select-none z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-slate-200 cursor-pointer transition-colors" title="Total items in archive">
            <Icon name="inventory_2" className="text-[14px]" />
            <span>{totalItems} Items</span>
        </div>
        
        {showSelectionCount && hasMultiSelection && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <Icon name="check_box" className="text-[14px] text-iiif-blue" />
            <span className="text-iiif-blue font-medium">{effectiveSelectionCount} selected</span>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="ml-1 hover:text-white transition-colors"
                title="Clear selection"
              >
                <Icon name="close" className="text-[12px]" />
              </button>
            )}
          </div>
        )}
        
        {selectedItem && !hasMultiSelection && (
             <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-slate-300">
                <Icon name="check_circle" className="text-[14px] text-green-500" />
                <span className="truncate max-w-[200px]">Selected: {getIIIFValue(selectedItem.label, 'none') || 'Untitled'}</span>
            </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 px-3 border-r border-slate-800" title="Project Save Status">
            {saveStatus === 'saving' && <Icon name="sync" className="text-[14px] animate-spin text-blue-400"/>}
            {saveStatus === 'saved' && <Icon name="cloud_done" className="text-[14px] text-slate-500"/>}
            {saveStatus === 'error' && <Icon name="cloud_off" className="text-[14px] text-red-500"/>}
            <span className={saveStatus === 'error' ? 'text-red-500' : saveStatus === 'saving' ? 'text-blue-400' : 'text-slate-500'}>
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
        
        <div className="pl-3 border-l border-slate-800 flex items-center gap-2" title={storageUsage ? `${formatBytes(storageUsage.usage)} / ${formatBytes(storageUsage.quota)}` : 'Storage unknown'}>
             <span>Storage</span>
             <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-slate-500'}`} 
                    style={{ width: `${usagePercent}%` }}
                 ></div>
             </div>
             {storageUsage && <span className="text-[9px]">{formatBytes(storageUsage.usage)}</span>}
        </div>
      </div>
    </div>
  );
};
