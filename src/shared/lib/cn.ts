/**
 * cn — Conditional class name joiner (replaces clsx/classnames)
 *
 * Accepts strings, false, null, undefined. Filters falsy values and joins with space.
 * Intentionally minimal — no object/array overloads.
 */
export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}
