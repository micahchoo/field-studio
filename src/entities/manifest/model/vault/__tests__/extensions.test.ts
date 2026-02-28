/**
 * Extension preservation — comprehensive tests built from scratch.
 * Tests round-tripping of unknown/vendor-specific properties.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { extractExtensions, applyExtensions, hasUnknownProperties, extractExtensionsFromEntity } from '../extensions';
import { normalize } from '../normalization';
import { denormalize } from '../denormalization';
import type { IIIFManifest, IIIFItem } from '@/src/shared/types';
import { resetIds, createMinimalManifest } from './fixtures';

beforeEach(() => resetIds());

describe('extractExtensions', () => {
  it('extracts unknown properties from a record', () => {
    const record: Record<string, unknown> = {
      id: 'test',
      type: 'Manifest',
      label: { en: ['Test'] },
      // Unknown property (not in IIIF spec)
      miradorConfig: { theme: 'dark' },
      customField: 'value',
    };

    const extensions = extractExtensions(record, 'Manifest');

    expect(extensions.miradorConfig).toEqual({ theme: 'dark' });
    expect(extensions.customField).toBe('value');
    // Known properties should NOT be in extensions
    expect(extensions.id).toBeUndefined();
    expect(extensions.type).toBeUndefined();
    expect(extensions.label).toBeUndefined();
  });

  it('returns empty object when no unknown properties', () => {
    const record: Record<string, unknown> = {
      id: 'test',
      type: 'Canvas',
      width: 100,
      height: 100,
    };

    const extensions = extractExtensions(record, 'Canvas');
    expect(Object.keys(extensions)).toHaveLength(0);
  });

  it('skips null/undefined values', () => {
    const record: Record<string, unknown> = {
      id: 'test',
      type: 'Manifest',
      unknownNull: null,
      unknownUndefined: undefined,
      unknownReal: 'keep me',
    };

    const extensions = extractExtensions(record, 'Manifest');
    expect(extensions.unknownNull).toBeUndefined();
    expect(extensions.unknownUndefined).toBeUndefined();
    expect(extensions.unknownReal).toBe('keep me');
  });

  it('preserves internal _ prefixed properties as known', () => {
    const record: Record<string, unknown> = {
      id: 'test',
      type: 'Canvas',
      _blobUrl: 'blob:...',
      _parentId: 'parent-1',
      unknownProp: true,
    };

    const extensions = extractExtensions(record, 'Canvas');
    // Internal _ props are in the "common" known set
    expect(extensions._blobUrl).toBeUndefined();
    expect(extensions._parentId).toBeUndefined();
    expect(extensions.unknownProp).toBe(true);
  });
});

describe('applyExtensions', () => {
  it('merges extensions back into record', () => {
    const record: Record<string, unknown> = { id: 'test', type: 'Manifest' };
    const extensions = { miradorConfig: { theme: 'dark' }, foo: 'bar' };

    applyExtensions(record, extensions);

    expect(record.miradorConfig).toEqual({ theme: 'dark' });
    expect(record.foo).toBe('bar');
  });

  it('does nothing when extensions are undefined', () => {
    const record: Record<string, unknown> = { id: 'test' };
    applyExtensions(record, undefined);
    expect(Object.keys(record)).toEqual(['id']);
  });
});

describe('hasUnknownProperties', () => {
  it('returns true when unknown properties exist', () => {
    const item = { id: 'test', type: 'Manifest', miradorConfig: {} };
    expect(hasUnknownProperties(item, 'Manifest')).toBe(true);
  });

  it('returns false when all properties are known', () => {
    const item = { id: 'test', type: 'Canvas', width: 100, height: 100 };
    expect(hasUnknownProperties(item, 'Canvas')).toBe(false);
  });

  it('returns false when unknown properties are null/undefined', () => {
    const item = { id: 'test', type: 'Manifest', unknownProp: null };
    expect(hasUnknownProperties(item, 'Manifest')).toBe(false);
  });

  it('early exits on first unknown property found', () => {
    const item = { id: 'test', type: 'Manifest', a: 1, b: 2, c: 3 };
    // Should return true quickly
    expect(hasUnknownProperties(item, 'Manifest')).toBe(true);
  });
});

describe('extractExtensionsFromEntity', () => {
  it('extracts from a typed entity (clones first)', () => {
    const entity = {
      id: 'test',
      type: 'Manifest' as const,
      label: { en: ['Test'] },
      vendorProp: 'preserved',
    };

    const extensions = extractExtensionsFromEntity(entity, 'Manifest');
    expect(extensions.vendorProp).toBe('preserved');
    // Should not affect original
    expect((entity as any).vendorProp).toBe('preserved');
  });
});

describe('extension round-trip through normalize/denormalize', () => {
  it('preserves unknown manifest properties', () => {
    const manifest = createMinimalManifest();
    // Add vendor-specific property
    (manifest as unknown as Record<string, unknown>).miradorConfig = { theme: 'dark', panels: ['info'] };

    const state = normalize(manifest as IIIFItem);

    // Should be stored in extensions
    expect(state.extensions[manifest.id]).toBeDefined();
    expect(state.extensions[manifest.id].miradorConfig).toEqual({ theme: 'dark', panels: ['info'] });

    // Should be restored on denormalize
    const result = denormalize(state) as IIIFManifest;
    expect((result as unknown as Record<string, unknown>).miradorConfig).toEqual({ theme: 'dark', panels: ['info'] });
  });
});
