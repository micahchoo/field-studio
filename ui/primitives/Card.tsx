/**
 * Card - Atomic UI Primitive
 *
 * Elevated surface container. Zero business logic — styling is
 * entirely derived from design tokens. Supports header/footer
 * slot composition for molecule-level assembly.
 */

import React from 'react';
import { COLORS, ELEVATION, INTERACTION, LAYOUT, SPACING } from '../../designSystem';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content rendered in the card header region */
  header?: React.ReactNode;
  /** Content rendered in the card footer region */
  footer?: React.ReactNode;
  /** Whether the card is in a selected/active state */
  selected?: boolean;
  /** Whether the card is in a disabled/archived state */
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  header,
  footer,
  selected = false,
  disabled = false,
  children,
  style,
  ...props
}) => {
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: LAYOUT.borderRadius.lg,
    border: `1px solid ${selected ? COLORS.primary[500] : COLORS.border.default}`,
    backgroundColor: selected ? COLORS.primary[50] : COLORS.background.elevated,
    boxShadow: ELEVATION.sm,
    transition: `box-shadow ${INTERACTION.duration.base} ${INTERACTION.easing.default}, border-color ${INTERACTION.duration.base} ${INTERACTION.easing.default}`,
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : undefined,
    ...style,
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: `1px solid ${COLORS.border.default}`,
    margin: 0,
  };

  return (
    <div style={cardStyle} {...props}>
      {header && (
        <>
          <div style={{ padding: SPACING[3] }}>{header}</div>
          {(children || footer) && <hr style={dividerStyle} />}
        </>
      )}
      {children && (
        <div style={{ padding: SPACING[3], flex: 1 }}>{children}</div>
      )}
      {footer && (
        <>
          {(header || children) && <hr style={dividerStyle} />}
          <div style={{ padding: SPACING[3] }}>{footer}</div>
        </>
      )}
    </div>
  );
};
