/**
 * Molecules: Composable UI Units
 *
 * All molecules are exported here for consistent imports across features.
 *
 * PRINCIPLE: Molecules are imported by organisms, never used directly in features.
 * Features compose organisms, which compose molecules.
 *
 * @example
 * import {
 *   FilterInput,
 *   SearchField,
 *   ViewToggle,
 *   ViewContainer,
 *   Toolbar,
 * } from '@/src/shared/ui/molecules';
 *
 * export const MyOrganism = () => (
 *   <ViewContainer
 *     title="Archive"
 *     icon="inventory"
 *     filter={{ value: filter, onChange: setFilter }}
 *     viewToggle={{ value: mode, onChange: setMode, options: [...] }}
 *   >
 *     <FilterInput value={search} onChange={setSearch} />
 *     <Toolbar>
 *       <Button onClick={onCreate}>Create</Button>
 *     </Toolbar>
 *   </ViewContainer>
 * );
 */

// Navigation & Tabs
export { TabBar } from './TabBar';
export type { TabBarProps, TabDefinition } from './TabBar';

// Form Controls & Selectors
export { SelectField } from './SelectField';
export type { SelectFieldProps, SelectOption, SelectOptionGroup } from './SelectField';

export { DropdownSelect } from './DropdownSelect';
export type { DropdownSelectProps, DropdownOption } from './DropdownSelect';

export { FormInput } from './FormInput';
export type { FormInputProps, FormInputType } from './FormInput';

// List Components
export { ListContainer } from './ListContainer';
export type { ListContainerProps } from './ListContainer';

export { ListItemBase } from './ListItemBase';
export type { ListItemBaseProps } from './ListItemBase';

// Modal & Dialog
export { ModalDialog } from './ModalDialog';
export type { ModalDialogProps, ModalSize } from './ModalDialog';

// Display & Content
export { StackedThumbnail } from './StackedThumbnail';
export type { StackedThumbnailProps } from './StackedThumbnail';

export { MuseumLabel } from './MuseumLabel';
export type { MuseumLabelProps, MuseumLabelType } from './MuseumLabel';

// Context Menu
export { ContextMenu } from './ContextMenu';
export type { ContextMenuProps, ContextMenuItem, ContextMenuSection } from './ContextMenu';

// Context Menu Sub-components
export { ContextMenuItem, getContextMenuItemClasses, getContextMenuIconClasses } from './ContextMenuItem';
export type { ContextMenuItemProps } from './ContextMenuItem';

export { ContextMenuSection } from './ContextMenuSection';
export type { ContextMenuSectionProps } from './ContextMenuSection';

export { ContextMenuSelectionBadge } from './ContextMenuSelectionBadge';
export type { ContextMenuSelectionBadgeProps } from './ContextMenuSelectionBadge';

// Filter & Search
export { FilterInput } from './FilterInput';
export type { FilterInputProps } from './FilterInput';

export { SearchField } from './SearchField';
export type { SearchFieldProps } from './SearchField';

export { DebouncedInput } from './DebouncedInput';
export type { DebouncedInputProps } from './DebouncedInput';

// Layout & Container
export { ViewContainer } from './ViewContainer';
export type { ViewContainerProps } from './ViewContainer';

export { ViewToggle } from './ViewToggle';
export type { ViewToggleProps, ViewToggleOption } from './ViewToggle';

// Actions & Controls
export { Toolbar } from './Toolbar';
export type { ToolbarProps } from './Toolbar';

export { SelectionToolbar } from './SelectionToolbar';
export type { SelectionToolbarProps } from './SelectionToolbar';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { ActionButton } from './ActionButton';
export type { ActionButtonProps } from './ActionButton';

export { MenuButton } from './MenuButton';
export type { MenuButtonProps } from './MenuButton';

// State & Info
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';

export { GuidedEmptyState } from './GuidedEmptyState';
export type { GuidedEmptyStateProps, WorkflowStep } from './GuidedEmptyState';

export { FloatingSelectionToolbar } from './FloatingSelectionToolbar';
export type { FloatingSelectionToolbarProps } from './FloatingSelectionToolbar';

export { BreadcrumbNav } from './BreadcrumbNav';
export type { BreadcrumbNavProps, BreadcrumbItem } from './BreadcrumbNav';

export { MetadataCard } from './MetadataCard';
export type { MetadataCardProps, MetadataField } from './MetadataCard';

export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { ResourceTypeBadge } from './ResourceTypeBadge';
export type { ResourceTypeBadgeProps } from './ResourceTypeBadge';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusVariant } from './StatusBadge';

// Search & Discovery (for decomposition)
export { FacetPill } from './FacetPill';
export type { FacetPillProps } from './FacetPill';

export { ResultCard } from './ResultCard';
export type { ResultCardProps } from './ResultCard';

// Viewer Controls - MOVED to viewer feature
// ZoomControl and PageCounter are now in src/features/viewer/ui/atoms/
// and should be imported from there instead.

// Map Components (for decomposition)
export { MapMarker } from './MapMarker';
export type { MapMarkerProps } from './MapMarker';

export { ClusterBadge } from './ClusterBadge';
export type { ClusterBadgeProps, ClusterItem } from './ClusterBadge';

// Timeline Components (for decomposition)
export { TimelineTick } from './TimelineTick';
export type { TimelineTickProps, TimelineItem } from './TimelineTick';

export { RangeSelector } from './RangeSelector';
export type { RangeSelectorProps, RangePreset } from './RangeSelector';

// Drag & Drop Components (Phase 4)
export { CanvasItem } from './CanvasItem';
export type { CanvasItemProps } from './CanvasItem';

export { CollectionCard } from './CollectionCard';
export type { CollectionCardProps } from './CollectionCard';

// CollectionCard Sub-components (for advanced composition)
export { CollectionCardHeader } from './CollectionCardHeader';
export type { CollectionCardHeaderProps } from './CollectionCardHeader';

export { CollectionCardDropOverlay } from './CollectionCardDropOverlay';
export type { CollectionCardDropOverlayProps } from './CollectionCardDropOverlay';

export { CollectionCardEditForm } from './CollectionCardEditForm';
export type { CollectionCardEditFormProps } from './CollectionCardEditForm';

export { CollectionCardMenu } from './CollectionCardMenu';
export type { CollectionCardMenuProps } from './CollectionCardMenu';
