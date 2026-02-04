/**
 * FieldModeTemplate
 *
 * Provides fieldMode context, design tokens (cx), and terminology (t) to child organisms.
 * This template ensures that organisms don't need to call useAppSettings,
 * useContextualStyles, or useTerminology directly - they receive these via render props.
 *
 * Philosophy:
 * - Organisms are context-agnostic. App provides context via templates.
 * - No fieldMode prop-drilling. Use render props instead.
 * - cx (contextual styles) is always available, never undefined.
 * - Terminology is provided at template level to avoid hook calls in organisms.
 *
 * Usage:
 *   <FieldModeTemplate>
 *     {({ cx, fieldMode, t, isAdvanced }) => (
 *       <ArchiveView cx={cx} fieldMode={fieldMode} t={t} isAdvanced={isAdvanced} />
 *     )}
 *   </FieldModeTemplate>
 */

import React, { ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ContextualClassNames, useContextualStyles } from '@/hooks/useContextualStyles';
import { useTerminology } from '@/hooks/useTerminology';

export interface FieldModeTemplateRenderProps {
  /** Contextual class names for current fieldMode (light/dark) */
  cx: ContextualClassNames;
  /** Current field mode state (true = high-contrast dark mode) */
  fieldMode: boolean;
  /** Terminology function for IIIF resource labels */
  t: (key: string) => string;
  /** Whether user is in advanced mode (shows technical details) */
  isAdvanced: boolean;
}

export interface FieldModeTemplateProps {
  /** Render function receives cx and fieldMode */
  children: (props: FieldModeTemplateRenderProps) => ReactNode;
}

/**
 * Template that injects fieldMode context to child organisms
 *
 * This is the primary way organisms receive styling and mode information.
 * Organisms wrapped in this template don't need to know about useAppSettings.
 */
/**
 * Memoized FieldModeTemplate for performance
 *
 * Prevents re-renders when settings haven't changed.
 * Critical for <50ms paint time after context changes.
 */
export const FieldModeTemplate: React.FC<FieldModeTemplateProps> = React.memo(({ children }) => {
  // Get current app settings (fieldMode, abstractionLevel, etc.)
  const { settings } = useAppSettings();

  // Get contextual styles based on current fieldMode
  const cx = useContextualStyles(settings.fieldMode);

  // Get terminology based on abstraction level
  const { t, isAdvanced } = useTerminology({ level: settings.abstractionLevel });

  // Memoize the context object to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    cx,
    fieldMode: settings.fieldMode,
    t,
    isAdvanced,
  }), [cx, settings.fieldMode, t, isAdvanced]);

  // Pass all context to children via render prop
  return (
    <>
      {children(contextValue)}
    </>
  );
});

FieldModeTemplate.displayName = 'FieldModeTemplate';

export default FieldModeTemplate;
