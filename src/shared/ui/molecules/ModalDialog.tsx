/**
 * ModalDialog Molecule
 *
 * Universal modal dialog with backdrop, header, and configurable sizing.
 * Handles click-outside, ESC key, and consistent styling across modals.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Local UI state (none - controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens via Tailwind
 *
 * @module shared/ui/molecules/ModalDialog
 */

import React, { ReactNode, useEffect } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalDialogProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon name for header */
  icon?: string;
  /** Icon color/background classes */
  iconColor?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Modal size preset */
  size?: ModalSize;
  /** Maximum height (e.g., "90vh", "600px") */
  maxHeight?: string;
  /** Fixed height (e.g., "500px") */
  height?: string;
  /** Z-index value (default 1000) */
  zIndex?: number;
  /** Field mode for dark theme */
  fieldMode?: boolean;
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  /** Additional CSS class for modal container */
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = 'bg-blue-100 text-blue-600',
  children,
  footer,
  size = 'lg',
  maxHeight = '90vh',
  height,
  zIndex = 1000,
  fieldMode = false,
  preventBackdropClose = false,
  className = '',
}) => {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!preventBackdropClose) {
      onClose();
    }
  };

  const backdropClass = `fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4`;
  const modalClass = `${SIZE_CLASSES[size]} w-full ${fieldMode ? 'bg-slate-950 border border-slate-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden flex flex-col ${className}`;
  const headerClass = `flex items-center justify-between p-4 border-b ${fieldMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`;
  const headerBgClass = fieldMode ? 'bg-slate-900' : 'bg-slate-50';

  const heightStyle: React.CSSProperties = height
    ? { height }
    : { maxHeight };

  return (
    <div
      className={backdropClass}
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div
        className={modalClass}
        style={heightStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className={headerClass}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
                <Icon name={icon} />
              </div>
            )}
            <div>
              <h2
                id="modal-title"
                className={`text-lg font-bold ${fieldMode ? 'text-slate-200' : 'text-slate-800'}`}
              >
                {title}
              </h2>
              {subtitle && (
                <p className={`text-sm ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              fieldMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Close modal"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`p-4 border-t ${fieldMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalDialog;
