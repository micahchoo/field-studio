/**
 * Empty Structure Molecule
 *
 * Displayed when no root item is loaded.
 */

import React from 'react';

interface EmptyStructureProps {
  className?: string;
}

export const EmptyStructure: React.FC<EmptyStructureProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        p-8 text-center text-nb-black/50
        ${className}
      `}
    >
      <svg
        className="w-12 h-12 mb-3 text-nb-black/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <p className="text-sm font-medium">No structure loaded</p>
      <p className="text-xs mt-1">
        Import or create a collection to get started
      </p>
    </div>
  );
};

EmptyStructure.displayName = 'EmptyStructure';
