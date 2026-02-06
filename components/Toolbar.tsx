/**
 * Toolbar - Sidebar footer with organized action groups
 *
 * Layout (top to bottom):
 * - Import Actions (Folder + Remote side by side)
 * - Primary Action (Export - full width, prominent)
 * - Utility Actions (Help + Settings + Field mode toggle)
 */

import React from 'react';
import { Icon } from './Icon';
import { AbstractionLevelToggle } from './AbstractionLevelToggle';
import type { AbstractionLevel } from '../types';
import { FEATURE_FLAGS } from '../constants/features';
import { useAppSettings } from '@/src/app/providers/useAppSettings';
import { useContextualStyles } from '@/hooks/useContextualStyles';

export interface ToolbarProps {
  /** @deprecated No longer needed - theme from context */
  fieldMode?: boolean;
  /** Import handler for local folder */
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Import handler for remote manifests */
  onOpenExternalImport: () => void;
  /** Export handler */
  onExportTrigger: () => void;
  /** Settings handler */
  onOpenSettings: () => void;
  /** Field mode toggle */
  onToggleFieldMode: () => void;
  /** Quick help toggle */
  onToggleQuickHelp?: () => void;
  /** Current abstraction level (for toggle) */
  abstractionLevel?: AbstractionLevel;
  /** Handler for abstraction level changes */
  onAbstractionLevelChange?: (level: AbstractionLevel) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Organized sidebar toolbar with logical action groupings
 *
 * Layout:
 * - Import: Folder + Remote (side by side)
 * - Actions: Export (prominent primary action)
 * - Settings: Help + Settings + Field Mode (side by side)
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onImport,
  onOpenExternalImport,
  onExportTrigger,
  onOpenSettings,
  onToggleFieldMode,
  onToggleQuickHelp,
  abstractionLevel = 'standard',
  onAbstractionLevelChange,
  className = ''
}) => {
  // Get theme from context - no prop-drilling
  const { settings, updateSettings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  const showAbstractionToggle = FEATURE_FLAGS.USE_SIMPLIFIED_UI && onAbstractionLevelChange;

  // Handle field mode toggle through settings
  const handleToggleFieldMode = () => {
    updateSettings({ fieldMode: !settings.fieldMode });
    onToggleFieldMode();
  };

  const { fieldMode } = settings;

  // Section label styling - subtle, consistent hierarchy
  const sectionLabelClass = `text-[10px] font-medium text-slate-500 mb-2 ${cx.textMuted}`;

  // Import buttons - secondary actions, side by side
  const importButtonClass = `
    flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg 
    border transition-all duration-150 text-xs font-medium
    ${fieldMode
      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-600'
      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'
    }
  `;

  // Primary action - Export, full width, high contrast
  const primaryButtonClass = `
    w-full py-3 rounded-lg text-sm font-semibold
    flex items-center justify-center gap-2 
    shadow-lg shadow-black/20
    transition-all duration-150 active:scale-[0.98]
    ${fieldMode
      ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/20'
      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
    }
  `;

  // Utility buttons - small, icon-only with labels
  const utilityButtonClass = `
    flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg 
    border transition-all duration-150 text-xs
    ${fieldMode
      ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'
      : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 hover:border-slate-600/50'
    }
  `;

  const utilityButtonActiveClass = `
    flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg 
    border transition-all duration-150 text-xs
    ${fieldMode
      ? 'bg-yellow-400/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-400/20'
      : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
    }
  `;

  return (
    <div className={`p-3 space-y-4 ${className}`}>
      
      {/* Import Section - Two equal buttons side by side */}
      <div>
        <div className={sectionLabelClass}>Import</div>
        <div className="flex gap-2">
          <label className={`${importButtonClass} cursor-pointer`} title="Import local folder">
            <Icon name="folder_open" className="text-base" />
            <span>Folder</span>
            <input
              type="file"
              multiple
              {...({ webkitdirectory: "" } as any)}
              className="hidden"
              onChange={onImport}
              aria-hidden="true"
            />
          </label>
          <button
            onClick={onOpenExternalImport}
            className={importButtonClass}
            title="Import remote IIIF manifest"
          >
            <Icon name="cloud_download" className="text-base" />
            <span>Remote</span>
          </button>
        </div>
      </div>

      {/* Primary Action - Export */}
      <div>
        <div className={sectionLabelClass}>Export</div>
        <button
          onClick={onExportTrigger}
          className={primaryButtonClass}
          title="Export archive to IIIF package"
        >
          <Icon name="download" className="text-base" />
          Export Archive
        </button>
      </div>

      {/* Utility Actions - Settings, Help, Field Mode */}
      <div className="pt-2 border-t border-slate-700/30">
        <div className={sectionLabelClass}>Settings</div>
        <div className="flex gap-2">
          {onToggleQuickHelp && (
            <button
              onClick={onToggleQuickHelp}
              className={utilityButtonClass}
              title="Quick Help (? key)"
            >
              <Icon name="help_outline" className="text-sm" />
              <span>Help</span>
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className={utilityButtonClass}
            title="Application settings"
          >
            <Icon name="tune" className="text-sm" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleToggleFieldMode}
            className={fieldMode ? utilityButtonActiveClass : utilityButtonClass}
            title={fieldMode ? "Disable Field Mode" : "Enable Field Mode"}
          >
            <Icon name={fieldMode ? "contrast" : "contrast"} className="text-sm" />
            <span>Field</span>
          </button>
        </div>
      </div>

      {/* Complexity Toggle - Only when enabled */}
      {showAbstractionToggle && (
        <div className="pt-2 border-t border-slate-700/30">
          <div className={sectionLabelClass}>Interface Mode</div>
          <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <AbstractionLevelToggle
              currentLevel={abstractionLevel}
              onChange={onAbstractionLevelChange}
              size="sm"
              className="w-full justify-center"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
