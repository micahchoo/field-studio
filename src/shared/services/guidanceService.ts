// Pure TypeScript — no Svelte-specific conversion

/**
 * Guidance Service
 *
 * Tracks which help tips, tooltips, and hints the user has seen.
 * Supports just-in-time contextual help that doesn't repeat.
 */

import { storageLog } from './logger';

export type GuidanceTopic =
  | 'intro-archive'
  | 'intro-collections'
  | 'intro-viewer'
  | 'concept-manifest'
  | 'concept-canvas'
  | 'concept-collection'
  | 'concept-annotation'
  | 'concept-range'
  | 'feature-ingest'
  | 'feature-export'
  | 'feature-metadata'
  | 'feature-validation'
  | 'validation-error'
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
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.seenTopics = new Set(JSON.parse(stored));
      }
    } catch {
      storageLog.warn('Failed to load guidance state');
    }
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.seenTopics)));
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  hasSeen(topic: GuidanceTopic | string): boolean {
    return this.seenTopics.has(topic);
  }

  markSeen(topic: GuidanceTopic | string) {
    if (!this.seenTopics.has(topic)) {
      this.seenTopics.add(topic);
      this.save();
    }
  }

  getSeenCount(): number {
    return this.seenTopics.size;
  }

  reset() {
    this.seenTopics.clear();
    this.save();
  }

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

  hasCompletedSetup(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('iiif-field-setup-complete') === 'true';
  }

  completeSetup() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('iiif-field-setup-complete', 'true');
  }

  resetSetup() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('iiif-field-setup-complete');
  }
}

export const guidance = new GuidanceService();
