/**
 * Test setup for happy-dom environment.
 * Polyfills Web Animations API (element.animate) which Svelte transitions require.
 */

if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function (_keyframes: Keyframe[] | PropertyIndexedKeyframes | null, _options?: number | KeyframeAnimationOptions) {
    const animation = {
      onfinish: null as (() => void) | null,
      oncancel: null as (() => void) | null,
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
      currentTime: 0,
      playState: 'finished' as AnimationPlayState,
      finished: Promise.resolve() as unknown as Animation['finished'],
      ready: Promise.resolve() as unknown as Animation['ready'],
    };
    // Immediately call onfinish to resolve transitions synchronously in tests
    queueMicrotask(() => {
      animation.onfinish?.();
    });
    return animation as unknown as Animation;
  };
}
