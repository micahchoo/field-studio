/**
 * ShareButton Component - Enhanced with Full IIIF Content State API 1.0 Support
 *
 * Features:
 * - Copy View Link (with zoom region)
 * - Copy Canvas Link (simple)
 * - Copy Embed Code (iframe)
 * - Copy Content State JSON
 * - Drag-and-drop sharing
 * - Native share API (mobile)
 *
 * Consistent Placement: Top-right action area (designSystem.NAVIGATION.actions.primary)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { contentStateService, ViewportState } from '@/src/shared/services/contentState';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { COLORS, PATTERNS, SPACING, TOUCH_TARGETS } from '@/src/shared/config/design-tokens';

interface ShareButtonProps {
  item: IIIFItem | null;
  manifestId?: string;
  selectedRegion?: { x: number; y: number; w: number; h: number } | null;
  currentTime?: { start?: number; end?: number } | null;
  annotationId?: string | null;
  fieldMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  item,
  manifestId,
  selectedRegion,
  currentTime,
  annotationId,
  fieldMode = false,
  size = 'md'
}) => {
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!item) return null;

  // Build viewport state from props
  const getViewportState = (): ViewportState => {
    return {
      manifestId: manifestId || item.id,
      canvasId: item.id,
      region: selectedRegion || undefined,
      time: currentTime || undefined,
      annotationId: annotationId || undefined
    };
  };

  const handleCopyViewLink = async () => {
    try {
      const viewport = getViewportState();
      const success = await contentStateService.copyLink(viewport);
      if (success) {
        setCopied('view');
        showToast('View link copied to clipboard', 'success');
        setTimeout(() => setCopied(null), 2000);
      } else {
        showToast('Could not copy link - try again', 'warning');
      }
    } catch (error) {
      console.error('[ShareButton] Copy view link failed:', error);
      showToast('Failed to copy link', 'error');
    }
  };

  const handleCopyCanvasLink = async () => {
    try {
      const viewport = getViewportState();
      if (!viewport.canvasId) {
        showToast('No canvas selected', 'warning');
        return;
      }
      // For canvas link, just copy the direct canvas URI without viewport
      await navigator.clipboard.writeText(viewport.canvasId);
      setCopied('canvas');
      showToast('Canvas URI copied to clipboard', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('[ShareButton] Copy canvas link failed:', error);
      showToast('Failed to copy link', 'error');
    }
  };

  const handleCopyEmbedCode = async () => {
    try {
      const viewport = getViewportState();
      if (!viewport.manifestId || !viewport.canvasId) {
        showToast('No content to embed', 'warning');
        return;
      }
      const embedCode = contentStateService.generateEmbedCode(viewport, {
        viewerUrl: window.location.origin + window.location.pathname
      });
      await navigator.clipboard.writeText(embedCode);
      setCopied('embed');
      showToast('Embed code copied to clipboard', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('[ShareButton] Copy embed code failed:', error);
      showToast('Failed to copy embed code', 'error');
    }
  };

  const handleCopyJson = async () => {
    try {
      const viewport = getViewportState();
      if (!viewport.manifestId || !viewport.canvasId) {
        showToast('No content state to copy', 'warning');
        return;
      }
      const state = contentStateService.createContentState(viewport);
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied('json');
      showToast('Content State JSON copied', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('[ShareButton] Copy JSON failed:', error);
      showToast('Failed to copy JSON', 'error');
    }
  };

  const handleNativeShare = async () => {
    try {
      const viewport = getViewportState();
      const shareUrl = contentStateService.generateLink(
        window.location.origin + window.location.pathname,
        viewport
      );
      await navigator.share({
        title: getIIIFValue(item.label, 'en') || getIIIFValue(item.label, 'none') || 'IIIF Resource',
        text: 'View this resource in Field Studio',
        url: shareUrl,
      });
      showToast('Shared successfully', 'success');
      setShowMenu(false);
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        showToast('Share cancelled', 'info');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    const viewport = getViewportState();
    contentStateService.setDragData(e.dataTransfer, viewport);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Simple share for field mode
  const handleFieldModeShare = async () => {
    if (navigator.share) {
      await handleNativeShare();
    } else {
      await handleCopyViewLink();
    }
  };

  // Dynamic sizing
  const buttonSize = fieldMode ? TOUCH_TARGETS.field : TOUCH_TARGETS.minimum;
  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2',
    lg: 'p-3 text-lg'
  };

  // Field mode: simple button
  if (fieldMode) {
    return (
      <Button variant="ghost" size="bare"
        onClick={handleFieldModeShare}
        draggable
        onDragStart={handleDragStart}
        className="
          inline-flex items-center justify-center gap-2
           border transition-nb
          bg-nb-black text-nb-yellow border-nb-yellow
          hover:bg-nb-yellow hover:text-black
          font-bold focus:outline-none focus:ring-2 focus:ring-nb-yellow
          cursor-grab active:cursor-grabbing
        "
        style={{
          height: buttonSize.height,
          minWidth: buttonSize.width,
          padding: `0 ${SPACING[6]}`,
          fontSize: '18px',
        }}
        aria-label="Share this view"
        title="Share this view"
      >
        <Icon name="share" className="text-2xl" />
      </Button>
    );
  }

  // Desktop mode: dropdown menu
  return (
    <div className="relative" ref={menuRef}>
      <Button variant="ghost" size="bare"
        onClick={() => setShowMenu(!showMenu)}
        draggable
        onDragStart={handleDragStart}
        className={`
          ${sizeClasses[size]}
          inline-flex items-center justify-center gap-2
           border transition-nb
          bg-nb-white text-nb-black/80 border-nb-black/20
          hover:bg-nb-white hover:border-nb-blue
          font-medium focus:outline-none focus:ring-2 focus:ring-nb-blue
          cursor-grab active:cursor-grabbing
        `}
        style={{
          height: buttonSize.height,
          minWidth: buttonSize.width,
          padding: `0 ${SPACING[4]}`,
          fontSize: '14px',
        }}
        aria-label="Share this view"
        aria-expanded={showMenu}
        aria-haspopup="menu"
        title="Share (drag to share via drag-and-drop)"
      >
        <Icon name="share" className="text-base" />
        <span>{PATTERNS.shareButton.label}</span>
        <Icon name="expand_more" className="text-base opacity-50" />
      </Button>

      {showMenu && (
        <div
          className="absolute top-full right-0 mt-2 w-72 bg-nb-white shadow-brutal border border-nb-black/20 z-50 overflow-hidden"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          role="menu"
        >
          <div className="p-3 border-b border-nb-black/10 bg-nb-white">
            <h3 className="text-xs font-bold text-nb-black/80 uppercase tracking-wider">Share This View</h3>
            <p className="text-[10px] text-nb-black/50 mt-0.5">
              {selectedRegion ? 'Includes current zoom region' : 'Links to this canvas'}
              {currentTime ? ` at ${currentTime.start}s` : ''}
            </p>
          </div>

          <div className="p-2 space-y-1">
            {/* Copy View Link */}
            <Button variant="ghost" size="bare"
              onClick={handleCopyViewLink}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-nb-blue/10 text-left transition-nb group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-iiif-blue/10 flex items-center justify-center text-iiif-blue group-hover:bg-iiif-blue group-hover:text-white transition-nb">
                <Icon name={copied === 'view' ? 'check' : 'content_copy'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-nb-black">
                  {copied === 'view' ? 'Copied!' : 'Copy View Link'}
                </div>
                <div className="text-[10px] text-nb-black/50 truncate">
                  {selectedRegion ? 'Share exact zoom & position' : 'Share current canvas'}
                </div>
              </div>
            </Button>

            {/* Copy Canvas Link (simpler) */}
            {selectedRegion && (
              <Button variant="ghost" size="bare"
                onClick={handleCopyCanvasLink}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-nb-cream text-left transition-nb group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-nb-cream flex items-center justify-center text-nb-black/50 group-hover:bg-nb-cream transition-nb">
                  <Icon name={copied === 'canvas' ? 'check' : 'link'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-nb-black">
                    {copied === 'canvas' ? 'Copied!' : 'Copy Canvas Link'}
                  </div>
                  <div className="text-[10px] text-nb-black/50 truncate">
                    Link to canvas (no zoom)
                  </div>
                </div>
              </Button>
            )}

            {/* Embed Code */}
            <Button variant="ghost" size="bare"
              onClick={handleCopyEmbedCode}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-nb-cream text-left transition-nb group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-nb-cream flex items-center justify-center text-nb-black/50 group-hover:bg-nb-cream transition-nb">
                <Icon name={copied === 'embed' ? 'check' : 'code'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-nb-black">
                  {copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}
                </div>
                <div className="text-[10px] text-nb-black/50 truncate">
                  HTML iframe for websites
                </div>
              </div>
            </Button>

            {/* Copy JSON */}
            <Button variant="ghost" size="bare"
              onClick={handleCopyJson}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-nb-cream text-left transition-nb group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-nb-cream flex items-center justify-center text-nb-black/50 group-hover:bg-nb-cream transition-nb">
                <Icon name={copied === 'json' ? 'check' : 'data_object'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-nb-black">
                  {copied === 'json' ? 'Copied!' : 'Copy Content State JSON'}
                </div>
                <div className="text-[10px] text-nb-black/50 truncate">
                  IIIF Content State Annotation
                </div>
              </div>
            </Button>

            {/* Native Share (if available) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button variant="ghost" size="bare"
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-nb-cream text-left transition-nb group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-nb-cream flex items-center justify-center text-nb-black/50 group-hover:bg-nb-cream transition-nb">
                  <Icon name="ios_share" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-nb-black">Share via...</div>
                  <div className="text-[10px] text-nb-black/50 truncate">
                    Open system share dialog
                  </div>
                </div>
              </Button>
            )}
          </div>

          <div className="p-3 border-t border-nb-black/10 bg-nb-white">
            <div className="flex items-center gap-2 text-[10px] text-nb-black/50">
              <Icon name="drag_indicator" className="text-nb-black/40" />
              <span>Drag this button to share via drag-and-drop</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook to parse content state from URL on app initialization
 */
export const useContentStateFromUrl = () => {
  const [initialViewport, setInitialViewport] = useState<ViewportState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const viewport = contentStateService.parseFromUrl();
    if (viewport) {
      setInitialViewport(viewport);
    }
    setLoaded(true);
  }, []);

  return { initialViewport, loaded };
};

/**
 * Hook to handle content state drag-and-drop on a target element
 */
export const useContentStateDrop = (
  onDrop: (viewport: ViewportState) => void
) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const viewport = contentStateService.handleDrop(e.dataTransfer);
    if (viewport) {
      onDrop(viewport);
    }
  };

  return {
    isDraggingOver,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  };
};

export default ShareButton;
