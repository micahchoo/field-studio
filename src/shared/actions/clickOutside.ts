/**
 * Click Outside — DOM behavior action (Category 3)
 *
 * Utility action for closing menus/dropdowns/modals on click outside.
 * Used by ContextMenu, DropdownSelect, etc.
 *
 * Usage: <div use:clickOutside={{ onClose }}>
 */

export interface ClickOutsideParams {
  onClose: () => void;
  /** Delay before activating listener (prevents same-click close). Default: 10ms */
  delay?: number;
}

export function clickOutside(node: HTMLElement, params: ClickOutsideParams) {
  let { onClose, delay = 10 } = params;
  let active = false;

  function handleClick(e: MouseEvent) {
    if (!active) return;
    if (!node.contains(e.target as Node)) {
      onClose();
    }
  }

  // Delay activation to avoid closing on the same click that opened the element
  const timer = setTimeout(() => {
    active = true;
    document.addEventListener('click', handleClick, true);
  }, delay);

  return {
    update(newParams: ClickOutsideParams) {
      onClose = newParams.onClose;
    },
    destroy() {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick, true);
    },
  };
}
