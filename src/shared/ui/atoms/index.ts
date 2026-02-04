/**
 * Atoms: UI Primitives
 *
 * Re-exports indivisible UI elements from the existing ui/primitives/ directory.
 * These are zero-state, zero-logic components that form the foundation of molecules.
 *
 * PRINCIPLE: Atoms are never imported directly in application code.
 * They are always composed into Molecules first.
 */

// Re-export all atoms from the existing primitives directory
export { Button } from '../../ui/primitives/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from '../../ui/primitives/Button';

export { Input } from '../../ui/primitives/Input';
export type { InputProps, InputSize } from '../../ui/primitives/Input';

export { Icon } from '../../ui/primitives/Icon';
export type { IconProps, IconSize } from '../../ui/primitives/Icon';

export { Card } from '../../ui/primitives/Card';
export type { CardProps } from '../../ui/primitives/Card';
