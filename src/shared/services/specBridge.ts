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

import { IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, LanguageMap } from '@/src/shared/types';
import {
  createLanguageMap,
  DEFAULT_VIEWING_DIRECTION,
  IMAGE_API_PROTOCOL,
  isBehaviorValidForType,
  isImageService3,
  isValidHttpUri,
  isValidViewingDirection
} from '../utils';
import { IIIF_SPEC } from '@/src/shared/constants';

// ============================================================================
// Version Detection
// ============================================================================

export type IIIFVersion = '2.0' | '2.1' | '3.0' | 'unknown';

/**
 * Detect IIIF Presentation API version from @context
 */
export function detectVersion(manifest: any): IIIFVersion {
  const context = manifest['@context'];

  if (!context) return 'unknown';

  const contextStr = Array.isArray(context) ? context.join(' ') : String(context);

  if (contextStr.includes('presentation/3')) return '3.0';
  if (contextStr.includes('presentation/2')) {
    // Check for 2.1 vs 2.0 (minor differences)
    if (contextStr.includes('2.1') || manifest.sequences?.[0]?.canvases) {
      return '2.1';
    }
    return '2.0';
  }

  // Heuristic: if it has 'sequences', it's likely v2
  if (manifest.sequences) return '2.1';

  // If it has 'items' with type Canvas, likely v3
  if (manifest.items?.some((i: any) => isCanvas(i))) return '3.0';

  return 'unknown';
}

/**
 * Check if manifest needs upgrade
 */
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
export function upgradeToV3(input: any): IIIFItem {
  const version = detectVersion(input);

  if (version === '3.0') {
    // Already v3, just clean up any legacy properties
    return cleanV3(input);
  }

  if (version === 'unknown') {
    console.warn('Unknown IIIF version, attempting upgrade anyway');
  }

  // Determine type
  const type = normalizeType(input['@type'] || input.type);

  switch (type) {
    case 'Collection':
      return upgradeCollection(input);
    case 'Manifest':
      return upgradeManifest(input);
    default:
      console.warn(`Unknown resource type: ${type}, returning as-is`);
      return input;
  }
}

/**
 * Upgrade a v2 Collection to v3
 */
function upgradeCollection(v2: any): IIIFCollection {
  // Known v2/v3 collection properties that we handle explicitly
  const knownCollectionKeys = [
    '@context', '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'attribution', 'requiredStatement', 'license', 'rights',
    'logo', 'provider', 'navDate', 'viewingHint', 'behavior',
    'manifests', 'collections', 'members', 'items'
  ];

  // Extract extension properties to preserve
  const extensions = extractExtensions(v2, knownCollectionKeys);

  const v3: IIIFCollection = {
    '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
    id: v2['@id'] || v2.id,
    type: 'Collection',
    label: upgradeLanguageValue(v2.label),
    items: [],
    // Spread extensions to preserve vendor properties
    ...extensions
  };

  // Optional properties
  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.attribution) v3.requiredStatement = upgradeAttribution(v2.attribution);
  if (v2.license) v3.rights = v2.license;
  if (v2.logo) v3.provider = [{ id: '', type: 'Agent', label: { none: ['Provider'] }, logo: upgradeLogo(v2.logo) }];
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Collection');

  // Upgrade child items (manifests and sub-collections)
  const items: IIIFItem[] = [];

  if (v2.manifests) {
    for (const m of v2.manifests) {
      items.push(upgradeToV3(m));
    }
  }

  if (v2.collections) {
    for (const c of v2.collections) {
      items.push(upgradeToV3(c));
    }
  }

  if (v2.members) {
    for (const member of v2.members) {
      items.push(upgradeToV3(member));
    }
  }

  v3.items = items;

  return v3;
}

/**
 * Upgrade a v2 Manifest to v3
 */
