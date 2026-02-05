/**
 * PresetSelector Atom
 *
 * Dropdown selector for IIIF Image API presets.
 * Replaces native <select> element with a styled button-based dropdown.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (dropdown open/closed)
 * - No domain logic
 * - Props-only API for data
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/PresetSelector
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PresetOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
}

export interface PresetSelectorProps {
  /** Available options */
  options: PresetOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  cx: _cx,
  fieldMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

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

  const dropdownBg = fieldMode ? '#0f172a' : '#ffffff';
  const dropdownBorder = fieldMode ? '#334155' : '#e2e8f0';
  const selectedBg = fieldMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff';
  const selectedColor = fieldMode ? '#60a5fa' : '#2563eb';

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="sm"
        icon={<Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-xs" />}
        iconAfter
        style={{
          fontSize: '0.75rem',
          minWidth: '80px',
          padding: '4px 8px',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOption?.label || placeholder}
      </Button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '6px',
            padding: '4px 0',
            zIndex: 50,
            minWidth: '140px',
            boxShadow: fieldMode
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          role="listbox"
        >
          {options.map(option => {
            const isSelected = option.value === value;
            const optionBg = isSelected
              ? selectedBg
              : fieldMode ? '#1e293b' : '#f8fafc';
            const optionColor = isSelected
              ? selectedColor
              : fieldMode ? '#cbd5e1' : '#334155';

            return (
              <Button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                variant="ghost"
                size="sm"
                fullWidth
                style={{
                  fontSize: '0.75rem',
                  justifyContent: 'flex-start',
                  padding: '6px 12px',
                  backgroundColor: optionBg,
                  color: optionColor,
                  borderRadius: 0,
                  borderBottom: `1px solid ${fieldMode ? '#1e293b' : '#f1f5f9'}`,
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{option.label}</div>
                  {option.description && (
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
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

export default PresetSelector;
