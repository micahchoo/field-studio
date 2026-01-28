# Field Studio: Deprecated APIs

This document lists deprecated APIs that remain in the codebase for backward compatibility but should not be used in new code.

---

## Deprecation Policy

1. **Deprecation Warning**: APIs are marked with JSDoc `@deprecated` tags
2. **Backward Compatibility**: Deprecated APIs continue to function
3. **Migration Path**: Documentation provides replacement alternatives
4. **Removal Timeline**: Deprecated APIs may be removed in future major versions

---

## Deprecated Constants

### `DEFAULT_DERIVATIVE_SIZES`

**Location:** `constants.ts` (lines 706-708)

```typescript
/**
 * Default derivative sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset() instead
 */
export const DEFAULT_DERIVATIVE_SIZES = [150, 600, 1200];
```

**Replacement:**
```typescript
// Old (deprecated)
const sizes = DEFAULT_DERIVATIVE_SIZES;

// New
import { getDerivativePreset } from './constants';
const preset = getDerivativePreset('level0-static');
const sizes = preset.sizes; // [150, 600, 1200]
```

---

### `DEFAULT_BACKGROUND_SIZES`

**Location:** `constants.ts` (lines 711-714)

```typescript
/**
 * Default background generation sizes (for backwards compatibility)
 * @deprecated Use getDerivativePreset().sizes instead
 */
export const DEFAULT_BACKGROUND_SIZES = [600, 1200];
```

**Replacement:**
```typescript
// Old (deprecated)
const bgSizes = DEFAULT_BACKGROUND_SIZES;

// New
import { getDerivativePreset } from './constants';
const preset = getDerivativePreset('level0-static');
const bgSizes = preset.sizes.filter(s => s >= 600); // [600, 1200]
```

---

## Deprecated Service Properties

### `csvImporter.legacyPropertyMap`

**Location:** `services/csvImporter.ts` (lines 41-42)

```typescript
/** @deprecated Use CSV_SUPPORTED_PROPERTIES from constants.ts instead */
export const SUPPORTED_IIIF_PROPERTIES: string[] = CSV_SUPPORTED_PROPERTIES;
```

**Replacement:**
```typescript
// Old (deprecated)
import { csvImporter } from './services/csvImporter';
const properties = csvImporter.getSupportedProperties();

// New
import { CSV_SUPPORTED_PROPERTIES } from './constants';
const properties = CSV_SUPPORTED_PROPERTIES;
```

---

## Deprecated Template Functions

### `canopyTemplates.getPackageJson`

**Location:** `constants/canopyTemplates.ts` (lines 52-88)

```typescript
/** @deprecated Use generateCanopyPackageJson() instead */
export const CANOPY_PACKAGE_JSON = `{
  "name": "@canopy-iiif/app-root",
  "version": "1.6.0",
  // ... template content
}`;
```

**Replacement:**
```typescript
// Old (deprecated)
import { CANOPY_PACKAGE_JSON } from './constants/canopyTemplates';
const packageJson = CANOPY_PACKAGE_JSON;

// New
import { generateCanopyPackageJson } from './constants/canopyTemplates';
const packageJson = generateCanopyPackageJson(8765); // With configurable port
```

**Benefits of Replacement:**
- Configurable IIIF server port
- Dynamic version injection
- Consistent with other template generators

---

## Migration Guide

### Step 1: Identify Usage

Search for deprecated API usage:

```bash
# Find deprecated constant usage
grep -r "DEFAULT_DERIVATIVE_SIZES" --include="*.ts" --include="*.tsx" src/
grep -r "DEFAULT_BACKGROUND_SIZES" --include="*.ts" --include="*.tsx" src/

# Find deprecated property access
grep -r "SUPPORTED_IIIF_PROPERTIES" --include="*.ts" --include="*.tsx" src/
grep -r "CANOPY_PACKAGE_JSON" --include="*.ts" --include="*.tsx" src/
```

### Step 2: Update Imports

| Deprecated Import | New Import |
|-------------------|------------|
| `DEFAULT_DERIVATIVE_SIZES` | `getDerivativePreset` |
| `DEFAULT_BACKGROUND_SIZES` | `getDerivativePreset` |
| `SUPPORTED_IIIF_PROPERTIES` | `CSV_SUPPORTED_PROPERTIES` |
| `CANOPY_PACKAGE_JSON` | `generateCanopyPackageJson` |

### Step 3: Code Changes

#### Derivative Sizes Migration

```typescript
// Before
import { DEFAULT_DERIVATIVE_SIZES, DEFAULT_BACKGROUND_SIZES } from '../constants';

function generateDerivatives(file: File) {
  for (const size of DEFAULT_DERIVATIVE_SIZES) {
    createThumbnail(file, size);
  }
  for (const size of DEFAULT_BACKGROUND_SIZES) {
    createBackground(file, size);
  }
}

// After
import { getDerivativePreset } from '../constants';

function generateDerivatives(file: File, presetName?: string) {
  const preset = getDerivativePreset(presetName);
  
  for (const size of preset.sizes) {
    createThumbnail(file, size);
  }
  
  // Filter for background-appropriate sizes
  const bgSizes = preset.sizes.filter(s => s >= preset.thumbnailWidth);
  for (const size of bgSizes) {
    createBackground(file, size);
  }
}
```

#### CSV Properties Migration

```typescript
// Before
import { csvImporter } from '../services/csvImporter';
const supportedProps = csvImporter.getSupportedProperties();

// After
import { CSV_SUPPORTED_PROPERTIES } from '../constants';
const supportedProps = CSV_SUPPORTED_PROPERTIES;
```

#### Canopy Template Migration

```typescript
// Before
import { CANOPY_PACKAGE_JSON } from '../constants/canopyTemplates';
files['package.json'] = CANOPY_PACKAGE_JSON;

// After
import { generateCanopyPackageJson } from '../constants/canopyTemplates';
files['package.json'] = generateCanopyPackageJson(port);
```

---

## ESLint Deprecation Warnings

Add to `.eslintrc` to catch deprecated usage:

```json
{
  "rules": {
    "deprecation/deprecation": "warn"
  },
  "plugins": ["deprecation"]
}
```

Or use JSDoc deprecation detection:

```json
{
  "compilerOptions": {
    "stripInternal": true
  }
}
```

---

## Future Deprecations (Planned)

These APIs are currently stable but may be deprecated in future versions:

| API | Current Status | Planned Replacement |
|-----|---------------|---------------------|
| `FeatureFlags.USE_NEW_STAGING` | Active | Remove flag, keep new staging only |
| `StagingArea` component | Legacy | `StagingWorkbench` |
| `DUBLIN_CORE_MAP` | Active | `CSV_COLUMN_ALIASES` |
| Manual ID generation | Active | `IIIF_CONFIG.ID_PATTERNS` |

---

## Breaking Changes Log

### Version 3.0.0 (Current)

- Introduced `getDerivativePreset()` as replacement for hardcoded size arrays
- Introduced `generateCanopyPackageJson()` as replacement for static template
- Deprecated `DEFAULT_DERIVATIVE_SIZES`
- Deprecated `DEFAULT_BACKGROUND_SIZES`
- Deprecated `CANOPY_PACKAGE_JSON`

### Version 2.x to 3.0 Migration

No breaking changes - all deprecated APIs remain functional with warnings.

---

## Related Documentation

- [Utility.md](./Utility.md) - Current API documentation
- [DevelopmentPatterns.md](./DevelopmentPatterns.md) - Coding standards
