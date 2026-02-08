/**
 * Icon - Atomic UI Primitive
 *
 * Renders Material Icons with consistent styling.
 * Zero business logic — pure presentational wrapper.
 *
 * This component provides a compatible API with the legacy components/Icon.tsx
 * while supporting the new atomic design patterns.
 */

import React from 'react';

export interface IconProps {
  /** Material icon name (e.g.,'search','home','settings') */
  name: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Native tooltip text */
  title?: string;
  /** Accessible label. If omitted, the icon is aria-hidden. */
  label?: string;
}

/**
 * Icon atom for rendering Material Icons
 *
 * @example
 *```tsx
 * <Icon name="search" />
 * <Icon name="home" className="text-nb-blue" onClick={handleClick} />
 * <Icon name="info" title="More information" />
 *```
 */
export const Icon: React.FC<IconProps> = React.memo(({
  name,
  className ='',
  onClick,
  title,
  label,
}) => {
  return (
    <span
      className={`material-icons select-none ${className}`}
      onClick={onClick}
      title={title}
      role={label ?'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined :'true'}
      style={{ fontSize:'inherit' }}
    >
      {name}
    </span>
  );
});

Icon.displayName = 'Icon';

export default Icon;
