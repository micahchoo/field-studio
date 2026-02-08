/**
 * MuseumLabel Molecule
 *
 * Styled label component for displaying contextual information.
 * Used for field notes, exhibit descriptions, and technical specs.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no context
 * - No state, pure presentation
 * - Uses Icon atom
 */

import React from 'react';
import { Icon } from '../atoms';
import { MUSEUM_LABEL_ICONS, MUSEUM_LABEL_STYLES } from '../../config/tokens';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type MuseumLabelType ='field-note' |'exhibit' |'spec';

export interface MuseumLabelProps {
  /** Title of the label */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Content to display */
  children: React.ReactNode;
  /** Visual style variant */
  type?: MuseumLabelType;
  /** Current field mode */
  fieldMode?: boolean;
  cx?: ContextualClassNames;
}

export const MuseumLabel: React.FC<MuseumLabelProps> = ({
  title,
  subtitle,
  children,
  type ='field-note',
  fieldMode = false,
}) => {
  const labelStyle = MUSEUM_LABEL_STYLES[type];
  const style = fieldMode ? labelStyle?.dark ??'' : labelStyle?.light ??'';

  return (
    <div
      className={`p-4 border-l-4 shadow-brutal-sm my-4 animate-in fade-in slide-in-from-left-2 ${style}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon name={MUSEUM_LABEL_ICONS[type] ||'info'} className="text-sm opacity-60" />
        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
          {title}
        </h4>
      </div>
      {subtitle && <p className="text-xs font-bold mb-2">{subtitle}</p>}
      <div className="text-xs leading-relaxed opacity-90 italic">{children}</div>
    </div>
  );
};
