/**
 * Toast Notification Store — Svelte 5 Runes
 *
 * Global singleton replacing React ToastProvider.
 * Module store: class with $state fields, exported as singleton.
 * No context provider needed — import directly in any component.
 *
 * React source: src/shared/ui/molecules/Toast.tsx (ToastProvider)
 *
 * Usage:
 *   import { toast } from '@/src/shared/stores/toast.svelte';
 *
 *   toast.show('Saved successfully', 'success');
 *   toast.show('Error!', 'error', { label: 'Retry', onClick: retry });
 *   toast.showPersistent('Uploading...', 'info');
 *   toast.dismiss(id);
 *
 * WARNING: Do NOT destructure — breaks reactivity:
 *   const { items } = toast;  // ❌
 *   toast.items;              // ✅
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  persistent?: boolean;
}

const MAX_TOASTS = 3;
const TOAST_DURATION = 3000;

class ToastStore {
  #items = $state<ToastItem[]>([]);
  #timeouts = new Set<ReturnType<typeof setTimeout>>();

  /** Reactive toast list (read-only) */
  get items(): readonly ToastItem[] {
    return this.#items;
  }

  /** Reactive toast count */
  get count(): number {
    return this.#items.length;
  }

  /** Show a toast that auto-dismisses after TOAST_DURATION */
  show(message: string, type: ToastType = 'info', action?: ToastAction): string {
    const id = crypto.randomUUID().slice(0, 9);

    this.#items = [
      ...(this.#items.length >= MAX_TOASTS ? this.#items.slice(-(MAX_TOASTS - 1)) : this.#items),
      { id, message, type, action },
    ];

    const timeout = setTimeout(() => {
      this.dismiss(id);
      this.#timeouts.delete(timeout);
    }, TOAST_DURATION);
    this.#timeouts.add(timeout);

    return id;
  }

  /** Show a persistent toast (no auto-dismiss) */
  showPersistent(message: string, type: ToastType, action?: ToastAction): string {
    const id = crypto.randomUUID().slice(0, 9);

    this.#items = [
      ...(this.#items.length >= MAX_TOASTS ? this.#items.slice(-(MAX_TOASTS - 1)) : this.#items),
      { id, message, type, action, persistent: true },
    ];

    return id;
  }

  /** Dismiss a single toast by ID */
  dismiss(id: string): void {
    this.#items = this.#items.filter(t => t.id !== id);
  }

  /** Dismiss all toasts and clear pending timeouts */
  clear(): void {
    this.#items = [];
    this.#timeouts.forEach(clearTimeout);
    this.#timeouts.clear();
  }

  /** Dismiss the oldest toast (used for click-to-dismiss) */
  dismissOldest(): void {
    if (this.#items.length > 0) {
      this.dismiss(this.#items[0].id);
    }
  }

  /** Convenience: show a success toast */
  success(message: string, action?: ToastAction): string {
    return this.show(message, 'success', action);
  }

  /** Convenience: show an error toast */
  error(message: string, action?: ToastAction): string {
    return this.show(message, 'error', action);
  }

  /** Convenience: show a warning toast */
  warning(message: string, action?: ToastAction): string {
    return this.show(message, 'warning', action);
  }

  /** Convenience: show an info toast */
  info(message: string, action?: ToastAction): string {
    return this.show(message, 'info', action);
  }
}

/** Singleton toast store */
export const toast = new ToastStore();
