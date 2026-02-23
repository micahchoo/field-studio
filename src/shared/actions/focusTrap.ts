/**
 * Focus Trap — DOM behavior action (Category 3)
 *
 * Replaces useFocusTrap React hook.
 * Architecture doc §4 Cat 3: Svelte action (use:focusTrap)
 *
 * Traps keyboard focus within a container element.
 * Auto-closes on Escape key (optional).
 *
 * Usage: <div use:focusTrap={{ onClose: handleClose }}>
 */

export interface FocusTrapParams {
  /** Called when Escape is pressed (optional) */
  onClose?: () => void;
  /** Whether the trap is currently active (default: true) */
  active?: boolean;
  /** Auto-focus the first focusable element on mount (default: true) */
  autoFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function focusTrap(node: HTMLElement, params: FocusTrapParams = {}) {
  let { onClose, active = true, autoFocus = true } = params;
  let previouslyFocused: HTMLElement | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!active) return;

    if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  function activate() {
    previouslyFocused = document.activeElement as HTMLElement | null;
    node.addEventListener('keydown', handleKeydown);

    if (autoFocus) {
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          node.setAttribute('tabindex', '-1');
          node.focus();
        }
      });
    }
  }

  function deactivate() {
    node.removeEventListener('keydown', handleKeydown);
    previouslyFocused?.focus();
  }

  if (active) activate();

  return {
    update(newParams: FocusTrapParams) {
      const wasActive = active;
      onClose = newParams.onClose;
      active = newParams.active ?? true;
      autoFocus = newParams.autoFocus ?? true;

      if (!wasActive && active) activate();
      if (wasActive && !active) deactivate();
    },
    destroy() {
      deactivate();
    },
  };
}
