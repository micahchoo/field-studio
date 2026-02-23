/**
 * ContextMenu types.
 *
 * Stub: provides the ContextMenuSectionType used by staging model
 * menu builders. The actual ContextMenu UI is in ContextMenu.svelte.
 */

export interface ContextMenuItemType {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

export interface ContextMenuSectionType {
  title?: string;
  items: ContextMenuItemType[];
}
