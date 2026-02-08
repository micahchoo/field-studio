/**
 * ViewerPanels Molecule
 *
 * Composes: ViewerSearchPanel + IconButton + Panel containers
 *
 * Side panel container for search, metadata, and transcription panels.
 * Manages panel visibility and layout.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: ViewerSearchPanel, IconButton
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Consistent side panel experience
 * FAILURE PREVENTED: Panel layout conflicts, accessibility issues
 *
 * @module features/viewer/ui/molecules/ViewerPanels
 */

import React from 'react';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { type SearchResult, type SearchService, ViewerSearchPanel } from './ViewerSearchPanel';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFManifest } from '@/src/shared/types';

export interface ViewerPanelsProps {
  /** Currently selected canvas ID */
  currentCanvasId?: string;
  /** Manifest for search context */
  manifest: IIIFManifest | null;
  /** Search service extracted from manifest */
  searchService: SearchService | null;
  /** Whether search panel is visible */
  showSearchPanel: boolean;
  /** Called when search panel should close */
  onCloseSearchPanel: () => void;
  /** Called when a search result is selected */
  onSearchResultSelect?: (result: SearchResult) => void;
  /** Called when search results change */
  onSearchResultsChange?: (results: SearchResult[]) => void;
  /** Search callback */
  onSearch?: (query: string) => Promise<SearchResult[]>;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * ViewerPanels Molecule
 *
 * @example
 * <ViewerPanels
 *   manifest={manifest}
 *   searchService={searchService}
 *   showSearchPanel={showSearchPanel}
 *   onCloseSearchPanel={() => setShowSearchPanel(false)}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ViewerPanels: React.FC<ViewerPanelsProps> = ({
  currentCanvasId,
  manifest,
  searchService,
  showSearchPanel,
  onCloseSearchPanel,
  onSearchResultSelect,
  onSearchResultsChange,
  onSearch,
  cx,
  fieldMode,
}) => {
  if (!showSearchPanel) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 w-96 shadow-brutal z-50 flex flex-col ${
        fieldMode ? 'bg-nb-black' : 'bg-nb-white'
      }`}
    >
      {/* Panel Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          fieldMode ? 'border-nb-black' : 'border-nb-black/20'
        }`}
      >
        <h3 className={`font-bold ${fieldMode ? 'text-white' : 'text-nb-black'}`}>
          Search Manifest
        </h3>
        <IconButton
          icon="close"
          ariaLabel="Close search panel"
          onClick={onCloseSearchPanel}
          variant="ghost"
          size="sm"
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {showSearchPanel && manifest && (
          <ViewerSearchPanel
            manifest={manifest}
            searchService={searchService}
            onResultSelect={onSearchResultSelect || (() => {})}
            onResultsChange={onSearchResultsChange}
            currentCanvasId={currentCanvasId}
            cx={cx}
            fieldMode={fieldMode}
            onSearch={onSearch || (async () => [])}
          />
        )}
      </div>
    </div>
  );
};

export default ViewerPanels;
