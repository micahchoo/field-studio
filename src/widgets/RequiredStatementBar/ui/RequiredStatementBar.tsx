/**
 * RequiredStatementBar - IIIF spec-mandated display of requiredStatement
 *
 * Per IIIF Presentation 3.0, clients MUST display requiredStatement when present.
 * Renders a non-dismissible info bar with the label and value text.
 *
 * @module widgets/RequiredStatementBar
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { getIIIFValue } from '@/src/shared/types';

export interface RequiredStatementBarProps {
  requiredStatement?: {
    label: Record<string, string[]>;
    value: Record<string, string[]>;
  };
  cx?: {
    surface?: string;
    text?: string;
    accent?: string;
    border?: string;
  };
  fieldMode?: boolean;
}

export const RequiredStatementBar: React.FC<RequiredStatementBarProps> = ({
  requiredStatement,
  cx,
  fieldMode = false,
}) => {
  if (!requiredStatement) return null;

  const label = getIIIFValue(requiredStatement.label);
  const value = getIIIFValue(requiredStatement.value);

  if (!value) return null;

  const bgClass = fieldMode
    ? 'bg-yellow-900/20 border-yellow-700/40'
    : cx?.surface || 'bg-amber-50 border-amber-200';
  const textClass = fieldMode
    ? 'text-yellow-200/80'
    : cx?.text || 'text-amber-800';
  const iconClass = fieldMode
    ? 'text-yellow-400/70'
    : cx?.accent || 'text-amber-600';

  return (
    <div
      className={`flex items-center gap-2 px-4 py-1.5 border-b text-xs ${bgClass}`}
      role="status"
      aria-label="Required statement"
    >
      <Icon name="info" className={`text-sm flex-shrink-0 ${iconClass}`} />
      <span className={`${textClass}`}>
        {label && <span className="font-medium">{label}: </span>}
        <span>{value}</span>
      </span>
    </div>
  );
};

export default RequiredStatementBar;
