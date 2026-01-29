# Field Studio: Utility Modules

The `utils/` directory contains 9 specialized utility modules providing low-level IIIF operations, validation, and transformation logic. These modules are completely undocumented in the architecture but form a critical foundation for the application's IIIF compliance.

---

## Overview

```
utils/
├── index.ts              # Central export point
├── filenameUtils.ts      # File naming utilities
├── iiifHierarchy.ts      # Tree traversal, relationship types
├── iiifSchema.ts         # Property requirements matrix
├── iiifBehaviors.ts      # Behavior inheritance, conflict detection
├── iiifTypes.ts          # MIME mapping, LanguageMap validation
├── iiifImageApi.ts       # Image API 3.0 URI parsing/building
├── imageSourceResolver.ts # Thumbnail resolution for hierarchies
└── themeClasses.ts       # Status colors, theme utilities
```

---

## 1. IIIF Hierarchy Utilities (`iiifHierarchy.ts`)

Centralized logic for IIIF Presentation API 3.0 hierarchy relationships. Manages the dual relationship model (hierarchical vs non-hierarchical) central to IIIF 3.0.

### Key Concepts

| Relationship Type | Description | Example |
|-------------------|-------------|---------|
| `reference` | Non-exclusive pointer (many-to-many) | Collection → Manifest |
| `ownership` | Exclusive parent-child (one-to-many) | Manifest → Canvas |

### Exported Functions (25+)

**Relationship Types:**
```typescript
getRelationshipType(parentType, childType): IIIFRelationshipType
canHaveMultipleParents(type): boolean
isStandaloneType(type): boolean
```

**Collection Operations:**
```typescript
getCollectionManifests(collection): IIIFManifest[]
getNestedCollections(collection): IIIFCollection[]
collectionContainsManifest(collection, manifestId): boolean
addManifestToCollection(collection, manifest): IIIFCollection
removeManifestFromCollection(collection, manifestId): IIIFCollection
```

**Manifest Operations:**
```typescript
getManifestCanvases(manifest): IIIFCanvas[]
manifestContainsCanvas(manifest, canvasId): boolean
addCanvasToManifest(manifest, canvas, index?): IIIFManifest
removeCanvasFromManifest(manifest, canvasId): IIIFManifest
reorderManifestCanvases(manifest, newOrder): IIIFManifest
```

**Tree Traversal:**
```typescript
findAllOfType<T>(root, type): T[]
findCollectionsContaining(root, targetId): IIIFCollection[]
findCanvasParent(root, canvasId): IIIFManifest | null
findNodeById(root, id): IIIFItem | null
getPathToNode(root, targetId): IIIFItem[]
```

**Validation:**
```typescript
isValidChildType(parentType, childType): boolean
getValidChildTypes(parentType): string[]
```

**Statistics:**
```typescript
countResourcesByType(root): Record<string, number>
getTreeDepth(root): number
```

**Cross-Collection References:**
```typescript
buildReferenceMap(root): Map<string, string[]>
getReferencingCollections(root, targetId): IIIFCollection[]
```

**Range Helpers:**
```typescript
createRange(label, canvasIds, options?): IIIFRange
createNestedRange(label, childRanges, options?): IIIFRange
addRangeToManifest(manifest, range): IIIFManifest
getManifestRanges(manifest): IIIFRange[]
flattenRangeCanvasIds(range): string[]
```

---

## 2. IIIF Schema Utilities (`iiifSchema.ts`)

Complete property requirements matrix for IIIF Presentation API 3.0. Validates which properties are required, recommended, or allowed per resource type.

### Key Exports

```typescript
// Complete property requirement matrix
PROPERTY_MATRIX: Record<string, PropertyRequirement[]>

// Items containment rules
ITEMS_CONTAINMENT: Record<string, string[]>

// Legacy schema (backwards compatibility)
IIIF_SCHEMA: Record<string, ResourceSchema>
```

### Validation Functions

