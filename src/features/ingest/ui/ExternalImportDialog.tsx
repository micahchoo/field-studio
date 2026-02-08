
import React, { useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
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

    // Validate URL before fetching
    try {
      const parsed = new URL(url);
      // Block dangerous protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('Only HTTP and HTTPS URLs are allowed.');
        return;
      }
      // Block private/local IPs
      const hostname = parsed.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
          hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || hostname === '0.0.0.0') {
        setError('Private/local network URLs are not allowed for external imports.');
        return;
      }
    } catch {
      setError('Please enter a valid URL.');
      return;
    }

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
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setError('Request timed out after 30 seconds. The server may be slow or unavailable.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load manifest');
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
    <div className="fixed inset-0 bg-nb-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in ">
      <div className="bg-nb-white shadow-brutal-lg max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-nb-white flex justify-between items-center">
          <h2 className="text-lg font-bold text-nb-black flex items-center gap-2">
            <Icon name="cloud_download" className="text-iiif-blue"/> 
            Import External IIIF
          </h2>
          <Button variant="ghost" size="bare" onClick={onClose} className="text-nb-black/40 hover:text-nb-black/60">
            <Icon name="close"/>
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-nb-black/50 uppercase mb-1">Manifest or Collection URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder="https://example.org/iiif/manifest.json"
                className="flex-1 border border-nb-black/20 px-3 py-2 text-sm focus:border-iiif-blue focus:ring-1 focus:ring-iiif-blue outline-none"
              />
              <Button variant="ghost" size="bare" 
                onClick={handleFetch}
                disabled={loading || !url}
                className="bg-nb-cream hover:bg-nb-cream text-nb-black/80 px-4 py-2 font-bold text-sm disabled:opacity-50"
              >
                {loading ? <Icon name="sync" className="animate-spin"/> : 'Fetch'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-nb-red/10 border border-nb-red/30 p-3 text-sm text-nb-red flex gap-2 items-start">
              <Icon name="error" className="mt-0.5 shrink-0"/>
              <div>
                <p className="font-bold">Error loading resource</p>
                <p className="text-xs mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {preview && (
            <div className="bg-nb-white border border-nb-black/20 p-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-nb-white border border-nb-black/20 flex items-center justify-center shrink-0 overflow-hidden">
                   {(preview as any).thumbnail?.[0]?.id ? (
                       <img src={(preview as any).thumbnail[0].id} className="w-full h-full object-cover" />
                   ) : (
                       <Icon name={isCollection(preview) ? 'folder' : 'menu_book'} className="text-nb-black/30 text-3xl"/>
                   )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 ${isCollection(preview) ? 'bg-nb-orange/20 text-nb-orange' : 'bg-nb-green/20 text-nb-green'}`}>
                      {preview.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-nb-black line-clamp-1">{getIIIFValue(preview.label, 'none') || getIIIFValue(preview.label, 'en') || 'Untitled'}</h3>
                  <p className="text-xs text-nb-black/50 mt-1 line-clamp-2">
                    {getIIIFValue(preview.summary, 'none') || getIIIFValue(preview.summary, 'en') || 'No description available.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-nb-white flex justify-end gap-2">
          <Button variant="ghost" size="bare" onClick={onClose} className="px-4 py-2 text-nb-black/60 font-bold text-sm hover:bg-nb-cream rounded">
            Cancel
          </Button>
          <Button variant="ghost" size="bare" 
            onClick={handleConfirm}
            disabled={!preview}
            className="bg-iiif-blue text-white px-6 py-2 font-bold text-sm hover:bg-nb-blue disabled:opacity-50 disabled:cursor-not-allowed shadow-brutal-sm flex items-center gap-2"
          >
            <Icon name="add" /> Add to Archive
          </Button>
        </div>
      </div>
    </div>
  );
};
