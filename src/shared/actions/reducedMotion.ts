/**
 * Reduced Motion — DOM behavior (Category 3)
 *
 * Replaces useReducedMotion React hook.
 * Architecture doc §4 Cat 3: Svelte action or reactive module.
 *
 * Since this is a media query listener, it becomes a module singleton
 * with $state. Components read: reducedMotion.prefersReduced
 *
 * Note: This is .ts not .svelte.ts because the reactive state is
 * managed via manual subscription (no runes needed).
 */

/** Default animation durations used throughout the app */
export const DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  stagger: 50,
} as const;

/** Default CSS transition classes */
export const TRANSITIONS = {
  default: 'transition-all duration-300 ease-in-out',
  colors: 'transition-colors duration-300 ease-in-out',
  transform: 'transition-transform duration-300 ease-in-out',
  opacity: 'transition-opacity duration-300 ease-in-out',
} as const;

/** Check if reduced motion is preferred (non-reactive, instant check) */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Get duration respecting motion preference */
export function getMotionDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

/** Get transition classes respecting motion preference */
export function getMotionTransitions(): {
  default: string;
  colors: string;
  transform: string;
  opacity: string;
  durations: typeof DURATIONS;
} {
  const reduced = prefersReducedMotion();
  return {
    default: reduced ? '' : TRANSITIONS.default,
    colors: reduced ? '' : TRANSITIONS.colors,
    transform: reduced ? '' : TRANSITIONS.transform,
    opacity: reduced ? '' : TRANSITIONS.opacity,
    durations: DURATIONS,
  };
}

/**
 * Svelte action: use:watchReducedMotion
 * Sets a data attribute and class on the element based on motion preference.
 * Listens for changes in the media query.
 */
export function watchReducedMotion(node: HTMLElement): { destroy: () => void } {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function apply() {
    node.dataset.reducedMotion = mq.matches ? 'true' : 'false';
    if (mq.matches) {
      node.classList.add('reduced-motion');
    } else {
      node.classList.remove('reduced-motion');
    }
  }

  apply();
  mq.addEventListener('change', apply);

  return {
    destroy() {
      mq.removeEventListener('change', apply);
    },
  };
}