```typescript
// Property validation
getPropertyRequirement(resourceType, propertyKey): PropertyRequirement
isPropertyAllowed(resourceType, propertyKey): boolean
getAllowedProperties(resourceType): string[]
getRequiredProperties(resourceType): string[]
getRecommendedProperties(resourceType): string[]

// Behavior validation
isBehaviorAllowed(resourceType, behavior): boolean
getAllowedBehaviors(resourceType): string[]
getNotAllowedBehaviors(resourceType): string[]

// Viewing direction
isValidViewingDirection(direction): boolean
canHaveViewingDirection(resourceType): boolean

// Time mode
isValidTimeMode(mode): boolean

// Items containment
getValidItemTypes(resourceType): string[]
isValidItemType(resourceType, itemType): boolean

// Complete validation
validateResource(item): ValidationResult
validateResourceFull(item): ValidationResult
```

### Resource Types Covered

- `Collection`
- `Manifest`
- `Canvas`
- `AnnotationPage`
- `Annotation`
- `Range`
- `AnnotationCollection`

---

## 3. IIIF Behavior Utilities (`iiifBehaviors.ts`)

Behavior inheritance, conflict detection, and validation per IIIF Presentation API 3.0 spec.

### Key Exports

```typescript
// Validity matrix by resource type
BEHAVIOR_VALIDITY_MATRIX: Record<string, string[]>

// Mutually exclusive behavior sets
DISJOINT_SETS: Array<string[]>

// Inheritance rules (child inherits from parent)
INHERITANCE_RULES: Array<{ child: string; parent: string }>

// Human-readable descriptions
BEHAVIOR_DESCRIPTIONS: Record<string, BehaviorDescription>
```

### Validation Functions

```typescript
isBehaviorValidForType(behavior, resourceType): boolean
getValidBehaviorsForType(resourceType): string[]
findBehaviorConflicts(behaviors): string[]
getDisjointSetForBehavior(behavior): string[]
getDefaultBehavior(resourceType): string | null
```

### Inheritance Functions

```typescript
doesInheritBehavior(behavior, resourceType): boolean
getInheritedBehaviors(resourceType): string[]
resolveEffectiveBehaviors(resource, parent?): string[]
```

### Helpers

```typescript
getBehaviorDescription(behavior): BehaviorDescription
getBehaviorsByCategory(category): BehaviorDescription[]
suggestBehaviors(resourceType, contentCharacteristics): string[]
```

---

## 4. IIIF Types Utilities (`iiifTypes.ts`)

MIME type mapping, LanguageMap validation, and content resource type detection.

### Content Resource Types

```typescript
CONTENT_RESOURCE_TYPES = ['Image', 'Video', 'Sound', 'Text', 'Dataset', 'Model']
```

### MIME Type Functions

```typescript
getMimeType(extension): string | undefined
getExtensionForMime(mimeType): string | undefined
getContentTypeFromMime(mimeType): ContentResourceType
getContentTypeFromFilename(filename): ContentResourceType
```

### Type Detection

```typescript
isImageMime(mimeType): boolean
isVideoMime(mimeType): boolean
isAudioMime(mimeType): boolean
isTimeBasedMime(mimeType): boolean
isVisualMime(mimeType): boolean
```

### LanguageMap Validation

```typescript
isValidLanguageMap(value): boolean
createLanguageMap(values): LanguageMap
getLanguageValue(languageMap, locale?): string
```

### Validation Helpers

```typescript
isValidMetadataEntry(entry): boolean
createMetadataEntry(label, value): MetadataEntry
isValidAgent(agent): boolean
isValidReference(ref): boolean
isValidExternalResource(resource): boolean
isValidContentResource(resource): boolean
isValidHttpUri(uri): boolean
hasFragmentIdentifier(uri): boolean
isValidId(id): boolean
isValidNavDate(date): boolean
formatNavDate(date): string
isKnownRightsUri(uri): boolean
isValidRightsUri(uri): boolean
isValidDimension(value): boolean
isValidDuration(value): boolean
isKnownServiceType(type): boolean
isValidMotivation(motivation): boolean
isPaintingMotivation(motivation): boolean
```

