/**
 * Shared Actions — Barrel export
 *
 * All shared Svelte actions (use:) exported from one place.
 */

export { focusTrap, type FocusTrapParams } from './focusTrap';
export { keyboardNav, type KeyboardNavParams } from './keyboardNav';
export { clickOutside, type ClickOutsideParams } from './clickOutside';
export { watchReducedMotion, prefersReducedMotion, getMotionDuration, getMotionTransitions, DURATIONS, TRANSITIONS } from './reducedMotion';
export { networkStatus } from './networkStatus.svelte';
export { responsive } from './responsive.svelte';
export { resizablePanel, type ResizablePanelParams } from './resizablePanel';
export { dragDrop, type DragDropParams } from './dragDrop';
export { keyboardDragDrop, type KeyboardDragDropParams } from './keyboardDragDrop';
export { panZoomGestures, type PanZoomParams } from './panZoomGestures';
export { viewportKeyboard, type ViewportKeyboardParams } from './viewportKeyboard';
