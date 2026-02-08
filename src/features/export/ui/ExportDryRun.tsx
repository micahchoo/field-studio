
import React, { useState } from 'react';
import { VirtualFile } from '../model/exportService';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface ExportDryRunProps {
  files: VirtualFile[];
}

export const ExportDryRun: React.FC<ExportDryRunProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(files[0] || null);

  return (
    <div className="flex h-[500px] border overflow-hidden bg-nb-white shadow-inner">
      {/* File Tree */}
      <div className="w-1/3 border-r bg-nb-white flex flex-col">
        <div className="p-3 border-b bg-nb-cream flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-nb-black/50 tracking-widest">Bundle Structure</span>
            <span className="text-[10px] font-bold text-iiif-blue bg-nb-blue/10 px-1.5 rounded">{files.length} Files</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {files.slice(0, 500).map(f => (
                <div 
                    key={f.path}
                    onClick={() => setSelectedFile(f)}
                    className={`flex items-center gap-2 p-2 cursor-pointer text-xs transition-nb ${
                        selectedFile?.path === f.path ? 'bg-iiif-blue text-white shadow-brutal-sm' : 'hover:bg-nb-cream text-nb-black/60'
                    }`}
                >
                    <Icon 
                        name={f.type === 'json' ? 'description' : f.type === 'html' ? 'html' : 'image'} 
                        className={selectedFile?.path === f.path ? 'text-white' : 'text-nb-black/40'}
                    />
                    <span className="truncate font-mono">{f.path}</span>
                </div>
            ))}
            {files.length > 500 && (
                <div className="p-4 text-center text-xs text-nb-black/40 italic">
                    ... and {files.length - 500} more files
                </div>
            )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-nb-black flex flex-col overflow-hidden">
        <div className="p-3 bg-nb-black border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Icon name="visibility" className="text-nb-blue text-sm"/>
                <span className="text-xs font-bold text-nb-black/30 font-mono truncate max-w-[200px]">{selectedFile?.path}</span>
            </div>
            {selectedFile?.type === 'json' && (
                <div className="text-[9px] font-black bg-nb-green/20 text-nb-green px-1.5 py-0.5 border border-nb-green/30 uppercase">Synthesized</div>
            )}
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            {selectedFile ? (
                selectedFile.content instanceof Blob ? (
                    <div className="h-full flex flex-col items-center justify-center text-nb-black/50 gap-4">
                        <Icon name="image" className="text-6xl opacity-20"/>
                        <div className="text-center">
                            <p className="text-xs font-bold uppercase text-nb-black/40">Binary Asset</p>
                            <p className="text-[10px] opacity-60">File contents hidden in preview</p>
                        </div>
                    </div>
                ) : (
                    <pre className="text-[11px] font-mono text-nb-blue/40 leading-relaxed whitespace-pre-wrap break-all">
                        {typeof selectedFile.content === 'string' && selectedFile.content.length > 50000 
                            ? `${selectedFile.content.slice(0, 50000)}\n... [Preview Truncated]` 
                            : selectedFile.content}
                    </pre>
                )
            ) : (
                <div className="h-full flex items-center justify-center text-nb-black/60 italic text-sm">Select a file to preview output</div>
            )}
        </div>
      </div>
    </div>
  );
};
