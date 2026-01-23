
/**
 * IIIF Content State API 1.0 Utility
 * Handles Base64 URL-safe encoding/decoding of content states.
 */

export const contentStateService = {
  encode: (json: object): string => {
    const str = JSON.stringify(json);
    const uriEncoded = encodeURIComponent(str);
    const base64 = btoa(uriEncoded);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  },

  decode: (encoded: string): any => {
    try {
      // Restore padding
      let s = encoded;
      while (s.length % 4 !== 0) s += "=";
      const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
      const uriDecoded = atob(base64);
      const str = decodeURIComponent(uriDecoded);
      return JSON.parse(str);
    } catch (e) {
      console.error("[ContentState] Decoding failed", e);
      return null;
    }
  },

  generateLink: (baseUrl: string, state: object): string => {
    const encoded = contentStateService.encode(state);
    const url = new URL(baseUrl);
    url.searchParams.set('iiif-content', encoded);
    return url.toString();
  }
};
