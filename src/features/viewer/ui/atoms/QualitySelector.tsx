/**
 * QualitySelector Atom
 *
 * Dropdown selector for IIIF Image API quality options.
 * Replaces native <select> with styled button dropdown.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state (dropdown open/closed)
 * - No domain logic
 * - Props-only API for data
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/QualitySelector
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface QualityOption {
  /** Quality value */
  value: string;
  /** Display label */
  label: string;
  /** Description text */
  description?: string;
}

export interface QualitySelectorProps {
  /** Available quality options */
  options: QualityOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  options,
  value,
  onChange,
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
  const selectedBg = fieldMode ? 'rgba(168, 85, 247, 0.2)' : '#faf5ff';
  const selectedColor = fieldMode ? '#c084fc' : '#7c3aed';

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="sm"
        fullWidth
        icon={<Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-xs" />}
        iconAfter
        style={{
          fontSize: '0.75rem',
          justifyContent: 'space-between',
          padding: '8px 12px',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOption?.label || 'Select quality...'}
      </Button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '6px',
            padding: '4px 0',
            zIndex: 50,
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

export default QualitySelector;
