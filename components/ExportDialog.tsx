
import React, { useState, useEffect } from 'react';
import { IIIFItem } from '../types';
import { exportService, ExportOptions, VirtualFile } from '../services/exportService';
import { validator, ValidationIssue } from '../services/validator';
import { Icon } from './Icon';
import { ExportDryRun } from './ExportDryRun';
import FileSaver from 'file-saver'; 

interface ExportDialogProps {
  root: IIIFItem | null;
  onClose: () => void;
}

type ExportStep = 'config' | 'dry-run' | 'exporting';

export const ExportDialog: React.FC<ExportDialogProps> = ({ root, onClose }) => {
  const [step, setStep] = useState<ExportStep>('config');
  const [format, setFormat] = useState<'static-site' | 'raw-iiif'>('static-site');
  const [includeAssets, setIncludeAssets] = useState(true);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [integrityIssues, setIntegrityIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
      if (root && step === 'dry-run') {
          handleDryRun();
      }
  }, [step, format, includeAssets]);

  const handleDryRun = async () => {
      if (!root) return;
      setProcessing(true);
      try {
          const files = await exportService.prepareExport(root, { format, includeAssets, ignoreErrors });
          setVirtualFiles(files);
          
          const issueMap = validator.validateTree(root);
          setIntegrityIssues(Object.values(issueMap).flat());
      } catch (e: any) {
          setErrorMsg(e.message);
      } finally {
          setProcessing(false);
      }
  };

  const handleFinalExport = async () => {
    if (!root) return;
    setStep('exporting');
    setErrorMsg(null);
    try {
        const blob = await exportService.exportArchive(root, { format, includeAssets, ignoreErrors }, (p) => {
            setProgress(p);
        });
        FileSaver.saveAs(blob, `archive-export-${new Date().toISOString().split('T')[0]}.zip`);
        onClose();
    } catch (e: any) {
        setErrorMsg(e.message);
        setStep('dry-run');
    }
  };

  const criticalErrors = integrityIssues.filter(i => i.level === 'error');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className={`bg-white rounded-3xl shadow-2xl transition-all duration-500 overflow-hidden flex flex-col ${step === 'dry-run' ? 'max-w-5xl w-full' : 'max-w-md w-full'}`}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-iiif-blue rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Icon name="publish" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Archive Export</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {step === 'config' ? 'Step 1: Configuration' : step === 'dry-run' ? 'Step 2: Integrity & Preview' : 'Step 3: Compressing'}
                        </p>
                    </div>
                </div>
                {step !== 'exporting' && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <Icon name="close"/>
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm mb-6 flex gap-3 animate-in shake">
                        <Icon name="error" className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1 uppercase tracking-tighter">Integrity Failure</p>
                            <p className="opacity-80">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {step === 'config' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'static-site' ? 'border-iiif-blue bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                onClick={() => setFormat('static-site')}
                            >
                                <Icon name="language" className={`text-2xl mb-3 ${format === 'static-site' ? 'text-iiif-blue' : 'text-slate-400'}`} />
                                <div className="font-bold text-sm text-slate-800 mb-1">Static Website</div>
                                <p className="text-[10px] text-slate-500 leading-tight">Includes embedded viewer for instant site browsing.</p>
                                {format === 'static-site' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </button>
                            <button 
                                className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'raw-iiif' ? 'border-iiif-blue bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                onClick={() => setFormat('raw-iiif')}
                            >
                                <Icon name="code" className={`text-2xl mb-3 ${format === 'raw-iiif' ? 'text-iiif-blue' : 'text-slate-400'}`} />
                                <div className="font-bold text-sm text-slate-800 mb-1">Raw IIIF</div>
                                <p className="text-[10px] text-slate-500 leading-tight">JSON documents and original assets only.</p>
                                {format === 'raw-iiif' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </button>
                        </div>

                        <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-slate-100 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={includeAssets} 
                                onChange={e => setIncludeAssets(e.target.checked)}
                                className="w-6 h-6 text-iiif-blue rounded-lg border-slate-300 focus:ring-iiif-blue"
                            />
                            <div>
                                <div className="font-bold text-sm text-slate-700">Include Physical Assets</div>
                                <div className="text-xs text-slate-500">Zip images and media files along with metadata.</div>
                            </div>
                        </label>
                    </div>
                )}

                {step === 'dry-run' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {processing ? (
                            <div className="h-[500px] flex flex-col items-center justify-center gap-4 text-slate-400">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-iiif-blue rounded-full animate-spin"></div>
                                <p className="text-xs font-black uppercase tracking-widest">Synthesizing Archive DNA...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <div className={`flex-1 p-4 rounded-2xl border-2 flex items-center gap-4 ${criticalErrors.length > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                        <Icon name={criticalErrors.length > 0 ? 'error' : 'verified'} className="text-2xl"/>
                                        <div>
                                            <p className="font-bold text-sm">{criticalErrors.length > 0 ? `${criticalErrors.length} Critical Issues` : 'Spec Compliance: Valid'}</p>
                                            <p className="text-[10px] opacity-75">{criticalErrors.length > 0 ? 'Fix issues below to ensure interoperability.' : 'Archive meets IIIF Presentation 3.0 standards.'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center min-w-[120px]">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Package Size</span>
                                        <span className="text-sm font-bold text-slate-700">~{includeAssets ? 'Calculated' : 'Small'}</span>
                                    </div>
                                </div>

                                <ExportDryRun files={virtualFiles} />
                                
                                {criticalErrors.length > 0 && (
                                    <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="warning" className="text-amber-600"/>
                                            <span className="text-xs font-medium text-amber-900">Archive has critical issues. You must fix them or override integrity.</span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
                                            <input type="checkbox" checked={ignoreErrors} onChange={e => setIgnoreErrors(e.target.checked)} className="rounded text-amber-600"/>
                                            <span className="text-[9px] font-black uppercase text-amber-700">Ignore Errors</span>
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {step === 'exporting' && (
                    <div className="text-center py-12 space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                            <div 
                                className="absolute inset-0 border-8 border-iiif-blue rounded-full transition-all duration-300"
                                style={{ 
                                    clipPath: `polygon(50% 50%, -50% -50%, ${progress.percent}% -50%, ${progress.percent}% 150%, -50% 150%)`,
                                    transform: 'rotate(-90deg)'
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center font-black text-iiif-blue">
                                {Math.round(progress.percent)}%
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{progress.status}</h3>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Archive Compression Engine</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
                {step === 'config' && (
                    <>
                        <button onClick={onClose} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                        <button 
                            onClick={() => setStep('dry-run')}
                            className="bg-iiif-blue text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl flex items-center gap-2 transition-all active:scale-95"
                        >
                            Start Dry Run <Icon name="arrow_forward" />
                        </button>
                    </>
                )}
                {step === 'dry-run' && !processing && (
                    <>
                        <button onClick={() => setStep('config')} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Back to Settings</button>
                        <button 
                            onClick={handleFinalExport}
                            disabled={criticalErrors.length > 0 && !ignoreErrors}
                            className="bg-green-600 text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-700 shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Finalize & Download ZIP <Icon name="download" />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
