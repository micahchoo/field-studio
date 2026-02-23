/**
 * Structure-View Highlight Helpers
 *
 * Pure functions extracted for testability.
 */

export interface TextSegment {
  text: string;
  isMatch: boolean;
}

/**
 * Split text into segments based on a case-insensitive query match.
 * Used by MatchHighlight to determine which parts to wrap in <mark>.
 */
export function splitByQuery(text: string, query: string): TextSegment[] {
  if (!query.trim()) {
    return [{ text, isMatch: false }];
  }

  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const result: TextSegment[] = [];

  let lastIndex = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);

  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      result.push({ text: text.slice(lastIndex, matchIndex), isMatch: false });
    }
    result.push({ text: text.slice(matchIndex, matchIndex + query.length), isMatch: true });
    lastIndex = matchIndex + query.length;
    matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), isMatch: false });
  }

  return result;
}

/**
 * Get the IIIF type icon name for a given resource type.
 */
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'Collection': return 'folder';
    case 'Manifest': return 'description';
    case 'Canvas': return 'image';
    case 'Range': return 'format_list_bulleted';
    case 'AnnotationPage': return 'note';
    case 'Annotation': return 'push_pin';
    default: return 'label';
  }
}

/**
 * Get the Tailwind color class for a node type.
 */
export function getTypeColor(type: string): string {
  switch (type) {
    case 'Collection': return 'text-nb-blue';
    case 'Manifest': return 'text-nb-green';
    case 'Canvas': return 'text-nb-purple';
    case 'Range': return 'text-nb-orange';
    default: return 'text-nb-black/50';
  }
}
