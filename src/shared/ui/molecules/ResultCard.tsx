/**
 * ResultCard Molecule
 *
 * A search result card displaying IIIF resource information.
 * Composes Card atom with thumbnail, title, metadata preview.
 *
 * ATOMIC DESIGN:
 * - Composes: Card, Button atoms
 * - Has local state: hover, selected
 * - No domain logic (selection managed by parent)
 *
 * IDEAL OUTCOME: Quick scan of search results with clear hierarchy
 * FAILURE PREVENTED: Information overload, unclear selection state
 *
 * @example
 * <ResultCard
 *   id="item-123"
 *   title="Sunset over Mountains"
 *   type="Canvas"
 *   thumbnail="https://example.com/thumb.jpg"
 *   metadata={{ Date: '2023-01-15', Location: 'Rockies' }}
 *   selected={false}
 *   onSelect={() => openItem('item-123')}
 * />
 */

import React, { useState } from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ResultCardProps {
  /** Unique identifier */
  id: string;
  /** Resource title/label */
  title: string;
  /** IIIF resource type */
  type: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Preview metadata (key-value pairs) */
  metadata?: Record<string, string>;
  /** Whether this card is selected */
  selected?: boolean;
  /** Called when card is clicked */
  onSelect: (id: string) => void;
  /** Highlighted search terms */
  highlightTerms?: string[];
  /** Resource date for sorting/display */
  date?: string;
  /** Loading state */
  loading?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
}

/**
 * ResultCard Component
 *
 * Search result item with thumbnail and metadata preview.
 */
export const ResultCard: React.FC<ResultCardProps> = ({
  id,
  title,
  type,
  thumbnail,
  metadata,
  selected = false,
  onSelect,
  highlightTerms = [],
  date,
  loading = false,
  cx,
}) => {
  const [imageError, setImageError] = useState(false);

  // Highlight matching terms in text
  const highlightText = (text: string): React.ReactNode => {
    if (!highlightTerms.length) return text;

    const parts = text.split(new RegExp(`(${highlightTerms.join('|')})`, 'gi'));
    return parts.map((part, i) =>
      highlightTerms.some((t) => part.toLowerCase() === t.toLowerCase()) ? (
        <mark
          key={i}
          className={`${cx.accent} bg-opacity-20 text-inherit font-semibold`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (loading) {
    return (
      <div
        className={`
          rounded-lg border ${cx.border} ${cx.surface}
          p-4 animate-pulse
        `}
      >
        <div className={`h-32 ${cx.headerBg} rounded mb-3`} />
        <div className={`h-4 ${cx.headerBg} rounded w-3/4 mb-2`} />
        <div className={`h-3 ${cx.headerBg} rounded w-1/2`} />
      </div>
    );
  }

  return (
    <article
      onClick={() => onSelect(id)}
      className={`
        group relative rounded-lg border overflow-hidden
        transition-all duration-200 cursor-pointer
        ${selected
          ? `${cx.accent} border-current ring-2 ring-current ring-opacity-50`
          : `${cx.surface} ${cx.border} hover:${cx.headerBg}`
        }
      `}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      {/* Thumbnail */}
      <div className={`aspect-video ${cx.headerBg} relative overflow-hidden`}>
        {thumbnail && !imageError ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`material-icons text-4xl ${cx.textMuted}`}>
              image_not_supported
            </span>
          </div>
        )}

        {/* Type badge */}
        <span
          className={`
            absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium
            ${cx.surface} shadow-sm ${cx.textMuted}
          `}
        >
          {type}
        </span>

        {/* Selection indicator */}
        {selected && (
          <div
            className={`
              absolute top-2 right-2 w-6 h-6 rounded-full
              ${cx.accent} text-white flex items-center justify-center
            `}
          >
            <span className="material-icons text-sm">check</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className={`font-medium ${cx.text} line-clamp-2`}>
          {highlightText(title)}
        </h3>

        {date && (
          <p className={`text-xs ${cx.textMuted} mt-1`}>{date}</p>
        )}

        {/* Metadata preview */}
        {metadata && Object.keys(metadata).length > 0 && (
          <dl className="mt-2 space-y-1">
            {Object.entries(metadata)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <dt className={`${cx.textMuted} min-w-[60px]`}>{key}:</dt>
                  <dd className={`${cx.text} truncate`}>
                    {highlightText(String(value))}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </div>
    </article>
  );
};
