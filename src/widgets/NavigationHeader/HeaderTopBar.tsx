/**
 * HeaderTopBar Component
 *
 * Displays the logo/brand section of the navigation header.
 *
 * @widget
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';

export interface HeaderTopBarProps {
  /** Current field mode - affects logo color */
  fieldMode: boolean;
  /** Contextual text color class */
  textColor: string;
}

/**
 * HeaderTopBar displays the application logo and brand name.
 *
 * @example
 * <HeaderTopBar fieldMode={false} textColor="text-nb-black" />
 */
export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  fieldMode,
  textColor,
}) => {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className={`w-8 h-8 ${fieldMode ? 'bg-nb-yellow' : 'bg-iiif-blue'} flex items-center justify-center`}
      >
        <Icon
          name="collections_bookmark"
          className={`text-lg ${fieldMode ? 'text-black' : 'text-white'}`}
        />
      </div>
      <span className={`font-bold text-lg ${textColor} hidden sm:block`}>
        Field Studio
      </span>
    </div>
  );
};

export default HeaderTopBar;
