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

import React, { useState, useRef, useEffect } from 'react';
import { IIIFItem } from '../types';
import { contentStateService, ViewportState } from '../services/contentState';
import { useToast } from './Toast';
import { Icon } from './Icon';
import { PATTERNS, SPACING, COLORS, TOUCH_TARGETS } from '../designSystem';

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
      }
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleCopyCanvasLink = async () => {
    try {
      const viewport = getViewportState();
      const link = contentStateService.generateCanvasLink(
        window.location.origin + window.location.pathname,
        viewport.manifestId,
        viewport.canvasId
      );
      await navigator.clipboard.writeText(link);
      setCopied('canvas');
      showToast('Canvas link copied to clipboard', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleCopyEmbedCode = async () => {
    try {
      const viewport = getViewportState();
      const embedCode = contentStateService.generateEmbedCode(viewport);
      await navigator.clipboard.writeText(embedCode);
      setCopied('embed');
      showToast('Embed code copied to clipboard', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      showToast('Failed to copy embed code', 'error');
    }
  };

  const handleCopyJson = async () => {
    try {
      const viewport = getViewportState();
      const state = contentStateService.createContentState(viewport);
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied('json');
      showToast('Content State JSON copied', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
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
        title: item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'IIIF Resource',
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
      <button
        onClick={handleFieldModeShare}
        draggable
        onDragStart={handleDragStart}
        className="
          inline-flex items-center justify-center gap-2
          rounded-lg border transition-all
          bg-black text-yellow-400 border-yellow-400
          hover:bg-yellow-400 hover:text-black
          font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400
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
      </button>
    );
  }

  // Desktop mode: dropdown menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        draggable
        onDragStart={handleDragStart}
        className={`
          ${sizeClasses[size]}
          inline-flex items-center justify-center gap-2
          rounded-lg border transition-all
          bg-white text-slate-700 border-slate-300
          hover:bg-slate-50 hover:border-blue-500
          font-medium focus:outline-none focus:ring-2 focus:ring-blue-500
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
      </button>

      {showMenu && (
        <div
          className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          role="menu"
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Share This View</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {selectedRegion ? 'Includes current zoom region' : 'Links to this canvas'}
              {currentTime ? ` at ${currentTime.start}s` : ''}
            </p>
          </div>

          <div className="p-2 space-y-1">
            {/* Copy View Link */}
            <button
              onClick={handleCopyViewLink}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-iiif-blue/10 rounded-lg flex items-center justify-center text-iiif-blue group-hover:bg-iiif-blue group-hover:text-white transition-colors">
                <Icon name={copied === 'view' ? 'check' : 'content_copy'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {copied === 'view' ? 'Copied!' : 'Copy View Link'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {selectedRegion ? 'Share exact zoom & position' : 'Share current canvas'}
                </div>
              </div>
            </button>

            {/* Copy Canvas Link (simpler) */}
            {selectedRegion && (
              <button
                onClick={handleCopyCanvasLink}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 text-left transition-colors group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                  <Icon name={copied === 'canvas' ? 'check' : 'link'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {copied === 'canvas' ? 'Copied!' : 'Copy Canvas Link'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Link to canvas (no zoom)
                  </div>
                </div>
              </button>
            )}

            {/* Embed Code */}
            <button
              onClick={handleCopyEmbedCode}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 text-left transition-colors group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                <Icon name={copied === 'embed' ? 'check' : 'code'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  HTML iframe for websites
                </div>
              </div>
            </button>

            {/* Copy JSON */}
            <button
              onClick={handleCopyJson}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 text-left transition-colors group"
              role="menuitem"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                <Icon name={copied === 'json' ? 'check' : 'data_object'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {copied === 'json' ? 'Copied!' : 'Copy Content State JSON'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  IIIF Content State Annotation
                </div>
              </div>
            </button>

            {/* Native Share (if available) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 text-left transition-colors group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                  <Icon name="ios_share" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">Share via...</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Open system share dialog
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Icon name="drag_indicator" className="text-slate-400" />
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
