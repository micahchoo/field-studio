import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type ViewHeaderHeight = 'default' | 'compact' | 'fluid';

export interface ViewHeaderContextValue {
  height: ViewHeaderHeight;
  cx: ContextualClassNames;
  fieldMode: boolean;
  isMobile: boolean;
}

export interface ViewHeaderProps {
  cx: ContextualClassNames;
  fieldMode: boolean;
  height?: ViewHeaderHeight;
  /** @deprecated shadow removed — headers are always flat */
  shadow?: boolean;
  zIndex?: string;
  className?: string;
  children: React.ReactNode;
}

export interface ViewHeaderTitleProps {
  icon?: string;
  title: string;
  badge?: string | number;
  children?: React.ReactNode;
}

export interface ViewHeaderCenterProps {
  children: React.ReactNode;
}

export interface ViewHeaderActionsProps {
  children: React.ReactNode;
}

export interface ViewHeaderSubBarProps {
  visible: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface ViewHeaderSelectionBarProps {
  count: number;
  onClear: () => void;
  fieldMode: boolean;
  isMobile?: boolean;
  children: React.ReactNode;
}

export interface ViewHeaderBodyProps {
  maxWidth?: string;
  children: React.ReactNode;
}

export interface ViewHeaderDividerProps {
  className?: string;
}
