/**
 * StorageFullDialog - Shown when browser storage quota is exceeded
 *
 * Provides users with options to:
 * 1. Export their data
 * 2. Clear storage to continue
 * 3. Learn about storage limits
 */

import React, { useEffect, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { storage } from '@/src/shared/services/storage';

interface StorageFullDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
}

interface StorageStats {
  usage: number;
  quota: number;
  usagePercent: number;
  assetCount: number;
}

export const StorageFullDialog: React.FC<StorageFullDialogProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const estimate = await storage.getEstimate();
    const assetIds = await storage.getAllAssetIds();
    
    if (estimate) {
      setStats({
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0,
        assetCount: assetIds.length,
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearStorage = async () => {
    if (!confirm('This will delete ALL imported files and derivatives. Your project structure will be preserved. Continue?')) {
      return;
    }

    setIsClearing(true);
    try {
      // Clear files and derivatives but keep project structure
      const db = await (storage as any).getDB();
      await db.clear('files');
      await db.clear('derivatives');
      await db.clear('tiles');
      await db.clear('tileManifests');
      
      setCleared(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error('Failed to clear storage:', e);
      alert('Failed to clear storage. Try closing and reopening the browser.');
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-500/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <Icon name="storage" className="text-2xl text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Storage Full</h2>
              <p className="text-red-300 text-sm">Browser storage quota exceeded</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {cleared ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="check" className="text-3xl text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Storage Cleared</h3>
              <p className="text-slate-400">Reloading page...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-400 text-sm">Storage Used</span>
                    <span className="text-white font-mono font-bold">
                      {formatBytes(stats.usage)} / {formatBytes(stats.quota)}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{stats.assetCount} assets stored</span>
                    <span>{stats.usagePercent.toFixed(1)}% full</span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-3">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Your browser's storage is full. This happens when:
                </p>
                <ul className="text-slate-400 text-sm space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    You've imported many large images
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    High-resolution derivatives were generated
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    Tile pyramids for the viewer consumed space
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={onExport}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon name="download" />
                  Export Archive to File
                </button>

                <button
                  onClick={handleClearStorage}
                  disabled={isClearing}
                  className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isClearing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Icon name="delete_forever" />
                      Clear All Files (Keep Structure)
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  I'll manage this later
                </button>
              </div>

              {/* Tip */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
                <Icon name="lightbulb" className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-300 text-xs">
                  <strong>Tip:</strong> After exporting, you can re-import the archive file 
                  later without hitting storage limits, since the export doesn't store 
                  derivatives or tiles.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageFullDialog;
