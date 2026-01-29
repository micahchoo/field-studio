/**
 * Toolbar - Reusable sidebar toolbar component
 *
 * Provides organized action groups for import, export, and settings
 * with consistent styling and clear visual hierarchy.
 */

import React from 'react';
import { Icon } from './Icon';
import { AbstractionLevelToggle } from './AbstractionLevelToggle';
import type { AbstractionLevel } from '../types';
import { FEATURE_FLAGS } from '../constants/features';

export interface ToolbarProps {
  /** Field mode styling */
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
 * Organized toolbar with logical action groupings
 * 
 * Layout:
 * - Import: Folder + Remote (side by side)
 * - Actions: Export (prominent primary action)
 * - Settings: Help + Settings + Field Mode (side by side)
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  fieldMode = false,
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
  const showAbstractionToggle = FEATURE_FLAGS.USE_SIMPLIFIED_UI && onAbstractionLevelChange;
  const sectionLabelClass = `text-[9px] font-black uppercase tracking-widest mb-2 ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`;
  
  const dividerClass = `h-px mb-3 ${fieldMode ? 'bg-slate-800' : 'bg-slate-800'}`;
  
  const secondaryButtonClass = (isActive?: boolean) => `
    flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all border
    ${isActive 
      ? (fieldMode 
        ? 'bg-yellow-400/20 text-yellow-400 border-yellow-600 hover:bg-yellow-400/30' 
        : 'bg-iiif-blue/20 text-iiif-blue border-iiif-blue hover:bg-iiif-blue/30')
      : (fieldMode 
        ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white' 
        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white')
    }
  `;

  const importButtonClass = `
    flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all border group
    ${fieldMode 
      ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-yellow-400' 
      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500'
    }
  `;

  const primaryButtonClass = `
    w-full py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest 
    flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95
    ${fieldMode 
      ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
      : 'bg-iiif-blue text-white hover:bg-blue-600'
    }
  `;

  return (
    <div className={`p-3 ${className}`}>
      {/* Abstraction Level Toggle - Always visible when feature enabled */}
      {showAbstractionToggle && (
        <div className="mb-3">
          <div className={sectionLabelClass}>Complexity</div>
          <AbstractionLevelToggle
            currentLevel={abstractionLevel}
            onChange={onAbstractionLevelChange}
            size="sm"
            className="w-full justify-center"
          />
        </div>
      )}

      {/* Import Section */}
      <div className="mb-3">
        <div className={sectionLabelClass}>Import</div>
        <div className="grid grid-cols-2 gap-2">
          <label 
            className={importButtonClass}
            title="Import local folder"
          >
            <Icon name="folder_open" className="text-lg group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">Folder</span>
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
            title="Import remote manifest or collection"
          >
            <Icon name="cloud_download" className="text-lg group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">Remote</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className={dividerClass} />

      {/* Actions Section */}
      <div className="mb-3">
        <div className={sectionLabelClass}>Actions</div>
        <button 
          onClick={onExportTrigger} 
          className={primaryButtonClass}
          title="Export archive to IIIF package"
        >
          <Icon name="publish" className="text-base" />
          Export Archive
        </button>
      </div>

      {/* Divider */}
      <div className={dividerClass} />

      {/* Settings Section */}
      <div>
        <div className={sectionLabelClass}>Settings</div>
        <div className="flex gap-2">
          {onToggleQuickHelp && (
            <button 
              onClick={onToggleQuickHelp} 
              className={secondaryButtonClass()}
              title="Quick Help (?)"
            >
              <Icon name="help_outline" className="text-base" />
              <span className="text-[10px] font-bold">Help</span>
            </button>
          )}
          <button 
            onClick={onOpenSettings} 
            className={secondaryButtonClass()}
            title="Application settings"
          >
            <Icon name="tune" className="text-base" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>
          <button 
            onClick={onToggleFieldMode} 
            className={secondaryButtonClass(fieldMode)}
            title={fieldMode ? "Disable Field Mode" : "Enable Field Mode"}
          >
            <Icon name={fieldMode ? "visibility" : "visibility_off"} className="text-base" />
            <span className="text-[10px] font-bold">Field</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
