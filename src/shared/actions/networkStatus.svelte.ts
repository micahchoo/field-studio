/**
 * Network Status — DOM behavior (Category 3) + Reactive store
 *
 * Replaces useNetworkStatus React hook.
 * Architecture doc §4 Cat 3: DOM events → reactive module singleton.
 *
 * Module singleton with $state, updated by window online/offline events.
 * Components read: networkStatus.isOnline
 */

class NetworkStatusStore {
  #isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
  #cleanup: (() => void) | null = null;

  get isOnline(): boolean { return this.#isOnline; }

  /** Start listening for online/offline events. Call once at app init. */
  listen(): void {
    if (this.#cleanup) return; // already listening
    if (typeof window === 'undefined') return;

    const handleOnline = () => { this.#isOnline = true; };
    const handleOffline = () => { this.#isOnline = false; };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.#cleanup = () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  /** Stop listening (cleanup) */
  destroy(): void {
    this.#cleanup?.();
    this.#cleanup = null;
  }
}

/** Global singleton */
export const networkStatus = new NetworkStatusStore();
