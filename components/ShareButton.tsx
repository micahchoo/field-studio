/**
 * ShareButton Component
 * Generates IIIF Content State API 1.0 shareable links for current view
 *
 * Consistent Placement: Top-right action area (designSystem.NAVIGATION.actions.primary)
 * Visual: Secondary button with link icon
 * Tactile: Minimum 44px touch target, scales to 56px in field mode
 */

import React, { useState } from 'react';
import { IIIFItem } from '../types';
import { contentStateService } from '../services/contentState';
import { useToast } from './Toast';
import { Icon } from './Icon';
import { PATTERNS, SPACING, COLORS, TOUCH_TARGETS } from '../designSystem';

interface ShareButtonProps {
  item: IIIFItem | null;
  selectedRegion?: { x: number; y: number; w: number; h: number } | null;
  fieldMode?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  item,
  selectedRegion,
  fieldMode = false
}) => {
  const { showToast } = useToast();
  const [showPopover, setShowPopover] = useState(false);

  if (!item) return null;

  const generateContentState = (): any => {
    const baseState: any = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      type: 'Annotation',
      motivation: 'contentState',
    };

    // If region is selected, create SpecificResource target
    if (selectedRegion) {
      baseState.target = {
        type: 'SpecificResource',
        source: {
          id: item.id,
          type: item.type,
        },
        selector: {
          type: 'FragmentSelector',
          conformsTo: 'http://www.w3.org/TR/media-frags/',
          value: `xywh=${selectedRegion.x},${selectedRegion.y},${selectedRegion.w},${selectedRegion.h}`,
        },
      };
    } else {
      // Simple target for whole resource
      baseState.target = {
        id: item.id,
        type: item.type,
      };
    }

    // Add partOf for Canvas/Canvas within Manifest context
    if (item.type === 'Canvas' && item.partOf) {
      baseState.target.partOf = item.partOf;
    }

    return baseState;
  };

  const handleShare = async () => {
    try {
      const state = generateContentState();
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = contentStateService.generateLink(baseUrl, state);

      // Try native share API first (mobile)
      if (navigator.share && fieldMode) {
        await navigator.share({
          title: item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'IIIF Resource',
          text: 'View this resource in Field Studio',
          url: shareUrl,
        });
        showToast('Shared successfully', 'success');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard', 'success');
        setShowPopover(true);
        setTimeout(() => setShowPopover(false), 3000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToast('Failed to generate shareable link', 'error');
    }
  };

  // Dynamic sizing based on field mode
  const buttonSize = fieldMode ? TOUCH_TARGETS.field : TOUCH_TARGETS.minimum;

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-lg border transition-all
          ${fieldMode
            ? 'bg-black text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-blue-500'
          }
          ${fieldMode ? 'font-bold' : 'font-medium'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        style={{
          height: buttonSize.height,
          minWidth: buttonSize.width,
          padding: `0 ${fieldMode ? SPACING[6] : SPACING[4]}`,
          fontSize: fieldMode ? '18px' : '14px',
        }}
        aria-label="Share this view"
        title={PATTERNS.shareButton.tooltip}
      >
        <Icon name="share" style={{ fontSize: fieldMode ? '24px' : '16px' }} />
        {!fieldMode && <span>{PATTERNS.shareButton.label}</span>}
      </button>

      {/* Popover confirmation */}
      {showPopover && !fieldMode && (
        <div
          className="absolute top-full right-0 mt-2 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl z-50"
          style={{
            minWidth: '220px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="flex items-start gap-2">
            <Icon name="check" className="text-green-400 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Link Copied!</div>
              <div className="text-slate-300 text-xs">
                Anyone with this link can view {selectedRegion ? 'this region' : 'this resource'}
              </div>
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
