
import React, { useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AppSettings } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { getVisibleFields, MetadataComplexity } from '@/src/shared/constants';
import { guidance } from '@/src/shared/services/guidanceService';

// Admin mode key for localStorage
const ADMIN_MODE_KEY = 'adminMode';

interface PersonaSettingsProps {
  settings: AppSettings;
  onUpdate: (s: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const PersonaSettings: React.FC<PersonaSettingsProps> = ({ settings, onUpdate, onClose }) => {
  // Admin mode state
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ADMIN_MODE_KEY) === 'true';
    }
    return false;
  });

  const toggleAdminMode = () => {
    const newValue = !adminMode;
    setAdminMode(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_MODE_KEY, newValue ? 'true' : 'false');
    }
  };

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const complexityLevels: { level: MetadataComplexity; label: string; desc: string }[] = [
      { level: 'simple', label: 'Essential', desc: 'Label, summary, thumbnail only' },
      { level: 'standard', label: 'Standard', desc: '+ metadata, rights, navDate' },
      { level: 'advanced', label: 'Full Spec', desc: '+ behaviors, services, structures' }
  ];

  const currentComplexityIndex = complexityLevels.findIndex(c => c.level === settings.metadataComplexity);
  const visibleFieldCount = getVisibleFields(settings.metadataComplexity).length;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-nb-black/60 backdrop-blur-md">
      <div className="bg-nb-white w-full max-w-xl shadow-brutal-lg overflow-hidden border border-nb-black/20 animate-in zoom-in-95 ">
        <div className="p-6 border-b flex justify-between items-center bg-nb-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-nb-black flex items-center justify-center text-white shadow-brutal"><Icon name="psychology"/></div>
             <div>
                <h2 className="text-lg font-black text-nb-black uppercase tracking-tighter">Studio Persona</h2>
                <p className="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">Global Workbench Configuration</p>
             </div>
          </div>
          <Button variant="ghost" size="bare" onClick={onClose} className="p-2 hover:bg-nb-cream text-nb-black/40"><Icon name="close"/></Button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <section>
                <label className="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Affordance Overrides</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-nb-black/50 uppercase">Auto-Save Frequency</span>
                        <select value={settings.autoSaveInterval} onChange={e => onUpdate({ autoSaveInterval: parseInt(e.target.value) })} className="w-full text-xs font-bold p-2 bg-nb-white border ">
                            <option value={30}>Every 30 seconds</option>
                            <option value={60}>Every minute</option>
                            <option value={300}>Every 5 minutes</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-nb-black/50 uppercase">Base Hosting URL</span>
                        <input value={settings.defaultBaseUrl} onChange={e => onUpdate({ defaultBaseUrl: e.target.value })} className="w-full text-xs font-bold p-2 bg-nb-white border font-mono" placeholder="http://localhost" />
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-nb-black/10">
                <label className="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Metadata Complexity</label>
                <div className="bg-nb-white border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-nb-black/80">Field Visibility Level</span>
                        <span className="text-[9px] font-mono bg-iiif-blue/10 text-iiif-blue px-2 py-0.5 ">{visibleFieldCount} fields</span>
                    </div>

                    {/* Slider Track */}
                    <div className="relative pt-2">
                        <div className="flex justify-between mb-2">
                            {complexityLevels.map((c, idx) => (
                                <Button variant="ghost" size="bare"
                                    key={c.level}
                                    onClick={() => onUpdate({ metadataComplexity: c.level })}
                                    className={`text-[9px] font-black uppercase tracking-tight transition-nb ${
                                        settings.metadataComplexity === c.level
                                            ? 'text-iiif-blue'
                                            : 'text-nb-black/40 hover:text-nb-black/60'
                                    }`}
                                >
                                    {c.label}
                                </Button>
                            ))}
                        </div>

                        {/* Custom Slider */}
                        <div className="relative h-2 bg-nb-cream ">
                            <div
                                className="absolute h-2 bg-gradient-to-r from-iiif-blue to-blue-400 transition-nb"
                                style={{ width: `${((currentComplexityIndex + 1) / complexityLevels.length) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max="2"
                                value={currentComplexityIndex}
                                onChange={e => onUpdate({ metadataComplexity: complexityLevels[parseInt(e.target.value)].level })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label="Metadata complexity level"
                            />
                            {/* Slider Thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-nb-white border-2 border-iiif-blue shadow-brutal-sm transition-nb pointer-events-none"
                                style={{ left: `calc(${(currentComplexityIndex / 2) * 100}% - 8px)` }}
                            />
                        </div>

                        {/* Current Level Description */}
                        <p className="text-[10px] text-nb-black/50 mt-3 text-center">
                            {complexityLevels[currentComplexityIndex]?.desc}
                        </p>
                    </div>

                    {/* Field Preview */}
                    <div className="pt-3 border-t border-nb-black/20">
                        <span className="text-[9px] font-black text-nb-black/40 uppercase block mb-2">Visible Fields Preview</span>
                        <div className="flex flex-wrap gap-1">
                            {getVisibleFields(settings.metadataComplexity).slice(0, 8).map(field => (
                                <span key={field.key} className="text-[8px] font-bold bg-nb-white border px-1.5 py-0.5 text-nb-black/60">
                                    {field.label}
                                </span>
                            ))}
                            {visibleFieldCount > 8 && (
                                <span className="text-[8px] font-bold text-nb-black/40">+{visibleFieldCount - 8} more</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-nb-black/10 space-y-3">
                <div className="flex items-center justify-between p-3 bg-nb-white border">
                    <div>
                        <span className="text-xs font-bold text-nb-black/80 block">Technical Transparency</span>
                        <span className="text-[9px] text-nb-black/40 uppercase font-black">IDs & JSON-LD Visible</span>
                    </div>
                    <input type="checkbox" checked={settings.showTechnicalIds} onChange={e => onUpdate({ showTechnicalIds: e.target.checked })} className="text-iiif-blue w-5 h-5"/>
                </div>
                <div className="flex items-center justify-between p-3 bg-nb-white border">
                    <div>
                        <span className="text-xs font-bold text-nb-black/80 block">Field Contrast Mode</span>
                        <span className="text-[9px] text-nb-black/40 uppercase font-black">Optimized for outdoor use</span>
                    </div>
                    <input type="checkbox" checked={settings.fieldMode} onChange={e => onUpdate({ fieldMode: e.target.checked })} className="text-iiif-blue w-5 h-5"/>
                </div>
            </section>

            <section className="pt-6 border-t border-nb-black/10 space-y-3">
                <label className="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Developer Tools</label>
                <div className={`flex items-center justify-between p-3 border transition-nb ${adminMode ? 'bg-nb-purple/5 border-nb-purple/20' : 'bg-nb-white border-nb-black/20'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${adminMode ? 'bg-nb-purple text-white' : 'bg-nb-cream text-nb-black/50'}`}>
                            <Icon name="admin_panel_settings"/>
                        </div>
                        <div>
                            <span className={`text-xs font-bold block ${adminMode ? 'text-nb-purple' : 'text-nb-black/80'}`}>Admin Mode</span>
                            <span className="text-[9px] text-nb-black/40 uppercase font-black">Access dependency explorer & tools</span>
                        </div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={adminMode} 
                        onChange={toggleAdminMode} 
                        className="text-nb-purple w-5 h-5"
                    />
                </div>
                {adminMode && (
                    <div className="p-3 bg-nb-purple/5 border border-nb-purple/10">
                        <p className="text-[10px] text-nb-purple mb-2">
                            Admin mode is enabled. You can now access:
                        </p>
                        <ul className="text-[10px] text-nb-purple space-y-1">
                            <li className="flex items-center gap-1">
                                <Icon name="account_tree" className="text-xs"/> 
                                Dependency Explorer (Cmd+K → "Dependency Explorer")
                            </li>
                        </ul>
                    </div>
                )}
            </section>

            <HelpResetSection />
        </div>

        <div className="p-6 bg-nb-white border-t flex justify-end">
            <Button variant="ghost" size="bare" onClick={onClose} className="bg-nb-black text-white px-10 py-3 font-black uppercase tracking-widest text-xs hover:bg-nb-black transition-nb shadow-brutal">Commit Environment Profile</Button>
        </div>
      </div>
    </div>
  );
};

const HelpResetSection: React.FC = () => {
    const [tipCount, setTipCount] = useState(guidance.getSeenCount());
    const [resetConfirm, setResetConfirm] = useState(false);

    const handleReset = () => {
        if (resetConfirm) {
            guidance.reset();
            setTipCount(0);
            setResetConfirm(false);
        } else {
            setResetConfirm(true);
            setTimeout(() => setResetConfirm(false), 3000);
        }
    };

    const handleResetTooltips = () => {
        guidance.resetTooltips();
        setTipCount(guidance.getSeenCount());
    };

    return (
        <section className="pt-6 border-t border-nb-black/10">
            <label className="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Help & Tooltips</label>
            <div className="bg-nb-white border p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-nb-black/80 block">Contextual Help</span>
                        <span className="text-[9px] text-nb-black/40">{tipCount} tips dismissed</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="bare"
                            onClick={handleResetTooltips}
                            className="text-[10px] font-bold text-nb-black/50 hover:text-nb-black/80 px-3 py-1.5 hover:bg-nb-cream transition-nb"
                        >
                            Reset Tooltips
                        </Button>
                        <Button variant="ghost" size="bare"
                            onClick={handleReset}
                            className={`text-[10px] font-bold px-3 py-1.5 transition-nb ${
                                resetConfirm
                                    ? 'bg-nb-red text-white'
                                    : 'text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-cream'
                            }`}
                        >
                            {resetConfirm ? 'Click to Confirm' : 'Reset All Help'}
                        </Button>
                    </div>
                </div>
                <p className="text-[10px] text-nb-black/40 leading-relaxed">
                    Show all help tooltips and welcome messages again. Useful if you want a refresher on features.
                </p>
            </div>
        </section>
    );
};
