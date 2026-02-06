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
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { contentStateService, ViewportState } from '@/src/shared/services/contentState';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { Button } from '@/ui/primitives/Button';
import { COLORS, PATTERNS, SPACING, TOUCH_TARGETS } from '../designSystem';

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

  // Field mode: simple button
  if (fieldMode) {
    return (
      <Button
        onClick={handleFieldModeShare}
        variant="primary"
        size="lg"
        style={{
          height: buttonSize.height,
          minWidth: buttonSize.width,
          padding: `0 ${SPACING[6]}`,
          fontSize: '18px',
          backgroundColor: '#000000',
          color: '#facc15',
          borderColor: '#facc15',
        }}
        aria-label="Share this view"
        title="Share this view"
        draggable
        onDragStart={handleDragStart}
      >
        <Icon name="share" className="text-2xl" />
      </Button>
    );
  }

  // Desktop mode: dropdown menu
  return (
    <div className="relative" ref={menuRef}>
      <Button
        onClick={() => setShowMenu(!showMenu)}
        variant="secondary"
        size="base"
        style={{
          height: buttonSize.height,
          minWidth: buttonSize.width,
          padding: `0 ${SPACING[4]}`,
          fontSize: '14px',
          gap: '8px',
        }}
        aria-label="Share this view"
        aria-expanded={showMenu}
        aria-haspopup="menu"
        title="Share (drag to share via drag-and-drop)"
        draggable
        onDragStart={handleDragStart}
      >
        <Icon name="share" className="text-base" />
        <span>{PATTERNS.shareButton.label}</span>
        <Icon name="expand_more" className="text-base opacity-50" />
      </Button>

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
            <MenuItemButton
              onClick={handleCopyViewLink}
              icon={copied === 'view' ? 'check' : 'content_copy'}
              label={copied === 'view' ? 'Copied!' : 'Copy View Link'}
              description={selectedRegion ? 'Share exact zoom & position' : 'Share current canvas'}
              highlighted={copied === 'view'}
            />

            {/* Copy Canvas Link (simpler) */}
            {selectedRegion && (
              <MenuItemButton
                onClick={handleCopyCanvasLink}
                icon={copied === 'canvas' ? 'check' : 'link'}
                label={copied === 'canvas' ? 'Copied!' : 'Copy Canvas Link'}
                description="Link to canvas (no zoom)"
                highlighted={copied === 'canvas'}
              />
            )}

            {/* Embed Code */}
            <MenuItemButton
              onClick={handleCopyEmbedCode}
              icon={copied === 'embed' ? 'check' : 'code'}
              label={copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}
              description="HTML iframe for websites"
              highlighted={copied === 'embed'}
            />

            {/* Copy JSON */}
            <MenuItemButton
              onClick={handleCopyJson}
              icon={copied === 'json' ? 'check' : 'data_object'}
              label={copied === 'json' ? 'Copied!' : 'Copy Content State JSON'}
              description="IIIF Content State Annotation"
              highlighted={copied === 'json'}
            />

            {/* Native Share (if available) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <MenuItemButton
                onClick={handleNativeShare}
                icon="ios_share"
                label="Share via..."
                description="Open system share dialog"
              />
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
 * Menu Item Button Component - Uses atomic Button
 */
interface MenuItemButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  description?: string;
  highlighted?: boolean;
}

const MenuItemButton: React.FC<MenuItemButtonProps> = ({
  onClick,
  icon,
  label,
  description,
  highlighted = false,
}) => {
  const iconElement = (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: highlighted ? '#3b82f6' : '#f1f5f9',
        color: highlighted ? '#ffffff' : '#64748b',
        transition: 'all 0.2s',
      }}
    >
      <Icon name={icon} className="text-base" aria-hidden="true" />
    </div>
  );

  const content = description ? (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{label}</span>
      <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {description}
      </span>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{label}</span>
    </div>
  );

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      fullWidth
      icon={iconElement}
      role="menuitem"
      style={{
        justifyContent: 'flex-start',
        padding: '10px',
        gap: '12px',
        textAlign: 'left',
        backgroundColor: 'transparent',
      }}
    >
      {content}
    </Button>
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
