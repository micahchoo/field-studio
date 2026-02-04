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

// State & Info
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';

export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { ResourceTypeBadge } from './ResourceTypeBadge';
export type { ResourceTypeBadgeProps } from './ResourceTypeBadge';