function upgradeManifest(v2: any): IIIFManifest {
  // Known v2/v3 manifest properties that we handle explicitly
  const knownManifestKeys = [
    '@context', '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'attribution', 'requiredStatement', 'license', 'rights',
    'logo', 'provider', 'navDate', 'viewingHint', 'behavior', 'viewingDirection',
    'sequences', 'items', 'structures', 'related', 'homepage', 'seeAlso', 'rendering',
    'within', 'partOf', 'service', 'services'
  ];

  // Extract extension properties to preserve
  const extensions = extractExtensions(v2, knownManifestKeys);

  const v3: IIIFManifest = {
    '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
    id: v2['@id'] || v2.id,
    type: 'Manifest',
    label: upgradeLanguageValue(v2.label),
    items: [],
    // Spread extensions to preserve vendor properties
    ...extensions
  };

  // Optional properties
  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.attribution) v3.requiredStatement = upgradeAttribution(v2.attribution);
  if (v2.license) v3.rights = v2.license;
  if (v2.logo) v3.provider = [{ id: '', type: 'Agent', label: { none: ['Provider'] }, logo: upgradeLogo(v2.logo) }];
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Manifest');
  if (v2.viewingDirection) {
    // Validate viewingDirection against IIIF 3.0 spec
    v3.viewingDirection = isValidViewingDirection(v2.viewingDirection)
      ? v2.viewingDirection
      : DEFAULT_VIEWING_DIRECTION;
  }

  // v2 sequences → v3 items (Canvases)
  // In v2, manifest.sequences[0].canvases contains the canvases
  if (v2.sequences && v2.sequences.length > 0) {
    const primarySequence = v2.sequences[0];

    if (primarySequence.canvases) {
      v3.items = primarySequence.canvases.map((c: any) => upgradeCanvas(c));
    }

    // Copy sequence-level viewingHint/viewingDirection if not on manifest
    if (!v3.behavior && primarySequence.viewingHint) {
      v3.behavior = upgradeViewingHint(primarySequence.viewingHint, 'Manifest');
    }
    if (!v3.viewingDirection && primarySequence.viewingDirection) {
      v3.viewingDirection = primarySequence.viewingDirection;
    }
  }

  // v2 structures → v3 structures (Ranges)
  if (v2.structures) {
    v3.structures = v2.structures.map((r: any) => upgradeRange(r));
  }

  // v2 related → v3 homepage
  if (v2.related) {
    v3.homepage = Array.isArray(v2.related)
      ? v2.related.map(upgradeRelated)
      : [upgradeRelated(v2.related)];
  }

  // v2 seeAlso → v3 seeAlso (mostly compatible)
  if (v2.seeAlso) {
    v3.seeAlso = Array.isArray(v2.seeAlso)
      ? v2.seeAlso.map(upgradeSeeAlso)
      : [upgradeSeeAlso(v2.seeAlso)];
  }

  // v2 rendering → v3 rendering (mostly compatible)
  if (v2.rendering) {
    v3.rendering = Array.isArray(v2.rendering)
      ? v2.rendering.map(upgradeRendering)
      : [upgradeRendering(v2.rendering)];
  }

  // v2 within → v3 partOf
  if (v2.within) {
    v3.partOf = Array.isArray(v2.within)
      ? v2.within.map(upgradeWithin)
      : [upgradeWithin(v2.within)];
  }

  // v2 service → v3 service (search, auth, etc.)
  if (v2.service) {
    v3.service = Array.isArray(v2.service)
      ? v2.service.map(upgradeService)
      : [upgradeService(v2.service)];
  }

  return v3;
}

/**
 * Upgrade a v2 Canvas to v3
 */
