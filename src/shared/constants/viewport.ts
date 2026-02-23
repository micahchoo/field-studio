// Pure TypeScript — no Svelte-specific conversion

/**
 * Viewport Constants
 *
 * Shared constants for unified viewport management across all image viewing components.
 */

// ============================================================================
// Default Values
// ============================================================================

export const VIEWPORT_DEFAULTS = {
  MIN_SCALE: 0.1,
  MAX_SCALE: 5,
  INITIAL_SCALE: 1,
  ZOOM_STEP: 1.2,
  WHEEL_SENSITIVITY: 0.001,
  PAN_KEYBOARD_STEP: 50,
  INITIAL_ROTATION: 0,
  ROTATION_STEP: 90,
} as const;

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export const VIEWPORT_KEYBOARD = {
  ZOOM_IN: ['+', '='],
  ZOOM_OUT: ['-'],
  RESET: '0',
  PAN_MODE: ' ',
  ROTATE_CW: 'r',
  ROTATE_CCW: 'R',
  PAN_UP: 'ArrowUp',
  PAN_DOWN: 'ArrowDown',
  PAN_LEFT: 'ArrowLeft',
  PAN_RIGHT: 'ArrowRight',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

export const DEFAULT_VIEWPORT_STATE: ViewportState = {
  x: 0,
  y: 0,
  scale: VIEWPORT_DEFAULTS.INITIAL_SCALE,
  rotation: VIEWPORT_DEFAULTS.INITIAL_ROTATION,
};
