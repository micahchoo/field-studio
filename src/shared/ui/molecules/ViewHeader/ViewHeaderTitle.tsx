import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { useViewHeaderContext } from './ViewHeader';
import type { ViewHeaderTitleProps } from './types';

export const ViewHeaderTitle: React.FC<ViewHeaderTitleProps> = ({
  icon,
  title,
  badge,
  children,
}) => {
  const { cx, fieldMode } = useViewHeaderContext();

  return (
    <div className="flex items-center min-w-0 gap-2 flex-shrink">
      {icon && (
        <Icon
          name={icon}
          className={`shrink-0 text-sm ${cx.text}`}
        />
      )}
      <h2
        className={`truncate text-xs font-bold uppercase tracking-wider font-mono ${cx.text}`}
      >
        {title}
      </h2>
      {badge != null && (
        <>
          <div
            className={`h-4 w-px shrink-0 ${cx.divider || (fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}`}
          />
          <span
            className={`text-[10px] font-black uppercase shrink-0 font-mono ${cx.textMuted || (fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}`}
          >
            {badge}
          </span>
        </>
      )}
      {children}
    </div>
  );
};
