
import React, { useState } from 'react';
import { IIIFItem } from '../types';
import { exportService, ExportOptions } from '../services/exportService';
import { Icon } from './Icon';
import { saveAs } from 'file-saver'; 

interface ExportDialogProps {
  root: IIIFItem | null;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ root, onClose }) => {
  const [format, setFormat] = useState<'static-site' | 'raw-iiif'>('static-site');
  const [includeAssets, setIncludeAssets] = useState(true);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    if (!root) return;
    setProcessing(true);
    setErrorMsg(null);
    try {
        const blob = await exportService.exportArchive(root, { format, includeAssets, ignoreErrors }, (p) => {
            setProgress(p);
        });
        
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `archive-export-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        onClose();
    } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message);
        setProgress({ status: 'Failed', percent: 0 });
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="archive" className="text-iiif-blue"/> Export Archive
                </h2>
                {!processing && (
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <Icon name="close"/>
                    </button>
                )}
            </div>
            
            <div className="p-6 space-y-6">
                {errorMsg ? (
                    <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm">
                        <div className="font-bold mb-1 flex items-center gap-2"><Icon name="error" /> Export Failed</div>
                        <p className="mb-3">{errorMsg}</p>
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                            <input 
                                type="checkbox" 
                                checked={ignoreErrors} 
                                onChange={e => setIgnoreErrors(e.target.checked)}
                                className="accent-red-600"
                            />
                            <span className="font-bold text-xs uppercase">Ignore validation errors and force export</span>
                        </label>
                        <div className="mt-4 flex justify-end">
                             <button onClick={handleExport} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">Retry</button>
                        </div>
                    </div>
                ) : processing ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-iiif-blue rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="font-bold text-slate-700">{progress.status}</h3>
                        <p className="text-sm text-slate-500">{Math.round(progress.percent)}%</p>
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Export Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    className={`p-3 rounded border text-left ${format === 'static-site' ? 'bg-blue-50 border-iiif-blue text-blue-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    onClick={() => setFormat('static-site')}
                                >
                                    <div className="font-bold text-sm mb-1">Static Website</div>
                                    <div className="text-xs opacity-75">Zip with HTML viewer and data</div>
                                </button>
                                <button 
                                    className={`p-3 rounded border text-left ${format === 'raw-iiif' ? 'bg-blue-50 border-iiif-blue text-blue-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    onClick={() => setFormat('raw-iiif')}
                                >
                                    <div className="font-bold text-sm mb-1">Raw IIIF Package</div>
                                    <div className="text-xs opacity-75">JSON Manifests and Assets only</div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input 
                                    type="checkbox" 
                                    checked={includeAssets} 
                                    onChange={e => setIncludeAssets(e.target.checked)}
                                    className="w-5 h-5 text-iiif-blue rounded focus:ring-iiif-blue"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-700">Include Assets (Media)</div>
                                    <div className="text-xs text-slate-500">Uncheck to export only metadata (smaller file size)</div>
                                </div>
                            </label>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-3 rounded text-xs text-amber-800">
                            <strong>Note:</strong> Exporting large archives with many images may take some time. The browser will generate the ZIP file locally.
                        </div>
                    </>
                )}
            </div>

            {!processing && !errorMsg && (
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">Cancel</button>
                    <button onClick={handleExport} className="px-6 py-2 bg-iiif-blue text-white font-bold text-sm rounded shadow hover:bg-blue-700">
                        Start Export
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
