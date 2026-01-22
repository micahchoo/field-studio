
export type GuidanceTopic = 
  | 'concept-manifest' 
  | 'concept-canvas' 
  | 'concept-collection'
  | 'intro-archive'
  | 'intro-collections'
  | 'intro-viewer'
  | 'validation-error';

class GuidanceService {
  private seenTopics: Set<string> = new Set();
  private readonly STORAGE_KEY = 'iiif-field-guidance';

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
      console.warn("Failed to load guidance state");
    }
  }

  private save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.seenTopics)));
  }

  hasSeen(topic: GuidanceTopic): boolean {
    return this.seenTopics.has(topic);
  }

  markSeen(topic: GuidanceTopic) {
    if (!this.seenTopics.has(topic)) {
      this.seenTopics.add(topic);
      this.save();
    }
  }

  reset() {
    this.seenTopics.clear();
    this.save();
  }
}

export const guidance = new GuidanceService();
