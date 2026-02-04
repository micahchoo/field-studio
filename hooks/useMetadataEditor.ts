/**
 * useMetadataEditor
 *
 * Extracts the metadata CRUD operations from Inspector into a reusable hook.
 * All mutations are expressed as partial updates to IIIFItem — the caller
 * passes them straight through to onUpdateResource.
 */

import { useCallback, useMemo } from 'react';
import { IIIFItem } from '../types';
import { getAllowedProperties } from '../utils/iiifSchema';

export function useMetadataEditor(
  resource: IIIFItem | null,
  language: string,
  onUpdate: (updates: Partial<IIIFItem>) => void
) {
  /** Update an existing metadata entry by index */
  const updateField = useCallback((index: number, key: string, value: string) => {
    if (!resource) return;
    const newMeta = [...(resource.metadata || [])];
    newMeta[index] = {
      label: { [language]: [key] },
      value: { [language]: [value] },
    };
    onUpdate({ metadata: newMeta });
  }, [resource, language, onUpdate]);

  /**
   * Add a new metadata field or activate a known IIIF property.
   * Known properties (rights, behavior, navPlace, etc.) are added as
   * top-level fields; everything else goes into the metadata array.
   */
  const addField = useCallback((labelStr: string) => {
    if (!resource) return;
    const propName = labelStr.charAt(0).toLowerCase() + labelStr.slice(1);

    const knownTopLevel = ['rights', 'navDate', 'behavior', 'viewingDirection', 'requiredStatement', 'navPlace'];
    if (knownTopLevel.includes(propName)) {
      if (propName === 'navPlace') {
        onUpdate({
          navPlace: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        } as any);
      } else {
        onUpdate({ [propName]: propName === 'behavior' ? [] : '' });
      }
    } else {
      const newMeta = [
        ...(resource.metadata || []),
        { label: { [language]: [labelStr] }, value: { [language]: [''] } },
      ];
      onUpdate({ metadata: newMeta });
    }
  }, [resource, language, onUpdate]);

  /** Remove a metadata entry by index */
  const removeField = useCallback((index: number) => {
    if (!resource) return;
    onUpdate({ metadata: resource.metadata?.filter((_, i) => i !== index) });
  }, [resource, onUpdate]);

  /** Properties eligible for the "Add" dropdown, filtered against already-present core fields */
  const availableProperties = useMemo(() => {
    if (!resource) return [];
    return getAllowedProperties(resource.type).filter(
      p => !['id', 'type', 'items', 'annotations', 'structures', 'label', 'summary', 'metadata'].includes(p)
    );
  }, [resource]);

  return { updateField, addField, removeField, availableProperties };
}
