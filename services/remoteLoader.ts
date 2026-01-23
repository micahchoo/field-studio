
import { IIIFItem } from '../types';

export interface RemoteResource {
  id: string;
  type: string;
  label?: Record<string, string[]>;
  summary?: Record<string, string[]>;
  items?: any[];
}

export const fetchRemoteManifest = async (url: string): Promise<IIIFItem> => {
  const fetchWithValidation = async (targetUrl: string) => {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Normalization for IIIF v2/v3 compatibility
    if (!data.type && data['@type']) {
        if (typeof data['@type'] === 'string') {
            if (data['@type'].indexOf('Manifest') !== -1) data.type = 'Manifest';
            else if (data['@type'].indexOf('Collection') !== -1) data.type = 'Collection';
        }
    }

    // Basic IIIF validation/normalization
    if (!data.type || (data.type !== 'Manifest' && data.type !== 'Collection')) {
       // Try to infer or fallback to Manifest if it looks like one (has sequences or items)
       if (data.sequences || data.items) {
           if (!data.type) data.type = 'Manifest';
       } else {
           throw new Error("Resource does not appear to be a valid IIIF Manifest or Collection");
       }
    }

    return data as IIIFItem;
  };

  try {
    return await fetchWithValidation(url);
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
           return await fetchWithValidation(proxyUrl);
       } catch (proxyError: any) {
           console.error("[RemoteLoader] Proxy fetch also failed:", proxyError);
           throw new Error("CORS Error: Unable to access resource directly or via proxy. The server likely blocks cross-origin requests.");
       }
    }
    
    throw error;
  }
};
