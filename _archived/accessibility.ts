/**
 * Accessibility Service
 * Ensures WCAG 2.1 AA compliance across the application
 *
 * Implements:
 * - Focus management for modals and navigation
 * - ARIA labels and announcements
 * - Keyboard navigation patterns
 * - Reduced motion support
 * - Screen reader utilities
 */

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private previousActiveElement: Element | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');

    return Array.from(this.element.querySelectorAll(selector));
  }

  activate(): void {
    this.previousActiveElement = document.activeElement;
    this.focusableElements = this.getFocusableElements();

    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown);

    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: Move backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: Move forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
}

/**
 * Manage focus restoration after navigation
 */
export function saveFocusPosition(): string | null {
  const active = document.activeElement;
  if (active && active.id) {
    return active.id;
  }
  return null;
}

export function restoreFocusPosition(id: string | null): void {
  if (id) {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
    }
  }
}

// ============================================================================
// ARIA Announcements
// ============================================================================

let announcer: HTMLElement | null = null;

function getAnnouncer(): HTMLElement {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }
  return announcer;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = getAnnouncer();
  el.setAttribute('aria-live', priority);

  // Clear and set to trigger announcement
  el.textContent = '';
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}

/**
 * Announce navigation changes
 */
export function announceNavigation(destination: string): void {
  announce(`Navigated to ${destination}`);
}

/**
 * Announce loading states
 */
export function announceLoading(isLoading: boolean, context?: string): void {
  if (isLoading) {
    announce(`Loading${context ? ` ${context}` : ''}...`);
  } else {
    announce(`${context || 'Content'} loaded`);
  }
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  action: () => void;
  description: string;
  scope?: string;
}

class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  constructor() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private getShortcutKey(
    key: string,
    modifiers?: KeyboardShortcut['modifiers']
  ): string {
    const parts: string[] = [];
    if (modifiers?.ctrl) parts.push('ctrl');
    if (modifiers?.shift) parts.push('shift');
    if (modifiers?.alt) parts.push('alt');
    if (modifiers?.meta) parts.push('meta');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut.key, shortcut.modifiers);
    this.shortcuts.set(key, shortcut);
  }

  unregister(key: string, modifiers?: KeyboardShortcut['modifiers']): void {
    const shortcutKey = this.getShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to blur inputs
      if (event.key === 'Escape') {
        target.blur();
      }
      return;
    }

    const key = this.getShortcutKey(event.key, {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    });

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  };
}

export const keyboardManager = new KeyboardManager();

// ============================================================================
// ARIA Label Utilities
// ============================================================================

/**
 * Generate descriptive labels for IIIF resources
 */
export function getResourceLabel(
  type: string,
  name: string,
  index?: number,
  total?: number
): string {
  let label = `${type}: ${name}`;
  if (typeof index === 'number' && typeof total === 'number') {
    label += `, item ${index + 1} of ${total}`;
  }
  return label;
}

/**
 * Generate button labels with state
 */
export function getButtonLabel(
  action: string,
  target?: string,
  state?: 'expanded' | 'collapsed' | 'selected' | 'loading'
): string {
  let label = action;
  if (target) {
    label += ` ${target}`;
  }
  if (state) {
    label += `, ${state}`;
  }
  return label;
}

/**
 * Generate form field descriptions
 */
export function getFieldDescription(
  label: string,
  required?: boolean,
  hint?: string,
  error?: string
): { 'aria-label': string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; 'aria-required'?: boolean } {
  const result: any = {
    'aria-label': label
  };

  if (required) {
    result['aria-required'] = true;
  }

  if (error) {
    result['aria-invalid'] = true;
  }

  return result;
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on preference
 */
export function getAnimationDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs;
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 */
export function meetsContrastAA(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Generate skip link targets for main content areas
 */
export const SKIP_TARGETS = {
  mainContent: 'main-content',
  sidebar: 'sidebar-content',
  inspector: 'inspector-content',
  navigation: 'main-navigation'
} as const;

/**
 * Create skip link element styles
 */
export const skipLinkStyles = `
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 10000;
    text-decoration: none;
    font-weight: bold;
  }
  .skip-link:focus {
    top: 0;
  }
`;

// ============================================================================
// React Hooks
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing focus trap in modals
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      trapRef.current = new FocusTrap(containerRef.current);
      trapRef.current.activate();
    }

    return () => {
      if (trapRef.current) {
        trapRef.current.deactivate();
        trapRef.current = null;
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard shortcuts within a component
 */
export function useKeyboardShortcut(
  key: string,
  action: () => void,
  modifiers?: KeyboardShortcut['modifiers'],
  deps: any[] = []
) {
  useEffect(() => {
    keyboardManager.register({
      key,
      modifiers,
      action,
      description: ''
    });

    return () => {
      keyboardManager.unregister(key, modifiers);
    };
  }, deps);
}

/**
 * Hook for announcing changes to screen readers
 */
export function useAnnounce() {
  return useCallback((message: string, priority?: 'polite' | 'assertive') => {
    announce(message, priority);
  }, []);
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

import { useState } from 'react';

// ============================================================================
// Accessible Component Patterns
// ============================================================================

/**
 * Props for accessible tree items
 */
export interface TreeItemA11yProps {
  'role': 'treeitem';
  'aria-expanded'?: boolean;
  'aria-selected': boolean;
  'aria-level': number;
  'aria-setsize': number;
  'aria-posinset': number;
  'tabIndex': number;
}

export function getTreeItemProps(
  isExpanded: boolean | undefined,
  isSelected: boolean,
  level: number,
  index: number,
  total: number,
  isFocused: boolean
): TreeItemA11yProps {
  return {
    'role': 'treeitem',
    'aria-expanded': isExpanded,
    'aria-selected': isSelected,
    'aria-level': level,
    'aria-setsize': total,
    'aria-posinset': index + 1,
    'tabIndex': isFocused ? 0 : -1
  };
}

/**
 * Props for accessible grid cells
 */
export interface GridCellA11yProps {
  'role': 'gridcell';
  'aria-rowindex': number;
  'aria-colindex': number;
  'aria-selected'?: boolean;
  'tabIndex': number;
}

export function getGridCellProps(
  rowIndex: number,
  colIndex: number,
  isSelected: boolean,
  isFocused: boolean
): GridCellA11yProps {
  return {
    'role': 'gridcell',
    'aria-rowindex': rowIndex + 1,
    'aria-colindex': colIndex + 1,
    'aria-selected': isSelected || undefined,
    'tabIndex': isFocused ? 0 : -1
  };
}
