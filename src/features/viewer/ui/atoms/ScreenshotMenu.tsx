/**
 * ScreenshotMenu Atom
 *
 * Dropdown menu for screenshot format selection and copy/download actions.
 *
 * @module features/viewer/ui/atoms/ScreenshotMenu
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { ScreenshotFormat } from '../../model';

const FORMATS: { value: ScreenshotFormat; label: string; ext: string }[] = [
  { value: 'image/png', label: 'PNG', ext: 'png' },
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
];

const STORAGE_KEY = 'field-studio:screenshot-format';

export interface ScreenshotMenuProps {
  onScreenshot: (format: ScreenshotFormat, action: 'download' | 'clipboard') => void;
  disabled?: boolean;
  fieldMode?: boolean;
  cx?: Partial<ContextualClassNames>;
}

export const ScreenshotMenu: React.FC<ScreenshotMenuProps> = ({
  onScreenshot,
  disabled = false,
  fieldMode = false,
  cx,
}) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ScreenshotFormat>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ScreenshotFormat) || 'image/png';
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleFormatChange = useCallback((f: ScreenshotFormat) => {
    setFormat(f);
    localStorage.setItem(STORAGE_KEY, f);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentFormat = FORMATS.find(f => f.value === format) || FORMATS[0];

  return (
    <div ref={menuRef} className="relative">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onScreenshot(format, 'download')}
          disabled={disabled}
          title={`Screenshot as ${currentFormat.label} (download)`}
          className={`!px-1.5 ${fieldMode ? 'text-nb-yellow' : ''}`}
        >
          <Icon name="photo_camera" className="text-base" />
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className={`!px-0.5 ${fieldMode ? 'text-nb-yellow' : ''}`}
          aria-label="Screenshot options"
        >
          <Icon name="arrow_drop_down" className="text-sm" />
        </Button>
      </div>

      {open && (
        <div className={`absolute top-full right-0 mt-1 z-30 w-44 shadow-brutal border ${
          fieldMode
            ? 'bg-nb-black/95 border-nb-yellow/30'
            : cx?.surface ? `${cx.surface} border-nb-black/20` : 'bg-nb-white border-nb-black/20'
        }`}>
          {/* Format selection */}
          <div className={`px-2 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider ${
            fieldMode ? 'border-nb-yellow/20 text-nb-yellow/60' : `border-nb-black/10 ${cx?.textMuted ?? 'text-nb-black/40'}`
          }`}>
            Format
          </div>
          <div className="p-1">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFormatChange(f.value)}
                className={`w-full text-left px-2 py-1 text-xs flex items-center gap-2 ${
                  f.value === format
                    ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
                    : fieldMode ? 'text-nb-yellow/80 hover:bg-nb-yellow/10' : `${cx?.text ?? 'text-nb-black/70'} hover:bg-nb-black/5`
                }`}
              >
                {f.value === format && <Icon name="check" className="text-xs" />}
                <span className={f.value !== format ? 'ml-5' : ''}>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className={`border-t p-1 ${fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'}`}>
            <button
              onClick={() => { onScreenshot(format, 'download'); setOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 ${
                fieldMode ? 'text-nb-yellow/80 hover:bg-nb-yellow/10' : `${cx?.text ?? 'text-nb-black/70'} hover:bg-nb-black/5`
              }`}
            >
              <Icon name="download" className="text-sm" />
              Download as {currentFormat.label}
            </button>
            <button
              onClick={() => { onScreenshot(format, 'clipboard'); setOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 ${
                fieldMode ? 'text-nb-yellow/80 hover:bg-nb-yellow/10' : `${cx?.text ?? 'text-nb-black/70'} hover:bg-nb-black/5`
              }`}
            >
              <Icon name="content_copy" className="text-sm" />
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotMenu;
