/**
 * SkipLink - Accessibility skip navigation link
 *
 * Allows keyboard users to quickly jump to main content or command palette.
 * Hidden by default, becomes visible on focus.
 *
 * @example
 * <SkipLink targetId="main-content" label="Skip to content" />
 * <SkipLink targetId="command-palette" label="Skip to Command Palette (⌘K)" />
 */

import React from 'react';

interface SkipLinkProps {
  /** ID of the element to skip to */
  targetId: string;
  /** Label text for the link */
  label?: string;
  /** Optional shortcut hint (e.g.,"⌘K") */
  shortcut?: string;
  /** Additional CSS classes */
  className?: string;
  /** Position variant */
  position?:'top-left' |'top-center' |'top-right';
}

/**
 * Skip link component for keyboard navigation
 *
 * Hidden visually but available to screen readers and keyboard users.
 * Becomes visible when focused.
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  label ='Skip to content',
  shortcut,
  className ='',
  position ='top-left'
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex if not focusable
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex','-1');
      }
      target.focus();
      target.scrollIntoView({ block:'start' });
      
      // Remove tabindex after focus (for non-interactive elements)
      if (target.tagName !=='BUTTON' && 
          target.tagName !=='A' && 
          target.tagName !=='INPUT' &&
          target.tagName !=='TEXTAREA' &&
          target.tagName !=='SELECT') {
        setTimeout(() => {
          target.removeAttribute('tabindex');
        }, 1000);
      }
    }
  };

  const positionClasses = {
'top-left':'top-4 left-4',
'top-center':'top-4 left-1/2 -translate-x-1/2',
'top-right':'top-4 right-4'
  };

  // Use sr-only pattern: completely hidden until focused
  // When focused, appears in a non-intrusive position (top center)
  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        focus:fixed focus:z-[9999] focus:top-2 focus:left-1/2 focus:-translate-x-1/2
        focus:px-4 focus:py-2
        focus:bg-sky-600 focus:text-white
        focus:font-semibold focus:text-sm
        focus:shadow-brutal
        focus:outline-none focus:ring-4 focus:ring-sky-500/50
        focus:flex focus:items-center focus:gap-2
        ${className}
`}
    >
      <span>{label}</span>
      {shortcut && (
        <kbd className="px-2 py-0.5 bg-sky-700 text-xs font-mono">
          {shortcut}
        </kbd>
      )}
    </a>
  );
};

/**
 * Multiple skip links container for complex applications
 */
interface SkipLinksProps {
  links: Array<{
    targetId: string;
    label: string;
    shortcut?: string;
  }>;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ links }) => {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-4 left-4 z-[9999] space-y-2">
        {links.map((link, index) => (
          <li key={link.targetId}>
            <SkipLink
              targetId={link.targetId}
              label={link.label}
              shortcut={link.shortcut}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SkipLink;
