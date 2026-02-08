/**
 * DropdownSelect Molecule
 *
 * Custom-styled dropdown selector with click-outside detection.
 * Alternative to native select for enhanced visual styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Local UI state (dropdown open/closed only)
 * - No domain logic
 * - Props-only API for data
 * - Uses design tokens
 *
 * @module shared/ui/molecules/DropdownSelect
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/src/shared/ui/atoms';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

export interface DropdownSelectProps {
  /** Available options */
  options: DropdownOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Theme color for selected state (e.g.,'yellow','purple','blue') */
  themeColor?:'yellow' |'purple' |'blue' |'green';
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
  /** Whether to show option descriptions */
  showDescriptions?: boolean;
  /** Additional CSS class */
  className?: string;
}

const THEME_COLORS = {
  yellow: {
    light: { bg:'#fefce8', text:'#a16207' },
    dark: { bg:'rgba(250, 204, 21, 0.2)', text:'#facc15' },
  },
  purple: {
    light: { bg:'#faf5ff', text:'#7c3aed' },
    dark: { bg:'rgba(168, 85, 247, 0.2)', text:'#c084fc' },
  },
  blue: {
    light: { bg:'#eff6ff', text:'#1d4ed8' },
    dark: { bg:'rgba(59, 130, 246, 0.2)', text:'#60a5fa' },
  },
  green: {
    light: { bg:'#f0fdf4', text:'#15803d' },
    dark: { bg:'rgba(34, 197, 94, 0.2)', text:'#4ade80' },
  },
};

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  options,
  value,
  onChange,
  placeholder ='Select an option...',
  themeColor ='blue',
  fieldMode = false,
  showDescriptions = false,
  className ='',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const colorScheme = THEME_COLORS[themeColor];
  const selectedColors = fieldMode ? colorScheme.dark : colorScheme.light;

  const handleSelect = useCallback((newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const dropdownBg = fieldMode ?'#0f172a' :'#ffffff';
  const dropdownBorder = fieldMode ?'#334155' :'#e2e8f0';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="sm"
        fullWidth
        icon={<Icon name={isOpen ?'expand_less' :'expand_more'} className="text-xs" />}
        iconAfter
        style={{
          fontSize:'0.75rem',
          justifyContent:'space-between',
          padding:'8px 12px',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOption?.label || placeholder}
      </Button>

      {isOpen && (
        <div
          style={{
            position:'absolute',
            left: 0,
            right: 0,
            top:'100%',
            marginTop:'4px',
            backgroundColor: dropdownBg,
            border:`1px solid ${dropdownBorder}`,
            borderRadius:'6px',
            padding:'4px 0',
            zIndex: 50,
            boxShadow: fieldMode
              ?'0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              :'0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          role="listbox"
        >
          {options.map(option => {
            const isSelected = option.value === value;
            const optionBg = isSelected
              ? selectedColors.bg
              : fieldMode ?'#1e293b' :'#f8fafc';
            const optionColor = isSelected
              ? selectedColors.text
              : fieldMode ?'#cbd5e1' :'#334155';

            return (
              <Button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                variant="ghost"
                size="sm"
                fullWidth
                style={{
                  fontSize:'0.75rem',
                  justifyContent:'flex-start',
                  padding:'6px 12px',
                  backgroundColor: optionBg,
                  color: optionColor,
                  borderRadius: 0,
                  borderBottom:`1px solid ${fieldMode ?'#1e293b' :'#f1f5f9'}`,
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{option.label}</div>
                  {showDescriptions && option.description && (
                    <div style={{ fontSize:'10px', opacity: 0.7, marginTop:'2px' }}>
                      {option.description}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DropdownSelect;
