/**
 * useReducedMotion Hook
 * 
 * Detects and responds to user's motion preference settings.
 * Respects the prefers-reduced-motion media query for accessibility.
 * 
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <motion.div
 *       animate={{ x: 100 }}
 *       transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 *     />
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { REDUCED_MOTION } from '../constants';

/**
 * Hook to detect user's reduced motion preference
 * @returns boolean - true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => 
    REDUCED_MOTION.prefersReducedMotion()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation duration based on motion preference
 * @param normalDuration - Duration in ms for normal animation
 * @returns Duration in ms (0 if reduced motion preferred)
 */
export function useMotionDuration(normalDuration: number): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 0 : normalDuration;
}

/**
 * Hook to get CSS transition classes respecting motion preferences
 * @returns Object with transition class names
 */
export function useMotionTransitions() {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    /** All properties transition */
    default: prefersReducedMotion ? '' : REDUCED_MOTION.TRANSITIONS.default,
    /** Color properties only */
    colors: prefersReducedMotion ? '' : REDUCED_MOTION.TRANSITIONS.colors,
    /** Transform only */
    transform: prefersReducedMotion ? '' : REDUCED_MOTION.TRANSITIONS.transform,
    /** Opacity only */
    opacity: prefersReducedMotion ? '' : REDUCED_MOTION.TRANSITIONS.opacity,
    /** True if reduced motion is preferred */
    prefersReducedMotion
  };
}

export default useReducedMotion;
