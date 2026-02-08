/**
 * StorageFullDialog - Shown when browser storage quota is exceeded
 *
 * Provides users with options to:
 * 1. Export their data
 * 2. Clear storage to continue
 * 3. Learn about storage limits
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
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
  const [isClearingDerivatives, setIsClearingDerivatives] = useState(false);
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
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleClearDerivatives = async () => {
    setIsClearingDerivatives(true);
    try {
      const count = await storage.clearDerivatives();
      // Reload stats to show updated storage
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadStats();
      alert(`Cleared ${count} thumbnail images. Storage should now have more space.`);
    } catch (e) {
      console.error('Failed to clear derivatives:', e);
      alert('Failed to clear derivatives. Try the full clear option instead.');
    } finally {
      setIsClearingDerivatives(false);
    }
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-nb-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-nb-black shadow-brutal-lg border border-nb-red/30 overflow-hidden">
        {/* Header */}
        <div className="bg-nb-red/10 border-b border-nb-red/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-nb-red/20 flex items-center justify-center">
              <Icon name="storage" className="text-2xl text-nb-red" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Storage Full</h2>
              <p className="text-nb-red/60 text-sm">Browser storage quota exceeded</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {cleared ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-nb-green/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="check" className="text-3xl text-nb-green" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Storage Cleared</h3>
              <p className="text-nb-black/40">Reloading page...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="bg-nb-black/50 p-4 border border-nb-black/80">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-nb-black/40 text-sm">Storage Used</span>
                    <span className="text-white font-mono font-bold">
                      {formatBytes(stats.usage)} / {formatBytes(stats.quota)}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 bg-nb-black/80 overflow-hidden mb-3">
                    <div 
                      className="h-full bg-nb-red "
                      style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-nb-black/50">
                    <span>{stats.assetCount} assets stored</span>
                    <span>{stats.usagePercent.toFixed(1)}% full</span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-3">
                <p className="text-nb-black/30 text-sm leading-relaxed">
                  Your browser's storage is full. This happens when:
                </p>
                <ul className="text-nb-black/40 text-sm space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-nb-red mt-0.5">•</span>
                    You've imported many large images
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-nb-red mt-0.5">•</span>
                    High-resolution derivatives were generated
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-nb-red mt-0.5">•</span>
                    Tile pyramids for the viewer consumed space
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button variant="ghost" size="bare"
                  onClick={onExport}
                  className="w-full py-3 px-4 bg-nb-blue hover:bg-nb-blue text-white font-semibold flex items-center justify-center gap-2 transition-nb"
                >
                  <Icon name="download" />
                  Export Archive to File
                </Button>

                <Button variant="ghost" size="bare"
                  onClick={handleClearDerivatives}
                  disabled={isClearingDerivatives}
                  className="w-full py-3 px-4 bg-nb-orange hover:bg-nb-orange text-white font-semibold flex items-center justify-center gap-2 transition-nb disabled:opacity-50"
                >
                  {isClearingDerivatives ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin" />
                      Clearing Thumbnails...
                    </>
                  ) : (
                    <>
                      <Icon name="image_not_supported" />
                      Clear Thumbnails (Free Space)
                    </>
                  )}
                </Button>

                <Button variant="ghost" size="bare"
                  onClick={handleClearStorage}
                  disabled={isClearing}
                  className="w-full py-3 px-4 bg-nb-black/80 hover:bg-nb-black/60 text-white font-semibold flex items-center justify-center gap-2 transition-nb disabled:opacity-50"
                >
                  {isClearing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Icon name="delete_forever" />
                      Clear All Files (Keep Structure)
                    </>
                  )}
                </Button>

                <Button variant="ghost" size="bare"
                  onClick={onClose}
                  className="w-full py-3 px-4 text-nb-black/40 hover:text-white text-sm transition-nb"
                >
                  I'll manage this later
                </Button>
              </div>

              {/* Tip */}
              <div className="bg-nb-blue/10 border border-nb-blue/20 p-3 flex gap-3">
                <Icon name="lightbulb" className="text-nb-blue shrink-0 mt-0.5" />
                <p className="text-nb-blue/60 text-xs">
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
