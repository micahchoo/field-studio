/** Concatenate class name fragments, filtering out falsy values. */
export function cn(...inputs: (string | false | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}
