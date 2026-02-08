/**
 * RenderingDownloadMenu Atom
 *
 * Dropdown menu showing available rendering (download) links
 * from the manifest or canvas `rendering` property.
 *
 * @module features/viewer/ui/atoms/RenderingDownloadMenu
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { getIIIFValue } from '@/src/shared/types';

interface RenderingLink {
  id: string;
  type: string;
  label?: Record<string, string[]>;
  format?: string;
}

export interface RenderingDownloadMenuProps {
  /** Available rendering links */
  items: RenderingLink[];
  /** Field mode styling */
  fieldMode?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/epub+zip': 'EPUB',
  'text/plain': 'Plain Text',
  'text/html': 'HTML',
  'application/xml': 'XML',
};

export const RenderingDownloadMenu: React.FC<RenderingDownloadMenuProps> = ({
  items,
  fieldMode = false,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (items.length === 0) return null;

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="bare"
        onClick={() => setOpen(!open)}
        icon={<Icon name="download" className="text-lg" />}
        title="Download options"
        aria-label="Download options"
        aria-expanded={open}
      />

      {open && (
        <div className={`absolute right-0 top-full mt-1 z-30 min-w-[200px] shadow-brutal border py-1 ${
          fieldMode
            ? 'bg-nb-black border-nb-black/80'
            : 'bg-nb-white border-nb-black/20'
        }`}>
          <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
            fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
          }`}>
            Downloads
          </div>
          {items.map((item) => {
            const label = getIIIFValue(item.label) ||
              FORMAT_LABELS[item.format || ''] ||
              item.format ||
              'Download';

            return (
              <a
                key={item.id}
                href={item.id}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-nb ${
                  fieldMode
                    ? 'text-nb-black/30 hover:bg-nb-black'
                    : 'text-nb-black/60 hover:bg-nb-white'
                }`}
              >
                <Icon name="description" className="text-base" />
                <span className="flex-1">{label}</span>
                {item.format && (
                  <span className={`text-[10px] ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
                    {FORMAT_LABELS[item.format] || item.format}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RenderingDownloadMenu;
