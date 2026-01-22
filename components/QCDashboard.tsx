
import React, { useMemo } from 'react';
import { ValidationIssue } from '../services/validator';
import { Icon } from './Icon';

interface QCDashboardProps {
  issuesMap: Record<string, ValidationIssue[]>;
  totalItems: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const QCDashboard: React.FC<QCDashboardProps> = ({ issuesMap, totalItems, onSelect, onClose }) => {
  const allIssues = useMemo(() => Object.values(issuesMap).flat(), [issuesMap]);
  const errors = allIssues.filter(i => i.level === 'error');
  const warnings = allIssues.filter(i => i.level === 'warning');
  
  const validItemsCount = totalItems - Object.keys(issuesMap).length;
  const healthScore = totalItems > 0 ? Math.round((validItemsCount / totalItems) * 100) : 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-8 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                healthScore === 100 ? 'bg-green-100 text-green-700' : 
                healthScore > 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
                {healthScore}%
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Archive Health</h2>
                <p className="text-sm text-slate-500">{totalItems} items scanned</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <Icon name="close" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 divide-x border-b bg-white">
            <div className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-700">{validItemsCount}</div>
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mt-1">Valid Resources</div>
            </div>
            <div className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{errors.length}</div>
                <div className="text-xs uppercase font-bold text-red-400 tracking-wider mt-1">Errors</div>
            </div>
            <div className="p-6 text-center">
                <div className="text-3xl font-bold text-amber-500">{warnings.length}</div>
                <div className="text-xs uppercase font-bold text-amber-400 tracking-wider mt-1">Warnings</div>
            </div>
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {allIssues.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Icon name="verified_user" className="text-6xl text-green-300 mb-4"/>
                    <h3 className="text-lg font-bold text-green-700">All systems go!</h3>
                    <p>No validation issues detected in your archive.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {errors.map((issue, idx) => (
                        <div key={`err-${idx}`} onClick={() => { onSelect(issue.itemId); onClose(); }} className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm cursor-pointer hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Error</span>
                                    <span className="font-mono text-xs text-slate-400">{issue.itemId}</span>
                                </div>
                                <Icon name="arrow_forward" className="text-slate-300 group-hover:text-iiif-blue opacity-0 group-hover:opacity-100 transition-opacity"/>
                            </div>
                            <h4 className="font-bold text-slate-800">{issue.itemLabel}</h4>
                            <p className="text-sm text-red-600 mt-1">{issue.message}</p>
                        </div>
                    ))}
                    
                    {warnings.map((issue, idx) => (
                        <div key={`warn-${idx}`} onClick={() => { onSelect(issue.itemId); onClose(); }} className="bg-white p-4 rounded-lg border-l-4 border-amber-400 shadow-sm cursor-pointer hover:shadow-md transition-all group">
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Warning</span>
                                    <span className="font-mono text-xs text-slate-400">{issue.itemId}</span>
                                </div>
                                <Icon name="arrow_forward" className="text-slate-300 group-hover:text-iiif-blue opacity-0 group-hover:opacity-100 transition-opacity"/>
                            </div>
                            <h4 className="font-bold text-slate-800">{issue.itemLabel}</h4>
                            <p className="text-sm text-slate-600 mt-1">{issue.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
