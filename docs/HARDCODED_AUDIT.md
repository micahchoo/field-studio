# Audit: Hardcoded & Fragile Patterns in Field Studio

This document identifies areas where the application uses hardcoded strings, magic numbers, or rigid logic that limits portability, scalability, and adherence to the IIIF specification.

## 1. Identity & URIs (The "Base URL" Problem)

The application lacks a single source of truth for generating IIIF resource IDs, leading to scattered and conflicting patterns.

| File | Pattern | Impact |
| :--- | :--- | :--- |
| `utils/iiifHierarchy.ts` | `https://archive.local/iiif/range/${uuid}` | Hardcoded domain for Range IDs. |
| `services/viewerCompatibility.ts` | `https://example.org/iiif` | Hardcoded domain for test manifests. |
| `services/iiifBuilder.ts` | `const basePath = import.meta.env.BASE_URL...` | Manual construction of `baseUrl` inside the ingest loop. |
| `public/sw.js` | `url.host === 'archive.local'` | Service Worker is hardcoded to a legacy domain. |

**Risk:** Moving the app to a new domain or hosting it in a subdirectory (e.g., `/my-archive/`) requires searching and replacing strings across multiple files. Exported JSON will contain broken links if not manually corrected.

## 2. Image Scaling & The Service Worker Bridge

Image derivative generation and retrieval rely on a rigid set of "Magic Numbers" that are not globally configured.

| File | Pattern | Impact |
| :--- | :--- | :--- |
| `public/sw.js` | `size === '150,'`, `1200,`, `pct:30` | Rigid mapping of request strings to local storage keys. |
| `services/iiifBuilder.ts` | `generateDerivative(file, 150)` | Thumbnail generation is fixed at 150px. |
| `utils/imageSourceResolver.ts` | `preferredWidth: number = 150`, `600` | Default UI widths are hardcoded as optional parameters. |
| `utils/iiifImageApi.ts` | `targetWidths: number[] = [150, 600, 1200]` | `generateStandardSizes` uses fixed defaults. |

**Risk:** Adding support for "Retina" (300px) thumbnails or high-res (2400px) previews requires modifying the Service Worker logic, the ingest service, and the UI components simultaneously.

## 3. Brittle Resource Ingest Logic (Convention over Configuration)

`iiifBuilder.ts` makes broad assumptions about the user's intent based on folder names and file presence.

| Pattern | Code Segment | Fragility |
| :--- | :--- | :--- |
| **Underscore Prefix** | `node.name.startsWith('_') → Collection` | Users cannot use `_` for Manifest naming. |
| **Root Naming** | `cleanName === 'root' → 'My Archive'` | Prevents renaming the root collection via file structure. |
| **Loose Files** | `looseFilesNode → Manifest` | Virtual manifests for "loose files" have hardcoded naming logic. |
| **Leaf Detection** | `!hasSubdirs && mediaFiles.length > 0 → Manifest` | Prevents single-folder Collections that are intended to be empty. | 

**Risk:** The "Smart Sidecar" and "Ingest Heuristics" are black-box operations that users cannot configure without changing the source code.

## 4. IIIF Utility Rigidity

The IIIF utilities provide spec coverage but lack extension points for real-world variations.

| File | Issue | Detail |
| :--- | :--- | :--- |
| `utils/iiifImageApi.ts` | **Compliance Constants** | Compliance levels (Level 0, 1, 2) are `const` records. No way to "polyfill" a feature for a known buggy server. |
| `utils/iiifHierarchy.ts` | **Ownership Defaults** | `getRelationshipType` defaults to `'ownership'` for unknown types. This may cause accidental deletion of child nodes in future spec extensions. |
| `utils/iiifSchema.ts` | **Property Matrix** | Contains extensive metadata (Required/Recommended) that is rarely used by the UI to drive validation or affordances. |

## 5. UI Implementation Gaps

*   **Manifest Tree Logic:** `components/ManifestTree.tsx` (and other viewers) often perform manual null checks or type matching rather than using the centralized logic in `iiifHierarchy.ts`.
*   **Search Service Hardcoding:** `iiifBuilder.ts` hardcodes the Content Search service ID: `${baseUrl}/search/${uuid}`. This assumes a specific search API implementation that might not exist on all hosts.