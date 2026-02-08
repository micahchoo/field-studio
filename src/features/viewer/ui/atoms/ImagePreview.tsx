/**
 * ImagePreview Atom
 *
 * IIIF image preview with loading and error states.
 * Displays image with transform effects (rotation, mirror).
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Local UI state for error handling
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/ImagePreview
 */

import React, { useState } from 'react';
export interface ImagePreviewProps {
  /** Image URL to display */
  src: string;
  /** Rotation in degrees */
  rotation?: number;
  /** Whether image is mirrored horizontally */
  mirrored?: boolean;
  /** Alt text for accessibility */
  alt?: string;
}

const ERROR_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="400" height="300"/><text fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" font-family="sans-serif">Invalid Request</text></svg>';

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  rotation = 0,
  mirrored = false,
  alt = 'IIIF Image Preview',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const transformStyle: React.CSSProperties = {
    transform: `scaleX(${mirrored ? -1 : 1}) rotate(${rotation}deg)`,
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative group bg-nb-black">
      {/* Grid background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-nb-black/60 border-t-nb-blue animate-spin" />
            <span className="text-nb-black/50 text-xs">Loading...</span>
          </div>
        </div>
      )}

      {/* Image */}
      {src && (
        <img
          src={hasError ? ERROR_SVG : src}
          className="max-w-[90%] max-h-[90%] object-contain shadow-brutal-lg ring-1 ring-white/20 transition-nb bg-nb-black"
          style={transformStyle}
          onError={handleError}
          onLoad={handleLoad}
          alt={alt}
        />
      )}
    </div>
  );
};

export default ImagePreview;
