import React, { useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { IIIFItem } from '@/src/shared/types';
import { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import type { DetailedStorageEstimate } from '@/src/shared/services/storage';

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
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  lastActionLabel?: string | null;
  // Network status
  isOnline?: boolean;
  // Activity feed
  activityCount?: number;
  onOpenActivityFeed?: () => void;
  // Storage breakdown
  storageDetail?: DetailedStorageEstimate | null;
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastActionLabel,
  isOnline,
  activityCount,
  onOpenActivityFeed,
  storageDetail,
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

  const [showStorageTooltip, setShowStorageTooltip] = useState(false);

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

        {/* Undo/Redo */}
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-1 pl-3 border-l-2 border-nb-black">
            {onUndo && (
              <Button variant="ghost" size="bare"
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-0.5 transition-nb ${canUndo ? 'hover:bg-nb-black hover:text-nb-white' : 'opacity-30 cursor-not-allowed'}`}
                title="Undo (Ctrl+Z)"
              >
                <Icon name="undo" className="text-[14px]" />
              </Button>
            )}
            {onRedo && (
              <Button variant="ghost" size="bare"
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-0.5 transition-nb ${canRedo ? 'hover:bg-nb-black hover:text-nb-white' : 'opacity-30 cursor-not-allowed'}`}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Icon name="redo" className="text-[14px]" />
              </Button>
            )}
            {lastActionLabel && (
              <span className="text-nb-micro text-nb-black/50 ml-1 max-w-[120px] truncate normal-case" title={lastActionLabel}>
                {lastActionLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Network Status */}
        {isOnline !== undefined && (
          <div className="flex items-center gap-1.5 px-3 border-r-2 border-nb-black" title={isOnline ? 'Online' : 'Offline — changes are saved locally'}>
            <div
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-nb-green' : 'bg-nb-red'}`}
              style={!isOnline ? { animation: 'savePulse 1s ease-in-out infinite' } : undefined}
            />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        )}

        {/* Save Status */}
        <div className="flex items-center gap-1.5 px-3 border-r-2 border-nb-black" title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save Failed' : 'Saved'}>
          {saveStatus === 'saving' && <><div className="w-2 h-2 bg-nb-blue" style={{ animation: 'savePulse 0.5s linear infinite' }} /><span>SAVING</span></>}
          {saveStatus === 'saved' && <><div className="w-2 h-2 bg-nb-green" /><span>SAVED</span></>}
          {saveStatus === 'error' && <><div className="w-2 h-2 bg-nb-red" /><span>ERROR</span></>}
        </div>

        {/* Activity Feed Badge */}
        {onOpenActivityFeed && (
          <Button variant="ghost" size="bare"
            onClick={onOpenActivityFeed}
            className="flex items-center gap-1 hover:bg-nb-black hover:text-nb-white px-1 py-0.5 transition-nb relative"
            title="Activity feed"
          >
            <Icon name="notifications" className="text-[14px]" />
            {activityCount != null && activityCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-nb-red text-nb-white text-[8px] flex items-center justify-center font-bold">
                {activityCount > 99 ? '99+' : activityCount}
              </span>
            )}
          </Button>
        )}

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

        {/* Storage with tooltip */}
        <div
          className="pl-3 border-l-2 border-nb-black flex items-center gap-2 relative"
          onMouseEnter={() => setShowStorageTooltip(true)}
          onMouseLeave={() => setShowStorageTooltip(false)}
        >
          <span>STORAGE:</span>
          <div className="w-16 h-2 bg-nb-cream border-2 border-nb-black overflow-hidden">
            <div
              className={`h-full ${usagePercent > 80 ? 'bg-nb-red' : usagePercent > 50 ? 'bg-nb-orange' : 'bg-nb-green'}`}
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
          {storageUsage && <span className="text-nb-micro">{formatBytes(storageUsage.usage)}</span>}

          {/* Storage Breakdown Tooltip */}
          {showStorageTooltip && storageDetail && (
            <div className="absolute bottom-full right-0 mb-2 bg-nb-cream border-2 border-nb-black shadow-brutal-sm p-3 min-w-[220px] z-[100] normal-case">
              <div className="text-[10px] font-bold mb-2 uppercase">Storage Breakdown</div>
              <div className="flex flex-col gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className="font-bold">{formatBytes(storageDetail.usage)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quota:</span>
                  <span className="font-bold">{formatBytes(storageDetail.quota)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Persistent:</span>
                  <span className={`font-bold ${storageDetail.persistent ? 'text-nb-green' : 'text-nb-orange'}`}>
                    {storageDetail.persistent ? 'YES' : 'NO'}
                  </span>
                </div>
                {Object.entries(storageDetail.stores).length > 0 && (
                  <>
                    <div className="border-t border-nb-black/20 my-1" />
                    <div className="text-[9px] font-bold uppercase mb-0.5">Stores</div>
                    {Object.entries(storageDetail.stores).map(([name, info]) => (
                      <div key={name} className="flex justify-between text-[9px]">
                        <span className="truncate mr-2">{name}:</span>
                        <span>{info.keys} keys</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
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
