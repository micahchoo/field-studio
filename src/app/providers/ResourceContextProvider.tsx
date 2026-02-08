/**
 * Resource Context
 * 
 * Tracks the current resource state (type, validation status, edit history, collaboration state, accessibility features)
 * to enable resource‑aware UI adaptations and contextual enrichment.
 * 
 * Uses split context pattern to prevent unnecessary re‑renders:
 * - ResourceStateContext: changes trigger re‑renders (for read‑only components)
 * - ResourceDispatchContext: stable reference, never triggers re‑renders (for actions)
 */

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { IIIFItem } from '@/src/shared/types';
import { ValidationSummary } from './useVaultSelectors';
import { CONTEXTUAL_TOKENS, HIERARCHY } from '@/src/shared/config/design-tokens';

// ============================================================================
// Types
// ============================================================================

/** Union of IIIF resource types as defined in IIIFItem.type */
export type IIIFResourceType = IIIFItem['type'];

/** Basic edit history tracking */
export interface EditHistory {
  /** Timestamp of last edit */
  lastEditedAt: number | null;
  /** Number of edits in current session */
  editCount: number;
  /** IDs of users who have edited (for collaboration) */
  editors: string[];
}

/** Collaboration status */
export interface CollaborationStatus {
  /** Whether resource is being edited by other users */
  isLocked: boolean;
  /** User IDs of current editors (if any) */
  lockedBy: string[];
  /** Version for optimistic concurrency */
  version: number;
}

/** Accessibility features for the resource */
export interface AccessibilitySettings {
  /** Whether alternative text is present */
  hasAltText: boolean;
  /** Whether resource has captions/subtitles */
  hasCaptions: boolean;
  /** Whether resource has audio descriptions */
  hasAudioDescription: boolean;
  /** Contrast ratio compliance level */
  contrastLevel: 'AA' | 'AAA' | 'none';
}

/** Resource context state */
export interface ResourceContextState {
  /** Currently selected resource (full entity or reference) */
  resource: IIIFItem | null;
  /** Resource type */
  type: IIIFResourceType | null;
  /** Validation status */
  validationStatus: ValidationSummary | null;
  /** Edit history */
  editHistory: EditHistory;
  /** Collaboration state */
  collaborationState: CollaborationStatus;
  /** Accessibility features */
  accessibilityFeatures: AccessibilitySettings;
  /** Timestamp when resource was selected */
  selectedAt: number;
  /** Associated user intent area (e.g., 'sidebar', 'inspector', 'canvas') */
  area?: string;
}

/** Resource context actions */
export interface ResourceContextActions {
  /** Set the current resource */
  setResource: (resource: IIIFItem | null, options?: Partial<Omit<ResourceContextState, 'resource' | 'selectedAt'>>) => void;
  /** Clear resource (reset to null) */
  clearResource: () => void;
  /** Update validation status */
  updateValidation: (validation: ValidationSummary) => void;
  /** Record an edit */
  recordEdit: (editorId?: string) => void;
  /** Update collaboration lock */
  setCollaborationLock: (isLocked: boolean, lockedBy?: string[], version?: number) => void;
  /** Update accessibility features */
  updateAccessibility: (features: Partial<AccessibilitySettings>) => void;
}

// ============================================================================
// Contexts
// ============================================================================

const ResourceStateContext = createContext<ResourceContextState | null>(null);
const ResourceDispatchContext = createContext<ResourceContextActions | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface ResourceContextProviderProps {
  children: ReactNode;
  /** Initial resource (optional) */
  initialResource?: IIIFItem | null;
}

