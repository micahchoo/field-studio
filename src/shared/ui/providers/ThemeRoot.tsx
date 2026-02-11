/**
 * ThemeRoot — converts theme tokens to CSS custom properties.
 *
 * Uses a ref-based approach to only update changed CSS properties on the DOM,
 * avoiding a full style object replacement on every theme change.
 * Uses `className="contents"` to avoid introducing an extra layout box.
 * Also sets `data-theme` for CSS selectors that need the theme name.
 */

import React, { useEffect, useRef } from 'react';
import { useTheme, useThemeName } from '@/src/shared/lib/hooks/useTheme';
import type { ThemeTokens } from '@/src/shared/config/themes/types';
import { tokenToCssVar } from '@/src/shared/config/themes/types';

/** Pre-compute CSS var names once — avoids regex on every theme switch. */
const CSS_VAR_NAMES: Record<string, string> = {};
function getCssVarName(key: string): string {
  if (!CSS_VAR_NAMES[key]) CSS_VAR_NAMES[key] = tokenToCssVar(key);
  return CSS_VAR_NAMES[key];
}

export const ThemeRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tokens = useTheme();
  const themeName = useThemeName();
  const ref = useRef<HTMLDivElement>(null);
  const prevTokensRef = useRef<ThemeTokens | null>(null);

  // Apply only changed CSS properties via setProperty (avoids full style replacement)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prev = prevTokensRef.current;
    for (const [key, value] of Object.entries(tokens)) {
      if (!prev || prev[key as keyof ThemeTokens] !== value) {
        el.style.setProperty(getCssVarName(key), value);
      }
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

  return (
    <div ref={ref} className="contents" data-theme={themeName}>
      {children}
    </div>
  );
};
