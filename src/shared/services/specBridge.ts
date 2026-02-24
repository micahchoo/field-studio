// Pure TypeScript — no Svelte-specific conversion

/**
 * IIIF Spec Bridge - V2 ↔ V3 Conversion
 *
 * Handles version detection and automatic upgrade of IIIF Presentation API
 * manifests from v2.x to v3.0 format. Internal processing always uses v3;
 * v2 export is optionally available.
 *
 * Key transformations (v2 → v3):
 * - @context URL update
 * - @id → id, @type → type
 * - label/description strings → language maps
 * - sequences → items (Canvases directly on Manifest)
 * - images → items (AnnotationPages on Canvas)
 * - otherContent → annotations
 * - within → partOf
 * - viewingHint → behavior
 * - license → rights
 *
 * @see https://iiif.io/api/presentation/3.0/change-log/
 */

import { vaultLog } from './logger';

// Compatibility adapter: logger.warn(category, msg) → vaultLog.warn(msg)
const logger = {
  warn: (_category: string, msg: string) => vaultLog.warn(msg),
  error: (_category: string, msg: string) => vaultLog.error(msg),
};

// ============================================================================
// Inlined utilities (adapted from @/utils for Svelte migration)
// ============================================================================

const DEFAULT_VIEWING_DIRECTION = 'left-to-right';

const IMAGE_API_PROTOCOL = 'http://iiif.io/api/image';

const VALID_BEHAVIORS: Record<string, string[]> = {
  Manifest: ['auto-advance', 'no-auto-advance', 'continuous', 'paged', 'individuals', 'unordered', 'multi-part', 'together', 'sequence', 'thumbnail-nav', 'no-nav'],
  Canvas: ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
  Collection: ['auto-advance', 'no-auto-advance', 'continuous', 'individuals', 'multi-part', 'together', 'unordered'],
  Range: ['auto-advance', 'no-auto-advance', 'no-nav', 'thumbnail-nav'],
};

function isBehaviorValidForType(behavior: string, type: string): boolean {
  const validBehaviors = VALID_BEHAVIORS[type];
  if (!validBehaviors) return true; // Unknown type, allow all
  return validBehaviors.includes(behavior);
}

const VALID_VIEWING_DIRECTIONS = ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'];