export const ResourceContextProvider: React.FC<ResourceContextProviderProps> = ({
  children,
  initialResource = null
}) => {
  const [state, setState] = useState<ResourceContextState>({
    resource: initialResource,
    type: initialResource?.type || null,
    validationStatus: null,
    editHistory: {
      lastEditedAt: null,
      editCount: 0,
      editors: []
    },
    collaborationState: {
      isLocked: false,
      lockedBy: [],
      version: 1
    },
    accessibilityFeatures: {
      hasAltText: false,
      hasCaptions: false,
      hasAudioDescription: false,
      contrastLevel: 'none'
    },
    selectedAt: Date.now()
  });

  const setResource = useCallback((
    resource: IIIFItem | null,
    options?: Partial<Omit<ResourceContextState, 'resource' | 'selectedAt'>>
  ) => {
    setState({
      resource,
      type: resource?.type || null,
      validationStatus: options?.validationStatus || null,
      editHistory: options?.editHistory || {
        lastEditedAt: null,
        editCount: 0,
        editors: []
      },
      collaborationState: options?.collaborationState || {
        isLocked: false,
        lockedBy: [],
        version: 1
      },
      accessibilityFeatures: options?.accessibilityFeatures || {
        hasAltText: false,
        hasCaptions: false,
        hasAudioDescription: false,
        contrastLevel: 'none'
      },
      selectedAt: Date.now(),
      area: options?.area
    });
  }, []);

  const clearResource = useCallback(() => {
    setState({
      resource: null,
      type: null,
      validationStatus: null,
      editHistory: {
        lastEditedAt: null,
        editCount: 0,
        editors: []
      },
      collaborationState: {
        isLocked: false,
        lockedBy: [],
        version: 1
      },
      accessibilityFeatures: {
        hasAltText: false,
        hasCaptions: false,
        hasAudioDescription: false,
        contrastLevel: 'none'
      },
      selectedAt: Date.now()
    });
  }, []);

  const updateValidation = useCallback((validation: ValidationSummary) => {
    setState(prev => ({
      ...prev,
      validationStatus: validation
    }));
  }, []);

  const recordEdit = useCallback((editorId?: string) => {
    setState(prev => ({
      ...prev,
      editHistory: {
        lastEditedAt: Date.now(),
        editCount: prev.editHistory.editCount + 1,
        editors: editorId && !prev.editHistory.editors.includes(editorId)
          ? [...prev.editHistory.editors, editorId]
          : prev.editHistory.editors
      }
    }));
  }, []);

  const setCollaborationLock = useCallback((
    isLocked: boolean,
    lockedBy: string[] = [],
    version?: number
  ) => {
    setState(prev => ({
      ...prev,
      collaborationState: {
        isLocked,
        lockedBy,
        version: version ?? prev.collaborationState.version
      }
    }));
  }, []);

  const updateAccessibility = useCallback((features: Partial<AccessibilitySettings>) => {
    setState(prev => ({
      ...prev,
      accessibilityFeatures: {
        ...prev.accessibilityFeatures,
        ...features
      }
    }));
  }, []);

  const actions = useMemo<ResourceContextActions>(() => ({
    setResource,
    clearResource,
    updateValidation,
    recordEdit,
    setCollaborationLock,
    updateAccessibility,
  }), [
    setResource,
    clearResource,
    updateValidation,
    recordEdit,
    setCollaborationLock,
    updateAccessibility,
  ]);

  const stateValue = useMemo(() => state, [state]);

  return (
    <ResourceStateContext.Provider value={stateValue}>
      <ResourceDispatchContext.Provider value={actions}>
        {children}
      </ResourceDispatchContext.Provider>
    </ResourceStateContext.Provider>
  );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the resource context state (triggers re‑renders on changes)
 */
export function useResourceContextState(): ResourceContextState {
  const context = useContext(ResourceStateContext);
  if (!context) {
    throw new Error('useResourceContextState must be used within a ResourceContextProvider');
  }
  return context;
}

/**
 * Access resource context actions (stable reference, no re‑renders)
 */
export function useResourceContextDispatch(): ResourceContextActions {
  const context = useContext(ResourceDispatchContext);
  if (!context) {
    throw new Error('useResourceContextDispatch must be used within a ResourceContextProvider');
  }
  return context;
}

/** Derived helpers that depend on state (not in dispatch to keep dispatch stable) */
interface ResourceDerivedHelpers {
  isType: (type: IIIFResourceType) => boolean;
  getResourceStyles: () => React.CSSProperties;
}

function makeDerivedHelpers(stateType: IIIFResourceType | null): ResourceDerivedHelpers {
  return {
    isType: (type: IIIFResourceType) => stateType === type,
    getResourceStyles: () => {
      if (!stateType) return {};
      const config = HIERARCHY.iiifTypes[stateType as keyof typeof HIERARCHY.iiifTypes];
      if (!config) return {};
      return { color: config.color, borderLeft: `3px solid ${config.color}`, paddingLeft: '8px' };
    },
  };
}

/**
 * Combined hook for convenience (triggers re‑renders on state changes)
 */
export function useResourceContext(): ResourceContextState & ResourceContextActions & ResourceDerivedHelpers {
  const state = useResourceContextState();
  const actions = useResourceContextDispatch();
  return { ...state, ...actions, ...makeDerivedHelpers(state.type) };
}

/**
 * Optional access (returns null if not in provider)
 */
export function useResourceContextOptional(): (ResourceContextState & ResourceContextActions & ResourceDerivedHelpers) | null {
  const state = useContext(ResourceStateContext);
  const actions = useContext(ResourceDispatchContext);
  if (!state || !actions) return null;
  return { ...state, ...actions, ...makeDerivedHelpers(state.type) };
}

// ============================================================================
// Derived Resource Utilities
// ============================================================================

/**
 * Hook that returns whether a resource is currently selected
 */
export function useHasResource(): boolean {
  const { resource } = useResourceContextState();
  return resource !== null;
}

/**
 * Hook that returns whether the selected resource is a Canvas
 */
export function useIsCanvas(): boolean {
  const { type } = useResourceContextState();
  return type === 'Canvas';
}

/**
 * Hook that returns whether the selected resource is a Manifest
 */
export function useIsManifest(): boolean {
  const { type } = useResourceContextState();
  return type === 'Manifest';
}

/**
 * Hook that returns whether the selected resource is a Collection
 */
export function useIsCollection(): boolean {
  const { type } = useResourceContextState();
  return type === 'Collection';
}

/**
 * Hook that returns contextual microcopy for the current resource type
 */
export function useResourceMicrocopy(): string {
  const { type } = useResourceContextState();
  if (!type) return '';
  const config = CONTEXTUAL_TOKENS.contexts[type as keyof typeof CONTEXTUAL_TOKENS.contexts];
  return config?.microcopy ?? '';
}