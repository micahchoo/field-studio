import React, { useMemo } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';

interface StatusBarProps {
  totalItems: number;
  selectedItem: IIIFItem | null;
  validationIssues: ValidationIssue[];
  storageUsage: { usage: number; quota: number } | null;
  onOpenQC: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
  selectionCount?: number;
  showSelectionCount?: boolean;
  onClearSelection?: () => void;
  quickHelpOpen?: boolean;
  onToggleQuickHelp?: () => void;
  onOpenKeyboardShortcuts?: () => void;
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
  onClearSelection,
  quickHelpOpen,
  onToggleQuickHelp,
  onOpenKeyboardShortcuts,
}) => {
  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0, warnings = 0;
    for (const issue of validationIssues) {
      if (issue.level === 'error') errors++;
      else if (issue.level === 'warning') warnings++;
    }
    return { errorCount: errors, warningCount: warnings };
  }, [validationIssues]);

  const usagePercent = storageUsage && storageUsage.quota > 0
    ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)
    : 0;

  const effectiveSelectionCount = selectionCount ?? 0;
  const hasMultiSelection = effectiveSelectionCount > 0;

  return (
    <div className="h-status-bar bg-nb-cream border-t-4 border-nb-black flex items-center justify-between px-4 font-mono text-nb-xs font-bold uppercase tracking-wider text-nb-black select-none z-50">
      <div className="flex items-center gap-4">
        {/* Items count */}
        <div className="flex items-center gap-1.5" title={`${totalItems} items in archive`}>
          <span>ITEMS:</span>
          <span className="text-nb-blue">{totalItems}</span>
        </div>

        {showSelectionCount && hasMultiSelection && (
          <div className="flex items-center gap-1.5 pl-3 border-l-2 border-nb-black">
            <span>SELECTED:</span>
            <span className="text-nb-blue">{effectiveSelectionCount}</span>
            {onClearSelection && (
              <Button variant="ghost" size="bare"
                onClick={onClearSelection}
                className="ml-1 text-nb-red hover:bg-nb-red hover:text-nb-white p-0.5 transition-nb"
                title="Clear selection"
              >
                <Icon name="close" className="text-[12px]" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Save Status */}
        <div className="flex items-center gap-1.5 px-3 border-r-2 border-nb-black" title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save Failed' : 'Saved'}>
          {saveStatus === 'saving' && <><div className="w-2 h-2 bg-nb-blue" style={{ animation: 'savePulse 0.5s linear infinite' }} /><span>SAVING</span></>}
          {saveStatus === 'saved' && <><div className="w-2 h-2 bg-nb-green" /><span>SAVED</span></>}
          {saveStatus === 'error' && <><div className="w-2 h-2 bg-nb-red" /><span>ERROR</span></>}
        </div>

        {/* Validation */}
        {(errorCount + warningCount) > 0 && (
          <div
            className={`flex items-center gap-1 cursor-pointer transition-nb px-2 py-0.5 border-2 ${errorCount > 0 ? 'border-nb-red text-nb-red bg-nb-red/10' : 'border-nb-orange text-nb-orange bg-nb-orange/10'}`}
            title="Open QC Dashboard"
            onClick={onOpenQC}
          >
            <span>ERRORS: {errorCount}</span>
          </div>
        )}

        {/* Storage */}
        <div className="pl-3 border-l-2 border-nb-black flex items-center gap-2" title={storageUsage ? `Storage: ${formatBytes(storageUsage.usage)} / ${formatBytes(storageUsage.quota)}` : 'Storage unknown'}>
          <span>STORAGE:</span>
          <div className="w-16 h-2 bg-nb-cream border-2 border-nb-black overflow-hidden">
            <div
              className={`h-full ${usagePercent > 80 ? 'bg-nb-red' : usagePercent > 50 ? 'bg-nb-orange' : 'bg-nb-green'}`}
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
          {storageUsage && <span className="text-nb-micro">{formatBytes(storageUsage.usage)}</span>}
        </div>

        {/* Help */}
        <div className="pl-3 border-l-2 border-nb-black flex items-center gap-2">
          {onOpenKeyboardShortcuts && (
            <Button variant="ghost" size="bare"
              onClick={onOpenKeyboardShortcuts}
              className="flex items-center gap-1 hover:bg-nb-black hover:text-nb-white px-1 py-0.5 transition-nb"
              title="Keyboard Shortcuts (?)"
            >
              <Icon name="keyboard" className="text-[14px]" />
            </Button>
          )}
          {onToggleQuickHelp && (
            <Button variant="ghost" size="bare"
              onClick={onToggleQuickHelp}
              className={`flex items-center px-1 py-0.5 transition-nb ${quickHelpOpen ? 'bg-nb-blue text-nb-white' : 'hover:bg-nb-black hover:text-nb-white'}`}
              title="Quick Help"
            >
              <Icon name="help_outline" className="text-[14px]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
