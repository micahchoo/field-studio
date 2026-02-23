/**
 * Molecules: Composed UI components (Svelte 5)
 *
 * Built from atoms + layout primitives. Molecules have minimal internal
 * state and receive theming via cx: ContextualClassNames prop.
 */

// ViewHeader system
export { ViewHeader, SelectionBar } from './ViewHeader';
export type { ViewHeaderProps, ViewHeaderSelectionBarProps, ViewHeaderHeight } from './ViewHeader';

// Form molecules
export { default as FormInput } from './FormInput.svelte';
export { default as FormSection } from './FormSection.svelte';
export { default as DebouncedInput } from './DebouncedInput.svelte';
export { default as SelectField } from './SelectField.svelte';
export { default as FilterInput } from './FilterInput.svelte';
export { default as SearchField } from './SearchField.svelte';
export { default as DropdownSelect } from './DropdownSelect.svelte';
export { default as RangeSelector } from './RangeSelector.svelte';

// State & container molecules
export { default as ModalDialog } from './ModalDialog.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as GuidanceEmptyState } from './GuidanceEmptyState.svelte';
export { default as LoadingState } from './LoadingState.svelte';
export { default as ErrorBoundary } from './ErrorBoundary.svelte';
export { default as ListContainer } from './ListContainer.svelte';
export { default as ListItemBase } from './ListItemBase.svelte';
export { default as ViewContainer } from './ViewContainer.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as TabBar } from './TabBar.svelte';

// Action molecules
export { default as ActionButton } from './ActionButton.svelte';
export { default as IconButton } from './IconButton.svelte';
export { default as MenuButton } from './MenuButton.svelte';
export { default as ViewToggle } from './ViewToggle.svelte';
export { default as Tooltip } from './Tooltip.svelte';
export { default as Toast } from './Toast.svelte';
export { default as ContextMenu } from './ContextMenu.svelte';
export { default as ContextMenuItem } from './ContextMenuItem.svelte';
export { default as ContextMenuSection } from './ContextMenuSection.svelte';
export { default as ContextMenuSelectionBadge } from './ContextMenuSelectionBadge.svelte';

// Card molecules
export { default as CollectionCard } from './CollectionCard.svelte';
export { default as CollectionCardHeader } from './CollectionCardHeader.svelte';
export { default as CollectionCardEditForm } from './CollectionCardEditForm.svelte';
export { default as CollectionCardMenu } from './CollectionCardMenu.svelte';
export { default as CollectionCardDropOverlay } from './CollectionCardDropOverlay.svelte';

// Badge & status molecules
export { default as StatusBadge } from './StatusBadge.svelte';
export { default as FacetPill } from './FacetPill.svelte';
export { default as ResourceTypeBadge } from './ResourceTypeBadge.svelte';

// Selection molecules
export { default as SelectionToolbar } from './SelectionToolbar.svelte';
export { default as SelectionThumbnailStrip } from './SelectionThumbnailStrip.svelte';
export { default as FloatingSelectionToolbar } from './FloatingSelectionToolbar.svelte';

// Navigation molecules
export { default as BreadcrumbNav } from './BreadcrumbNav.svelte';
export { default as BreadcrumbSiblingMenu } from './BreadcrumbSiblingMenu.svelte';
export type { BreadcrumbItem } from './breadcrumbTypes';

// Display molecules
export { default as MuseumLabel } from './MuseumLabel.svelte';
export { default as PipelineBanner } from './PipelineBanner.svelte';

// Hint & reference molecules
export { default as FirstTimeHint } from './FirstTimeHint.svelte';
export { default as QuickReference } from './QuickReference.svelte';

// IIIF-specific molecules
export { default as AgentEditor } from './AgentEditor.svelte';
export { default as CanvasItem } from './CanvasItem.svelte';
export { default as ClusterBadge } from './ClusterBadge.svelte';
export { default as LinkListEditor } from './LinkListEditor.svelte';
export { default as MapMarker } from './MapMarker.svelte';
export { default as MetadataCard } from './MetadataCard.svelte';
export { default as MetadataFieldRenderer } from './MetadataFieldRenderer.svelte';
export { default as ResultCard } from './ResultCard.svelte';
export { default as StackedThumbnail } from './StackedThumbnail.svelte';
export { default as TimelineTick } from './TimelineTick.svelte';

// ViewHeader sub-components
export { ViewHeaderTitle, ViewHeaderCenter, ViewHeaderActions, ViewHeaderSubBar, ViewHeaderBody, ViewHeaderDivider } from './ViewHeader';
