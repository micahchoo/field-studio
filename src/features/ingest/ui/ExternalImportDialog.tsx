
import React, { useState } from 'react';
import { getIIIFValue, IIIFItem, isCollection } from '@/src/shared/types';
import { AuthRequiredResult, fetchRemoteResource, requiresAuth } from '@/src/shared/services/remoteLoader';
import { AuthService } from '@/src/shared/services/authService';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface ExternalImportDialogProps {
  onImport: (item: IIIFItem) => void;
  onClose: () => void;
  onAuthRequired?: (resourceId: string, authServices: AuthService[]) => void;
}

// Fetch timeout in milliseconds (30 seconds)
const FETCH_TIMEOUT_MS = 30000;

export const ExternalImportDialog: React.FC<ExternalImportDialogProps> = ({ onImport, onClose, onAuthRequired }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IIIFItem | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFetch = async () => {
    if (!url) return;

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller with timeout
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const result = await fetchRemoteResource(url, { signal: abortController.signal });

      // Check if authentication is required
      if (requiresAuth(result)) {
        if (onAuthRequired) {
          onAuthRequired(result.resourceId, result.authServices);
        } else {
          setError('This resource requires authentication, but auth is not configured.');
        }
        return;
      }

      setPreview(result.item);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Request timed out after 30 seconds. The server may be slow or unavailable.');
      } else {
        setError(e.message || "Failed to load manifest");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onImport(preview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Icon name="cloud_download" className="text-iiif-blue"/> 
            Import External IIIF
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="close"/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manifest or Collection URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder="https://example.org/iiif/manifest.json"
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:border-iiif-blue focus:ring-1 focus:ring-iiif-blue outline-none"
              />
              <button 
                onClick={handleFetch}
                disabled={loading || !url}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
              >
                {loading ? <Icon name="sync" className="animate-spin"/> : 'Fetch'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex gap-2 items-start">
              <Icon name="error" className="mt-0.5 shrink-0"/>
              <div>
                <p className="font-bold">Error loading resource</p>
                <p className="text-xs mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {preview && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-white rounded border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                   {(preview as any).thumbnail?.[0]?.id ? (
                       <img src={(preview as any).thumbnail[0].id} className="w-full h-full object-cover" />
                   ) : (
                       <Icon name={isCollection(preview) ? 'folder' : 'menu_book'} className="text-slate-300 text-3xl"/>
                   )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isCollection(preview) ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {preview.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 line-clamp-1">{getIIIFValue(preview.label, 'none') || getIIIFValue(preview.label, 'en') || 'Untitled'}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {getIIIFValue(preview.summary, 'none') || getIIIFValue(preview.summary, 'en') || 'No description available.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!preview}
            className="bg-iiif-blue text-white px-6 py-2 rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            <Icon name="add" /> Add to Archive
          </button>
        </div>
      </div>
    </div>
  );
};
