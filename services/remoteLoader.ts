
import { IIIFItem } from '../types';
import { virtualManifestFactory } from './virtualManifestFactory';
import { specBridge } from './specBridge';

export interface RemoteResource {
  id: string;
  type: string;
  label?: Record<string, string[]>;
  summary?: Record<string, string[]>;
  items?: any[];
}

export interface FetchResult {
  item: IIIFItem;
  isVirtualManifest: boolean;
  originalUrl: string;
}

/**
 * Fetch a remote IIIF resource or wrap a media URL in a virtual manifest
 */
export const fetchRemoteManifest = async (url: string): Promise<IIIFItem> => {
  const result = await fetchRemoteResource(url);
  return result.item;
};

/**
 * Extended fetch that returns metadata about the fetch
 */
export const fetchRemoteResource = async (url: string): Promise<FetchResult> => {
  // Check if URL is a direct media file (image, audio, video)
  if (virtualManifestFactory.isMediaUrl(url)) {
    console.log('[RemoteLoader] Detected media URL, creating virtual manifest:', url);
    try {
      const manifest = await virtualManifestFactory.createManifest(url);
      return {
        item: manifest as IIIFItem,
        isVirtualManifest: true,
        originalUrl: url
      };
    } catch (e) {
      console.warn('[RemoteLoader] Virtual manifest creation failed, trying as IIIF:', e);
      // Fall through to try as IIIF
    }
  }

  const fetchWithValidation = async (targetUrl: string) => {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';

    // If it's an image/media type, wrap in virtual manifest
    if (contentType.startsWith('image/') ||
        contentType.startsWith('audio/') ||
        contentType.startsWith('video/')) {
      console.log('[RemoteLoader] Response is media type, creating virtual manifest');
      const manifest = await virtualManifestFactory.createManifest(url);
      return { data: manifest, isVirtual: true };
    }

    const data = await response.json();

    // Use specBridge for v2/v3 compatibility
    const upgraded = specBridge.importManifest(data);

    // Basic IIIF validation/normalization
    if (!upgraded.type || (upgraded.type !== 'Manifest' && upgraded.type !== 'Collection')) {
       // Try to infer or fallback to Manifest if it looks like one (has sequences or items)
       if ((upgraded as any).sequences || upgraded.items) {
           if (!upgraded.type) upgraded.type = 'Manifest';
       } else {
           throw new Error("Resource does not appear to be a valid IIIF Manifest or Collection");
       }
    }

    return { data: upgraded as IIIFItem, isVirtual: false };
  };

  try {
    const result = await fetchWithValidation(url);
    return {
      item: result.data,
      isVirtualManifest: result.isVirtual,
      originalUrl: url
    };
  } catch (error: any) {
    console.error("Failed to fetch remote manifest directly:", error);

    // Check for common CORS/Network errors (Firefox: "NetworkError...", Chrome: "Failed to fetch")
    const isNetworkError = error.name === 'TypeError' &&
      (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'));

    if (isNetworkError) {
       console.warn(`[RemoteLoader] CORS restriction detected for ${url}. Attempting fallback via proxy.`);
       try {
           // Using allorigins.win as a public proxy to bypass CORS for client-side usage
           const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
           const result = await fetchWithValidation(proxyUrl);
           return {
             item: result.data,
             isVirtualManifest: result.isVirtual,
             originalUrl: url
           };
       } catch (proxyError: any) {
           console.error("[RemoteLoader] Proxy fetch also failed:", proxyError);
           throw new Error("CORS Error: Unable to access resource directly or via proxy. The server likely blocks cross-origin requests.");
       }
    }

    throw error;
  }
};
