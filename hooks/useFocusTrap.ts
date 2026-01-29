/**
 * useFocusTrap Hook
 * 
 * Traps focus within a container element for accessibility.
 * Essential for modals, dialogs, and overlay components.
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   const containerRef = useFocusTrap(isOpen);
 *   
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       {children}
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useRef, useEffect, RefObject } from 'react';
import { FOCUS_TRAP, KEYBOARD } from '../constants';

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean;
  /** Element to return focus to when trap is deactivated */
  returnFocusTo?: HTMLElement | null;
  /** Delay before focusing first element (ms) */
  focusDelay?: number;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
}

/**
 * Hook to trap focus within a container
 * @param options - Configuration options
 * @returns RefObject to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions
): RefObject<T> {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { isActive, returnFocusTo, focusDelay = FOCUS_TRAP.focusDelay, onEscape } = options;

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the element that had focus before trapping
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Find all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll(FOCUS_TRAP.focusableSelector)
      ).filter((el): el is HTMLElement => {
        // Filter out disabled elements and hidden elements
        const htmlEl = el as HTMLElement;
        return (
          !htmlEl.hasAttribute('disabled') &&
          htmlEl.getAttribute('tabindex') !== '-1' &&
          htmlEl.offsetParent !== null // Check visibility
        );
      });
    };

    // Focus the first focusable element after a delay
    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        // Try to find an autofocus element first
        const autoFocusEl = focusable.find(el => el.hasAttribute('autofocus'));
        (autoFocusEl || focusable[0]).focus();
      }
    };

    const timer = setTimeout(focusFirstElement, focusDelay);

    // Handle Tab key to cycle focus
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === KEYBOARD.KEYS.ESCAPE && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Only handle Tab key
      if (e.key !== KEYBOARD.KEYS.TAB) return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      // Shift+Tab on first element -> focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> focus first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to previous element or specified element
      const elementToFocus = returnFocusTo || previousActiveElement.current;
      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        elementToFocus.focus();
      }
    };
  }, [isActive, returnFocusTo, focusDelay, onEscape]);

  return containerRef;
}

export default useFocusTrap;