function isValidViewingDirection(dir: string): boolean {
  return VALID_VIEWING_DIRECTIONS.includes(dir);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCanvas(item: any): boolean {
  return item && (item.type === 'Canvas' || item['@type'] === 'sc:Canvas');
}

const IIIF_CONTEXT = 'http://iiif.io/api/presentation/3/context.json';

// ============================================================================
// Version Detection
// ============================================================================

export type IIIFVersion = '2.0' | '2.1' | '3.0' | 'unknown';

/**
 * Detect IIIF Presentation API version from @context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectVersion(manifest: any): IIIFVersion {
  const context = manifest['@context'];
  if (!context) return 'unknown';

  const contextStr = Array.isArray(context) ? context.join(' ') : String(context);

  if (contextStr.includes('presentation/3')) return '3.0';
  if (contextStr.includes('presentation/2')) {
    if (contextStr.includes('2.1') || manifest.sequences?.[0]?.canvases) return '2.1';
    return '2.0';
  }
  if (manifest.sequences) return '2.1';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (manifest.items?.some((i: any) => isCanvas(i))) return '3.0';

  return 'unknown';
}

/**
 * Check if manifest needs upgrade
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function needsUpgrade(manifest: any): boolean {
  const version = detectVersion(manifest);
  return version === '2.0' || version === '2.1';
}

// ============================================================================
// V2 → V3 Upgrade
// ============================================================================

/**
 * Upgrade a IIIF v2 manifest to v3 format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upgradeToV3(input: any): any {
  const version = detectVersion(input);

  if (version === '3.0') return cleanV3(input);

  if (version === 'unknown') {
    logger.warn('general', 'Unknown IIIF version, attempting upgrade anyway');
  }

  const type = normalizeType(input['@type'] || input.type);

  switch (type) {
    case 'Collection': return upgradeCollection(input);
    case 'Manifest': return upgradeManifest(input);
    default:
      logger.warn('general', `Unknown resource type: ${type}, returning as-is`);
      return input;
  }
}

/**
 * Upgrade a v2 Collection to v3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeCollection(v2: any): any {
  const knownCollectionKeys = [
    '@context', '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'attribution', 'requiredStatement', 'license', 'rights',
    'logo', 'provider', 'navDate', 'viewingHint', 'behavior',
    'manifests', 'collections', 'members', 'items'
  ];

  const extensions = extractExtensions(v2, knownCollectionKeys);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v3: any = {
    '@context': IIIF_CONTEXT,
    id: v2['@id'] || v2.id,
    type: 'Collection',
    label: upgradeLanguageValue(v2.label),
    items: [],
    ...extensions
  };

  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.attribution) v3.requiredStatement = upgradeAttribution(v2.attribution);
  if (v2.license) v3.rights = v2.license;
  if (v2.logo) v3.provider = [{ id: '', type: 'Agent', label: { none: ['Provider'] }, logo: upgradeLogo(v2.logo) }];
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Collection');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  if (v2.manifests) { for (const m of v2.manifests) items.push(upgradeToV3(m)); }
  if (v2.collections) { for (const c of v2.collections) items.push(upgradeToV3(c)); }
  if (v2.members) { for (const member of v2.members) items.push(upgradeToV3(member)); }
  v3.items = items;

  return v3;
}

/**
 * Upgrade a v2 Manifest to v3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeManifest(v2: any): any {
  const knownManifestKeys = [
    '@context', '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'attribution', 'requiredStatement', 'license', 'rights',
    'logo', 'provider', 'navDate', 'viewingHint', 'behavior', 'viewingDirection',
    'sequences', 'items', 'structures', 'related', 'homepage', 'seeAlso', 'rendering',
    'within', 'partOf', 'service', 'services'
  ];

  const extensions = extractExtensions(v2, knownManifestKeys);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v3: any = {
    '@context': IIIF_CONTEXT,
    id: v2['@id'] || v2.id,
    type: 'Manifest',
    label: upgradeLanguageValue(v2.label),
    items: [],
    ...extensions
  };

  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.attribution) v3.requiredStatement = upgradeAttribution(v2.attribution);
  if (v2.license) v3.rights = v2.license;
  if (v2.logo) v3.provider = [{ id: '', type: 'Agent', label: { none: ['Provider'] }, logo: upgradeLogo(v2.logo) }];
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Manifest');
  if (v2.viewingDirection) {
    v3.viewingDirection = isValidViewingDirection(v2.viewingDirection)
      ? v2.viewingDirection
      : DEFAULT_VIEWING_DIRECTION;
  }

  if (v2.sequences && v2.sequences.length > 0) {
    const primarySequence = v2.sequences[0];
    if (primarySequence.canvases) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      v3.items = primarySequence.canvases.map((c: any) => upgradeCanvas(c));
    }
    if (!v3.behavior && primarySequence.viewingHint) {
      v3.behavior = upgradeViewingHint(primarySequence.viewingHint, 'Manifest');
    }
    if (!v3.viewingDirection && primarySequence.viewingDirection) {
      v3.viewingDirection = primarySequence.viewingDirection;
    }
  }

  if (v2.structures) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v3.structures = v2.structures.map((r: any) => upgradeRange(r));
  }
  if (v2.related) {
    v3.homepage = Array.isArray(v2.related) ? v2.related.map(upgradeRelated) : [upgradeRelated(v2.related)];
  }
  if (v2.seeAlso) {
    v3.seeAlso = Array.isArray(v2.seeAlso) ? v2.seeAlso.map(upgradeSeeAlso) : [upgradeSeeAlso(v2.seeAlso)];
  }
  if (v2.rendering) {
    v3.rendering = Array.isArray(v2.rendering) ? v2.rendering.map(upgradeRendering) : [upgradeRendering(v2.rendering)];
  }
  if (v2.within) {
    v3.partOf = Array.isArray(v2.within) ? v2.within.map(upgradeWithin) : [upgradeWithin(v2.within)];
  }
  if (v2.service) {
    v3.service = Array.isArray(v2.service) ? v2.service.map(upgradeService) : [upgradeService(v2.service)];
  }

  return v3;
}

/**
 * Upgrade a v2 Canvas to v3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeCanvas(v2: any): any {
  const knownCanvasKeys = [
    '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'navDate', 'width', 'height', 'duration',
    'viewingHint', 'behavior', 'images', 'items', 'otherContent', 'annotations'
  ];

  const extensions = extractExtensions(v2, knownCanvasKeys);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v3: any = {
    id: v2['@id'] || v2.id,
    type: 'Canvas',
    label: upgradeLanguageValue(v2.label),
    width: v2.width,
    height: v2.height,
    items: [],
    ...extensions
  };

  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.duration) v3.duration = v2.duration;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Canvas');

  if (v2.images && v2.images.length > 0) {
    v3.items = [{
      id: `${v3.id}/page/1`,
      type: 'AnnotationPage' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: v2.images.map((img: any, idx: number) => upgradeImageAnnotation(img, v3.id, idx))
    }];
  }

  if (v2.otherContent && v2.otherContent.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v3.annotations = v2.otherContent.map((oc: any) => ({
      id: oc['@id'] || oc.id,
      type: 'AnnotationPage' as const,
      label: oc.label ? upgradeLanguageValue(oc.label) : undefined,
      items: []
    }));
  }

  return v3;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeImageAnnotation(v2: any, canvasId: string, index: number): any {
  const resource = v2.resource || {};
  return {
    id: v2['@id'] || `${canvasId}/annotation/${index}`,
    type: 'Annotation',
    motivation: 'painting',
    target: v2.on || canvasId,
    body: {
      id: resource['@id'] || resource.id,
      type: normalizeResourceType(resource['@type'] || resource.type),
      format: resource.format,
      width: resource.width,
      height: resource.height,
      service: resource.service ? [upgradeService(resource.service)] : undefined
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeRange(v2: any): any {
  const knownRangeKeys = [
    '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'viewingHint', 'behavior', 'canvases', 'ranges', 'members', 'items'
  ];

  const extensions = extractExtensions(v2, knownRangeKeys);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v3: any = {
    id: v2['@id'] || v2.id,
    type: 'Range',
    label: upgradeLanguageValue(v2.label),
    items: [],
    ...extensions
  };

  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Range');

  if (v2.canvases) {
    v3.items.push(...v2.canvases.map((c: string) => ({ id: c, type: 'Canvas' })));
  }
  if (v2.ranges) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v3.items.push(...v2.ranges.map((r: any) =>
      typeof r === 'string' ? { id: r, type: 'Range' } : upgradeRange(r)
    ));
  }
  if (v2.members) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v3.items.push(...v2.members.map((m: any) => {
      const type = normalizeType(m['@type'] || m.type);
      if (type === 'Range') {
        return typeof m === 'string' ? { id: m, type: 'Range' } : upgradeRange(m);
      }
      return { id: m['@id'] || m.id || m, type: 'Canvas' };
    }));
  }

  return v3;
}

// ============================================================================
// Value Upgraders
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeLanguageValue(v2Value: any): LanguageMap {
  if (!v2Value) return { none: [''] };
  if (typeof v2Value === 'object' && !Array.isArray(v2Value) && !v2Value['@value']) return v2Value;
  if (typeof v2Value === 'string') return { none: [v2Value] };

  if (Array.isArray(v2Value)) {
    const result: LanguageMap = {};
    for (const item of v2Value) {
      if (typeof item === 'string') {
        if (!result.none) result.none = [];
        result.none.push(item);
      } else if (item['@value']) {
        const lang = item['@language'] || 'none';
        if (!result[lang]) result[lang] = [];
        result[lang].push(item['@value']);
      }
    }
    return Object.keys(result).length > 0 ? result : { none: [''] };
  }

  if (v2Value['@value']) {
    const lang = v2Value['@language'] || 'none';
    return { [lang]: [v2Value['@value']] };
  }

  return { none: [String(v2Value)] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeMetadata(v2Metadata: any[]): Array<{ label: LanguageMap; value: LanguageMap }> {
  if (!Array.isArray(v2Metadata)) return [];
  return v2Metadata.map(entry => ({
    label: upgradeLanguageValue(entry.label),
    value: upgradeLanguageValue(entry.value)
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeThumbnail(v2Thumb: any): any[] {
  if (!v2Thumb) return [];
  const thumbs = Array.isArray(v2Thumb) ? v2Thumb : [v2Thumb];
  return thumbs.map(t => ({
    id: t['@id'] || t.id,
    type: 'Image',
    format: t.format || 'image/jpeg',
    width: t.width,
    height: t.height,
    service: t.service ? [upgradeService(t.service)] : undefined
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeAttribution(v2Attribution: any): { label: LanguageMap; value: LanguageMap } {
  return {
    label: { en: ['Attribution'] },
    value: upgradeLanguageValue(v2Attribution)
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeLogo(v2Logo: any): any[] {
  if (!v2Logo) return [];
  const logos = Array.isArray(v2Logo) ? v2Logo : [v2Logo];
  return logos.map(l => ({
    id: typeof l === 'string' ? l : (l['@id'] || l.id),
    type: 'Image',
    format: typeof l === 'object' ? l.format : 'image/png'
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeViewingHint(v2Hint: any, targetType = 'Manifest'): string[] {
  if (!v2Hint) return [];
  const hints = Array.isArray(v2Hint) ? v2Hint : [v2Hint];

  const behaviorMap: Record<string, string> = {
    'individuals': 'individuals',
    'paged': 'paged',
    'continuous': 'continuous',
    'multi-part': 'multi-part',
    'non-paged': 'non-paged',
    'facing-pages': 'facing-pages',
    'top': 'sequence',
  };

  return hints
    .map(h => behaviorMap[h] || h)
    .filter(b => b && isBehaviorValidForType(b, targetType));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeService(v2Service: any): any {
  if (!v2Service) return null;
  if (Array.isArray(v2Service)) {
    return v2Service.map(s => upgradeService(s)).filter(Boolean);
  }

  const profile = v2Service.profile || v2Service['@profile'];
  const context = v2Service['@context'];

  let type = 'Service';
  const isImageService = context?.includes('image') || profile?.includes('image') ||
                         context?.includes(IMAGE_API_PROTOCOL) || profile?.includes('level');

  if (isImageService) {
    if (context?.includes('/3') || profile?.includes('level0') ||
        profile?.includes('level1') || profile?.includes('level2')) {
      type = 'ImageService3';
    } else {
      type = 'ImageService2';
    }
  } else if (context?.includes('search') || profile?.includes('search')) {
    type = 'SearchService2';
  } else if (context?.includes('auth') || profile?.includes('auth')) {
    type = 'AuthCookieService1';
  }

  let normalizedProfile = typeof profile === 'string' ? profile : profile?.[0];
  if (type === 'ImageService3' && normalizedProfile) {
    if (normalizedProfile.includes('level0') || normalizedProfile.includes('level1.json')) {
      normalizedProfile = 'level0';
    } else if (normalizedProfile.includes('level1') && !normalizedProfile.includes('level1.json')) {
      normalizedProfile = 'level1';
    } else if (normalizedProfile.includes('level2')) {
      normalizedProfile = 'level2';
    }
  }

  return {
    id: v2Service['@id'] || v2Service.id,
    type,
    profile: normalizedProfile,
    ...(v2Service.width && { width: v2Service.width }),
    ...(v2Service.height && { height: v2Service.height }),
    ...(v2Service.tiles && { tiles: v2Service.tiles }),
    ...(v2Service.sizes && { sizes: v2Service.sizes })
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeRelated(v2Related: any): any {
  if (typeof v2Related === 'string') return { id: v2Related, type: 'Text', label: { none: ['Related'] } };
  return {
    id: v2Related['@id'] || v2Related.id,
    type: 'Text',
    label: v2Related.label ? upgradeLanguageValue(v2Related.label) : { none: ['Related'] },
    format: v2Related.format
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeSeeAlso(v2SeeAlso: any): any {
  if (typeof v2SeeAlso === 'string') return { id: v2SeeAlso, type: 'Dataset' };
  return {
    id: v2SeeAlso['@id'] || v2SeeAlso.id,
    type: 'Dataset',
    format: v2SeeAlso.format,
    profile: v2SeeAlso.profile,
    label: v2SeeAlso.label ? upgradeLanguageValue(v2SeeAlso.label) : undefined
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeRendering(v2Rendering: any): any {
  if (typeof v2Rendering === 'string') return { id: v2Rendering, type: 'Text' };
  return {
    id: v2Rendering['@id'] || v2Rendering.id,
    type: 'Text',
    label: v2Rendering.label ? upgradeLanguageValue(v2Rendering.label) : undefined,
    format: v2Rendering.format
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upgradeWithin(v2Within: any): any {
  if (typeof v2Within === 'string') return { id: v2Within, type: 'Collection' };
  return {
    id: v2Within['@id'] || v2Within.id,
    type: normalizeType(v2Within['@type'] || v2Within.type) || 'Collection',
    label: v2Within.label ? upgradeLanguageValue(v2Within.label) : undefined
  };
}

// ============================================================================
// Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeType(type: any): string {
  if (!type) return '';
  if (Array.isArray(type)) type = type[0];

  const str = String(type);
  if (str.includes(':')) return str.split(':').pop() || str;

  const typeMap: Record<string, string> = {
    'sc:Collection': 'Collection',
    'sc:Manifest': 'Manifest',
    'sc:Sequence': 'Sequence',
    'sc:Canvas': 'Canvas',
    'sc:Range': 'Range',
    'sc:AnnotationList': 'AnnotationPage',
    'oa:Annotation': 'Annotation',
    'dctypes:Image': 'Image',
    'dctypes:Sound': 'Sound',
    'dctypes:Video': 'Video',
    'dctypes:Text': 'Text'
  };

  return typeMap[str] || str;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeResourceType(type: any): string {
  const normalized = normalizeType(type);
  const resourceTypes: Record<string, string> = {
    'Image': 'Image', 'dctypes:Image': 'Image',
    'Sound': 'Sound', 'dctypes:Sound': 'Sound',
    'Video': 'Video', 'dctypes:Video': 'Video',
    'Text': 'Text', 'dctypes:Text': 'Text'
  };
  return resourceTypes[normalized] || normalized || 'Image';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanV3(input: any): any {
  const cleaned = { ...input };

  const v2OnlyProperties = [
    '@id', '@type', 'sequences', 'otherContent', 'images',
    'within', 'attribution', 'license', 'logo', 'related', 'description'
  ];

  for (const prop of v2OnlyProperties) {
    delete cleaned[prop];
  }

  if (!cleaned.id && input['@id']) cleaned.id = input['@id'];
  if (!cleaned.type && input['@type']) cleaned.type = normalizeType(input['@type']);

  return cleaned;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractExtensions(obj: any, knownKeys: string[]): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    if (knownKeys.includes(key)) continue;
    if (key.startsWith('@')) continue;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    extensions[key] = obj[key];
  }

  return extensions;
}

// ============================================================================
// Export Functions
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function importManifest(data: any): any {
  return upgradeToV3(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getVersionInfo(manifest: any): {
  detected: IIIFVersion;
  needsUpgrade: boolean;
  label: string;
} {
  const version = detectVersion(manifest);
  return {
    detected: version,
    needsUpgrade: needsUpgrade(manifest),
    label: version === 'unknown' ? 'Unknown Version' : `IIIF Presentation ${version}`
  };
}

export const specBridge = {
  importManifest,
  getVersionInfo,
  detectVersion,
  needsUpgrade,
  upgradeToV3
};
