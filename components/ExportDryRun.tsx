
import React, { useState } from 'react';
import { VirtualFile } from '../services/exportService';
import { Icon } from './Icon';

interface ExportDryRunProps {
  files: VirtualFile[];
}

export const ExportDryRun: React.FC<ExportDryRunProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(files[0] || null);

  return (
    <div className="flex h-[500px] border rounded-xl overflow-hidden bg-white shadow-inner">
      {/* File Tree */}
      <div className="w-1/3 border-r bg-slate-50 flex flex-col">
        <div className="p-3 border-b bg-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Bundle Structure</span>
            <span className="text-[10px] font-bold text-iiif-blue bg-blue-50 px-1.5 rounded">{files.length} Files</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {files.map(f => (
                <div 
                    key={f.path}
                    onClick={() => setSelectedFile(f)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-all ${
                        selectedFile?.path === f.path ? 'bg-iiif-blue text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'
                    }`}
                >
                    <Icon 
                        name={f.type === 'json' ? 'description' : f.type === 'html' ? 'html' : 'image'} 
                        className={selectedFile?.path === f.path ? 'text-white' : 'text-slate-400'}
                    />
                    <span className="truncate font-mono">{f.path}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden">
        <div className="p-3 bg-slate-800 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Icon name="visibility" className="text-blue-400 text-sm"/>
                <span className="text-xs font-bold text-slate-300 font-mono truncate max-w-[200px]">{selectedFile?.path}</span>
            </div>
            {selectedFile?.type === 'json' && (
                <div className="text-[9px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30 uppercase">Synthesized</div>
            )}
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            {selectedFile ? (
                selectedFile.content instanceof Blob ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <Icon name="image" className="text-6xl opacity-20"/>
                        <div className="text-center">
                            <p className="text-xs font-bold uppercase text-slate-400">Binary Asset</p>
                            <p className="text-[10px] opacity-60">File contents hidden in preview</p>
                        </div>
                    </div>
                ) : (
                    <pre className="text-[11px] font-mono text-blue-200 leading-relaxed">
                        {selectedFile.content}
                    </pre>
                )
            ) : (
                <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">Select a file to preview output</div>
            )}
        </div>
      </div>
    </div>
  );
};