function upgradeCanvas(v2: any): IIIFCanvas {
  // Known v2/v3 canvas properties that we handle explicitly
  const knownCanvasKeys = [
    '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'thumbnail', 'navDate', 'width', 'height', 'duration',
    'viewingHint', 'behavior', 'images', 'items', 'otherContent', 'annotations'
  ];

  // Extract extension properties to preserve
  const extensions = extractExtensions(v2, knownCanvasKeys);

  const v3: IIIFCanvas = {
    id: v2['@id'] || v2.id,
    type: 'Canvas',
    label: upgradeLanguageValue(v2.label),
    width: v2.width,
    height: v2.height,
    items: [],
    // Spread extensions to preserve vendor properties
    ...extensions
  };

  // Optional properties
  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.thumbnail) v3.thumbnail = upgradeThumbnail(v2.thumbnail);
  if (v2.navDate) v3.navDate = v2.navDate;
  if (v2.duration) v3.duration = v2.duration;
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Canvas');

  // v2 images → v3 items (AnnotationPage with painting annotations)
  if (v2.images && v2.images.length > 0) {
    const paintingPage = {
      id: `${v3.id}/page/1`,
      type: 'AnnotationPage' as const,
      items: v2.images.map((img: any, idx: number) => upgradeImageAnnotation(img, v3.id, idx))
    };
    v3.items = [paintingPage];
  }

  // v2 otherContent → v3 annotations (AnnotationPages)
  if (v2.otherContent && v2.otherContent.length > 0) {
    v3.annotations = v2.otherContent.map((oc: any) => ({
      id: oc['@id'] || oc.id,
      type: 'AnnotationPage' as const,
      label: oc.label ? upgradeLanguageValue(oc.label) : undefined,
      items: [] // External annotation pages - items loaded separately
    }));
  }

  return v3;
}

/**
 * Upgrade a v2 image annotation to v3 painting annotation
 */
