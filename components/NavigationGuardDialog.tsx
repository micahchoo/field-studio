/**
 * NavigationGuardDialog - Reusable confirmation dialog for unsaved changes
 * 
 * Addresses Issue 3.1: Metadata Spreadsheet unsaved changes warning
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface NavigationGuardDialogProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
}

export const NavigationGuardDialog: React.FC<NavigationGuardDialogProps> = ({
  isOpen,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onConfirm,
  onCancel,
  title = 'Unsaved Changes'
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-guard-title"
    >
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-amber-50 p-6 flex items-center gap-4 border-b border-amber-100">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            <Icon name="warning" className="text-2xl" />
          </div>
          <div>
            <h2 id="nav-guard-title" className="text-lg font-bold text-amber-900">
              {title}
            </h2>
            <p className="text-amber-700 text-sm">Your changes will be lost.</p>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600">{message}</p>
        </div>
        
        <div className="p-6 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Stay Here
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Leave Without Saving
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationGuardDialog;
