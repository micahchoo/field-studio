/**
 * Viewing Direction — Pure computation (Category 1)
 *
 * Replaces useViewingDirection React hook.
 * Architecture doc §4 Cat 1: plain function.
 *
 * Resolves CSS layout properties from IIIF viewingDirection.
 */

export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export interface DirectionStyles {
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  textAlign: 'left' | 'right' | 'center';
  isRtl: boolean;
  isVertical: boolean;
}

/**
 * Convert IIIF viewingDirection to CSS layout properties.
 */
export function getDirectionStyles(direction?: ViewingDirection | string | null): DirectionStyles {
  switch (direction) {
    case 'right-to-left':
      return {
        flexDirection: 'row-reverse',
        writingMode: 'horizontal-tb',
        textAlign: 'right',
        isRtl: true,
        isVertical: false,
      };
    case 'top-to-bottom':
      return {
        flexDirection: 'column',
        writingMode: 'vertical-rl',
        textAlign: 'left',
        isRtl: false,
        isVertical: true,
      };
    case 'bottom-to-top':
      return {
        flexDirection: 'column-reverse',
        writingMode: 'vertical-lr',
        textAlign: 'left',
        isRtl: false,
        isVertical: true,
      };
    case 'left-to-right':
    default:
      return {
        flexDirection: 'row',
        writingMode: 'horizontal-tb',
        textAlign: 'left',
        isRtl: false,
        isVertical: false,
      };
  }
}

/**
 * Get Tailwind flex-direction class for viewing direction.
 */
export function getDirectionClass(direction?: ViewingDirection | string | null): string {
  const styles = getDirectionStyles(direction);
  const map: Record<string, string> = {
    'row': 'flex-row',
    'row-reverse': 'flex-row-reverse',
    'column': 'flex-col',
    'column-reverse': 'flex-col-reverse',
  };
  return map[styles.flexDirection] ?? 'flex-row';
}