function upgradeImageAnnotation(v2: any, canvasId: string, index: number): any {
  const resource = v2.resource || {};

  const v3 = {
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

  return v3;
}

/**
 * Upgrade a v2 Range to v3
 */
function upgradeRange(v2: any): any {
  // Known v2/v3 range properties that we handle explicitly
  const knownRangeKeys = [
    '@id', '@type', 'id', 'type', 'label', 'description', 'summary',
    'metadata', 'viewingHint', 'behavior', 'canvases', 'ranges', 'members', 'items'
  ];

  // Extract extension properties to preserve
  const extensions = extractExtensions(v2, knownRangeKeys);

  const v3: any = {
    id: v2['@id'] || v2.id,
    type: 'Range',
    label: upgradeLanguageValue(v2.label),
    items: [],
    // Spread extensions to preserve vendor properties
    ...extensions
  };

  if (v2.description) v3.summary = upgradeLanguageValue(v2.description);
  if (v2.metadata) v3.metadata = upgradeMetadata(v2.metadata);
  if (v2.viewingHint) v3.behavior = upgradeViewingHint(v2.viewingHint, 'Range');

  // v2 canvases → v3 items (Canvas references)
  if (v2.canvases) {
    v3.items.push(...v2.canvases.map((c: string) => ({ id: c, type: 'Canvas' })));
  }

  // v2 ranges → v3 items (nested Ranges)
  if (v2.ranges) {
    v3.items.push(...v2.ranges.map((r: any) =>
      typeof r === 'string' ? { id: r, type: 'Range' } : upgradeRange(r)
    ));
  }

  // v2 members (mixed canvases and ranges)
  if (v2.members) {
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

/**
 * Upgrade a v2 label/description to v3 language map
 * v2: string | { "@value": string, "@language": string }[]
 * v3: { [lang]: string[] }
 */
function upgradeLanguageValue(v2Value: any): LanguageMap {
  if (!v2Value) return { none: [''] };

  // Already a language map (v3 format)
  if (typeof v2Value === 'object' && !Array.isArray(v2Value) && !v2Value['@value']) {
    return v2Value;
  }

  // Simple string
  if (typeof v2Value === 'string') {
    return { none: [v2Value] };
  }

  // Array of language-tagged values
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

  // Single language-tagged value
  if (v2Value['@value']) {
    const lang = v2Value['@language'] || 'none';
    return { [lang]: [v2Value['@value']] };
  }

  return { none: [String(v2Value)] };
}

/**
 * Upgrade v2 metadata array
 */
function upgradeMetadata(v2Metadata: any[]): Array<{ label: LanguageMap; value: LanguageMap }> {
  if (!Array.isArray(v2Metadata)) return [];

  return v2Metadata.map(entry => ({
    label: upgradeLanguageValue(entry.label),
    value: upgradeLanguageValue(entry.value)
  }));
}

/**
 * Upgrade v2 thumbnail
 */
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

/**
 * Upgrade v2 attribution to v3 requiredStatement
 */
function upgradeAttribution(v2Attribution: any): { label: LanguageMap; value: LanguageMap } {
  return {
    label: { en: ['Attribution'] },
    value: upgradeLanguageValue(v2Attribution)
  };
}

/**
 * Upgrade v2 logo
 */
function upgradeLogo(v2Logo: any): any[] {
  if (!v2Logo) return [];

  const logos = Array.isArray(v2Logo) ? v2Logo : [v2Logo];

  return logos.map(l => ({
    id: typeof l === 'string' ? l : (l['@id'] || l.id),
    type: 'Image',
    format: typeof l === 'object' ? l.format : 'image/png'
  }));
}

/**
 * Upgrade v2 viewingHint to v3 behavior
 * Uses centralized behavior validation from utils/iiifBehaviors
 */
function upgradeViewingHint(v2Hint: any, targetType: string = 'Manifest'): string[] {
  if (!v2Hint) return [];

  const hints = Array.isArray(v2Hint) ? v2Hint : [v2Hint];

  // Map v2 hints to v3 behaviors (most are the same)
  const behaviorMap: Record<string, string> = {
    'individuals': 'individuals',
    'paged': 'paged',
    'continuous': 'continuous',
    'multi-part': 'multi-part',
    'non-paged': 'non-paged',
    'facing-pages': 'facing-pages',
    'top': 'sequence', // v2 'top' range hint → v3 'sequence'
  };

  return hints
    .map(h => behaviorMap[h] || h)
    .filter(b => b && isBehaviorValidForType(b, targetType));
}

/**
 * Upgrade v2 service to v3 format
 */
function upgradeService(v2Service: any): any {
  if (!v2Service) return null;

  // Handle array of services
  if (Array.isArray(v2Service)) {
    return v2Service.map(s => upgradeService(s)).filter(Boolean);
  }

  const profile = v2Service.profile || v2Service['@profile'];
  const context = v2Service['@context'];

  // Determine service type from profile/context
  let type = 'Service';
  const isImageService = context?.includes('image') || profile?.includes('image') ||
                         context?.includes(IMAGE_API_PROTOCOL) || profile?.includes('level');

  if (isImageService) {
    // Upgrade to ImageService3 if it looks like a v3 service or has level profile
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

  // Normalize profile to standard level format for ImageService3
  let normalizedProfile = typeof profile === 'string' ? profile : profile?.[0];
  if (type === 'ImageService3' && normalizedProfile) {
    // Ensure profile is in correct format (level0, level1, level2)
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

/**
 * Upgrade v2 related to v3 homepage
 */
function upgradeRelated(v2Related: any): any {
  if (typeof v2Related === 'string') {
    return { id: v2Related, type: 'Text', label: { none: ['Related'] } };
  }
  return {
    id: v2Related['@id'] || v2Related.id,
    type: 'Text',
    label: v2Related.label ? upgradeLanguageValue(v2Related.label) : { none: ['Related'] },
    format: v2Related.format
  };
}

/**
 * Upgrade v2 seeAlso
 */
function upgradeSeeAlso(v2SeeAlso: any): any {
  if (typeof v2SeeAlso === 'string') {
    return { id: v2SeeAlso, type: 'Dataset' };
  }
  return {
    id: v2SeeAlso['@id'] || v2SeeAlso.id,
    type: 'Dataset',
    format: v2SeeAlso.format,
    profile: v2SeeAlso.profile,
    label: v2SeeAlso.label ? upgradeLanguageValue(v2SeeAlso.label) : undefined
  };
}

/**
 * Upgrade v2 rendering
 */
function upgradeRendering(v2Rendering: any): any {
  if (typeof v2Rendering === 'string') {
    return { id: v2Rendering, type: 'Text' };
  }
  return {
    id: v2Rendering['@id'] || v2Rendering.id,
    type: 'Text',
    label: v2Rendering.label ? upgradeLanguageValue(v2Rendering.label) : undefined,
    format: v2Rendering.format
  };
}

/**
 * Upgrade v2 within to v3 partOf
 */
function upgradeWithin(v2Within: any): any {
  if (typeof v2Within === 'string') {
    return { id: v2Within, type: 'Collection' };
  }
  return {
    id: v2Within['@id'] || v2Within.id,
    type: normalizeType(v2Within['@type'] || v2Within.type) || 'Collection',
    label: v2Within.label ? upgradeLanguageValue(v2Within.label) : undefined
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize @type to type
 */
function normalizeType(type: any): string {
  if (!type) return '';

  // Handle array (take first)
  if (Array.isArray(type)) {
    type = type[0];
  }

  // Strip namespace prefixes
  const str = String(type);
  if (str.includes(':')) {
    return str.split(':').pop() || str;
  }

  // Map old types to new
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

/**
 * Normalize resource type for annotation bodies
 */
function normalizeResourceType(type: any): string {
  const normalized = normalizeType(type);

  const resourceTypes: Record<string, string> = {
    'Image': 'Image',
    'dctypes:Image': 'Image',
    'Sound': 'Sound',
    'dctypes:Sound': 'Sound',
    'Video': 'Video',
    'dctypes:Video': 'Video',
    'Text': 'Text',
    'dctypes:Text': 'Text'
  };

  return resourceTypes[normalized] || normalized || 'Image';
}

/**
 * Clean up a v3 manifest (remove legacy properties, preserve extensions)
 *
 * IIIF allows vendor extensions. Properties that:
 * - Start with a namespace prefix (e.g., "oa:", "dc:")
 * - Are in an "extensions" array
 * - Have namespaced keys (contain ":")
 * - Start with underscore (internal app properties)
 *
 * These are preserved as they may be important vendor data.
 */
function cleanV3(input: any): IIIFItem {
  const cleaned = { ...input };

  // Only remove v2 properties that have v3 equivalents (already transformed)
  // These are the legacy properties that are replaced, not vendor extensions
  const v2OnlyProperties = [
    '@id',      // → id
    '@type',    // → type
    'sequences', // → items
    'otherContent', // → annotations
    'images',   // → items (annotation pages)
    'within',   // → partOf
    'attribution', // → requiredStatement
    'license',  // → rights
    'logo',     // → provider.logo
    'related',  // → homepage
    'description' // → summary
  ];

  for (const prop of v2OnlyProperties) {
    delete cleaned[prop];
  }

  // Ensure id and type are present
  if (!cleaned.id && input['@id']) cleaned.id = input['@id'];
  if (!cleaned.type && input['@type']) cleaned.type = normalizeType(input['@type']);

  return cleaned;
}

/**
 * Extract unknown/extension properties from an object
 * These are properties not in the standard IIIF spec that should be preserved
 */
function extractExtensions(obj: any, knownKeys: string[]): Record<string, any> {
  const extensions: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    // Skip known keys
    if (knownKeys.includes(key)) continue;

    // Skip v2 legacy keys (they'll be transformed)
    if (key.startsWith('@')) continue;

    // Preserve extension properties:
    // - Namespaced keys (contain ":")
    // - Keys starting with underscore (app internal)
    // - "extensions" array
    // - Any other unknown property (vendor extension)
    extensions[key] = obj[key];
  }

  return extensions;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Import any IIIF manifest, normalizing to v3
 */
export function importManifest(data: any): IIIFItem {
  return upgradeToV3(data);
}

/**
 * Get version info for display
 */
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
