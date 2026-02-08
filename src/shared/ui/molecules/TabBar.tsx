/**
 * TabBar Molecule
 *
 * Reusable tab bar container for organizing tabbed content.
 * Composes TabButtonBase atoms and manages spacing/layout.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes TabButtonBase atoms
 * - Handles layout and spacing
 * - Props-only API for configuration
 *
 * @module shared/ui/molecules/TabBar
 */

import React from 'react';
import { TabButtonBase } from '../atoms/TabButtonBase';

export interface TabDefinition {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Optional icon name */
  icon?: string;
}

export interface TabBarProps {
  /** Tab definitions */
  tabs: TabDefinition[];
  /** Currently active tab ID */
  activeTabId: string;
  /** Called when tab is clicked */
  onTabChange: (tabId: string) => void;
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
  /** Border color class */
  borderColor?: string;
  /** Additional container CSS class */
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  fieldMode = false,
  borderColor,
  className ='',
}) => {
  return (
    <div
      className={`flex ${borderColor || (fieldMode ?'border-nb-black' :'border-nb-black/20')} border-b ${className}`}
    >
      {tabs.map((tab) => (
        <TabButtonBase
          key={tab.id}
          id={tab.id}
          label={tab.label}
          icon={tab.icon}
          isActive={activeTabId === tab.id}
          onClick={() => onTabChange(tab.id)}
          fieldMode={fieldMode}
        />
      ))}
    </div>
  );
};

export default TabBar;
