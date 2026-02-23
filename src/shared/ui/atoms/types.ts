/**
 * Atom type exports — shared between .svelte components and barrel index.ts
 *
 * Svelte 5's <script module> exports aren't visible to plain tsc.
 * This file provides the canonical type definitions that both
 * .svelte components and .ts consumers can import.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'bare' | 'sm' | 'base' | 'lg' | 'xl';
export type InputSize = 'sm' | 'base' | 'lg';
export type TagColor = 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'orange' | 'purple' | 'black';
