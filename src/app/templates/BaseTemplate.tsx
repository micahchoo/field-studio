/**
 * BaseTemplate
 *
 * Provides the base layout structure with sidebar, header, and main content area.
 * All app routes are wrapped with this template for consistent layout.
 *
 * Structure:
 * ┌─────────────────────────────────────────┐
 * │ Header                                  │
 * ├──────────┬──────────────────────────────┤
 * │ Sidebar  │ Main Content                 │
 * │          │                              │
 * │          │ (FieldModeTemplate wraps here)
 * │          │                              │
 * └──────────┴──────────────────────────────┘
 *
 * Usage:
 *   <BaseTemplate
 *     showSidebar={true}
 *     onSidebarToggle={() => setShowSidebar(!show)}
 *   >
 *     [Main content goes here]
 *   </BaseTemplate>
 */

import React, { ReactNode } from 'react';
import { Button } from '@/ui/primitives/Button';

export interface BaseTemplateProps {
  /** Main content */
  children: ReactNode;
  /** Whether to show sidebar */
  showSidebar?: boolean;
  /** Callback when sidebar toggle is clicked */
  onSidebarToggle?: () => void;
  /** Optional header content (defaults to standard header) */
  headerContent?: ReactNode;
  /** Optional sidebar content (defaults to standard sidebar) */
  sidebarContent?: ReactNode;
}

/**
 * Base layout template providing sidebar, header, main structure
 *
 * This template establishes the overall app structure that all views use.
 */
export const BaseTemplate: React.FC<BaseTemplateProps> = ({
  children,
  showSidebar = true,
  onSidebarToggle,
  headerContent,
  sidebarContent
}) => {
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header
        className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        role="banner"
      >
        {/* Sidebar toggle button */}
        <Button
          onClick={onSidebarToggle}
          variant="ghost"
          size="sm"
          aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          title={showSidebar ? 'Hide sidebar (Cmd+\\)' : 'Show sidebar (Cmd+\\)'}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          }
        />

        {/* Custom header content */}
        <div className="flex-1 mx-4">
          {headerContent}
        </div>
      </header>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside
            className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
            role="navigation"
          >
            {sidebarContent}
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 min-h-0 flex flex-col" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default BaseTemplate;
