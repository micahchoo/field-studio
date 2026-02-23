/**
 * Metadata Editor — Pure computation (Category 1)
 *
 * Replaces useMetadataEditor React hook.
 * Architecture doc §4 Cat 1: plain functions.
 *
 * These are stateless CRUD helpers for IIIF metadata fields.
 * Consumer passes resource + language, gets back update objects.
 */

import type { IIIFItem } from '@/src/shared/types';

// ── IIIF allowed properties stub ──
// In the full app this comes from @/utils/iiifSchema.
// For the migration MVP, we inline the known set.

const IIIF_PROPERTIES_BY_TYPE: Record<string, readonly string[]> = {
  Collection: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service', 'navDate', 'behavior', 'viewingDirection', 'navPlace'],
  Manifest: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service', 'navDate', 'behavior', 'viewingDirection', 'navPlace'],
  Canvas: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service', 'navDate', 'behavior', 'height', 'width', 'duration'],
  Range: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service', 'navDate', 'behavior', 'viewingDirection', 'supplementary'],
  Annotation: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service'],
  AnnotationPage: ['label', 'summary', 'metadata', 'rights', 'requiredStatement', 'provider', 'thumbnail', 'homepage', 'seeAlso', 'rendering', 'service'],
};

export function getAllowedProperties(type: string): readonly string[] {
  return IIIF_PROPERTIES_BY_TYPE[type] ?? IIIF_PROPERTIES_BY_TYPE['Manifest'];
}

// ── Known top-level IIIF fields that get special add handling ──

const KNOWN_TOP_LEVEL = ['rights', 'navDate', 'behavior', 'viewingDirection', 'requiredStatement', 'navPlace'] as const;

// ── Metadata CRUD functions ──

/** Update an existing metadata entry by index */
export function updateMetadataField(
  resource: IIIFItem,
  index: number,
  key: string,
  value: string,
  language: string
): Partial<IIIFItem> {
  const newMeta = [...(resource.metadata || [])];
  newMeta[index] = {
    label: { [language]: [key] },
    value: { [language]: [value] },
  };
  return { metadata: newMeta };
}

/** Add a new field — known IIIF properties go top-level, others to metadata array */
export function addMetadataField(
  resource: IIIFItem,
  labelStr: string,
  language: string
): Partial<IIIFItem> {
  const propName = labelStr.charAt(0).toLowerCase() + labelStr.slice(1);

  if ((KNOWN_TOP_LEVEL as readonly string[]).includes(propName)) {
    if (propName === 'navPlace') {
      return { navPlace: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} } } as Partial<IIIFItem>;
    }
    if (propName === 'navDate') {
      return { navDate: new Date().toISOString() };
    }
    if (propName === 'viewingDirection') {
      return { viewingDirection: 'left-to-right' };
    }
    if (propName === 'requiredStatement') {
      return { requiredStatement: { label: { none: ['Attribution'] }, value: { none: [''] } } };
    }
    return { [propName]: propName === 'behavior' ? [] : '' } as Partial<IIIFItem>;
  }

  return {
    metadata: [
      ...(resource.metadata || []),
      { label: { [language]: [labelStr] }, value: { [language]: [''] } },
    ],
  };
}

/** Remove a metadata entry by index */
export function removeMetadataField(resource: IIIFItem, index: number): Partial<IIIFItem> {
  return { metadata: resource.metadata?.filter((_, i) => i !== index) };
}

/** Get properties eligible for the "Add" dropdown, excluding already-used ones */
export function getAvailableProperties(resource: IIIFItem): string[] {
  const exclude = ['id', 'type', 'items', 'annotations', 'structures', 'label', 'summary', 'metadata'];
  return [...getAllowedProperties(resource.type)].filter(p => !exclude.includes(p));
}
