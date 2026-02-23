/**
 * Resource Context Store — Svelte 5 Runes
 *
 * Replaces React ResourceContextProvider.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Tracks the current resource state (type, validation status, edit history,
 * collaboration state, accessibility features) to enable resource-aware UI
 * adaptations and contextual enrichment.
 *
 * WARNING: Do NOT destructure — breaks reactivity.
 */

import type { IIIFItem } from '@/src/shared/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type IIIFResourceType = IIIFItem['type'];

export interface EditHistory {
  lastEditedAt: number | null;
  editCount: number;
  editors: string[];
}

export interface CollaborationStatus {
  isLocked: boolean;
  lockedBy: string[];
  version: number;
}

export interface AccessibilitySettings {
  hasAltText: boolean;
  hasCaptions: boolean;
  hasAudioDescription: boolean;
  contrastLevel: 'AA' | 'AAA' | 'none';
}

export interface ValidationSummary {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalIssues: number;
}

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

class ResourceContextStore {
  // ── Reactive state ──
  #resource = $state<IIIFItem | null>(null);
  #type = $state<IIIFResourceType | null>(null);
  #validationStatus = $state<ValidationSummary | null>(null);
  #editHistory = $state<EditHistory>({
    lastEditedAt: null,
    editCount: 0,
    editors: [],
  });
  #collaborationState = $state<CollaborationStatus>({
    isLocked: false,
    lockedBy: [],
    version: 1,
  });
  #accessibilityFeatures = $state<AccessibilitySettings>({
    hasAltText: false,
    hasCaptions: false,
    hasAudioDescription: false,
    contrastLevel: 'none',
  });
  #selectedAt = $state<number>(Date.now());
  #area = $state<string | undefined>(undefined);

  // ── Reactive getters ──

  get resource(): IIIFItem | null { return this.#resource; }
  get type(): IIIFResourceType | null { return this.#type; }
  get validationStatus(): ValidationSummary | null { return this.#validationStatus; }
  get editHistory(): EditHistory { return this.#editHistory; }
  get collaborationState(): CollaborationStatus { return this.#collaborationState; }
  get accessibilityFeatures(): AccessibilitySettings { return this.#accessibilityFeatures; }
  get selectedAt(): number { return this.#selectedAt; }
  get area(): string | undefined { return this.#area; }

  /** Derived: whether any resource is currently selected */
  get hasResource(): boolean { return this.#resource !== null; }

  /** Derived: whether the current resource is of a specific type */
  isType(type: IIIFResourceType): boolean { return this.#type === type; }

  get isCanvas(): boolean { return this.#type === 'Canvas'; }
  get isManifest(): boolean { return this.#type === 'Manifest'; }
  get isCollection(): boolean { return this.#type === 'Collection'; }

  // ── Actions ──

  /**
   * Set the current resource.
   * Resets edit history, collaboration state, and accessibility features
   * unless overrides are provided.
   */
  setResource(
    resource: IIIFItem | null,
    options?: {
      validationStatus?: ValidationSummary;
      editHistory?: EditHistory;
      collaborationState?: CollaborationStatus;
      accessibilityFeatures?: AccessibilitySettings;
      area?: string;
    }
  ): void {
    this.#resource = resource;
    this.#type = resource?.type ?? null;
    this.#validationStatus = options?.validationStatus ?? null;
    this.#editHistory = options?.editHistory ?? { lastEditedAt: null, editCount: 0, editors: [] };
    this.#collaborationState = options?.collaborationState ?? { isLocked: false, lockedBy: [], version: 1 };
    this.#accessibilityFeatures = options?.accessibilityFeatures ?? {
      hasAltText: false,
      hasCaptions: false,
      hasAudioDescription: false,
      contrastLevel: 'none',
    };
    this.#selectedAt = Date.now();
    this.#area = options?.area;
  }

  /** Clear resource — reset to null state */
  clearResource(): void {
    this.setResource(null);
  }

  /** Update validation status without clearing other state */
  updateValidation(validation: ValidationSummary): void {
    this.#validationStatus = validation;
  }

  /** Record an edit — increments edit count and adds editor to history */
  recordEdit(editorId?: string): void {
    this.#editHistory = {
      lastEditedAt: Date.now(),
      editCount: this.#editHistory.editCount + 1,
      editors:
        editorId && !this.#editHistory.editors.includes(editorId)
          ? [...this.#editHistory.editors, editorId]
          : this.#editHistory.editors,
    };
  }

  /** Update collaboration lock status */
  setCollaborationLock(
    isLocked: boolean,
    lockedBy: string[] = [],
    version?: number
  ): void {
    this.#collaborationState = {
      isLocked,
      lockedBy,
      version: version ?? this.#collaborationState.version,
    };
  }

  /** Update accessibility features (partial merge) */
  updateAccessibility(features: Partial<AccessibilitySettings>): void {
    this.#accessibilityFeatures = { ...this.#accessibilityFeatures, ...features };
  }
}

/** Global singleton */
export const resourceContext = new ResourceContextStore();
