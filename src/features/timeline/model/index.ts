/**
 * Timeline Feature Model
 *
 * Domain-specific logic for temporal visualization of IIIF items.
 * Handles navDate extraction, date grouping, and timeline state.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Reactive hooks for timeline state
 * - Date formatting and grouping utilities
 *
 * IDEAL OUTCOME: Consistent timeline behavior across the app
 * FAILURE PREVENTED: Invalid dates, inconsistent grouping, timezone issues
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { IIIFCanvas, IIIFItem } from '@/types';
import { isCanvas } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type ZoomLevel = 'day' | 'month' | 'year';

export interface TimelineGroup {
  date: string;
  displayDate: string;
  items: IIIFCanvas[];
}

export interface TimelineState {
  groups: TimelineGroup[];
  minDate: Date | null;
  maxDate: Date | null;
  totalItems: number;
  zoomLevel: ZoomLevel;
  selectedDate: string | null;
}

export interface UseTimelineReturn extends TimelineState {
  // Actions
  setZoomLevel: (level: ZoomLevel) => void;
  setSelectedDate: (date: string | null) => void;
  toggleDate: (date: string) => void;
  hasItems: boolean;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Extract date key based on zoom level
 */
export const getDateKey = (date: Date, zoomLevel: ZoomLevel): string => {
  switch (zoomLevel) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'day':
    default:
      return date.toISOString().split('T')[0];
  }
};

/**
 * Format display date based on zoom level
 */
export const formatDisplayDate = (date: Date, zoomLevel: ZoomLevel): string => {
  switch (zoomLevel) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case 'day':
    default:
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
  }
};

/**
 * Format time for display
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format short date for thumbnails
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString();
};

// ============================================================================
// Hook
// ============================================================================

export const useTimeline = (root: IIIFItem | null): UseTimelineReturn => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Extract and group dated items
  const { groups, minDate, maxDate, totalItems } = useMemo(() => {
    if (!root) {
      return { groups: [], minDate: null, maxDate: null, totalItems: 0 };
    }

    // Collect all canvases with navDate
    const items: IIIFCanvas[] = [];
    
    const traverse = (item: IIIFItem) => {
      if (isCanvas(item) && (item as IIIFCanvas).navDate) {
        items.push(item as IIIFCanvas);
      }
      if (item.items) {
        item.items.forEach(traverse);
      }
    };
    
    traverse(root);

    if (items.length === 0) {
      return { groups: [], minDate: null, maxDate: null, totalItems: 0 };
    }

    // Sort by date
    items.sort((a, b) => {
      const dateA = new Date(a.navDate!).getTime();
      const dateB = new Date(b.navDate!).getTime();
      return dateA - dateB;
    });

    // Group by zoom level
    const groupMap = new Map<string, IIIFCanvas[]>();

    items.forEach(item => {
      const date = new Date(item.navDate!);
      const key = getDateKey(date, zoomLevel);

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    });

    // Build groups array
    const groups: TimelineGroup[] = Array.from(groupMap.entries()).map(([date, groupItems]) => ({
      date,
      displayDate: groupItems[0] 
        ? formatDisplayDate(new Date(groupItems[0].navDate!), zoomLevel)
        : date,
      items: groupItems,
    }));

    const minDate = items[0]?.navDate ? new Date(items[0].navDate) : null;
    const maxDate = items[items.length - 1]?.navDate 
      ? new Date(items[items.length - 1].navDate!) 
      : null;

    return { groups, minDate, maxDate, totalItems: items.length };
  }, [root, zoomLevel]);

  // Toggle date selection
  const toggleDate = useCallback((date: string) => {
    setSelectedDate(current => current === date ? null : date);
  }, []);

  return {
    groups,
    minDate,
    maxDate,
    totalItems,
    zoomLevel,
    selectedDate,
    setZoomLevel,
    setSelectedDate,
    toggleDate,
    hasItems: totalItems > 0,
  };
};

// ============================================================================
// Grid Layout Utilities
// ============================================================================

/**
 * Get grid columns based on zoom level
 */
export const getGridColumns = (zoomLevel: ZoomLevel): string => {
  switch (zoomLevel) {
    case 'day':
      return 'grid-cols-4 md:grid-cols-6';
    case 'month':
      return 'grid-cols-6 md:grid-cols-8';
    case 'year':
    default:
      return 'grid-cols-8 md:grid-cols-12';
  }
};

/**
 * Calculate position percentage on timeline
 */
export const getTimelinePosition = (
  date: Date,
  minDate: Date,
  maxDate: Date
): number => {
  const startTime = minDate.getTime();
  const endTime = maxDate.getTime();
  const itemTime = date.getTime();
  
  if (endTime <= startTime) return 0;
  return ((itemTime - startTime) / (endTime - startTime)) * 100;
};