---

## 5. IIIF Image API Utilities (`iiifImageApi.ts`)

Complete IIIF Image API 3.0 implementation - URI parsing, building, and validation.

### Constants

```typescript
IMAGE_API_CONTEXT = 'http://iiif.io/api/image/3/context.json'
IMAGE_API_PROTOCOL = 'http://iiif.io/api/image'
COMPLIANCE_LEVELS = ['level0', 'level1', 'level2']
FORMAT_MIME_TYPES: Record<ImageFormat, string>
MIME_TO_FORMAT: Record<string, ImageFormat>
FEATURE_DESCRIPTIONS: Record<string, string>
VALIDATION_PATTERNS: Record<string, RegExp>
```

### Parameter Validation

```typescript
validateRegion(region): ValidationResult
validateSize(size): ValidationResult
validateRotation(rotation): ValidationResult
validateQuality(quality): ValidationResult
validateFormat(format): ValidationResult
validateImageRequest(params): ImageApiValidationResult
```

### URI Building

```typescript
buildImageUri(baseUrl, identifier, params): string
buildInfoUri(baseUrl, identifier): string
formatRegion(region): string
formatSize(size): string
formatRotation(rotation): string
parseImageUri(uri): ParsedImageUri
```

### Info.json Generation

```typescript
validateInfoJson(infoJson): ValidationResult
generateInfoJson(identifier, width, height, profile?): ImageServiceInfo
generateStandardSizes(width, height, maxSize?): SizeInfo[]
generateStandardTiles(width, height, tileSize?): TileInfo[]
```

### Tile Calculation

```typescript
calculateTileRequest(infoJson, x, y, z): TileRequest
calculateTileCount(width, height, tileSize): number
buildTileUri(baseUrl, identifier, x, y, z): string
getAllTileUris(infoJson): string[]
```

### Compliance Checking

```typescript
checkComplianceLevel(profile): ImageApiProfile
getFeaturesForProfile(profile): string[]
getFormatsForProfile(profile): ImageFormat[]
getQualitiesForProfile(profile): ImageQuality[]
```

### Service References

```typescript
createImageServiceReference(service): ImageService
isImageService3(service): boolean
```

### Utilities

```typescript
getImageMimeType(format): string
getFormatFromMime(mimeType): ImageFormat
calculateResultingSize(region, size, originalWidth, originalHeight): SizeInfo
encodeIdentifier(identifier): string
decodeIdentifier(encoded): string
```

---

## 6. Image Source Resolver (`imageSourceResolver.ts`)

Thumbnail resolution for IIIF hierarchies. Handles complex thumbnail resolution across Collections, Manifests, and Canvases.

### Types

```typescript
interface IIIFCanvasLike {
  id: string;
  type: 'Canvas';
  thumbnail?: Array<{ id: string; type: string }>;
  items?: any[];
}

interface IIIFItemLike {
  id: string;
  type: string;
  thumbnail?: Array<{ id: string; type: string }>;
  items?: IIIFItemLike[];
}

interface ImageSourceResult {
  url: string | null;
  source: 'thumbnail' | 'painting' | 'placeholder' | 'none';
  width?: number;
  height?: number;
}

interface ResolveImageOptions {
  preferThumbnail?: boolean;
  maxSize?: number;
  allowPlaceholder?: boolean;
}
```

### Functions

```typescript
// Resolve image source for a canvas
resolveImageSource(
  canvas: IIIFCanvasLike,
  options?: ResolveImageOptions
): ImageSourceResult

// Resolve thumbnail URL
resolveThumbUrl(canvas: IIIFCanvasLike, maxSize?: number): string | null

// Resolve preview URL (larger than thumbnail)
resolvePreviewUrl(canvas: IIIFCanvasLike): string | null

// Check deep zoom capability
hasDeepZoomCapability(canvas: IIIFCanvasLike): boolean

// Get image service info
getImageServiceInfo(canvas: IIIFCanvasLike): ImageServiceInfo | null

// Hierarchical thumbnail resolution
resolveHierarchicalThumb(
  item: IIIFItemLike,
  maxSize?: number
): { url: string | null; source: string }

// Batch hierarchical thumbnail resolution
resolveHierarchicalThumbs(
  items: IIIFItemLike[],
  maxSize?: number
): Map<string, { url: string | null; source: string }>

// Get leaf canvases for thumbnail fallback
resolveLeafCanvases(item: IIIFItemLike): IIIFCanvasLike[]
```

