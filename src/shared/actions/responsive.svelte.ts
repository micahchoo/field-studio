/**
 * Responsive — DOM behavior (Category 3)
 *
 * Replaces useResponsive React hook.
 * Architecture doc §4 Cat 3: DOM events → reactive module singleton.
 *
 * Tracks window dimensions with RAF-throttled resize listener.
 * Components read: responsive.isMobile, responsive.width, etc.
 */

class ResponsiveStore {
  #width = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
  #height = $state(typeof window !== 'undefined' ? window.innerHeight : 768);
  #rafId = 0;
  #cleanup: (() => void) | null = null;

  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get isMobile(): boolean { return this.#width < 768; }
  get isTablet(): boolean { return this.#width >= 768 && this.#width <= 1024; }
  get isDesktop(): boolean { return this.#width > 1024; }
  get isTouchDevice(): boolean { return this.#width <= 1024; }

  /** Start listening for resize events. Call once at app init. */
  listen(): void {
    if (this.#cleanup) return;
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (this.#rafId) cancelAnimationFrame(this.#rafId);
      this.#rafId = requestAnimationFrame(() => {
        this.#width = window.innerWidth;
        this.#height = window.innerHeight;
      });
    };

    window.addEventListener('resize', handleResize);
    this.#cleanup = () => {
      window.removeEventListener('resize', handleResize);
      if (this.#rafId) cancelAnimationFrame(this.#rafId);
    };
  }

  /** Stop listening */
  destroy(): void {
    this.#cleanup?.();
    this.#cleanup = null;
  }
}

/** Global singleton */
export const responsive = new ResponsiveStore();
