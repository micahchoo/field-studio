/**
 * Atoms: UI Primitives (Svelte 5)
 *
 * Re-exports indivisible UI elements. These are zero-state, zero-logic
 * components that form the foundation of molecules.
 *
 * ATOMIC DESIGN PRINCIPLES:
 * - Atoms are the smallest building blocks
 * - Zero business logic, zero state
 * - Props-only rendering from design tokens
 * - Never imported directly in app code — composed into Molecules
 */

// Types (from .ts file — visible to both tsc and svelte-check)
export type { ButtonVariant, ButtonSize, InputSize, TagColor } from './types';

// Button
export { default as Button } from './Button.svelte';

// Input
export { default as Input } from './Input.svelte';

// Icon
export { default as Icon } from './Icon.svelte';

// Card
export { default as Card } from './Card.svelte';

// Tag
export { default as Tag } from './Tag.svelte';

// Divider
export { default as Divider } from './Divider.svelte';

// Panel
export { default as Panel } from './Panel.svelte';

// TabButtonBase
export { default as TabButtonBase } from './TabButtonBase.svelte';

// StepIndicator
export { default as StepIndicator } from './StepIndicator.svelte';

// StepConnector
export { default as StepConnector } from './StepConnector.svelte';

// ZoomControl
export { default as ZoomControl } from './ZoomControl.svelte';

// TextArea
export { default as TextArea } from './TextArea.svelte';

// Select
export { default as Select } from './Select.svelte';

// SkipLink
export { default as SkipLink } from './SkipLink.svelte';
export { default as SkipLinks } from './SkipLinks.svelte';
