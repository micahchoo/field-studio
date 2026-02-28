# V2: Export + _fileRef Fix — Implementation Plan

**Affordances:** Remove _fileRef from type system, wire exporters to storage.getAsset()
**Demo criteria:** Reload page → export works; no _fileRef in serialized vault
**File scope:** types/index.ts, extensions.ts, virtualManifestFactory.ts, imageSourceResolver.ts, exportService.ts, archivalPackageService.ts, extensions.test.ts

## Steps
1. Remove _fileRef from IIIFItem type and known properties
2. Remove _fileRef write in virtualManifestFactory
3. Remove _fileRef resolution in imageSourceResolver
4. Replace _fileRef reads in exportService with storage.getAsset()
5. Remove _fileRef fallback in archivalPackageService
6. Update extensions test
7. Fix any TypeScript errors from removal
8. Verify: typecheck + lint + existing tests pass
