
/**
 * Guidance Service
 *
 * Tracks which help tips, tooltips, and hints the user has seen.
 * Supports just-in-time contextual help that doesn't repeat.
 */

import { storageLog } from '@/src/shared/services/logger';

export type GuidanceTopic =
  // Legacy intro topics
  | 'intro-archive'
  | 'intro-collections'
  | 'intro-viewer'
  // Concept explanations
  | 'concept-manifest'
  | 'concept-canvas'
  | 'concept-collection'
  | 'concept-annotation'
  | 'concept-range'
  // Feature introductions
  | 'feature-ingest'
  | 'feature-export'
  | 'feature-metadata'
  | 'feature-validation'
  // Validation/error guidance
  | 'validation-error'
  // Dynamic tooltip/hint IDs (prefixed)
  | `tooltip-${string}`
  | `hint-${string}`;

class GuidanceService {
  private seenTopics: Set<string> = new Set();
  private readonly STORAGE_KEY = 'iiif-field-guidance';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.seenTopics = new Set(JSON.parse(stored));
      }
    } catch (e) {
      storageLog.warn("Failed to load guidance state");
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.seenTopics)));
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  /**
   * Subscribe to changes in guidance state
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Check if a topic has been seen
   */
  hasSeen(topic: GuidanceTopic | string): boolean {
    return this.seenTopics.has(topic);
  }

  /**
   * Mark a topic as seen
   */
  markSeen(topic: GuidanceTopic | string) {
    if (!this.seenTopics.has(topic)) {
      this.seenTopics.add(topic);
      this.save();
    }
  }

  /**
   * Get count of seen topics (for settings display)
   */
  getSeenCount(): number {
    return this.seenTopics.size;
  }

  /**
   * Reset all guidance - show all tips again
   */
  reset() {
    this.seenTopics.clear();
    this.save();
  }

  /**
   * Reset only tooltips and hints, keep major introductions
   */
  resetTooltips() {
    const toRemove: string[] = [];
    this.seenTopics.forEach(topic => {
      if (topic.startsWith('tooltip-') || topic.startsWith('hint-')) {
        toRemove.push(topic);
      }
    });
    toRemove.forEach(t => this.seenTopics.delete(t));
    this.save();
  }

  /**
   * Check if user has completed initial setup
   */
  hasCompletedSetup(): boolean {
    return localStorage.getItem('iiif-field-setup-complete') === 'true';
  }

  /**
   * Mark setup as complete
   */
  completeSetup() {
    localStorage.setItem('iiif-field-setup-complete', 'true');
  }

  /**
   * Reset setup state (for testing)
   */
  resetSetup() {
    localStorage.removeItem('iiif-field-setup-complete');
  }
}

export const guidance = new GuidanceService();
