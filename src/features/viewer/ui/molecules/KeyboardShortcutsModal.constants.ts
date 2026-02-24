/**
 * Keyboard shortcut groups for the viewer.
 * Extracted from KeyboardShortcutsModal.svelte so the data can be
 * imported by tests without mounting the component.
 */

export interface ShortcutEntry {
  keys: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  mediaType: 'image' | 'media' | 'all';
  shortcuts: ShortcutEntry[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    mediaType: 'image',
    shortcuts: [
      { keys: ['W', '↑'], description: 'Pan up' },
      { keys: ['S', '↓'], description: 'Pan down' },
      { keys: ['A', '←'], description: 'Pan left' },
      { keys: ['D', '→'], description: 'Pan right' },
      { keys: ['0'], description: 'Reset view (home)' },
    ],
  },
  {
    title: 'Zoom',
    mediaType: 'image',
    shortcuts: [
      { keys: ['+', '='], description: 'Zoom in' },
      { keys: ['-', '_'], description: 'Zoom out' },
      { keys: ['Double-click'], description: 'Zoom to point' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
    ],
  },
  {
    title: 'Rotation & Flip',
    mediaType: 'image',
    shortcuts: [
      { keys: ['R'], description: 'Rotate clockwise 90°' },
      { keys: ['Shift', 'R'], description: 'Rotate counter-clockwise 90°' },
      { keys: ['F'], description: 'Flip horizontally' },
    ],
  },
  {
    title: 'Tools',
    mediaType: 'image',
    shortcuts: [
      { keys: ['A'], description: 'Toggle annotation tool' },
      { keys: ['M'], description: 'Toggle measurement tool' },
      { keys: ['Esc'], description: 'Exit fullscreen / cancel drawing' },
      { keys: ['Ctrl', 'Z'], description: 'Undo last annotation point' },
      { keys: ['Enter'], description: 'Close polygon (when drawing)' },
    ],
  },
  {
    title: 'Playback',
    mediaType: 'media',
    shortcuts: [
      { keys: ['Space', 'K'], description: 'Play / Pause' },
      { keys: ['J'], description: 'Seek backward 5 seconds' },
      { keys: ['L'], description: 'Seek forward 5 seconds' },
      { keys: ['Home'], description: 'Seek to beginning' },
      { keys: ['End'], description: 'Seek to end' },
      { keys: ['0-9'], description: 'Seek to 0%-90%' },
    ],
  },
  {
    title: 'Volume & Speed',
    mediaType: 'media',
    shortcuts: [
      { keys: ['↑'], description: 'Volume up' },
      { keys: ['↓'], description: 'Volume down' },
      { keys: ['M'], description: 'Toggle mute' },
      { keys: ['<'], description: 'Decrease playback speed' },
      { keys: ['>'], description: 'Increase playback speed' },
    ],
  },
  {
    title: 'General',
    mediaType: 'all',
    shortcuts: [
      { keys: ['?'], description: 'Show / hide this help' },
      { keys: ['Esc'], description: 'Exit fullscreen' },
    ],
  },
];
