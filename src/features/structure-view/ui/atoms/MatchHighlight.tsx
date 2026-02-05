/**
 * Match Highlight Atom
 *
 * Highlights matching text within a label for search results.
 * Wraps matching segments in a styled span.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure presentational component
 * - No state or logic beyond text highlighting
 * - Props-only API
 *
 * @module features/structure-view/ui/atoms/MatchHighlight
 */

import React, { useMemo } from 'react';

export interface MatchHighlightProps {
  /** Text to display */
  text: string;
  /** Query to highlight */
  query: string;
  /** Additional className for the container */
  className?: string;
  /** ClassName for highlighted segments */
  highlightClassName?: string;
}

/**
 * Match Highlight Atom
 *
 * @example
 * <MatchHighlight text="My Collection" query="col" />
 */
export const MatchHighlight: React.FC<MatchHighlightProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-900/40 text-slate-900 dark:text-slate-100',
}) => {
  const segments = useMemo(() => {
    if (!query.trim()) {
      return [{ text, isMatch: false }];
    }

    const normalizedQuery = query.toLowerCase();
    const normalizedText = text.toLowerCase();
    const result: Array<{ text: string; isMatch: boolean }> = [];
    
    let lastIndex = 0;
    let matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);

    while (matchIndex !== -1) {
      // Add non-matching segment before match
      if (matchIndex > lastIndex) {
        result.push({
          text: text.slice(lastIndex, matchIndex),
          isMatch: false,
        });
      }

      // Add matching segment
      result.push({
        text: text.slice(matchIndex, matchIndex + query.length),
        isMatch: true,
      });

      lastIndex = matchIndex + query.length;
      matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
    }

    // Add remaining non-matching segment
    if (lastIndex < text.length) {
      result.push({
        text: text.slice(lastIndex),
        isMatch: false,
      });
    }

    return result;
  }, [text, query]);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark
            key={index}
            className={`${highlightClassName} rounded px-0.5`}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
};

MatchHighlight.displayName = 'MatchHighlight';

export default MatchHighlight;
