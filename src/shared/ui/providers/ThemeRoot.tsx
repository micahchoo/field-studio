/**
 * ThemeRoot — converts theme tokens to CSS custom properties.
 *
 * Reads from useTheme() and sets `--theme-*` vars on a wrapper element.
 * Uses `className="contents"` to avoid introducing an extra layout box.
 * Also sets `data-theme` for CSS selectors that need the theme name.
 */

import React, { useMemo } from 'react';
import { useTheme, useThemeName } from '@/src/shared/lib/hooks/useTheme';
import type { ThemeTokens } from '@/src/shared/config/themes/types';
import { tokenToCssVar } from '@/src/shared/config/themes/types';

function tokensToStyleObject(tokens: ThemeTokens): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    style[tokenToCssVar(key)] = value;
  }
  return style as React.CSSProperties;
}

export const ThemeRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tokens = useTheme();
  const themeName = useThemeName();

  const style = useMemo(() => tokensToStyleObject(tokens), [tokens]);

  return (
    <div className="contents" data-theme={themeName} style={style}>
      {children}
    </div>
  );
};
