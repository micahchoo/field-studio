/**
 * Viewport Constants
 *
 * Shared constants for unified viewport management across all image viewing components.
 * These values standardize zoom, pan, and keyboard behavior throughout the application.
 */

// ============================================================================
// Default Values
// ============================================================================

export const VIEWPORT_DEFAULTS = {
  /** Minimum zoom level (10% of original size) */
  MIN_SCALE: 0.1,
  /** Maximum zoom level (500% of original size) */
  MAX_SCALE: 5,
  /** Initial zoom level (100%) */
  INITIAL_SCALE: 1,
  /** Multiplier for zoom in/out operations */
  ZOOM_STEP: 1.2,
  /** Mouse wheel sensitivity for zoom (scale change per deltaY unit) */
  WHEEL_SENSITIVITY: 0.001,
  /** Pixels to pan per arrow key press */
  PAN_KEYBOARD_STEP: 50,
  /** Default rotation (degrees) */
  INITIAL_ROTATION: 0,
  /** Rotation step for keyboard shortcuts (degrees) */
  ROTATION_STEP: 90,
} as const;

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export const VIEWPORT_KEYBOARD = {
  /** Keys that trigger zoom in */
  ZOOM_IN: ['+', '='],
  /** Keys that trigger zoom out */
  ZOOM_OUT: ['-'],
  /** Key that resets view (typically with Cmd/Ctrl modifier) */
  RESET: '0',
  /** Key that enables pan mode while held */
  PAN_MODE: ' ', // Space
  /** Key that rotates clockwise */
  ROTATE_CW: 'r',
  /** Key that rotates counter-clockwise (Shift+R) */
  ROTATE_CCW: 'R',
  /** Arrow keys for panning */
  PAN_UP: 'ArrowUp',
  PAN_DOWN: 'ArrowDown',
  PAN_LEFT: 'ArrowLeft',
  PAN_RIGHT: 'ArrowRight',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface ViewportState {
  /** Pan offset X in pixels */
  x: number;
  /** Pan offset Y in pixels */
  y: number;
  /** Zoom level (1 = 100%) */
  scale: number;
  /** Rotation in degrees */
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
