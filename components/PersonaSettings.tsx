
import React from 'react';
import { AbstractionLevel, AppSettings } from '../types';
import { Icon } from './Icon';
import { METADATA_TEMPLATES } from '../constants';

interface PersonaSettingsProps {
  settings: AppSettings;
  onUpdate: (s: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const PersonaSettings: React.FC<PersonaSettingsProps> = ({ settings, onUpdate, onClose }) => {
  const handlePersonaSelect = (lvl: AbstractionLevel) => {
      let template = METADATA_TEMPLATES.ARCHIVIST;
      let showTechnical = true;
      let fieldMode = false;

      if (lvl === 'simple') {
          template = METADATA_TEMPLATES.RESEARCHER;
          showTechnical = false;
          fieldMode = true;
      } else if (lvl === 'advanced') {
          template = METADATA_TEMPLATES.DEVELOPER;
          showTechnical = true;
          fieldMode = false;
      }

      onUpdate({ 
          abstractionLevel: lvl, 
          metadataTemplate: template,
          showTechnicalIds: showTechnical,
          fieldMode: fieldMode
      });
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-xl"><Icon name="psychology"/></div>
             <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Studio Persona</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Workbench Configuration</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><Icon name="close"/></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <section>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Your Role</label>
                <div className="grid grid-cols-1 gap-3">
                    <PersonaOption 
                        icon="travel_explore" title="Field Researcher" 
                        desc="Simplified UI. Focus on GPS, high-contrast field modes, and quick capture." 
                        active={settings.abstractionLevel === 'simple'}
                        onClick={() => handlePersonaSelect('simple')}
                    />
                    <PersonaOption 
                        icon="inventory" title="Digital Archivist" 
                        desc="Standard UI. Emphasis on metadata precision, validation, and batching." 
                        active={settings.abstractionLevel === 'standard'}
                        onClick={() => handlePersonaSelect('standard')}
                    />
                    <PersonaOption 
                        icon="terminal" title="IIIF Developer" 
                        desc="Advanced UI. Raw JSON-LD access, direct ID editing, and Image API workbenches." 
                        active={settings.abstractionLevel === 'advanced'}
                        onClick={() => handlePersonaSelect('advanced')}
                    />
                </div>
            </section>

            <section className="pt-6 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Affordance Overrides</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Auto-Save Frequency</span>
                        <select value={settings.autoSaveInterval} onChange={e => onUpdate({ autoSaveInterval: parseInt(e.target.value) })} className="w-full text-xs font-bold p-2 bg-slate-50 border rounded-lg">
                            <option value={30}>Every 30 seconds</option>
                            <option value={60}>Every minute</option>
                            <option value={300}>Every 5 minutes</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Base Hosting URL</span>
                        <input value={settings.defaultBaseUrl} onChange={e => onUpdate({ defaultBaseUrl: e.target.value })} className="w-full text-xs font-bold p-2 bg-slate-50 border rounded-lg font-mono" placeholder="http://localhost" />
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                    <div>
                        <span className="text-xs font-bold text-slate-700 block">Technical Transparency</span>
                        <span className="text-[9px] text-slate-400 uppercase font-black">IDs & JSON-LD Visible</span>
                    </div>
                    <input type="checkbox" checked={settings.showTechnicalIds} onChange={e => onUpdate({ showTechnicalIds: e.target.checked })} className="rounded text-iiif-blue w-5 h-5"/>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                    <div>
                        <span className="text-xs font-bold text-slate-700 block">Field Contrast Mode</span>
                        <span className="text-[9px] text-slate-400 uppercase font-black">Optimized for outdoor use</span>
                    </div>
                    <input type="checkbox" checked={settings.fieldMode} onChange={e => onUpdate({ fieldMode: e.target.checked })} className="rounded text-iiif-blue w-5 h-5"/>
                </div>
            </section>
        </div>

        <div className="p-6 bg-slate-50 border-t flex justify-end">
            <button onClick={onClose} className="bg-slate-800 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl">Commit Environment Profile</button>
        </div>
      </div>
    </div>
  );
};

const PersonaOption: React.FC<{ icon: string, title: string, desc: string, active: boolean, onClick: () => void }> = ({ icon, title, desc, active, onClick }) => (
    <button onClick={onClick} className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${active ? 'border-iiif-blue bg-blue-50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}>
        <div className={`p-3 rounded-xl ${active ? 'bg-iiif-blue text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><Icon name={icon}/></div>
        <div className="flex-1">
            <h4 className={`font-black uppercase tracking-tighter text-sm ${active ? 'text-iiif-blue' : 'text-slate-700'}`}>{title}</h4>
            <p className="text-[10px] text-slate-500 leading-tight mt-1">{desc}</p>
        </div>
        {active && <Icon name="check_circle" className="text-iiif-blue"/>}
    </button>
);