---

## 7. Theme Classes (`themeClasses.ts`)

Status colors and theme utility functions.

### Types

```typescript
interface ThemeClasses {
  bg: string;
  text: string;
  border: string;
  hover: string;
}
```

### Functions

```typescript
// Create theme classes for a status color
createThemeClasses(color: string): ThemeClasses

// Get status color for compatibility score (0-100)
getStatusColorForScore(score: number): string

// Get status color for validation level
getStatusColorForLevel(level: 'error' | 'warning' | 'info' | 'success'): string
```

### Color Mapping

| Score Range | Color | Usage |
|-------------|-------|-------|
| 90-100 | Green | Excellent compatibility |
| 70-89 | Blue | Good compatibility |
| 50-69 | Yellow | Fair compatibility |
| 30-49 | Orange | Poor compatibility |
| 0-29 | Red | Incompatible |

---

## 8. Filename Utilities (`filenameUtils.ts`)

File naming and path manipulation utilities.

### Functions

```typescript
sanitizeFilename(filename: string): string
generateUniqueFilename(baseName: string, existingNames: string[]): string
getExtension(filename: string): string
removeExtension(filename: string): string
addSuffix(filename: string, suffix: string): string
```

---

## Usage Patterns

### Importing Utilities

```typescript
// Import specific utilities
import { findNodeById, getManifestCanvases } from '../utils/iiifHierarchy';
import { validateImageRequest } from '../utils/iiifImageApi';

// Or import from index
import {
  findNodeById,
  validateImageRequest,
  resolveImageSource
} from '../utils';
```

### Common Patterns

**Finding a resource by ID:**
```typescript
import { findNodeById } from '../utils/iiifHierarchy';

const node = findNodeById(root, 'https://example.org/manifest/1');
```

**Validating an Image API request:**
```typescript
import { validateImageRequest } from '../utils/iiifImageApi';

const result = validateImageRequest({
  region: '100,200,500,400',
  size: '800,',
  rotation: '0',
  quality: 'default',
  format: 'jpg'
});

if (!result.valid) {
  console.error(result.errors);
}
```

**Resolving a thumbnail:**
```typescript
import { resolveImageSource } from '../utils/imageSourceResolver';

const { url, source } = resolveImageSource(canvas, {
  maxSize: 400,
  preferThumbnail: true
});
```

**Checking behavior conflicts:**
```typescript
import { findBehaviorConflicts } from '../utils/iiifBehaviors';

const conflicts = findBehaviorConflicts(['auto-advance', 'no-auto-advance']);
// Returns: ['auto-advance conflicts with no-auto-advance']
```

---

## Summary Table

| Module | ~Functions | Primary Purpose |
|--------|-----------|-----------------|
| `iiifHierarchy.ts` | 25+ | Tree traversal, relationship types, collection ops |
| `iiifSchema.ts` | 20+ | Property requirements matrix, validation |
| `iiifBehaviors.ts` | 15+ | Behavior inheritance, conflict detection |
| `iiifTypes.ts` | 25+ | MIME mapping, LanguageMap validation |
| `iiifImageApi.ts` | 30+ | Full Image API 3.0 URI parsing/building |
| `imageSourceResolver.ts` | 6+ | Thumbnail resolution for hierarchies |
| `themeClasses.ts` | 3+ | Status colors, theme utilities |
| `filenameUtils.ts` | 5+ | File naming utilities |

**Total: 9 modules, ~130+ exported functions**
