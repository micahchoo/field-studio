/**
 * NavigationHeader Widget
 *
 * Composes: ArchiveHeader (from archive) + User Context
 *
 * This widget combines archive navigation with user context information
 * for the main application header.
 *
 * WIDGET COMPOSITION RULES:
 * - Pure composition only - no business logic
 * - Imports organisms from features (archive)
 * - Receives cx and fieldMode via props from template
 * - Exists strictly between Organisms and Pages
 */

import React from 'react';
import type { IIIFItem } from '@/src/shared/types';

import { ArchiveHeader } from '@/src/features/archive/ui/organisms/ArchiveHeader';
import type { ArchiveViewMode } from '@/src/features/archive/model';
import { HeaderTopBar } from './HeaderTopBar';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { HeaderUserMenu } from './HeaderUserMenu';

export interface NavigationHeaderProps {
  /** Current search/filter value */
  filter: string;
  /** Called when filter changes */
  onFilterChange: (value: string) => void;
  /** Current view mode */
  view: ArchiveViewMode;
  /** Called when view mode changes */
  onViewChange: (view: ArchiveViewMode) => void;
  /** Whether mobile layout is active */
  isMobile: boolean;
  /** Number of selected items */
  selectedCount: number;
  /** Whether selection has GPS metadata */
  selectionHasGPS: boolean;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to group selected items */
  onGroupIntoManifest: () => void;
  /** Callback to open map view */
  onOpenMap: () => void;
  /** Callback to edit metadata */
  onEditMetadata: () => void;
  /** Callback to batch edit */
  onBatchEdit: () => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
    warningBg: string;
    pageBg: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** User context - current user name */
  userName?: string;
  /** User context - current user avatar */
  userAvatar?: string;
  /** User context - organization name */
  organizationName?: string;
  /** Callback for user menu */
  onUserMenu?: () => void;
  /** Callback for settings */
  onSettings?: () => void;
  /** Callback for help */
  onHelp?: () => void;
  /** Current breadcrumb path */
  breadcrumbPath?: IIIFItem[];
  /** Callback when breadcrumb item is clicked */
  onBreadcrumbClick?: (item: IIIFItem) => void;
  /** Root item for breadcrumb */
  rootItem?: IIIFItem | null;
}

/**
 * NavigationHeader Widget
 *
 * Composes archive navigation with user context for the application header.
 * This widget sits between organisms and pages.
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t }) => (
 *     <NavigationHeader
 *       filter={filter}
 *       onFilterChange={setFilter}
 *       view={view}
 *       onViewChange={setView}
 *       isMobile={isMobile}
 *       selectedCount={selectedCount}
 *       selectionHasGPS={selectionHasGPS}
 *       onClearSelection={clearSelection}
 *       onGroupIntoManifest={handleGroup}
 *       onOpenMap={() => setView('map')}
 *       onEditMetadata={handleEdit}
 *       onBatchEdit={handleBatch}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       userName="Jane Doe"
 *       organizationName="Example Museum"
 *       onUserMenu={handleUserMenu}
 *       onSettings={handleSettings}
 *       breadcrumbPath={breadcrumbPath}
 *       onBreadcrumbClick={handleBreadcrumb}
 *       rootItem={root}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  filter,
  onFilterChange,
  view,
  onViewChange,
  isMobile,
  selectedCount,
  selectionHasGPS,
  onClearSelection,
  onGroupIntoManifest,
  onOpenMap,
  onEditMetadata,
  onBatchEdit,
  cx,
  fieldMode,
  t,
  userName,
  userAvatar,
  organizationName,
  onUserMenu,
  onSettings,
  onHelp,
  breadcrumbPath = [],
  onBreadcrumbClick,
  rootItem,
}) => {
  return (
    <header
      className={`flex flex-col border-b ${cx.border} ${cx.headerBg}`}
      role="banner"
    >
      {/* Top Row: Brand, Breadcrumb, User Context */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-nb-black/20">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <HeaderTopBar fieldMode={fieldMode} textColor={cx.text} />
          <HeaderBreadcrumb
            rootItem={rootItem}
            breadcrumbPath={breadcrumbPath}
            onBreadcrumbClick={onBreadcrumbClick}
            textMutedColor={cx.textMuted}
            t={t}
          />
        </div>

        {/* Right: User Context */}
        <HeaderUserMenu
          fieldMode={fieldMode}
          userName={userName}
          userAvatar={userAvatar}
          organizationName={organizationName}
          textMutedColor={cx.textMuted}
          onHelp={onHelp}
          onSettings={onSettings}
          onUserMenu={onUserMenu}
          t={t}
        />
      </div>

      {/* Bottom Row: Archive Controls (from archive feature) */}
      <ArchiveHeader
        filter={filter}
        onFilterChange={onFilterChange}
        view={view}
        onViewChange={onViewChange}
        isMobile={isMobile}
        selectedCount={selectedCount}
        selectionHasGPS={selectionHasGPS}
        onClearSelection={onClearSelection}
        onGroupIntoManifest={onGroupIntoManifest}
        onOpenMap={onOpenMap}
        onEditMetadata={onEditMetadata}
        onBatchEdit={onBatchEdit}
        cx={{
          surface: cx.surface,
          text: cx.text,
          accent: cx.accent,
        }}
        fieldMode={fieldMode}
      />
    </header>
  );
};

export default NavigationHeader;
