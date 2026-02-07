
> iiif-field-archive-studio@0.0.0 lint
> eslint .


/media/2TA/DevStuff/BIIIF/field-studio/index.tsx
   55:1  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
   65:9  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  152:9  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console

/media/2TA/DevStuff/BIIIF/field-studio/migrations/addTrashSupport.ts
  110:11  warning  'migratedState' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/scripts/analyze-imports.ts
   18:7  error    Variable name `__filename` trimmed as `_filename` must match one of the following formats: camelCase, UPPER_CASE, PascalCase  @typescript-eslint/naming-convention
   19:7  error    Variable name `__dirname` trimmed as `_dirname` must match one of the following formats: camelCase, UPPER_CASE, PascalCase    @typescript-eslint/naming-convention
  520:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  534:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  535:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  536:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  537:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  538:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  539:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  545:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console
  549:9  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                       no-console

/media/2TA/DevStuff/BIIIF/field-studio/scripts/audit-props.ts
   48:9  warning  'propPattern' is assigned a value but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
   49:9  warning  'propPattern2' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  114:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  115:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  123:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  124:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  125:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  126:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  127:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  133:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  134:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  135:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  136:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  137:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  139:5  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  146:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  147:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  148:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  149:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  150:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  153:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  155:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  183:3  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/app/App.tsx
    4:10   warning  'ToastProvider' is defined but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
    5:10   warning  'ErrorBoundary' is defined but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
   14:105  warning  Member 'QUICK_REF_STAGING' of the import declaration should be sorted alphabetically                                                                                sort-imports
   36:61   warning  'VaultProvider' is defined but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
   38:10   warning  'UserIntentProvider' is defined but never used. Allowed unused vars must match /^_/u                                                                                @typescript-eslint/no-unused-vars
   39:10   warning  'ResourceContextProvider' is defined but never used. Allowed unused vars must match /^_/u                                                                           @typescript-eslint/no-unused-vars
   63:11   warning  'state' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                    @typescript-eslint/no-unused-vars
   66:44   warning  React Hook useMemo has a missing dependency: 'exportRoot'. Either include it or remove the dependency array                                                         react-hooks/exhaustive-deps
   99:10   warning  'pipelineContext' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
  144:6    warning  React Hook useEffect has a missing dependency: 'setCurrentMode'. Either include it or remove the dependency array                                                   react-hooks/exhaustive-deps
  208:6    warning  React Hook useMemo has a missing dependency: 'setCurrentMode'. Either include it or remove the dependency array                                                     react-hooks/exhaustive-deps
  253:9    warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  258:37   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  286:5    warning  Arrow function expected no return value                                                                                                                             consistent-return
  287:6    warning  React Hook useEffect has missing dependencies: 'setCurrentMode' and 'storageFullDialog'. Either include them or remove the dependency array                         react-hooks/exhaustive-deps
  356:31   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  356:54   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  397:6    warning  React Hook useCallback has a missing dependency: 'setCurrentMode'. Either include it or remove the dependency array                                                 react-hooks/exhaustive-deps
  404:6    warning  React Hook useCallback has a missing dependency: 'setCurrentMode'. Either include it or remove the dependency array                                                 react-hooks/exhaustive-deps
  406:9    warning  'handleManifestSynthesis' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                  @typescript-eslint/no-unused-vars
  410:6    warning  React Hook useCallback has a missing dependency: 'setCurrentMode'. Either include it or remove the dependency array                                                 react-hooks/exhaustive-deps
  440:41   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  462:41   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  510:5    warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  566:13   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  570:13   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  658:30   warning  Forbidden non-null assertion                                                                                                                                        @typescript-eslint/no-non-null-assertion
  682:126  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  682:138  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  715:40   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  767:1    error    '@/src/app/providers' import is duplicated                                                                                                                          no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/app/providers/AppModeProvider.tsx
  75:15  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/app/providers/useTerminology.ts
  20:8  warning  'TerminologyKey' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/app/providers/useVaultSelectors.ts
   27:3   warning  'IIIFItem' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
  184:47  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  196:42  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  416:15  warning  'manifest' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/app/routes/ViewRouter.tsx
   14:15  warning  'AppMode' is defined but never used. Allowed unused vars must match /^_/u                                                                                           @typescript-eslint/no-unused-vars
   14:34  warning  Member 'IIIFCanvas' of the import declaration should be sorted alphabetically                                                                                       sort-imports
   22:24  warning  Member 'Inspector' of the import declaration should be sorted alphabetically                                                                                        sort-imports
   48:29  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   48:47  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   59:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  327:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  338:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/annotation/model/contentSearchService.ts
   24:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   40:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   94:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  140:34  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  162:58  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  200:14  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  251:14  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  317:9   warning  Use object destructuring                                                                                prefer-destructuring
  318:9   warning  Use object destructuring                                                                                prefer-destructuring
  336:11  warning  Use object destructuring                                                                                prefer-destructuring
  337:11  warning  Use object destructuring                                                                                prefer-destructuring
  481:14  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  585:11  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  612:11  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/canvas/model/avService.ts
   13:38  warning  'IIIFManifest' is defined but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars
   34:11  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
   44:11  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  100:59  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion
  201:17  warning  'loops' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  246:25  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  247:22  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/canvas/model/imageSourceResolver.ts
   36:3   warning  'IIIFAnnotation' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars
   42:32  warning  'ImageServiceInfo' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
  555:9   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/collection/model/stagingService.ts
  409:44  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/actions.ts
   30:3   warning  'VaultSnapshot' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   38:3   warning  'IIIFRangeReference' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  381:15  warning  'newSet' is assigned a value but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
  687:56  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  723:53  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  750:52  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  767:57  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  771:49  warning  Forbidden non-null assertion                                                          @typescript-eslint/no-non-null-assertion
  982:46  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  983:52  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any
  984:54  warning  Unexpected any. Specify a different type                                              @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/builders/autoStructure.ts
   2:24  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  17:31  warning  'idx' is defined but never used. Allowed unused args must match /^_/u         @typescript-eslint/no-unused-vars
  38:9   warning  Forbidden non-null assertion                                                  @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/builders/fileLifecycle.ts
  22:14  warning  'entityId' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  22:32  warning  'file' is defined but never used. Allowed unused args must match /^_/u      @typescript-eslint/no-unused-vars
  22:44  warning  'onRevoke' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  26:16  warning  'entityId' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/builders/iiifBuilder.ts
     3:3   warning  'FileStatus' is defined but never used. Allowed unused vars must match /^_/u                            @typescript-eslint/no-unused-vars
    28:10  warning  'generateDerivativeAsync' is defined but never used. Allowed unused vars must match /^_/u               @typescript-eslint/no-unused-vars
    29:25  warning  'HashLookupResult' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
    33:3   warning  'isStandaloneType' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
    38:3   warning  'DEFAULT_VIEWING_DIRECTION' is defined but never used. Allowed unused vars must match /^_/u             @typescript-eslint/no-unused-vars
    39:3   warning  'getContentTypeFromFilename' is defined but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
    40:3   warning  'getMimeType' is defined but never used. Allowed unused vars must match /^_/u                           @typescript-eslint/no-unused-vars
    41:3   warning  'IMAGE_API_PROTOCOL' is defined but never used. Allowed unused vars must match /^_/u                    @typescript-eslint/no-unused-vars
    42:3   warning  'isImageMimeType' is defined but never used. Allowed unused vars must match /^_/u                       @typescript-eslint/no-unused-vars
    43:3   warning  'isTimeBasedMimeType' is defined but never used. Allowed unused vars must match /^_/u                   @typescript-eslint/no-unused-vars
    44:3   warning  'suggestBehaviors' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
    45:3   warning  'validateResource' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
    47:1   error    '@/src/shared/constants' import is duplicated                                                           no-duplicate-imports
    55:3   warning  'ingestTreeWithWorkers' is defined but never used. Allowed unused vars must match /^_/u                 @typescript-eslint/no-unused-vars
    56:3   warning  'IngestWorkerPool' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
    57:3   warning  'PoolStats' is defined but never used. Allowed unused vars must match /^_/u                             @typescript-eslint/no-unused-vars
    64:3   warning  'IngestWorkerResponse' is defined but never used. Allowed unused vars must match /^_/u                  @typescript-eslint/no-unused-vars
   303:10  warning  'handleWorkerProgress' is defined but never used. Allowed unused vars must match /^_/u                  @typescript-eslint/no-unused-vars
   330:10  warning  'handleWorkerFileComplete' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
   360:10  warning  'handleWorkerComplete' is defined but never used. Allowed unused vars must match /^_/u                  @typescript-eslint/no-unused-vars
   387:10  warning  'handleWorkerError' is defined but never used. Allowed unused vars must match /^_/u                     @typescript-eslint/no-unused-vars
   533:14  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
   602:16  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   605:26  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   607:14  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
   609:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   639:38  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   651:22  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   653:11  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   664:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   668:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   672:5   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   682:44  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   692:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   695:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   700:7   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   708:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   718:11  warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   719:11  warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   728:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   744:20  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
   751:11  warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   765:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   788:31  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   853:15  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
   863:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   868:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   873:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   878:9   warning  Assignment to function parameter 'progress'                                                             no-param-reassign
   889:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   892:34  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   935:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   988:18  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   991:32  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
   993:18  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
  1020:48  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  1032:30  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  1035:21  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  1055:50  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  1089:26  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
  1129:39  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1198:25  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
  1210:13  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  1213:40  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1257:13  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  1419:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
  1428:9   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
  1484:19  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  1507:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  1583:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  1669:25  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/hooks/useIIIFEntity.tsx
   31:3   warning  'Vault' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                             @typescript-eslint/no-unused-vars
   36:3   warning  'ActionHistory' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                     @typescript-eslint/no-unused-vars
   41:3   warning  'IIIFAnnotationPage' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                @typescript-eslint/no-unused-vars
  177:11  warning  'normalized' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                               @typescript-eslint/no-unused-vars
  320:9   warning  The 'canvasIds' conditional could make the dependencies of useMemo Hook (at line 326) change on every render. To fix this, wrap the initialization of 'canvasIds' in its own useMemo() Hook                                                         react-hooks/exhaustive-deps
  390:9   warning  The 'annotationPageIds' conditional could make the dependencies of useMemo Hook (at line 406) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'annotationPageIds' in its own useMemo() Hook  react-hooks/exhaustive-deps
  417:5   warning  React Hook useMemo has a missing dependency: 'canvas'. Either include it or remove the dependency array                                                                                                                                             react-hooks/exhaustive-deps
  500:9   warning  The 'childIds' conditional could make the dependencies of useMemo Hook (at line 504) change on every render. To fix this, wrap the initialization of 'childIds' in its own useMemo() Hook                                                           react-hooks/exhaustive-deps

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/hooks/useVaultSelectors.ts
   27:3   warning  'IIIFItem' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
  182:47  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  194:42  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  414:15  warning  'manifest' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/ingest/ingestAnalyzer.ts
  243:3   warning  'parentType' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  356:28  warning  Forbidden non-null assertion                                                  @typescript-eslint/no-non-null-assertion
  449:20  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any
  449:32  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any
  465:28  warning  Forbidden non-null assertion                                                  @typescript-eslint/no-non-null-assertion
  553:27  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any
  553:39  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any
  562:27  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any
  562:39  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/ingest/ingestState.ts
   17:7  warning  'CHECKPOINTS_STORE' is assigned a value but never used. Allowed unused vars must match /^_/u               @typescript-eslint/no-unused-vars
  439:5  error    Object Literal Property name `in_progress` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  453:5  error    Object Literal Property name `in_progress` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/ingest/ingestWorkerPool.ts
   15:3   warning  'IngestCompleteMessage' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
   16:3   warning  'IngestErrorMessage' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars
   17:3   warning  'IngestFileCompleteMessage' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   18:3   warning  'IngestNodeCompleteMessage' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   19:3   warning  'IngestProgressMessage' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
   27:3   warning  'IngestFileInfo' is defined but never used. Allowed unused vars must match /^_/u             @typescript-eslint/no-unused-vars
   29:3   warning  'IngestProgressOptions' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
   30:3   warning  'IngestReport' is defined but never used. Allowed unused vars must match /^_/u               @typescript-eslint/no-unused-vars
   33:10  warning  'FEATURE_FLAGS' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
   34:10  warning  'getTileWorkerPool' is defined but never used. Allowed unused vars must match /^_/u          @typescript-eslint/no-unused-vars
  149:30  warning  'fileId' is assigned a value but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
  182:30  warning  'fileId' is assigned a value but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
  227:30  warning  'fileId' is assigned a value but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
  255:25  warning  'operationId' is defined but never used. Allowed unused args must match /^_/u                @typescript-eslint/no-unused-vars
  563:5   warning  Async method 'flush' expected no return value                                                consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/ingest/tileWorker.ts
  16:48  warning  'file' is defined but never used. Allowed unused args must match /^_/u   @typescript-eslint/no-unused-vars
  16:60  warning  'sizes' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  34:3   warning  'file' is defined but never used. Allowed unused args must match /^_/u   @typescript-eslint/no-unused-vars
  35:3   warning  'size' is defined but never used. Allowed unused args must match /^_/u   @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/trash/trashService.ts
   18:3   warning  'getDescendants' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  529:17  warning  'id' is assigned a value but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
  612:16  warning  'id' is assigned a value but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/validation/validationHealer.ts
    3:61  warning  Member 'generateUUID' of the import declaration should be sorted alphabetically            sort-imports
    8:3   warning  'getMinimumTemplate' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
    9:3   warning  'getPropertyRequirement' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
   11:3   warning  'isBehaviorAllowed' is defined but never used. Allowed unused vars must match /^_/u        @typescript-eslint/no-unused-vars
   12:3   warning  'isValidViewingDirection' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   13:3   warning  'VIEWING_DIRECTIONS' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   16:3   warning  'findBehaviorConflicts' is defined but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars
   17:3   warning  'getDefaultBehavior' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   60:12  warning  'e' is defined but never used                                                              @typescript-eslint/no-unused-vars
   94:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  109:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  113:29  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  136:35  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  180:49  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  182:11  warning  'label' is assigned a value but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
  188:12  warning  'e' is defined but never used                                                              @typescript-eslint/no-unused-vars
  200:36  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  323:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  392:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  404:36  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  405:20  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  405:47  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  406:27  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  407:24  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  416:21  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  417:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  430:22  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  430:48  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  431:20  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  431:45  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  434:22  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  434:49  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  435:20  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  435:44  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  439:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  440:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  447:41  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  449:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  496:51  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  510:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  516:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  526:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  532:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  538:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  550:82  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  552:27  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  589:25  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  593:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  604:25  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  608:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  617:16  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  627:25  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  633:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  635:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  637:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  639:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  641:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  653:20  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  658:25  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  669:25  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  673:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  683:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  692:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  704:39  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  705:18  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  716:20  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  717:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  717:46  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  718:23  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  718:47  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any
  745:28  warning  Unexpected any. Specify a different type                                                   @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/validation/validator.ts
    3:3   warning  'getRecommendedProperties' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
    4:3   warning  'IIIF_SCHEMA' is defined but never used. Allowed unused vars must match /^_/u                           @typescript-eslint/no-unused-vars
    5:3   warning  'isBehaviorAllowed' is defined but never used. Allowed unused vars must match /^_/u                     @typescript-eslint/no-unused-vars
    8:10  warning  'isValidHttpUri' is defined but never used. Allowed unused vars must match /^_/u                        @typescript-eslint/no-unused-vars
   65:37  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   65:60  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   65:89  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   66:36  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  190:49  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  190:75  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  271:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault.ts
    24:3   warning  'LanguageString' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   150:14  warning  'e' is defined but never used                                                     @typescript-eslint/no-unused-vars
   163:10  warning  'deepCloneState' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   171:14  warning  'e' is defined but never used                                                     @typescript-eslint/no-unused-vars
   677:21  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion
  1015:24  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion
  1093:26  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion
  1132:42  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  1187:23  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion
  1265:25  warning  Forbidden non-null assertion                                                      @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/collections.ts
  10:1  error  '@/src/shared/types' import is duplicated  no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/denormalization.ts
  16:1  error  '@/src/shared/types' import is duplicated  no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/normalization.ts
  17:1  error  '@/src/shared/types' import is duplicated  no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/queries.ts
   9:1   error    '@/src/shared/types' import is duplicated  no-duplicate-imports
  77:21  warning  Forbidden non-null assertion               @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/trash.ts
   11:1   error    '@/src/shared/types' import is duplicated                                            no-duplicate-imports
   11:59  warning  Member 'EmptyTrashResult' of the import declaration should be sorted alphabetically  sort-imports
   12:21  warning  Member 'getDescendants' of the import declaration should be sorted alphabetically    sort-imports
  105:23  warning  Forbidden non-null assertion                                                         @typescript-eslint/no-non-null-assertion
  183:25  warning  Forbidden non-null assertion                                                         @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/updates.ts
   11:1   error    '@/src/shared/types' import is duplicated  no-duplicate-imports
  232:24  warning  Forbidden non-null assertion               @typescript-eslint/no-non-null-assertion
  310:26  warning  Forbidden non-null assertion               @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/entities/manifest/model/vault/vault.ts
  12:1   error    '@/src/shared/types' import is duplicated                                                no-duplicate-imports
  13:21  warning  Member 'createEmptyState' of the import declaration should be sorted alphabetically      sort-imports
  15:34  warning  Member 'getChildIds' of the import declaration should be sorted alphabetically           sort-imports
  15:47  warning  'getEntitiesByType' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  16:36  warning  Member 'getCollectionMembers' of the import declaration should be sorted alphabetically  sort-imports
  17:24  warning  Member 'addEntity' of the import declaration should be sorted alphabetically             sort-imports
  18:53  warning  Member 'emptyTrash' of the import declaration should be sorted alphabetically            sort-imports
  19:22  warning  'reorderChildren' is defined but never used. Allowed unused vars must match /^_/u        @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/archive/ui/organisms/ArchiveGrid.tsx
   19:1   warning  [ARCHITECTURE] Organism ArchiveGrid has 328 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                @field-studio/max-lines-feature
   22:10  warning  'Icon' is defined but never used. Allowed unused vars must match /^_/u                                                                                              @typescript-eslint/no-unused-vars
  114:3   warning  'isMobile' is defined but never used. Allowed unused args must match /^_/u                                                                                          @typescript-eslint/no-unused-vars
  115:3   warning  'activeItem' is defined but never used. Allowed unused args must match /^_/u                                                                                        @typescript-eslint/no-unused-vars
  150:9   warning  'getItemIndex' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
  209:11  warning  'isHovered' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                @typescript-eslint/no-unused-vars
  251:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  281:23  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  288:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  300:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  312:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  349:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/archive/ui/organisms/ArchiveHeader.tsx
  104:3   warning  'onBatchEdit' is defined but never used. Allowed unused args must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  237:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  248:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/archive/ui/organisms/ArchiveList.tsx
   15:1   warning  [ARCHITECTURE] Organism ArchiveList has 331 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                @field-studio/max-lines-feature
   15:27  warning  Member 'useMemo' of the import declaration should be sorted alphabetically                                                                                          sort-imports
   78:43  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   78:67  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  240:19  warning  'dna' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
  360:19  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/archive/ui/organisms/ArchiveView.tsx
   13:1   warning  [ARCHITECTURE] Organism ArchiveView has 565 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                @field-studio/max-lines-feature
   20:78  warning  Member 'BreadcrumbNav' of the import declaration should be sorted alphabetically                                                                                    sort-imports
   20:78  warning  'BreadcrumbNav' is defined but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
   20:98  warning  'BreadcrumbItem' is defined but never used. Allowed unused vars must match /^_/u                                                                                    @typescript-eslint/no-unused-vars
   26:10  warning  'Button' is defined but never used. Allowed unused vars must match /^_/u                                                                                            @typescript-eslint/no-unused-vars
  174:21  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  223:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  225:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  229:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  251:27  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  253:37  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  277:24  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  278:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase                                                              @typescript-eslint/naming-convention
  331:38  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  335:52  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  383:5   warning  Arrow function expected no return value                                                                                                                             consistent-return
  453:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/board-design/model/index.ts
  225:23  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  277:18  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/board-design/ui/organisms/BoardHeader.tsx
   13:10  warning  'ViewToggle' is defined but never used. Allowed unused vars must match /^_/u                                                                                        @typescript-eslint/no-unused-vars
  140:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  172:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  200:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/board-design/ui/organisms/BoardOnboarding.tsx
  165:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  179:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  195:9   error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  210:13  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  254:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  262:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/board-design/ui/organisms/BoardView.tsx
   15:1   warning  [ARCHITECTURE] Organism BoardView has 538 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
  109:9   warning  'hasArchiveItems' is assigned a value but never used. Allowed unused vars must match /^_/u                                          @typescript-eslint/no-unused-vars
  110:14  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  111:14  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  112:14  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  239:17  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  346:13  warning  Use object destructuring                                                                                                            prefer-destructuring
  350:32  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  358:20  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  359:18  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  384:34  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  392:22  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  393:20  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  416:29  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  463:29  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any
  472:29  warning  Unexpected any. Specify a different type                                                                                            @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/model/useDependencyData.ts
  5:20  warning  Member 'useEffect' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/ArchitecturePanel.tsx
  13:51  warning  Member 'formatCrossLayerDepsAsMarkdown' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/CopyableSection.tsx
  7:27  warning  Member 'useCallback' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/DependencyExplorer.tsx
    8:27  warning  Member 'useMemo' of the import declaration should be sorted alphabetically                                                                                          sort-imports
   16:25  warning  Member 'FilterType' of the import declaration should be sorted alphabetically                                                                                       sort-imports
  106:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  159:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  174:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  198:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/DependencyGraphView.tsx
   21:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   29:29  error    Object Literal Property name `__files` trimmed as `_files` must match one of the following formats: camelCase, PascalCase                                           @typescript-eslint/naming-convention
   60:24  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  105:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  148:10  error    Function name `FileIcon` must match one of the following formats: camelCase                                                                                         @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/FileDetailPanel.tsx
   42:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  152:23  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  196:17  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/dependency-explorer/ui/OrphansPanel.tsx
  61:19  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/export/model/archivalPackageService.ts
   12:46  warning  'IIIFManifest' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  520:20  warning  Unexpected any. Specify a different type                                        @typescript-eslint/no-explicit-any
  521:31  warning  Unexpected any. Specify a different type                                        @typescript-eslint/no-explicit-any
  537:64  warning  Unexpected any. Specify a different type                                        @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/export/model/exportService.ts
     3:24  warning  'IIIFAnnotation' is defined but never used. Allowed unused vars must match /^_/u                        @typescript-eslint/no-unused-vars
     3:78  warning  'IIIFManifest' is defined but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars
     3:92  warning  'isCanvas' is defined but never used. Allowed unused vars must match /^_/u                              @typescript-eslint/no-unused-vars
     7:3   warning  'generateInfoJson' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
     9:3   warning  'generateStandardTiles' is defined but never used. Allowed unused vars must match /^_/u                 @typescript-eslint/no-unused-vars
    11:3   warning  'ImageApiProfile' is defined but never used. Allowed unused vars must match /^_/u                       @typescript-eslint/no-unused-vars
   301:34  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   301:63  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   309:27  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   360:71  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   381:61  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   435:39  warning  'imagesBasePath' is assigned a value but never used. Allowed unused vars must match /^_/u               @typescript-eslint/no-unused-vars
   468:99  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   762:21  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   794:60  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   915:35  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1179:21  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1180:13  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/features/export/model/staticSiteExporter.ts
    11:100  warning  'isManifest' is defined but never used. Allowed unused vars must match /^_/u                            @typescript-eslint/no-unused-vars
    13:10   warning  'LunrDocument' is defined but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars
    21:3    warning  'ImageApiProfile' is defined but never used. Allowed unused vars must match /^_/u                       @typescript-eslint/no-unused-vars
    24:10   warning  'DEFAULT_DERIVATIVE_SIZES' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
   280:40   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   292:51   warning  'cfg' is defined but never used. Allowed unused args must match /^_/u                                   @typescript-eslint/no-unused-vars
   302:20   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   303:47   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   329:43   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   416:31   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   512:27   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   512:50   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   525:7    error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   529:29   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   546:7    error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   550:31   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
   781:30   warning  'cfg' is defined but never used. Allowed unused args must match /^_/u                                   @typescript-eslint/no-unused-vars
  1000:54   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1002:28   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1003:21   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  1003:41   warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/export/ui/ExportDialog.tsx
    4:24  warning  'ExportOptions' is defined but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
   86:6   warning  React Hook useEffect has missing dependencies: 'handleDryRun' and 'root'. Either include them or remove the dependency array                                        react-hooks/exhaustive-deps
  111:19  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  135:17  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  202:17  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  222:66  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  259:17  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  322:21  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  349:29  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  360:29  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  379:33  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  390:33  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  409:29  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  830:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  831:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  846:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  847:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  857:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  858:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  868:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  869:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/ingest/model/csvImporter.ts
    5:3   warning  'isValidNavDate' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  224:18  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  239:18  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  258:23  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  259:20  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  265:20  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  267:20  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  427:50  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  428:35  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  472:49  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  476:23  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  480:23  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any
  497:27  warning  Unexpected any. Specify a different type                                          @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/ingest/ui/ExternalImportDialog.tsx
    4:10  warning  'AuthRequiredResult' is defined but never used. Allowed unused vars must match /^_/u                                                                                @typescript-eslint/no-unused-vars
   64:17  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   91:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  108:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  132:33  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  133:46  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  155:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  158:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/map/ui/organisms/MapView.tsx
  33:1  error  '@/src/features/viewer/ui/atoms' import is restricted from being used by a pattern. ❌ FSD: Features cannot import from other features. Use shared layer for cross-cutting concerns  no-restricted-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/model/index.ts
  133:39  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/model/useInspectorValidation.ts
   15:19  warning  Member 'useCallback' of the import declaration should be sorted alphabetically     sort-imports
   16:25  warning  Member 'IIIFCollection' of the import declaration should be sorted alphabetically  sort-imports
   16:55  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
  153:15  warning  'item' is defined but never used. Allowed unused args must match /^_/u             @typescript-eslint/no-unused-vars
  167:13  warning  Use object destructuring                                                           prefer-destructuring
  182:13  warning  Use object destructuring                                                           prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/AnnotationItem.tsx
  46:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/AutoMapButton.tsx
  16:16  warning  Member 'Button' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/BehaviorTag.tsx
  42:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/EmptyProperties.tsx
  33:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/FileDropZone.tsx
  15:27  warning  Member 'useCallback' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/ImportSummary.tsx
  16:32  warning  'ValidationStatus' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/LocationPicker.tsx
  16:16  warning  Member 'Button' of the import declaration should be sorted alphabetically  sort-imports
  37:3   warning  'cx' is defined but never used. Allowed unused args must match /^_/u       @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/MappingRow.tsx
  19:28  warning  Member 'PropertyOption' of the import declaration should be sorted alphabetically  sort-imports
  20:23  warning  Member 'LanguageOption' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/PropertyLabel.tsx
  39:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/RightsBadge.tsx
  38:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/ShareButton.tsx
   20:10  warning  'COLORS' is defined but never used. Allowed unused vars must match /^_/u                                                                                            @typescript-eslint/no-unused-vars
  191:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  220:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  265:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  285:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  305:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  324:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  344:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/TechnicalProperty.tsx
  38:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/atoms/ValidatedInput.tsx
  165:7   error    Object Literal Property name `aria-describedby` must match one of the following formats: camelCase, PascalCase                                                      @typescript-eslint/naming-convention
  182:9   warning  'InputComponent' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                           @typescript-eslint/no-unused-vars
  245:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/CSVImportModal.tsx
   16:1   warning  [ARCHITECTURE] Molecule CSVImportModal has 220 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
   81:10  warning  'csvText' is assigned a value but never used. Allowed unused vars must match /^_/u                                                              @typescript-eslint/no-unused-vars
  108:9   warning  'propertiesByCategory' is assigned a value but never used. Allowed unused vars must match /^_/u                                                 @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/CSVImportWizard.tsx
   18:1   warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports
   19:1   error    '@/src/shared/ui/atoms' import is duplicated                                                                                                                                                                                            no-duplicate-imports
   19:48  warning  Member 'WizardStepConnector' of the import declaration should be sorted alphabetically                                                                                                                                                  sort-imports
   98:3   warning  'defaultLanguage' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                       @typescript-eslint/no-unused-vars
  103:3   warning  'onStepChange' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                          @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/GeoEditor.tsx
    8:1   warning  [ARCHITECTURE] Molecule GeoEditor has 407 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                           @field-studio/max-lines-feature
   13:3   warning  'LatLngBounds' is defined but never used. Allowed unused vars must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
   42:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   43:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   64:28  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   74:44  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   77:43  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   85:30  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
   90:25  warning  Forbidden non-null assertion                                                                                                                                        @typescript-eslint/no-non-null-assertion
  109:9   error    [ARCHITECTURE] useEffect in molecules should not call external services (loadNavPlaceToMap). Move to organism or use props callback                                 @field-studio/useeffect-restrictions
  113:27  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  115:27  error    [ARCHITECTURE] useEffect in molecules should not call external services (createPointFeature). Move to organism or use props callback                                @field-studio/useeffect-restrictions
  115:27  error    [ARCHITECTURE] useEffect in molecules should not call service methods (navPlaceService.createPointFeature). Services belong in organisms                            @field-studio/useeffect-restrictions
  123:24  error    [ARCHITECTURE] useEffect in molecules should not call external services (getCenter). Move to organism or use props callback                                         @field-studio/useeffect-restrictions
  130:5   warning  Arrow function expected no return value                                                                                                                             consistent-return
  136:6   warning  React Hook useEffect has missing dependencies: 'addFeatureToNavPlace', 'drawMode', 'editable', and 'navPlace'. Either include them or remove the dependency array   react-hooks/exhaustive-deps
  144:44  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  147:9   error    [ARCHITECTURE] useEffect in molecules should not call external services (loadNavPlaceToMap). Move to organism or use props callback                                 @field-studio/useeffect-restrictions
  151:5   error    [ARCHITECTURE] useEffect in molecules should not call external services (loadLeaflet). Move to organism or use props callback                                       @field-studio/useeffect-restrictions
  156:10  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  157:17  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  158:8   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  163:31  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  163:44  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  166:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  166:44  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  179:36  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  205:40  warning  Forbidden non-null assertion                                                                                                                                        @typescript-eslint/no-non-null-assertion
  297:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  319:21  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  331:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  352:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  361:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  372:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  415:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  436:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  445:44  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  447:25  warning  Forbidden non-null assertion                                                                                                                                        @typescript-eslint/no-non-null-assertion
  458:23  error    [ARCHITECTURE] useEffect in molecules should not call service methods (navPlaceService.toGeoJSON). Services belong in organisms                                     @field-studio/useeffect-restrictions
  461:22  error    [ARCHITECTURE] useEffect in molecules should not call external services (getBounds). Move to organism or use props callback                                         @field-studio/useeffect-restrictions
  461:22  error    [ARCHITECTURE] useEffect in molecules should not call service methods (navPlaceService.getBounds). Services belong in organisms                                     @field-studio/useeffect-restrictions
  474:5   warning  Arrow function expected no return value                                                                                                                             consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/LocationPickerModal.tsx
  18:1   warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports
  21:18  warning  Unexpected any. Specify a different type                                                                                                                                                                                                @typescript-eslint/no-explicit-any
  23:8   warning  [ARCHITECTURE] Molecule LocationPickerModalProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate                                                                                   @field-studio/molecule-props-validation
  69:27  warning  Unexpected any. Specify a different type                                                                                                                                                                                                @typescript-eslint/no-explicit-any
  74:33  warning  Unexpected any. Specify a different type                                                                                                                                                                                                @typescript-eslint/no-explicit-any
  79:7   warning  Arrow function expected no return value                                                                                                                                                                                                 consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/MappingStep.tsx
  17:16  warning  Member 'Button' of the import declaration should be sorted alphabetically  sort-imports
  19:1   error    '../atoms' import is duplicated                                            no-duplicate-imports
  20:1   error    '../atoms' import is duplicated                                            no-duplicate-imports
  21:1   error    '../atoms' import is duplicated                                            no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/MetadataTabPanel.tsx
   18:1   warning  [ARCHITECTURE] Molecule MetadataTabPanel has 442 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                                                                                        @field-studio/max-lines-feature
   21:1   warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports
   21:10  warning  'Button' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                @typescript-eslint/no-unused-vars
   92:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                                                      no-restricted-syntax
  165:9   error    [ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom                                                                                                                @field-studio/no-native-html-in-molecules
  223:9   warning  'locationFields' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                               @typescript-eslint/no-unused-vars
  270:33  warning  'idx' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                   @typescript-eslint/no-unused-vars
  306:34  warning  'idx' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                   @typescript-eslint/no-unused-vars
  371:81  warning  Forbidden non-null assertion                                                                                                                                                                                                            @typescript-eslint/no-non-null-assertion
  387:36  warning  'idx' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                   @typescript-eslint/no-unused-vars
  413:37  warning  'idx' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                                                   @typescript-eslint/no-unused-vars
  447:21  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                                                      no-restricted-syntax
  479:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                                                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/StructureTabPanel.tsx
   13:1   warning  [ARCHITECTURE] Molecule StructureTabPanel has 569 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                                                         @field-studio/max-lines-feature
   13:27  warning  Member 'useCallback' of the import declaration should be sorted alphabetically                                                                                                                            sort-imports
   13:40  warning  'useMemo' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                 @typescript-eslint/no-unused-vars
   18:3   warning  Member 'IIIFCanvas' of the import declaration should be sorted alphabetically                                                                                                                             sort-imports
   20:3   warning  'LanguageMap' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                             @typescript-eslint/no-unused-vars
   37:6   warning  'RangeItem' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                               @typescript-eslint/no-unused-vars
   71:3   warning  'canvases' is defined but never used. Allowed unused args must match /^_/u                                                                                                                                @typescript-eslint/no-unused-vars
  110:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  154:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  160:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  242:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  330:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  342:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax
  378:9   warning  The 'structures' logical expression could make the dependencies of useCallback Hook (at line 409) change on every render. To fix this, wrap the initialization of 'structures' in its own useMemo() Hook  react-hooks/exhaustive-deps
  378:9   warning  The 'structures' logical expression could make the dependencies of useCallback Hook (at line 448) change on every render. To fix this, wrap the initialization of 'structures' in its own useMemo() Hook  react-hooks/exhaustive-deps
  378:9   warning  The 'structures' logical expression could make the dependencies of useCallback Hook (at line 477) change on every render. To fix this, wrap the initialization of 'structures' in its own useMemo() Hook  react-hooks/exhaustive-deps
  378:9   warning  The 'structures' logical expression could make the dependencies of useCallback Hook (at line 528) change on every render. To fix this, wrap the initialization of 'structures' in its own useMemo() Hook  react-hooks/exhaustive-deps
  602:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated                                        no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/TechnicalTabPanel.tsx
   21:1   warning  [ARCHITECTURE] Molecule TechnicalTabPanel has 296 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                   @field-studio/max-lines-feature
   21:27  warning  Member 'useEffect' of the import declaration should be sorted alphabetically                                                                                        sort-imports
   48:7   warning  'BASIC_FIELDS' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
   49:7   warning  'ADVANCED_FIELDS' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
  193:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  228:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  251:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  274:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  297:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  320:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  343:17  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/ValidationSummary.tsx
  62:3  warning  'cx' is assigned a value but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/molecules/ValidationTabPanel.tsx
  101:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/organisms/BatchEditor.tsx
    2:1   warning  [ARCHITECTURE] Organism BatchEditor has 307 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                @field-studio/max-lines-feature
   47:12  warning  'e' is defined but never used                                                                                                                                       @typescript-eslint/no-unused-vars
   69:10  warning  'showAddMenu' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                              @typescript-eslint/no-unused-vars
   69:23  warning  'setShowAddMenu' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                           @typescript-eslint/no-unused-vars
   95:24  warning  'setSharedRights' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
   96:25  warning  'setSharedNavDate' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                         @typescript-eslint/no-unused-vars
   97:24  warning  'setCustomFields' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
  121:39  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  131:16  warning  'e' is defined but never used                                                                                                                                       @typescript-eslint/no-unused-vars
  203:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  207:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  208:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  209:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  248:37  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  251:29  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  283:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  296:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  297:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  325:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  331:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  347:5   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/organisms/Inspector.tsx
    2:1    warning  [ARCHITECTURE] Organism Inspector has 739 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                              @field-studio/max-lines-feature
    2:39   warning  'useRef' is defined but never used. Allowed unused vars must match /^_/u                                                                                                        @typescript-eslint/no-unused-vars
   11:1    error    '@/src/app/providers/useTerminology' import is restricted from being used by a pattern. ❌ FSD: Features cannot import from app layer. Receive context via props from Templates  no-restricted-imports
   86:18   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  113:7    warning  'ValidatedField' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  156:17   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  183:29   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  184:33   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  240:48   warning  React Hook useMemo has a missing dependency: 'resourceProp'. Either include it or remove the dependency array                                                                   react-hooks/exhaustive-deps
  242:9    warning  'hasResource' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                          @typescript-eslint/no-unused-vars
  247:17   warning  'inspectorWidth' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  283:11   warning  'hasError' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                             @typescript-eslint/no-unused-vars
  308:35   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  310:32   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  311:33   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  323:9    warning  'handleUpdateMetadataField' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                            @typescript-eslint/no-unused-vars
  332:9    warning  'handleAddMetadataField' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                               @typescript-eslint/no-unused-vars
  337:129  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  348:9    warning  'handleRemoveMetadataField' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                            @typescript-eslint/no-unused-vars
  379:11   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  392:11   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  397:40   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  428:21   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  440:23   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  481:19   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  490:25   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  518:23   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  549:27   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  553:19   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  554:80   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  563:78   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  576:19   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  587:23   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  644:89   warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  682:23   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  694:23   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx
  25:1  error    '@/src/shared/ui/molecules' import is duplicated                                                                                    no-duplicate-imports
  57:3  error    Object Literal Property name `TAB_PERSISTENCE` must match one of the following formats: camelCase, PascalCase                       @typescript-eslint/naming-convention
  58:3  error    Object Literal Property name `VALIDATION_UI` must match one of the following formats: camelCase, PascalCase                         @typescript-eslint/naming-convention
  59:3  error    Object Literal Property name `MOBILE_INSPECTOR` must match one of the following formats: camelCase, PascalCase                      @typescript-eslint/naming-convention
  85:7  error    React Hook "usePersistedTab" is called conditionally. React Hooks must be called in the exact same order in every component render  react-hooks/rules-of-hooks
  86:7  error    React Hook "React.useState" is called conditionally. React Hooks must be called in the exact same order in every component render   react-hooks/rules-of-hooks
  99:6  warning  React Hook useEffect has a missing dependency: 'resource'. Either include it or remove the dependency array                         react-hooks/exhaustive-deps

/media/2TA/DevStuff/BIIIF/field-studio/src/features/metadata-edit/ui/organisms/MetadataView.tsx
   23:1   warning  [ARCHITECTURE] Organism MetadataView has 609 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                               @field-studio/max-lines-feature
   28:10  warning  'Toolbar' is defined but never used. Allowed unused vars must match /^_/u                                                                                           @typescript-eslint/no-unused-vars
  149:55  warning  Expected to return a value at the end of arrow function                                                                                                             consistent-return
  196:23  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  198:23  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  201:45  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  202:56  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  218:23  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  225:20  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  228:27  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  270:19  warning  'prev' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                     @typescript-eslint/no-unused-vars
  315:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  352:15  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/features/search/model/index.ts
  107:5  warning  Arrow function expected no return value                                                                                                    consistent-return
  108:6  warning  React Hook useEffect has missing dependencies: 'executeSearch', 'filter', and 'query'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/media/2TA/DevStuff/BIIIF/field-studio/src/features/search/ui/organisms/SearchView.tsx
   21:1   warning  [ARCHITECTURE] Organism SearchView has 307 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                 @field-studio/max-lines-feature
  126:9   warning  'handleKeyDown' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                            @typescript-eslint/no-unused-vars
  181:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  325:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  335:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/molecules/ArchivePane.tsx
    8:1   warning  [ARCHITECTURE] Molecule ArchivePane has 251 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                         @field-studio/max-lines-feature
    8:27  warning  Member 'useCallback' of the import declaration should be sorted alphabetically                                                                                      sort-imports
    8:27  warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
    9:15  warning  'SourceManifest' is defined but never used. Allowed unused vars must match /^_/u                                                                                    @typescript-eslint/no-unused-vars
   13:8   warning  [ARCHITECTURE] Molecule ArchivePaneProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate                       @field-studio/molecule-props-validation
   48:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   71:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   91:62  warning  'onOpenSendTo' is defined but never used. Allowed unused args must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
  109:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  148:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  158:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  187:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  216:3   warning  'onAddToCollection' is defined but never used. Allowed unused args must match /^_/u                                                                                 @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/molecules/IngestProgressPanel.tsx
   23:1   warning  [ARCHITECTURE] Molecule IngestProgressPanel has 443 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                 @field-studio/max-lines-feature
   39:8   warning  [ARCHITECTURE] Molecule IngestProgressPanelProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate               @field-studio/molecule-props-validation
  178:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  208:9   warning  'stats' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                    @typescript-eslint/no-unused-vars
  251:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  260:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  269:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  341:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  350:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  359:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  437:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  467:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/molecules/MetadataTemplateExport.tsx
    2:1   warning  [ARCHITECTURE] Molecule MetadataTemplateExport has 253 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md              @field-studio/max-lines-feature
   72:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  128:17  error    [ARCHITECTURE] Native <select> not allowed in molecules. Use Select atom from shared or create feature-specific atom                                                @field-studio/no-native-html-in-molecules
  250:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  256:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/molecules/SendToCollectionModal.tsx
   7:8   warning  [ARCHITECTURE] Molecule SendToCollectionModalProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate             @field-studio/molecule-props-validation
  10:18  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  16:6   warning  'props' is defined but never used. Allowed unused args must match /^_/u                                                                                             @typescript-eslint/no-unused-vars
  34:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/molecules/SourcePane.tsx
   18:1   warning  [ARCHITECTURE] Molecule SourcePane has 209 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
  241:44  warning  Unexpected any. Specify a different type                                                                                                    @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/organisms/StagingView.tsx
   43:1   warning  [ARCHITECTURE] Organism StagingView has 345 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                                                            @field-studio/max-lines-feature
  112:9   warning  The 'sourceManifests' logical expression could make the dependencies of useMemo Hook (at line 126) change on every render. To fix this, wrap the initialization of 'sourceManifests' in its own useMemo() Hook  react-hooks/exhaustive-deps
  112:9   warning  The 'sourceManifests' logical expression could make the dependencies of useMemo Hook (at line 130) change on every render. To fix this, wrap the initialization of 'sourceManifests' in its own useMemo() Hook  react-hooks/exhaustive-deps
  185:13  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                         no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/features/staging/ui/organisms/StagingWorkbench.tsx
    2:1   warning  [ARCHITECTURE] Organism StagingWorkbench has 462 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                       @field-studio/max-lines-feature
    5:32  warning  'findManifest' is defined but never used. Allowed unused vars must match /^_/u                                                                                                  @typescript-eslint/no-unused-vars
    5:46  warning  'getAllCollections' is defined but never used. Allowed unused vars must match /^_/u                                                                                             @typescript-eslint/no-unused-vars
   16:1   error    '@/src/app/providers/useTerminology' import is restricted from being used by a pattern. ❌ FSD: Features cannot import from app layer. Receive context via props from Templates  no-restricted-imports
  162:5   warning  'selectAll' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                            @typescript-eslint/no-unused-vars
  170:5   warning  'reorderCanvases' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
  185:9   warning  'keyboardDnd' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                          @typescript-eslint/no-unused-vars
  201:9   warning  'allManifestIds' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  228:9   warning  'handleManifestDragStart' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                              @typescript-eslint/no-unused-vars
  235:45  warning  Expected to return a value at the end of async arrow function                                                                                                                   consistent-return
  251:39  warning  'msg' is defined but never used. Allowed unused args must match /^_/u                                                                                                           @typescript-eslint/no-unused-vars
  251:44  warning  'pct' is defined but never used. Allowed unused args must match /^_/u                                                                                                           @typescript-eslint/no-unused-vars
  381:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  403:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  412:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  438:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  443:57  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  486:21  warning  'ids' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/model/useStructureTree.ts
    9:25  warning  Member 'IIIFCollection' of the import declaration should be sorted alphabetically          sort-imports
    9:25  warning  'IIIFCollection' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
    9:41  warning  'IIIFManifest' is defined but never used. Allowed unused vars must match /^_/u             @typescript-eslint/no-unused-vars
    9:55  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u               @typescript-eslint/no-unused-vars
   11:3   warning  'getAllCollections' is defined but never used. Allowed unused vars must match /^_/u        @typescript-eslint/no-unused-vars
   12:3   warning  'getAllManifests' is defined but never used. Allowed unused vars must match /^_/u          @typescript-eslint/no-unused-vars
   13:3   warning  Member 'getAllCanvases' of the import declaration should be sorted alphabetically          sort-imports
   13:3   warning  'getAllCanvases' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
   25:3   warning  Member 'canHaveMultipleParents' of the import declaration should be sorted alphabetically  sort-imports
   25:3   warning  'canHaveMultipleParents' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
   27:3   warning  'getValidChildTypes' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   29:1   error    '@/utils/organisms/iiif/hierarchy' import is duplicated                                    no-duplicate-imports
  103:3   warning  'onUpdate' is defined but never used. Allowed unused args must match /^_/u                 @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/atoms/ExpandButton.tsx
  28:5  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/atoms/NodeLabel.tsx
  20:3  warning  'type' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/atoms/StructureNodeIcon.tsx
  9:15  warning  'IIIFResourceType' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/atoms/TreeSearchBar.tsx
   88:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  117:13  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/molecules/StructureToolbar.tsx
   54:11  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   78:9   error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   99:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  109:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  134:13  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/molecules/TreeNodeItem.tsx
  10:29  warning  Member 'ExpandButton' of the import declaration should be sorted alphabetically                                                                 sort-imports
  14:8   warning  [ARCHITECTURE] Molecule TreeNodeItemProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate  @field-studio/molecule-props-validation
  45:11  warning  Use object destructuring                                                                                                                        prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/molecules/VirtualTreeList.tsx
  15:1   warning  [ARCHITECTURE] Molecule VirtualTreeList has 212 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md    @field-studio/max-lines-feature
  20:8   warning  [ARCHITECTURE] Molecule VirtualTreeListProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate  @field-studio/molecule-props-validation
  80:11  warning  'startIndex' is assigned a value but never used. Allowed unused vars must match /^_/u                                                              @typescript-eslint/no-unused-vars
  80:23  warning  'endIndex' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/organisms/Sidebar.tsx
    2:1   warning  [ARCHITECTURE] Organism Sidebar has 531 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                                                @field-studio/max-lines-feature
    2:17  warning  'useMemo' is defined but never used. Allowed unused vars must match /^_/u                                                                                                       @typescript-eslint/no-unused-vars
   12:1   error    '@/src/app/providers/useAppSettings' import is restricted from being used by a pattern. ❌ FSD: Features cannot import from app layer. Receive context via props from Templates  no-restricted-imports
   46:3   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
   79:7   warning  'SIDEBAR_VISIBLE_TYPES' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                @typescript-eslint/no-unused-vars
   84:86  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
   93:32  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
   93:55  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
   94:47  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  101:57  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  105:61  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  121:24  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  123:38  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  125:42  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  134:38  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  143:15  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                         no-console
  192:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  232:33  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  241:68  error    Function name `Sidebar` must match one of the following formats: camelCase                                                                                                      @typescript-eslint/naming-convention
  242:68  warning  'onViewTypeChange' is defined but never used. Allowed unused args must match /^_/u                                                                                              @typescript-eslint/no-unused-vars
  252:37  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  252:72  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  255:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                         no-console
  257:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                         no-console
  271:11  warning  'sidebarWidth' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                         @typescript-eslint/no-unused-vars
  314:35  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  318:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  355:49  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  358:19  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                         no-console
  364:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  380:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  407:29  warning  Unexpected any. Specify a different type                                                                                                                                        @typescript-eslint/no-explicit-any
  439:19  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  456:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  476:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  492:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  507:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  526:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  534:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax
  543:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated              no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/structure-view/ui/organisms/StructureTreeView.tsx
   21:49  warning  'useState' is defined but never used. Allowed unused vars must match /^_/u                                         @typescript-eslint/no-unused-vars
   23:27  warning  Member 'StructureToolbar' of the import declaration should be sorted alphabetically                                sort-imports
   31:3   error    Object Literal Property name `TREE_VIRTUALIZATION` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   32:3   error    Object Literal Property name `TREE_SEARCH` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   67:5   warning  'selectRange' is assigned a value but never used. Allowed unused vars must match /^_/u                             @typescript-eslint/no-unused-vars
  152:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                            no-console
  174:9   warning  'indentPerLevel' is assigned a value but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/timeline/model/index.ts
  135:30  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion
  136:30  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion
  144:29  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion
  150:7   warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion
  157:38  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion
  164:18  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/model/annotation.ts
  334:38  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/model/composer.ts
  139:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/model/index.ts
   37:30  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
   67:37  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  137:61  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  152:28  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  207:63  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  215:6   warning  React Hook useEffect has a missing dependency: 'item'. Either include it or remove the dependency array. If 'setAnnotations' needs the current value of 'item', you can also switch to useReducer instead of useState and read 'item' in the reducer  react-hooks/exhaustive-deps
  231:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  253:9   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  266:6   warning  React Hook useEffect has a missing dependency: 'item'. Either include it or remove the dependency array                                                                                                                                               react-hooks/exhaustive-deps
  274:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  297:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  305:23  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  308:67  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  314:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  318:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  322:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  330:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  383:9   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  395:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  398:57  warning  Unexpected any. Specify a different type                                                                                                                                                                                                              @typescript-eslint/no-explicit-any
  414:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  420:13  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  451:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  458:6   warning  React Hook useEffect has a missing dependency: 'item'. Either include it or remove the dependency array                                                                                                                                               react-hooks/exhaustive-deps
  540:13  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console
  581:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                                                                                                               no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/model/useMediaPlayer.ts
  10:41  warning  Member 'KeyboardEvent' of the import declaration should be sorted alphabetically  sort-imports
  92:7   warning  Expected an assignment or function call and instead saw an expression             no-unused-expressions

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/model/viewerCompatibility.ts
  131:42  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  207:29  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  209:38  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  242:30  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  286:33  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  286:56  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  294:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  295:38  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  362:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/AnnotationCanvas.tsx
  53:38  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  94:48  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/AnnotationDrawingOverlay.tsx
   15:1   warning  [ARCHITECTURE] Molecule AnnotationDrawingOverlay has 411 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
   16:10  warning  'Icon' is defined but never used. Allowed unused vars must match /^_/u                                                                                    @typescript-eslint/no-unused-vars
   17:10  warning  'IconButton' is defined but never used. Allowed unused vars must match /^_/u                                                                              @typescript-eslint/no-unused-vars
   22:3   warning  Member 'createSvgSelector' of the import declaration should be sorted alphabetically                                                                      sort-imports
   24:3   warning  'getBoundingBox' is defined but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
   34:37  warning  Unexpected any. Specify a different type                                                                                                                  @typescript-eslint/no-explicit-any
   85:3   warning  'cx' is defined but never used. Allowed unused args must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
   96:24  warning  'setShowExisting' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                @typescript-eslint/no-unused-vars
  117:22  error    [ARCHITECTURE] useEffect in molecules should not call external services (getBounds). Move to organism or use props callback                               @field-studio/useeffect-restrictions
  118:29  error    [ARCHITECTURE] useEffect in molecules should not call external services (getBoundingClientRect). Move to organism or use props callback                   @field-studio/useeffect-restrictions
  134:5   error    [ARCHITECTURE] useEffect in molecules should not call external services (updateViewport). Move to organism or use props callback                          @field-studio/useeffect-restrictions
  142:5   warning  Arrow function expected no return value                                                                                                                   consistent-return
  156:34  warning  Unexpected any. Specify a different type                                                                                                                  @typescript-eslint/no-explicit-any
  174:42  warning  Unexpected any. Specify a different type                                                                                                                  @typescript-eslint/no-explicit-any
  297:9   warning  'setModeWithClear' is assigned a value but never used. Allowed unused vars must match /^_/u                                                               @typescript-eslint/no-unused-vars
  345:5   warning  Arrow function expected no return value                                                                                                                   consistent-return
  350:38  warning  Unexpected any. Specify a different type                                                                                                                  @typescript-eslint/no-explicit-any
  388:46  warning  Unexpected any. Specify a different type                                                                                                                  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/AnnotationForm.tsx
   8:1  warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports
  71:9  error    [ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom                                                                                                                @field-studio/no-native-html-in-molecules

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/AnnotationOverlay.tsx
  116:13  warning  Use object destructuring  prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/AnnotationToolbar.tsx
  9:1  warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ComposerCanvas.tsx
  149:15  error  [ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom  @field-studio/no-native-html-in-molecules

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ComposerSidebar.tsx
   12:1   warning  [ARCHITECTURE] Molecule ComposerSidebar has 281 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md                                                                                         @field-studio/max-lines-feature
   14:1   warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports
  212:44  warning  Unexpected any. Specify a different type                                                                                                                                                                                                @typescript-eslint/no-explicit-any
  228:21  error    [ARCHITECTURE] Native <input type="range"> not allowed in molecules. Use feature-specific atom                                                                                                                                          @field-studio/no-native-html-in-molecules
  272:36  warning  Unexpected any. Specify a different type                                                                                                                                                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ComposerToolbar.tsx
  14:1  warning  '@/ui/primitives/Button' import is restricted from being used by a pattern. ⚠️ Consider creating feature-specific atoms in features/{name}/ui/atoms/ instead of importing primitives directly. See docs/atomic-design-feature-audit.md  no-restricted-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/KeyboardShortcutsModal.tsx
  71:3  warning  'cx' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/MediaPlayer.tsx
  21:3  warning  Member 'ProgressBar' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ViewerSearchPanel.tsx
   20:1   warning  [ARCHITECTURE] Molecule ViewerSearchPanel has 370 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
   20:40  warning  Member 'useEffect' of the import declaration should be sorted alphabetically                                                                       sort-imports
  158:11  warning  Use object destructuring                                                                                                                           prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ViewerToolbar.tsx
   22:1  warning  [ARCHITECTURE] Molecule ViewerToolbar has 364 lines (max 200). Decompose into feature-specific atoms. See docs/atomic-design-feature-audit.md  @field-studio/max-lines-feature
  142:3  warning  'showComposer' is defined but never used. Allowed unused args must match /^_/u                                                                 @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/molecules/ViewerWorkbench.tsx
   19:37  warning  Member 'CoordinateInput' of the import declaration should be sorted alphabetically    sort-imports
  124:9   warning  'textClass' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/organisms/CanvasComposer.tsx
    2:1    warning  [ARCHITECTURE] Organism CanvasComposer has 391 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                             @field-studio/max-lines-feature
    2:17   warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  131:19   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  134:11   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  138:15   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  139:15   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  142:15   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  144:15   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  146:11   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  147:11   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  154:17   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  155:17   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  175:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  176:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  177:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  178:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  186:112  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  197:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  198:33   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  208:46   warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/organisms/CanvasComposerPanel.tsx
  81:40  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  97:43  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/organisms/PolygonAnnotationTool.tsx
    2:1   warning  [ARCHITECTURE] Organism PolygonAnnotationTool has 488 lines (max 300). Extract molecules or decompose. See docs/atomic-design-feature-audit.md                      @field-studio/max-lines-feature
  251:38  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  279:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  293:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  299:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  343:50  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  445:64  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  500:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  507:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  518:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/features/viewer/ui/organisms/ViewerView.tsx
   32:3   warning  Member 'AnnotationDrawingMode' of the import declaration should be sorted alphabetically                    sort-imports
   32:8   warning  'AnnotationDrawingMode' is defined but never used. Allowed unused vars must match /^_/u                     @typescript-eslint/no-unused-vars
   34:21  warning  Member 'DrawingMode' of the import declaration should be sorted alphabetically                              sort-imports
   99:34  warning  'setInternalAnnotationText' is assigned a value but never used. Allowed unused vars must match /^_/u        @typescript-eslint/no-unused-vars
  100:40  warning  'setInternalAnnotationMotivation' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  174:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                     no-console
  188:16  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  211:9   warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  215:46  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  265:19  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  275:39  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  276:21  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  302:21  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  312:19  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  322:13  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                     no-console
  325:21  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  338:57  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                     no-console
  340:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                     no-console
  343:19  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any
  351:19  warning  Unexpected any. Specify a different type                                                                    @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/config/design-tokens.ts
   13:5   error    Object Literal Property name `50` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   14:5   error    Object Literal Property name `100` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   15:5   error    Object Literal Property name `200` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   16:5   error    Object Literal Property name `300` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   17:5   error    Object Literal Property name `400` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   18:5   error    Object Literal Property name `500` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   19:5   error    Object Literal Property name `600` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   20:5   error    Object Literal Property name `700` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   21:5   error    Object Literal Property name `800` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   22:5   error    Object Literal Property name `900` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   90:5   error    Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   91:5   error    Object Literal Property name `3xl` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   92:5   error    Object Literal Property name `4xl` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  116:3   error    Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  125:3   error    Object Literal Property name `0` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  126:3   error    Object Literal Property name `0.5` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  127:3   error    Object Literal Property name `1` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  128:3   error    Object Literal Property name `1.5` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  129:3   error    Object Literal Property name `2` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  130:3   error    Object Literal Property name `2.5` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  131:3   error    Object Literal Property name `3` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  132:3   error    Object Literal Property name `3.5` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  133:3   error    Object Literal Property name `4` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  134:3   error    Object Literal Property name `5` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  135:3   error    Object Literal Property name `6` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  136:3   error    Object Literal Property name `7` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  137:3   error    Object Literal Property name `8` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  138:3   error    Object Literal Property name `9` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  139:3   error    Object Literal Property name `10` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  140:3   error    Object Literal Property name `11` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  141:3   error    Object Literal Property name `12` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  142:3   error    Object Literal Property name `14` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  143:3   error    Object Literal Property name `16` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  144:3   error    Object Literal Property name `20` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  145:3   error    Object Literal Property name `24` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  192:5   error    Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  572:7   error    Object Literal Property name `Cmd+K` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  573:7   error    Object Literal Property name `Cmd+S` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  574:7   error    Object Literal Property name `Cmd+Z` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  575:7   error    Object Literal Property name `Cmd+Shift+Z` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  576:7   error    Object Literal Property name `Cmd+B` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  577:7   error    Object Literal Property name `Cmd+I` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  578:7   error    Object Literal Property name `?` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  582:7   error    Object Literal Property name `Cmd+1` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  583:7   error    Object Literal Property name `Cmd+2` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  584:7   error    Object Literal Property name `Cmd+3` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  585:7   error    Object Literal Property name `Cmd+4` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  586:7   error    Object Literal Property name `Cmd+5` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  587:7   error    Object Literal Property name `Cmd+6` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  736:75  warning  Unexpected any. Specify a different type                                                                   @typescript-eslint/no-explicit-any
  750:16  warning  Unexpected any. Specify a different type                                                                   @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/accessibility.ts
   67:16  error  Object Literal Property name `aria-live` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   67:42  error  Object Literal Property name `aria-atomic` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   69:13  error  Object Literal Property name `aria-live` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   69:36  error  Object Literal Property name `aria-atomic` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   71:29  error  Object Literal Property name `aria-live` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   73:27  error  Object Literal Property name `aria-live` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   87:5   error  Object Literal Property name `ARROW_UP` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   88:5   error  Object Literal Property name `ARROW_DOWN` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
   89:5   error  Object Literal Property name `ARROW_LEFT` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
   90:5   error  Object Literal Property name `ARROW_RIGHT` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   93:5   error  Object Literal Property name `PAGE_UP` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   94:5   error  Object Literal Property name `PAGE_DOWN` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  118:7   error  Object Literal Property name `Cmd+K` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  119:7   error  Object Literal Property name `Cmd+S` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  120:7   error  Object Literal Property name `Cmd+Z` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  121:7   error  Object Literal Property name `Cmd+Shift+Z` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  122:7   error  Object Literal Property name `Cmd+B` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  123:7   error  Object Literal Property name `Cmd+I` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  124:7   error  Object Literal Property name `?` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  128:7   error  Object Literal Property name `Cmd+1` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  129:7   error  Object Literal Property name `Cmd+2` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  130:7   error  Object Literal Property name `Cmd+3` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  131:7   error  Object Literal Property name `Cmd+4` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  132:7   error  Object Literal Property name `Cmd+5` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  133:7   error  Object Literal Property name `Cmd+6` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/core.ts
   8:3  error  Object Literal Property name `APP_NAME` must match one of the following formats: camelCase, PascalCase              @typescript-eslint/naming-convention
  10:3  error  Object Literal Property name `DEFAULT_LANGUAGE` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  11:3  error  Object Literal Property name `TOAST_DURATION` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  23:3  error  Object Literal Property name `BASE_URL` must match one of the following formats: camelCase, PascalCase              @typescript-eslint/naming-convention
  25:5  error  Object Literal Property name `LEGACY_DOMAINS` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  26:5  error  Object Literal Property name `PATH_SEGMENT` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  32:3  error  Object Literal Property name `ID_PATTERNS` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  47:5  error  Object Literal Property name `COLLECTION_PREFIX` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  48:5  error  Object Literal Property name `ROOT_NAME` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  49:5  error  Object Literal Property name `ROOT_DISPLAY_NAME` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  50:5  error  Object Literal Property name `LOOSE_FILES_Dir_NAME` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  51:5  error  Object Literal Property name `META_FILE` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  59:3  error  Object Literal Property name `INGEST_PREFS` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  68:3  error  Object Literal Property name `MAP_CONFIG` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  75:3  error  Object Literal Property name `ZOOM_CONFIG` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/csv.ts
   76:3  error  Object Literal Property name `requiredstatement.value` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   77:3  error  Object Literal Property name `requiredStatement.value` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   78:3  error  Object Literal Property name `requiredstatement.label` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   79:3  error  Object Literal Property name `requiredStatement.label` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   82:3  error  Object Literal Property name `metadata.title` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   83:3  error  Object Literal Property name `metadata.creator` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   84:3  error  Object Literal Property name `metadata.date` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   85:3  error  Object Literal Property name `metadata.description` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   86:3  error  Object Literal Property name `metadata.subject` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   87:3  error  Object Literal Property name `metadata.type` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   88:3  error  Object Literal Property name `metadata.format` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   89:3  error  Object Literal Property name `metadata.identifier` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   90:3  error  Object Literal Property name `metadata.source` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   91:3  error  Object Literal Property name `metadata.language` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   92:3  error  Object Literal Property name `metadata.coverage` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   93:3  error  Object Literal Property name `metadata.rights` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   94:3  error  Object Literal Property name `metadata.publisher` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   97:3  error  Object Literal Property name `dc:title` must match one of the following formats: camelCase, PascalCase                 @typescript-eslint/naming-convention
   98:3  error  Object Literal Property name `dc:creator` must match one of the following formats: camelCase, PascalCase               @typescript-eslint/naming-convention
   99:3  error  Object Literal Property name `dc:date` must match one of the following formats: camelCase, PascalCase                  @typescript-eslint/naming-convention
  100:3  error  Object Literal Property name `dc:description` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  101:3  error  Object Literal Property name `dc:subject` must match one of the following formats: camelCase, PascalCase               @typescript-eslint/naming-convention
  102:3  error  Object Literal Property name `dc:type` must match one of the following formats: camelCase, PascalCase                  @typescript-eslint/naming-convention
  103:3  error  Object Literal Property name `dc:format` must match one of the following formats: camelCase, PascalCase                @typescript-eslint/naming-convention
  104:3  error  Object Literal Property name `dc:identifier` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  105:3  error  Object Literal Property name `dc:source` must match one of the following formats: camelCase, PascalCase                @typescript-eslint/naming-convention
  106:3  error  Object Literal Property name `dc:language` must match one of the following formats: camelCase, PascalCase              @typescript-eslint/naming-convention
  107:3  error  Object Literal Property name `dc:coverage` must match one of the following formats: camelCase, PascalCase              @typescript-eslint/naming-convention
  108:3  error  Object Literal Property name `dc:rights` must match one of the following formats: camelCase, PascalCase                @typescript-eslint/naming-convention
  109:3  error  Object Literal Property name `dc:publisher` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/features.ts
   9:3  error  Object Literal Property name `USE_NEW_STAGING` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  11:3  error  Object Literal Property name `USE_ACCESSIBLE_FOCUS` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  13:3  error  Object Literal Property name `USE_IMMER_CLONING` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  15:3  error  Object Literal Property name `USE_WORKER_SEARCH` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  17:3  error  Object Literal Property name `USE_PROGRESSIVE_DISCLOSURE` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  19:3  error  Object Literal Property name `USE_SIMPLIFIED_UI` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  21:3  error  Object Literal Property name `USE_KEYBOARD_DND` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  23:3  error  Object Literal Property name `USE_I18N` must match one of the following formats: camelCase, PascalCase                    @typescript-eslint/naming-convention
  32:3  error  Object Literal Property name `USE_WORKER_URL_CLEANUP` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  37:3  error  Object Literal Property name `USE_IMAGE_SOURCE_CLEANUP` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  42:3  error  Object Literal Property name `USE_FILE_LIFECYCLE` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  51:3  error  Object Literal Property name `USE_TRASH_SYSTEM` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  55:3  error  Object Literal Property name `USE_TRASH_AUTO_CLEANUP` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  59:3  error  Object Literal Property name `USE_TRASH_SIZE_LIMITS` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  68:3  error  Object Literal Property name `USE_ENHANCED_PROGRESS` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  79:3  error  Object Literal Property name `USE_WORKER_INGEST` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/helpContent.ts
   76:3  error  Object Literal Property name `resource-collection` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   81:3  error  Object Literal Property name `resource-manifest` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   86:3  error  Object Literal Property name `resource-canvas` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   91:3  error  Object Literal Property name `resource-annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   95:3  error  Object Literal Property name `resource-range` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  101:3  error  Object Literal Property name `field-label` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  106:3  error  Object Literal Property name `field-summary` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  110:3  error  Object Literal Property name `field-metadata` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  115:3  error  Object Literal Property name `field-rights` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  119:3  error  Object Literal Property name `field-thumbnail` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  123:3  error  Object Literal Property name `field-navDate` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  127:3  error  Object Literal Property name `field-behavior` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  133:3  error  Object Literal Property name `action-ingest` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  139:3  error  Object Literal Property name `action-export` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  144:3  error  Object Literal Property name `action-validate` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  151:3  error  Object Literal Property name `inspector-core` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  155:3  error  Object Literal Property name `inspector-descriptive` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  159:3  error  Object Literal Property name `inspector-technical` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  163:3  error  Object Literal Property name `inspector-structural` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
  169:3  error  Object Literal Property name `export-canopy` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  173:3  error  Object Literal Property name `export-raw` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  177:3  error  Object Literal Property name `export-ocfl` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  188:3  error  Object Literal Property name `empty-archive` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  189:3  error  Object Literal Property name `first-manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  190:3  error  Object Literal Property name `first-export` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  191:3  error  Object Literal Property name `metadata-tip` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  192:3  error  Object Literal Property name `validation-errors` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  193:3  error  Object Literal Property name `keyboard-shortcuts` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/iiif.ts
   18:3  error  Object Literal Property name `PRESENTATION_3` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
   21:3  error  Object Literal Property name `IMAGE_3` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   30:3  error  Object Literal Property name `SEARCH_2` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   34:3  error  Object Literal Property name `AUTH_2` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   37:3  error  Object Literal Property name `DISCOVERY_1` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   40:3  error  Object Literal Property name `CONTENT_STATE_1` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   58:3  error  Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   72:3  error  Object Literal Property name `auto-advance` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   78:3  error  Object Literal Property name `no-auto-advance` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   90:3  error  Object Literal Property name `no-repeat` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  124:3  error  Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  130:3  error  Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  144:3  error  Object Literal Property name `thumbnail-nav` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  150:3  error  Object Literal Property name `no-nav` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/image.ts
  36:3  error  Object Literal Property name `wax-compatible` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  50:3  error  Object Literal Property name `level0-static` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  64:3  error  Object Literal Property name `level2-dynamic` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  78:3  error  Object Literal Property name `mobile-optimized` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  92:3  error  Object Literal Property name `archive-quality` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/metadata.ts
  7:15  warning  'AbstractionLevel' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/ui.ts
   23:3  error  Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   35:3  error  Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   62:3  error  Object Literal Property name `0` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   63:3  error  Object Literal Property name `0.5` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   64:3  error  Object Literal Property name `1` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   65:3  error  Object Literal Property name `1.5` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   66:3  error  Object Literal Property name `2` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   67:3  error  Object Literal Property name `2.5` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   68:3  error  Object Literal Property name `3` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   69:3  error  Object Literal Property name `3.5` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   70:3  error  Object Literal Property name `4` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   71:3  error  Object Literal Property name `5` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   72:3  error  Object Literal Property name `6` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   73:3  error  Object Literal Property name `7` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   74:3  error  Object Literal Property name `8` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   75:3  error  Object Literal Property name `9` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
   76:3  error  Object Literal Property name `10` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   77:3  error  Object Literal Property name `11` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   78:3  error  Object Literal Property name `12` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   79:3  error  Object Literal Property name `14` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   80:3  error  Object Literal Property name `16` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   81:3  error  Object Literal Property name `20` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   82:3  error  Object Literal Property name `24` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  112:5  error  Object Literal Property name `2xl` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  235:3  error  Object Literal Property name `NO_ITEMS` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  241:3  error  Object Literal Property name `NO_RESULTS` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  247:3  error  Object Literal Property name `NO_SELECTION` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  265:3  error  Object Literal Property name `NO_DATA` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  271:3  error  Object Literal Property name `EMPTY_CANVAS` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  295:3  error  Object Literal Property name `DEBOUNCE_MS` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
  296:3  error  Object Literal Property name `TIMEOUT_MS` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/constants/viewport.ts
  14:3  error  Object Literal Property name `MIN_SCALE` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  16:3  error  Object Literal Property name `MAX_SCALE` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  18:3  error  Object Literal Property name `INITIAL_SCALE` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  20:3  error  Object Literal Property name `ZOOM_STEP` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  22:3  error  Object Literal Property name `WHEEL_SENSITIVITY` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  24:3  error  Object Literal Property name `PAN_KEYBOARD_STEP` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  26:3  error  Object Literal Property name `INITIAL_ROTATION` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
  28:3  error  Object Literal Property name `ROTATION_STEP` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  37:3  error  Object Literal Property name `ZOOM_IN` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  39:3  error  Object Literal Property name `ZOOM_OUT` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  43:3  error  Object Literal Property name `PAN_MODE` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  45:3  error  Object Literal Property name `ROTATE_CW` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  47:3  error  Object Literal Property name `ROTATE_CCW` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  49:3  error  Object Literal Property name `PAN_UP` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  50:3  error  Object Literal Property name `PAN_DOWN` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  51:3  error  Object Literal Property name `PAN_LEFT` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  52:3  error  Object Literal Property name `PAN_RIGHT` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useCommandHistory.ts
  8:42  warning  Member 'useEffect' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useDebouncedCallback.ts
  26:58  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  26:68  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useDragDrop.ts
  408:5  warning  React Hook useCallback has a missing dependency: 'handleKeyCancel'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  512:5  warning  Arrow function expected no return value                                                                               consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useFocusTrap.ts
  121:5  warning  Arrow function expected no return value  consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useGridVirtualization.ts
  8:10  warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  8:34  warning  'useRef' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useHistory.ts
  23:26  warning  Forbidden non-null assertion              @typescript-eslint/no-non-null-assertion
  36:26  warning  Forbidden non-null assertion              @typescript-eslint/no-non-null-assertion
  47:74  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useIngestProgress.ts
   27:3   warning  'IngestActivityLogEntry' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   28:3   warning  'IngestFileInfo' is defined but never used. Allowed unused vars must match /^_/u          @typescript-eslint/no-unused-vars
   31:3   warning  'IngestProgressSummary' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
  370:41  warning  Expected to return a value at the end of method 'onProgress'                              consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useKeyboardDragDrop.ts
   82:10  warning  'announcement' is assigned a value but never used. Allowed unused vars must match /^_/u                            @typescript-eslint/no-unused-vars
  142:9   warning  'moveItem' is assigned a value but never used. Allowed unused vars must match /^_/u                                @typescript-eslint/no-unused-vars
  260:6   warning  React Hook useCallback has a missing dependency: 'getItemLabel'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  284:29  warning  Unexpected any. Specify a different type                                                                           @typescript-eslint/no-explicit-any
  345:11  warning  'currentIndex' is assigned a value but never used. Allowed unused vars must match /^_/u                            @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useLayerHistory.ts
   61:27  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
   71:29  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
   72:31  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
   73:35  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
   73:80  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
   74:32  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any
  100:6   warning  React Hook useEffect has a missing dependency: 'canvas'. Either include it or remove the dependency array. If 'setHistory' needs the current value of 'canvas', you can also switch to useReducer instead of useState and read 'canvas' in the reducer  react-hooks/exhaustive-deps
  127:26  warning  Forbidden non-null assertion                                                                                                                                                                                                                            @typescript-eslint/no-non-null-assertion
  136:26  warning  Forbidden non-null assertion                                                                                                                                                                                                                            @typescript-eslint/no-non-null-assertion
  172:15  warning  Unexpected any. Specify a different type                                                                                                                                                                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useMetadataEditor.ts
  43:14  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/usePanZoomGestures.ts
   72:5  warning  'zoomSensitivity' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   83:9  warning  'isPanButton' is assigned a value but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  142:6  warning  'e' is defined but never used. Allowed unused args must match /^_/u                         @typescript-eslint/no-unused-vars
  154:6  warning  'e' is defined but never used. Allowed unused args must match /^_/u                         @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useResizablePanel.ts
   73:5  error    Type Property name `aria-label` must match one of the following formats: camelCase, PascalCase                  @typescript-eslint/naming-convention
   74:5  error    Type Property name `aria-valuenow` must match one of the following formats: camelCase, PascalCase               @typescript-eslint/naming-convention
   75:5  error    Type Property name `aria-valuemin` must match one of the following formats: camelCase, PascalCase               @typescript-eslint/naming-convention
   76:5  error    Type Property name `aria-valuemax` must match one of the following formats: camelCase, PascalCase               @typescript-eslint/naming-convention
   77:5  error    Type Property name `aria-orientation` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  123:9  warning  'wasCollapsedRef' is assigned a value but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
  297:5  error    Object Literal Property name `aria-label` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  298:5  error    Object Literal Property name `aria-valuenow` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  299:5  error    Object Literal Property name `aria-valuemin` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  300:5  error    Object Literal Property name `aria-valuemax` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  301:5  error    Object Literal Property name `aria-orientation` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useStagingState.ts
  49:27  warning  'setSourceManifests' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useViewport.ts
  10:3  warning  'DEFAULT_VIEWPORT_STATE' is defined but never used. Allowed unused vars must match /^_/u                                                                                                     @typescript-eslint/no-unused-vars
  97:9  warning  The 'initialState' object makes the dependencies of useCallback Hook (at line 250) change on every render. To fix this, wrap the initialization of 'initialState' in its own useMemo() Hook  react-hooks/exhaustive-deps

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/lib/hooks/useViewportKeyboard.ts
  207:5  warning  Arrow function expected no return value  consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/activityStream.ts
   28:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   70:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   83:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  120:7   error    Type Property name `by-time` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  121:7   error    Type Property name `by-object` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  122:7   error    Type Property name `by-type` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  133:7   error    Type Property name `by-time` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  134:7   error    Type Property name `by-object` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  153:19  warning  'oldVersion' is defined but never used. Allowed unused args must match /^_/u                            @typescript-eslint/no-unused-vars
  153:31  warning  'newVersion' is defined but never used. Allowed unused args must match /^_/u                            @typescript-eslint/no-unused-vars
  153:43  warning  'transaction' is defined but never used. Allowed unused args must match /^_/u                           @typescript-eslint/no-unused-vars
  215:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  241:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  267:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  297:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  327:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  356:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  398:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
  420:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                 no-console
  467:56  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  470:56  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  558:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  594:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/authService.ts
   21:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   48:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   70:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   78:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  113:33  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  116:27  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  145:34  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  210:9   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  277:25  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  282:25  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/contentState.ts
   11:10  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u                                       @typescript-eslint/no-unused-vars
   11:22  warning  'IIIFItem' is defined but never used. Allowed unused vars must match /^_/u                                         @typescript-eslint/no-unused-vars
   19:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase                       @typescript-eslint/naming-convention
  181:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase             @typescript-eslint/naming-convention
  458:7   error    Object Literal Property name `application/ld+json` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  459:7   error    Object Literal Property name `application/json` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  460:7   error    Object Literal Property name `text/plain` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  461:7   error    Object Literal Property name `text/uri-list` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/fieldRegistry.ts
  520:5  error  Object Literal Property name `metadata.title` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  521:5  error  Object Literal Property name `metadata.creator` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  523:5  error  Object Literal Property name `metadata.subject` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  524:5  error  Object Literal Property name `metadata.description` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  525:5  error  Object Literal Property name `metadata.date` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/guidanceService.ts
  33:20  error    Class Property name `STORAGE_KEY` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  46:14  warning  'e' is defined but never used                                                                     @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/logger.ts
  122:16  warning  'e' is defined but never used                                                            @typescript-eslint/no-unused-vars
  133:11  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/metadataTemplateService.ts
  2:10  warning  'SourceManifest' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
  3:35  warning  'SUPPORTED_LANGUAGES' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/navPlaceService.ts
   11:10  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u                              @typescript-eslint/no-unused-vars
   11:32  warning  'IIIFManifest' is defined but never used. Allowed unused vars must match /^_/u                            @typescript-eslint/no-unused-vars
   22:32  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  101:18  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  133:21  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  142:19  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  144:26  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  418:11  error    Object Literal Property name `User-Agent` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  428:30  warning  Unexpected any. Specify a different type                                                                  @typescript-eslint/no-explicit-any
  454:11  error    Object Literal Property name `User-Agent` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/provenanceService.ts
   12:10  warning  'IIIFItem' is defined but never used. Allowed unused vars must match /^_/u                                     @typescript-eslint/no-unused-vars
   36:13  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   37:13  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
  310:9   error    Object Literal Property name `batch-update` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  311:9   error    Object Literal Property name `import-external` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  322:9   error    Object Literal Property name `batch-update` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  323:9   error    Object Literal Property name `import-external` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/remoteLoader.ts
   13:11  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
   61:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  100:16  warning  'e' is defined but never used                                                            @typescript-eslint/no-unused-vars
  117:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info  no-console
  128:15  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
  139:26  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
  152:25  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
  186:19  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any
  210:29  warning  Unexpected any. Specify a different type                                                 @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/searchService.ts
    3:40  warning  'IIIFCanvas' is defined but never used. Allowed unused vars must match /^_/u                           @typescript-eslint/no-unused-vars
    9:41  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
   58:3   error    Type Property name `lunr_id` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
   85:18  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  140:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                no-console
  188:41  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  216:7   warning  Forbidden non-null assertion                                                                           @typescript-eslint/no-non-null-assertion
  300:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                no-console
  342:31  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  564:14  warning  'e' is defined but never used                                                                          @typescript-eslint/no-unused-vars
  572:14  warning  'e' is defined but never used                                                                          @typescript-eslint/no-unused-vars
  669:13  warning  'summary' is assigned a value but never used. Allowed unused vars must match /^_/u                     @typescript-eslint/no-unused-vars
  669:45  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  690:9   error    Object Literal Property name `lunr_id` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  702:11  warning  'fields' is assigned a value but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
  743:36  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  747:23  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  751:23  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/specBridge.ts
   24:3   warning  'createLanguageMap' is defined but never used. Allowed unused vars must match /^_/u                              @typescript-eslint/no-unused-vars
   28:3   warning  'isImageService3' is defined but never used. Allowed unused vars must match /^_/u                                @typescript-eslint/no-unused-vars
   29:3   warning  'isValidHttpUri' is defined but never used. Allowed unused vars must match /^_/u                                 @typescript-eslint/no-unused-vars
   43:41  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
   63:32  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
   71:40  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
   83:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  112:32  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  125:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  173:30  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  187:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  218:51  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  232:43  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  276:28  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  311:34  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  318:47  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  332:37  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  332:76  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  356:27  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  356:33  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  366:13  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  386:40  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  393:41  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  414:40  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  457:38  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  469:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  469:42  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  487:44  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  497:30  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  497:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  513:37  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  523:5   error    Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  524:5   error    Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  525:5   error    Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  537:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  537:42  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  594:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  594:42  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  609:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  609:42  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  625:40  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  625:46  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  640:34  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  640:40  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  658:30  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  663:5   warning  Assignment to function parameter 'type'                                                                          no-param-reassign
  674:5   error    Object Literal Property name `sc:Collection` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  675:5   error    Object Literal Property name `sc:Manifest` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  676:5   error    Object Literal Property name `sc:Sequence` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  677:5   error    Object Literal Property name `sc:Canvas` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  678:5   error    Object Literal Property name `sc:Range` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  679:5   error    Object Literal Property name `sc:AnnotationList` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  680:5   error    Object Literal Property name `oa:Annotation` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  681:5   error    Object Literal Property name `dctypes:Image` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  682:5   error    Object Literal Property name `dctypes:Sound` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  683:5   error    Object Literal Property name `dctypes:Video` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  684:5   error    Object Literal Property name `dctypes:Text` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  693:38  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  698:5   error    Object Literal Property name `dctypes:Image` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  700:5   error    Object Literal Property name `dctypes:Sound` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  702:5   error    Object Literal Property name `dctypes:Video` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  704:5   error    Object Literal Property name `dctypes:Text` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  721:25  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  755:33  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  755:75  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  756:36  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  783:38  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any
  790:42  warning  Unexpected any. Specify a different type                                                                         @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/storage.ts
   87:18  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  188:14  warning  Forbidden non-null assertion                                                @typescript-eslint/no-non-null-assertion
  315:16  warning  'e' is defined but never used                                               @typescript-eslint/no-unused-vars
  332:33  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  332:56  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  358:33  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  358:56  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  631:22  warning  Unexpected any. Specify a different type                                    @typescript-eslint/no-explicit-any
  638:3   warning  'metadata' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
  659:50  warning  'options' is defined but never used. Allowed unused args must match /^_/u   @typescript-eslint/no-unused-vars
  664:33  warning  'filter' is defined but never used. Allowed unused args must match /^_/u    @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/services/virtualManifestFactory.ts
   60:14  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  302:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  311:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  314:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  317:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  320:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  348:18  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  375:45  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  376:17  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  417:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  426:20  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  500:29  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  501:29  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/types/index.ts
  232:3    error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  242:11   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  246:93   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  246:107  warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  250:13   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  252:90   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  357:13   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  414:36   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  421:40   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any
  442:44   warning  Unexpected any. Specify a different type                                                      @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/atoms/SkipLink.tsx
   38:3   warning  'position' is assigned a value but never used. Allowed unused args must match /^_/u                       @typescript-eslint/no-unused-vars
   59:12  warning  No magic number: 1000                                                                                     no-magic-numbers
   64:9   warning  'positionClasses' is assigned a value but never used. Allowed unused vars must match /^_/u                @typescript-eslint/no-unused-vars
   65:5   error    Object Literal Property name `top-left` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   66:5   error    Object Literal Property name `top-center` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   67:5   error    Object Literal Property name `top-right` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
  113:27  warning  'index' is defined but never used. Allowed unused args must match /^_/u                                   @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/atoms/StepConnector.tsx
  36:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  36:38  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/atoms/StepIndicator.tsx
  45:7   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  47:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  48:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  51:7   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  53:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  54:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  61:25  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  61:51  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  61:67  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/atoms/TabButtonBase.tsx
  53:7  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  54:7  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  57:7  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  58:7  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ActionButton.tsx
   98:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  100:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  102:13  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  104:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  105:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/BreadcrumbNav.tsx
   20:10   warning  'Button' is defined but never used. Allowed unused vars must match /^_/u                 @typescript-eslint/no-unused-vars
   76:3    warning  'cx' is defined but never used. Allowed unused args must match /^_/u                     @typescript-eslint/no-unused-vars
   79:14   warning  No magic number: 4                                                                       no-magic-numbers
  102:48   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  102:67   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  111:55   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  111:83   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  116:45   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  116:100  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  118:45   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  118:102  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  120:45   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  120:104  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  122:45   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  122:100  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  147:23   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  147:53   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  176:52   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  176:71   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  204:41   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  204:73   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  218:39   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  218:73   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  223:84   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  223:103  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  237:46   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  237:74   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  238:46   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  238:84   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  253:47   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  253:79   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  277:39   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  277:71   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  294:80   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  294:99   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CanvasItem.tsx
  120:13   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  121:38   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  123:26   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  130:94   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  136:65   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  136:133  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  141:69   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  151:75   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  157:66   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  165:47   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ClusterBadge.tsx
  109:18  warning  No magic number: 99  no-magic-numbers
  145:29  warning  No magic number: 5   no-magic-numbers
  187:22  warning  No magic number: 5   no-magic-numbers
  189:30  warning  No magic number: 5   no-magic-numbers

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CollectionCard.tsx
  146:13  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  148:13  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  151:31  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CollectionCardDropOverlay.tsx
  21:8   warning  [ARCHITECTURE] Molecule CollectionCardDropOverlayProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate  @field-studio/molecule-props-validation
  44:22  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  46:45  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  47:26  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  54:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  56:38  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  57:24  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CollectionCardEditForm.tsx
  20:8   warning  [ARCHITECTURE] Molecule CollectionCardEditFormProps should accept optional cx and fieldMode props. These enable proper theming through FieldModeTemplate  @field-studio/molecule-props-validation
  81:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CollectionCardHeader.tsx
   24:8    warning  [ARCHITECTURE] Molecule CollectionCardHeaderProps should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface  @field-studio/molecule-props-validation
  103:53   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                        no-restricted-syntax
  103:104  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                        no-restricted-syntax
  112:85   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                        no-restricted-syntax
  118:49   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                        no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/CollectionCardMenu.tsx
   23:8   warning  [ARCHITECTURE] Molecule CollectionCardMenuProps should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface  @field-studio/molecule-props-validation
   76:45  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
   89:85  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
   97:84  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  100:76  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  109:84  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  112:63  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  121:27  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  124:47  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ContextMenu.tsx
   26:12  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   27:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   28:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  111:15  warning  No magic number: 400                                                                     no-magic-numbers
  178:26  warning  No magic number: 8                                                                       no-magic-numbers
  179:26  warning  No magic number: 8                                                                       no-magic-numbers
  202:36  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ContextMenuItem.tsx
   22:8   warning  [ARCHITECTURE] Molecule ContextMenuItemProps should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface  @field-studio/molecule-props-validation
   53:77  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   58:46  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   58:83  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   62:50  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   62:92  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   74:60  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   78:46  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
   82:49  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax
  100:3   warning  'id' is defined but never used. Allowed unused args must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
  132:83  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                   no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ContextMenuSection.tsx
  21:8   warning  [ARCHITECTURE] Molecule ContextMenuSectionProps should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface  @field-studio/molecule-props-validation
  62:75  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax
  67:99  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ContextMenuSelectionBadge.tsx
  20:8   warning  [ARCHITECTURE] Molecule ContextMenuSelectionBadgeProps should accept optional fieldMode prop for high-contrast support. Add fieldMode?: boolean to props interface  @field-studio/molecule-props-validation
  40:73  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                             no-restricted-syntax
  41:62  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                             no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/DebouncedInput.tsx
  132:69  warning  No magic number: 0.9  no-magic-numbers

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/DropdownSelect.tsx
   26:8   warning  [ARCHITECTURE] Molecule DropdownSelectProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
   47:18  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   47:35  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   48:50  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   51:18  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   51:35  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   52:50  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   55:18  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   55:35  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   56:50  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   59:18  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   59:35  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
   60:49  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  103:34  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  103:46  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  104:38  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  104:50  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  133:24  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values                                                                  no-restricted-syntax
  136:27  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values                                                                  no-restricted-syntax
  149:29  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  149:41  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  152:29  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  152:41  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  168:58  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  168:70  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                                                                                      no-restricted-syntax
  176:45  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values                                                                  no-restricted-syntax
  176:78  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values                                                                  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ErrorBoundary.tsx
   65:24  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   66:26  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   67:28  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   68:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   72:31  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   73:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   78:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   79:33  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   82:33  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   90:29  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   97:28  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  120:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  134:28  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  135:31  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  139:24  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  147:27  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/FacetPill.tsx
   66:41  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
   67:42  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
   83:27  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
   84:23  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
   87:29  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                      no-restricted-syntax
  105:23  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
  106:14  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values  no-restricted-syntax
  110:25  warning  Use COLORS from designSystem.ts instead of hardcoded hex colors                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/FloatingSelectionToolbar.tsx
   81:3    warning  'cx' is defined but never used. Allowed unused args must match /^_/u                                          @typescript-eslint/no-unused-vars
  166:5    error    Object Literal Property name `near-selection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  170:52   warning  No magic number: 5                                                                                            no-magic-numbers
  171:46   warning  No magic number: 5                                                                                            no-magic-numbers
  187:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  187:59   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  196:29   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  196:66   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  205:35   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  206:35   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  217:99   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  217:116  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  227:35   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  227:67   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  235:58   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  235:75   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  239:75   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  239:94   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  240:74   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  249:31   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  249:71   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  265:29   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  265:65   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  331:43   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  331:77   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  348:37   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  349:37   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  367:61   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax
  367:78   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                       no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/FormInput.tsx
   20:8    warning  [ARCHITECTURE] Molecule FormInputProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
   69:10   warning  No magic number: 3                                                                                                                              no-magic-numbers
   79:11   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   80:11   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   82:11   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   83:11   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   86:66   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   86:85   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   87:62   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   87:79   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   87:110  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   87:129  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
   92:9    error    [ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom                        @field-studio/no-native-html-in-molecules
  143:53   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax
  143:70   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                         no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/GuidedEmptyState.tsx
  114:9    warning  'activeStep' is assigned a value but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars
  115:62   warning  No magic number: 3                                                                       no-magic-numbers
  120:32   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  120:69   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  121:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  121:59   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  122:29   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  122:48   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  123:28   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  123:47   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  124:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  124:49   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  129:32   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  129:67   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  130:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  130:57   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  131:29   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  131:47   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  132:28   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  132:46   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  133:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  133:48   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  137:30   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  137:67   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  138:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  138:57   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  139:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  139:46   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  140:26   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  140:45   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  141:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  141:47   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  150:36   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  159:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  159:70   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  170:42   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  192:44   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  192:63   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  195:71   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  202:31   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  202:48   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  208:33   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  208:50   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  251:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  251:66   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  260:36   warning  'index' is defined but never used. Allowed unused args must match /^_/u                  @typescript-eslint/no-unused-vars
  270:35   warning  Unexpected string concatenation                                                          prefer-template
  270:74   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  270:114  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  301:43   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  301:73   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  311:43   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  311:75   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  330:41   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  330:73   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  359:58   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  359:77   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  369:44   warning  No magic number: 3                                                                       no-magic-numbers
  376:19   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  377:19   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  416:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  416:59   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/IconButton.tsx
   54:7   warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values      no-restricted-syntax
   55:7   warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values      no-restricted-syntax
   56:7   warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values      no-restricted-syntax
   79:3   warning  'cx' is assigned a value but never used. Allowed unused args must match /^_/u            @typescript-eslint/no-unused-vars
  109:19  warning  Use SPACING or LAYOUT tokens from designSystem.ts instead of hardcoded pixel values      no-restricted-syntax
  118:26  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  118:46  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ListContainer.tsx
  20:8   warning  [ARCHITECTURE] Molecule ListContainerProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
  72:51  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax
  72:70  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax
  74:46  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax
  74:65  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax
  97:77  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax
  97:96  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                             no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ListItemBase.tsx
  17:10  warning  'Icon' is defined but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
  20:8   warning  [ARCHITECTURE] Molecule ListItemBaseProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
  64:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                            no-restricted-syntax
  65:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                            no-restricted-syntax
  68:24  warning  'e' is defined but never used. Allowed unused args must match /^_/u                                                                                @typescript-eslint/no-unused-vars
  94:36  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                            no-restricted-syntax
  94:76  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                            no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/LoadingState.tsx
   24:12  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   25:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   26:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   71:54  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   74:63  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   74:81  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   80:23  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   80:40  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  122:3   warning  'spinner' is assigned a value but never used. Allowed unused args must match /^_/u       @typescript-eslint/no-unused-vars
  164:39  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  164:60  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  177:51  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  187:60  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  191:57  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/MenuButton.tsx
  70:13  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  71:32  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  71:67  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  81:59  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  82:56  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  87:57  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/MetadataCard.tsx
  101:3   warning  'cx' is defined but never used. Allowed unused args must match /^_/u                                                      @typescript-eslint/no-unused-vars
  158:64  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  158:83  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  160:48  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  164:13  error    [ARCHITECTURE] Native <textarea> not allowed in molecules. Use TextArea atom from shared or create feature-specific atom  @field-studio/no-native-html-in-molecules
  172:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  173:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  175:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  180:13  error    [ARCHITECTURE] Native <select> not allowed in molecules. Use Select atom from shared or create feature-specific atom      @field-studio/no-native-html-in-molecules
  187:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  188:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  190:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  207:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  208:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  210:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  217:26  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  224:50  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  224:69  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  235:66  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  235:85  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  238:64  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  249:23  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  249:64  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  253:51  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  253:72  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  259:29  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  259:46  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  260:29  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  271:71  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  271:90  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  280:93  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  283:59  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  283:78  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  293:35  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  293:66  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  333:70  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  333:89  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  355:31  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  355:52  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  364:33  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  364:56  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  365:54  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  365:74  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  371:55  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  371:74  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  373:78  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  376:59  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  376:78  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  382:53  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  382:72  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  390:33  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  390:53  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  403:23  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax
  403:59  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                   no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ModalDialog.tsx
   18:10   warning  'Button' is defined but never used. Allowed unused vars must match /^_/u                                                                          @typescript-eslint/no-unused-vars
   22:8    warning  [ARCHITECTURE] Molecule ModalDialogProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
   69:15   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
   75:12   warning  No magic number: 1000                                                                                                                             no-magic-numbers
   91:5    warning  Arrow function expected no return value                                                                                                           consistent-return
  103:66   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  104:85   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  104:119  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  105:9    warning  'headerBgClass' is assigned a value but never used. Allowed unused vars must match /^_/u                                                          @typescript-eslint/no-unused-vars
  105:37   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  105:54   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  136:61   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  136:80   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  141:54   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  141:73   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  151:19   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  152:19   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  167:55   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  167:89   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/PipelineBanner.tsx
   42:3   warning  'cx' is defined but never used. Allowed unused args must match /^_/u                     @typescript-eslint/no-unused-vars
   69:13  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   70:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   71:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   72:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   73:18  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   80:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   81:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   82:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   83:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   84:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   88:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   89:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   90:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   91:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   92:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   96:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   97:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   98:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   99:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  100:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  104:15  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  105:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  106:17  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  107:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  108:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/RangeSelector.tsx
  182:22  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ResultCard.tsx
  186:25  warning  No magic number: 3  no-magic-numbers

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/SelectField.tsx
  29:8    warning  [ARCHITECTURE] Molecule SelectFieldProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
  69:9    warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  70:9    warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  76:74   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  76:93   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  79:79   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  79:111  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                           no-restricted-syntax
  85:7    error    [ARCHITECTURE] Native <select> not allowed in molecules. Use Select atom from shared or create feature-specific atom                              @field-studio/no-native-html-in-molecules

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/StackedThumbnail.tsx
   57:52   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   58:38   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   68:137  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   79:106  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   95:62   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   95:119  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
   97:27   warning  No magic number: 4                                                                       no-magic-numbers
  104:28   warning  No magic number: 3                                                                       no-magic-numbers
  116:21   warning  No magic number: 3                                                                       no-magic-numbers
  117:44   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  118:72   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/StatusBadge.tsx
  76:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  77:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  82:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  83:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  85:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  86:9  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/TabBar.tsx
  27:8   warning  [ARCHITECTURE] Molecule TabBarProps should accept optional cx prop for contextual styling. Add cx?: ContextualClassNames to props interface  @field-studio/molecule-props-validation
  52:54  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                      no-restricted-syntax
  52:75  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                      no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/TimelineTick.tsx
  145:22  warning  No magic number: 9  no-magic-numbers

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/Toast.tsx
   39:9    warning  'MAX_HEIGHT' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                  @typescript-eslint/no-unused-vars
   45:19   warning  The ref value 'timeoutsRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'timeoutsRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps
   50:16   warning  Expected to return a value at the end of arrow function                                                                                                                                                                                                                consistent-return
   67:39   warning  No magic number: 36                                                                                                                                                                                                                                                    no-magic-numbers
   67:53   warning  No magic number: 9                                                                                                                                                                                                                                                     no-magic-numbers
   86:39   warning  No magic number: 36                                                                                                                                                                                                                                                    no-magic-numbers
   86:53   warning  No magic number: 9                                                                                                                                                                                                                                                     no-magic-numbers
  124:42   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  125:40   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  127:15   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  130:47   warning  No magic number: 0.05                                                                                                                                                                                                                                                  no-magic-numbers
  138:69   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  138:113  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  138:176  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  145:27   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  161:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  162:52   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  163:50   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax
  165:25   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors                                                                                                                                                                                no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/Toolbar.tsx
  72:54  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/Tooltip.tsx
   50:11  warning  No magic number: 400                                                                     no-magic-numbers
  108:25  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  118:26  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  120:28  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  125:29  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  135:28  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  138:30  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  146:34  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  190:22  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  191:24  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  192:25  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  195:23  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  198:42  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  205:25  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  207:48  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  210:35  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  212:36  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  218:32  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  263:35  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  267:19  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  300:22  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  301:37  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  303:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  304:20  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  309:21  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  318:24  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  321:37  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  322:53  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ViewContainer.tsx
  74:12  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  75:9   warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax
  76:11  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/ui/molecules/ViewToggle.tsx
  101:32  warning  Use design tokens (cx.*) from ContextualClassNames instead of hardcoded Tailwind colors  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/workers/ingest.worker.ts
   23:3   warning  'IngestProgress' is defined but never used. Allowed unused vars must match /^_/u                        @typescript-eslint/no-unused-vars
  196:7   warning  'DEFAULT_DERIVATIVE_SIZES' is assigned a value but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
  230:29  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  268:12  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
  298:12  warning  'e' is defined but never used                                                                           @typescript-eslint/no-unused-vars
  354:9   warning  'ext' is assigned a value but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars
  366:5   warning  Use object destructuring                                                                                prefer-destructuring
  367:5   warning  Use object destructuring                                                                                prefer-destructuring
  403:25  warning  Unexpected any. Specify a different type                                                                @typescript-eslint/no-explicit-any
  458:11  warning  'suppAssetId' is assigned a value but never used. Allowed unused vars must match /^_/u                  @typescript-eslint/no-unused-vars
  546:38  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  557:22  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  559:11  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  573:17  warning  'base' is assigned a value but never used. Allowed unused vars must match /^_/u                         @typescript-eslint/no-unused-vars
  645:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  686:7   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/workers/searchIndexer.ts
  13:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  14:12  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  29:14  warning  'e' is defined but never used             @typescript-eslint/no-unused-vars
  31:7   warning  Use object destructuring                  prefer-destructuring
  31:29  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  81:55  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  97:23  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/shared/workers/validation.worker.ts
   58:29  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
   58:48  warning  'options' is defined but never used. Allowed unused args must match /^_/u            @typescript-eslint/no-unused-vars
   58:57  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  100:9   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  102:12  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  137:11  warning  'duration' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/AuthDialog/ui/AuthDialog.tsx
   45:6   warning  React Hook useEffect has missing dependencies: 'probeForAccess' and 'probeService'. Either include them or remove the dependency array                              react-hooks/exhaustive-deps
   85:26  warning  'windowClosed' is defined but never used. Allowed unused args must match /^_/u                                                                                      @typescript-eslint/no-unused-vars
  270:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  278:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  299:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  306:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  328:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  337:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/CommandPalette/ui/CommandPalette.tsx
   12:10  warning  'CommandHistoryEntry' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  266:5   warning  Arrow function expected no return value                                                consistent-return

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/ContextualHelp/ui/ContextualHelp.tsx
  45:34  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  72:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  97:7   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/ExperienceSelector/ExperienceSelector.tsx
   17:18  warning  'SPACING' is defined but never used. Allowed unused vars must match /^_/u                                                                                           @typescript-eslint/no-unused-vars
   17:27  warning  Member 'LAYOUT' of the import declaration should be sorted alphabetically                                                                                           sort-imports
   17:27  warning  'LAYOUT' is defined but never used. Allowed unused vars must match /^_/u                                                                                            @typescript-eslint/no-unused-vars
   17:35  warning  'INTERACTION' is defined but never used. Allowed unused vars must match /^_/u                                                                                       @typescript-eslint/no-unused-vars
  199:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  208:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  313:32  warning  Forbidden non-null assertion                                                                                                                                        @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/KeyboardShortcuts/ui/KeyboardShortcutsOverlay.tsx
   17:3   warning  'getShortcutsByContext' is defined but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
   22:3   warning  'ShortcutDefinition' is defined but never used. Allowed unused vars must match /^_/u                                                                                @typescript-eslint/no-unused-vars
  225:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  237:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  246:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  277:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  288:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  296:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  313:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  376:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/NavigationSidebar/ui/organisms/Sidebar.tsx
    2:17  warning  'useMemo' is defined but never used. Allowed unused vars must match /^_/u                                                                                           @typescript-eslint/no-unused-vars
    3:28  warning  'AppMode' is defined but never used. Allowed unused vars must match /^_/u                                                                                           @typescript-eslint/no-unused-vars
   12:1   error    '@/src/app/providers/useAppSettings' import is restricted from being used by a pattern. ❌ WIDGETS: Cannot import from app layer. Widgets compose feature organisms  no-restricted-imports
   13:1   error    '@/src/app/providers' import is restricted from being used by a pattern. ❌ WIDGETS: Cannot import from app layer. Widgets compose feature organisms                 no-restricted-imports
   45:3   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   78:7   warning  'SIDEBAR_VISIBLE_TYPES' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                    @typescript-eslint/no-unused-vars
   83:86  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  105:32  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  105:55  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  106:47  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  113:57  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  117:61  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  133:24  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  135:38  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  137:42  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  146:38  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  155:15  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  240:9   error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  279:33  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  288:68  error    Function name `Sidebar` must match one of the following formats: camelCase                                                                                          @typescript-eslint/naming-convention
  289:41  warning  'onViewTypeChange' is defined but never used. Allowed unused args must match /^_/u                                                                                  @typescript-eslint/no-unused-vars
  291:57  warning  'onAbstractionLevelChange' is defined but never used. Allowed unused args must match /^_/u                                                                          @typescript-eslint/no-unused-vars
  295:22  warning  'previousMode' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
  302:37  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  302:72  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  305:5   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  307:7   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  321:11  warning  'sidebarWidth' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                             @typescript-eslint/no-unused-vars
  364:35  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  368:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  415:49  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  418:19  warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                                                                             no-console
  424:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  440:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  467:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  512:19  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  529:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  557:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  573:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  588:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  607:15  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  615:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/OnboardingModal/ui/OnboardingModal.tsx
   93:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  100:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  121:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  153:17  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  159:17  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/PersonaSettings/ui/PersonaSettings.tsx
   65:11  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
   98:55  warning  'idx' is defined but never used. Allowed unused args must match /^_/u                                                                                               @typescript-eslint/no-unused-vars
   99:33  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  213:13  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  250:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  256:25  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/QCDashboard/ui/QCDashboard.tsx
    5:34   warning  'isCanvas' is defined but never used. Allowed unused vars must match /^_/u                                        @typescript-eslint/no-unused-vars
   94:35   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
   94:58   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  116:5    warning  React Hook useMemo has a missing dependency: 'findItemAndPath'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  131:37   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  131:60   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  131:89   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  210:11   warning  Unexpected console statement. Only these console methods are allowed: warn, error, info                           no-console
  350:71   warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  350:105  warning  Unexpected any. Specify a different type                                                                          @typescript-eslint/no-explicit-any
  410:49   warning  Forbidden non-null assertion                                                                                      @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/StatusBar/ui/StatusBar.tsx
  79:15  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/StatusBar/ui/organisms/StatusBar.tsx
  130:13  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  140:13  error  Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/src/widgets/StorageFullDialog/ui/StorageFullDialog.tsx
   62:12  warning  Unexpected string concatenation                                                                                                                                     prefer-template
   89:36  warning  Unexpected any. Specify a different type                                                                                                                            @typescript-eslint/no-explicit-any
  185:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  193:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  211:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax
  229:17  error    Inline <button> elements are not allowed. Use atomic Button component from @/src/shared/ui/atoms. Atoms are indivisible - zero inline button definitions tolerated  no-restricted-syntax

/media/2TA/DevStuff/BIIIF/field-studio/template/app/components/Example.client.tsx
  3:25  error  Function name `ExampleClient` must match one of the following formats: camelCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/template/app/components/Example.tsx
  3:25  error  Function name `Example` must match one of the following formats: camelCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/template/app/components/StoryMapJS.client.tsx
  43:10  warning  Forbidden non-null assertion                                                   @typescript-eslint/no-non-null-assertion
  46:25  error    Function name `StoryMapJS` must match one of the following formats: camelCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/test_ux_components.test.tsx
  10:24  warning  Member 'expect' of the import declaration should be sorted alphabetically          sort-imports
  11:10  warning  'render' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
  11:18  warning  'screen' is defined but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
  12:8   warning  'React' is defined but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
  15:7   warning  'mockCx' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/utils/atoms/files.ts
  50:9  warning  Unused eslint-disable directive (no problems were reported from 'no-useless-escape')

/media/2TA/DevStuff/BIIIF/field-studio/utils/atoms/url.ts
  56:5  warning  Unused eslint-disable directive (no problems were reported from 'no-new')

/media/2TA/DevStuff/BIIIF/field-studio/utils/filenameUtils.ts
  110:55  warning  Forbidden non-null assertion                                                                       @typescript-eslint/no-non-null-assertion
  110:67  warning  Forbidden non-null assertion                                                                       @typescript-eslint/no-non-null-assertion
  115:9   warning  Forbidden non-null assertion                                                                       @typescript-eslint/no-non-null-assertion
  115:29  warning  Forbidden non-null assertion                                                                       @typescript-eslint/no-non-null-assertion
  323:7   warning  'normalizeForComparison' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifBehaviors.ts
   56:3  error  Object Literal Property name `auto-advance` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   57:3  error  Object Literal Property name `no-auto-advance` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   59:3  error  Object Literal Property name `no-repeat` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   68:3  error  Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   69:3  error  Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   72:3  error  Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   77:3  error  Object Literal Property name `thumbnail-nav` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   78:3  error  Object Literal Property name `no-nav` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  199:3  error  Object Literal Property name `auto-advance` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  206:3  error  Object Literal Property name `no-auto-advance` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  220:3  error  Object Literal Property name `no-repeat` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  258:3  error  Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  265:3  error  Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  274:3  error  Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  295:3  error  Object Literal Property name `thumbnail-nav` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  301:3  error  Object Literal Property name `no-nav` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifHierarchy.ts
  264:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  288:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  310:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  328:26  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  328:49  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  351:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  411:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  424:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  458:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  581:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifImageApi.ts
    71:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase                   @typescript-eslint/naming-convention
    90:13  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   174:3   error    Object Literal Property name `image/jpeg` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   175:3   error    Object Literal Property name `image/tiff` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   176:3   error    Object Literal Property name `image/png` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   177:3   error    Object Literal Property name `image/gif` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   178:3   error    Object Literal Property name `image/jp2` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   179:3   error    Object Literal Property name `application/pdf` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   180:3   error    Object Literal Property name `image/webp` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   460:40  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
   464:38  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
   468:42  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
   473:41  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
   478:40  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
   597:40  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   674:33  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   690:33  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   752:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   971:18  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
   987:42  warning  Unexpected any. Specify a different type                                                                       @typescript-eslint/no-explicit-any
  1038:16  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1039:28  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1044:27  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1045:17  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1050:41  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1051:43  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1056:16  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1057:17  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1061:22  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion
  1062:22  warning  Forbidden non-null assertion                                                                                   @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifMetadataEnricher.ts
   9:37  warning  'resolveLeafCanvases' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  70:18  warning  Forbidden non-null assertion                                                           @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifSchema.ts
   699:3   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase                                       @typescript-eslint/naming-convention
  1318:25  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1389:32  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1455:46  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1455:88  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1463:48  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1480:20  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1483:54  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1484:61  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1489:20  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1492:46  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1493:53  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1498:20  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1501:48  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1502:55  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1543:20  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1543:64  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1544:35  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1556:22  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1557:34  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1578:46  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1578:88  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1591:48  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1607:66  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1609:27  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1625:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase                                                 @typescript-eslint/naming-convention
  1628:18  warning  Unexpected any. Specify a different type                                                                                                     @typescript-eslint/no-explicit-any
  1643:9   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase                                       @typescript-eslint/naming-convention
  1650:9   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase                                       @typescript-eslint/naming-convention
  1769:3   error    Object Literal Property name `CC BY 4.0` must match one of the following formats: camelCase, PascalCase                                      @typescript-eslint/naming-convention
  1770:3   error    Object Literal Property name `CC BY-SA 4.0` must match one of the following formats: camelCase, PascalCase                                   @typescript-eslint/naming-convention
  1771:3   error    Object Literal Property name `CC BY-NC 4.0` must match one of the following formats: camelCase, PascalCase                                   @typescript-eslint/naming-convention
  1772:3   error    Object Literal Property name `CC BY-ND 4.0` must match one of the following formats: camelCase, PascalCase                                   @typescript-eslint/naming-convention
  1773:3   error    Object Literal Property name `CC BY-NC-SA 4.0` must match one of the following formats: camelCase, PascalCase                                @typescript-eslint/naming-convention
  1774:3   error    Object Literal Property name `CC BY-NC-ND 4.0` must match one of the following formats: camelCase, PascalCase                                @typescript-eslint/naming-convention
  1775:3   error    Object Literal Property name `CC0 1.0` must match one of the following formats: camelCase, PascalCase                                        @typescript-eslint/naming-convention
  1776:3   error    Object Literal Property name `Public Domain Mark` must match one of the following formats: camelCase, PascalCase                             @typescript-eslint/naming-convention
  1777:3   error    Object Literal Property name `In Copyright` must match one of the following formats: camelCase, PascalCase                                   @typescript-eslint/naming-convention
  1778:3   error    Object Literal Property name `In Copyright - Educational Use Permitted` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  1779:3   error    Object Literal Property name `In Copyright - EU Orphan Work` must match one of the following formats: camelCase, PascalCase                  @typescript-eslint/naming-convention
  1780:3   error    Object Literal Property name `No Copyright - Non-Commercial Use Only` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  1781:3   error    Object Literal Property name `No Copyright - Other Known Legal Restrictions` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  1782:3   error    Object Literal Property name `No Copyright - United States` must match one of the following formats: camelCase, PascalCase                   @typescript-eslint/naming-convention
  1783:3   error    Object Literal Property name `Copyright Not Evaluated` must match one of the following formats: camelCase, PascalCase                        @typescript-eslint/naming-convention
  1784:3   error    Object Literal Property name `Copyright Undetermined` must match one of the following formats: camelCase, PascalCase                         @typescript-eslint/naming-convention
  1811:3   error    Object Literal Property name `PROPERTY_MATRIX` must match one of the following formats: camelCase, PascalCase                                @typescript-eslint/naming-convention
  1812:3   error    Object Literal Property name `ITEMS_CONTAINMENT` must match one of the following formats: camelCase, PascalCase                              @typescript-eslint/naming-convention
  1813:3   error    Object Literal Property name `VIEWING_DIRECTIONS` must match one of the following formats: camelCase, PascalCase                             @typescript-eslint/naming-convention
  1814:3   error    Object Literal Property name `DEFAULT_VIEWING_DIRECTION` must match one of the following formats: camelCase, PascalCase                      @typescript-eslint/naming-convention
  1815:3   error    Object Literal Property name `TIME_MODES` must match one of the following formats: camelCase, PascalCase                                     @typescript-eslint/naming-convention
  1816:3   error    Object Literal Property name `DEFAULT_TIME_MODE` must match one of the following formats: camelCase, PascalCase                              @typescript-eslint/naming-convention
  1818:3   error    Object Literal Property name `DEFAULT_MOTIVATION` must match one of the following formats: camelCase, PascalCase                             @typescript-eslint/naming-convention
  1819:3   error    Object Literal Property name `BEHAVIOR_VALIDITY` must match one of the following formats: camelCase, PascalCase                              @typescript-eslint/naming-convention
  1820:3   error    Object Literal Property name `CONTENT_RESOURCE_TYPES` must match one of the following formats: camelCase, PascalCase                         @typescript-eslint/naming-convention
  1821:3   error    Object Literal Property name `IIIF_SCHEMA` must match one of the following formats: camelCase, PascalCase                                    @typescript-eslint/naming-convention
  1854:3   error    Object Literal Property name `COMMON_RIGHTS_URIS` must match one of the following formats: camelCase, PascalCase                             @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifTraversal.ts
   66:16  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   66:53  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   67:31  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   71:16  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   71:59  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   72:31  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   76:16  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   76:58  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
   77:31  warning  Unexpected any. Specify a different type                                            @typescript-eslint/no-explicit-any
  177:25  warning  'context' is defined but never used. Allowed unused args must match /^_/u           @typescript-eslint/no-unused-vars
  224:3   warning  'options' is assigned a value but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifTypes.ts
   59:3   error    Object Literal Property name `.jpg` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   60:3   error    Object Literal Property name `.jpeg` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   61:3   error    Object Literal Property name `.png` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   62:3   error    Object Literal Property name `.gif` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   63:3   error    Object Literal Property name `.tif` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   64:3   error    Object Literal Property name `.tiff` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   65:3   error    Object Literal Property name `.webp` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   66:3   error    Object Literal Property name `.svg` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   67:3   error    Object Literal Property name `.bmp` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   68:3   error    Object Literal Property name `.ico` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   69:3   error    Object Literal Property name `.avif` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   70:3   error    Object Literal Property name `.heic` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   71:3   error    Object Literal Property name `.heif` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   74:3   error    Object Literal Property name `.mp4` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   75:3   error    Object Literal Property name `.webm` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   76:3   error    Object Literal Property name `.ogv` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   77:3   error    Object Literal Property name `.mov` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   78:3   error    Object Literal Property name `.avi` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   79:3   error    Object Literal Property name `.mkv` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   80:3   error    Object Literal Property name `.m4v` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   83:3   error    Object Literal Property name `.mp3` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   84:3   error    Object Literal Property name `.wav` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   85:3   error    Object Literal Property name `.ogg` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   86:3   error    Object Literal Property name `.oga` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   87:3   error    Object Literal Property name `.flac` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   88:3   error    Object Literal Property name `.aac` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   89:3   error    Object Literal Property name `.m4a` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   90:3   error    Object Literal Property name `.weba` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   93:3   error    Object Literal Property name `.txt` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   94:3   error    Object Literal Property name `.html` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   95:3   error    Object Literal Property name `.htm` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   96:3   error    Object Literal Property name `.css` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   97:3   error    Object Literal Property name `.csv` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   98:3   error    Object Literal Property name `.md` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   99:3   error    Object Literal Property name `.vtt` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  100:3   error    Object Literal Property name `.srt` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  103:3   error    Object Literal Property name `.pdf` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  104:3   error    Object Literal Property name `.epub` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  107:3   error    Object Literal Property name `.xml` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  108:3   error    Object Literal Property name `.json` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  109:3   error    Object Literal Property name `.jsonld` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  110:3   error    Object Literal Property name `.rdf` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  113:3   error    Object Literal Property name `.gltf` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  114:3   error    Object Literal Property name `.glb` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  115:3   error    Object Literal Property name `.obj` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  116:3   error    Object Literal Property name `.stl` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  117:3   error    Object Literal Property name `.usdz` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  276:22  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  312:22  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  336:20  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  363:25  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  390:13  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any
  398:25  warning  Unexpected any. Specify a different type                                                               @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/utils/iiifValidation.ts
   64:12  warning  'e' is defined but never used             @typescript-eslint/no-unused-vars
  121:31  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:54  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  121:83  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  152:31  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  152:54  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/utils/imageSourceResolver.ts
   16:10  warning  'DEFAULT_DERIVATIVE_PRESET' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   33:7   error    Type Property name `@id` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   35:7   error    Type Property name `@type` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   47:11  error    Type Property name `@id` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   49:11  error    Type Property name `@type` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   58:11  error    Type Property name `@id` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   60:11  error    Type Property name `@type` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   80:7   error    Type Property name `@id` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   82:7   error    Type Property name `@type` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  128:34  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  143:32  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  150:37  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  161:38  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  161:46  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  206:25  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  207:23  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any
  464:24  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any

/media/2TA/DevStuff/BIIIF/field-studio/utils/mediaTypes.ts
  353:3  error  Object Literal Property name `MIME_TYPE_MAP` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  354:3  error  Object Literal Property name `IMAGE_EXTENSIONS` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  355:3  error  Object Literal Property name `VIDEO_EXTENSIONS` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  356:3  error  Object Literal Property name `AUDIO_EXTENSIONS` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  357:3  error  Object Literal Property name `TEXT_EXTENSIONS` must match one of the following formats: camelCase, PascalCase   @typescript-eslint/naming-convention
  358:3  error  Object Literal Property name `MODEL_EXTENSIONS` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/molecules/files.ts
    8:3   warning  Member 'getBaseName' of the import declaration should be sorted alphabetically  sort-imports
   99:55  warning  Forbidden non-null assertion                                                    @typescript-eslint/no-non-null-assertion
   99:67  warning  Forbidden non-null assertion                                                    @typescript-eslint/no-non-null-assertion
  104:9   warning  Forbidden non-null assertion                                                    @typescript-eslint/no-non-null-assertion
  104:29  warning  Forbidden non-null assertion                                                    @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/utils/molecules/media-detection.ts
    8:3   warning  Member 'IMAGE_EXTENSIONS' of the import declaration should be sorted alphabetically  sort-imports
  171:11  warning  Use object destructuring                                                             prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/utils/molecules/sanitizers.ts
    6:10  warning  'escapeHTML' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
    7:26  warning  Member 'EVENT_HANDLER_PATTERN' of the import declaration should be sorted alphabetically  sort-imports
   54:9   warning  'allowedTags' is assigned a value but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars
   55:9   warning  'allowedAttrs' is assigned a value but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
   81:5   warning  Unused eslint-disable directive (no problems were reported from 'no-console')
   88:5   warning  Unused eslint-disable directive (no problems were reported from 'no-new')
  176:7   warning  Unused eslint-disable directive (no problems were reported from 'quotes')

/media/2TA/DevStuff/BIIIF/field-studio/utils/molecules/themes.ts
  8:3  warning  Member 'BACKGROUNDS' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/utils/molecules/validators.ts
   9:3  warning  Member 'DEFAULT_VALIDATION' of the import declaration should be sorted alphabetically     sort-imports
  13:3  warning  Member 'EVENT_HANDLER_PATTERN' of the import declaration should be sorted alphabetically  sort-imports

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/behaviors.ts
    6:29  warning  'IIIFResourceType' is defined but never used. Allowed unused vars must match /^_/u                             @typescript-eslint/no-unused-vars
   14:3   error    Object Literal Property name `auto-advance` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   15:3   error    Object Literal Property name `no-auto-advance` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   17:3   error    Object Literal Property name `no-repeat` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   26:3   error    Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   27:3   error    Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   30:3   error    Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   35:3   error    Object Literal Property name `thumbnail-nav` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   36:3   error    Object Literal Property name `no-nav` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  165:5   error    Object Literal Property name `auto-advance` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  172:5   error    Object Literal Property name `no-auto-advance` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  185:5   error    Object Literal Property name `no-repeat` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  217:5   error    Object Literal Property name `facing-pages` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  224:5   error    Object Literal Property name `non-paged` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  231:5   error    Object Literal Property name `multi-part` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  249:5   error    Object Literal Property name `thumbnail-nav` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  255:5   error    Object Literal Property name `no-nav` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/hierarchy.ts
  434:11  warning  Use object destructuring  prefer-destructuring

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/image-api-constants.ts
  21:3  error  Object Literal Property name `image/jpeg` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  22:3  error  Object Literal Property name `image/tiff` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  23:3  error  Object Literal Property name `image/png` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  24:3  error  Object Literal Property name `image/gif` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  25:3  error  Object Literal Property name `image/jp2` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  26:3  error  Object Literal Property name `application/pdf` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  27:3  error  Object Literal Property name `image/webp` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/image-api.ts
    6:26  warning  Member 'FORMAT_MIME_TYPES' of the import declaration should be sorted alphabetically                    sort-imports
    7:10  warning  'getExtension' is defined but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars
    7:24  warning  'getMimeTypeString' is defined but never used. Allowed unused vars must match /^_/u                     @typescript-eslint/no-unused-vars
   70:3   error    Type Property name `@context` must match one of the following formats: camelCase, PascalCase            @typescript-eslint/naming-convention
  372:5   error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  448:16  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  449:63  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  453:62  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  454:17  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  457:23  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  457:44  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  459:22  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  460:22  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  468:44  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion
  469:46  warning  Forbidden non-null assertion                                                                            @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/image-resolver.ts
  6:10  warning  'findAllOfType' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  8:3   warning  'getMimeType' is defined but never used. Allowed unused vars must match /^_/u        @typescript-eslint/no-unused-vars
  9:3   warning  'getMimeTypeString' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/schema.ts
    8:3  warning  Member 'IIIFValidationResult' of the import declaration should be sorted alphabetically                 sort-imports
   13:3  warning  Member 'TimeMode' of the import declaration should be sorted alphabetically                             sort-imports
   14:3  warning  'IIIFBehavior' is defined but never used. Allowed unused vars must match /^_/u                          @typescript-eslint/no-unused-vars
  474:3  error    Object Literal Property name `@context` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/traversal.ts
  389:18  warning  Forbidden non-null assertion  @typescript-eslint/no-non-null-assertion

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/iiif/validation.ts
  10:3  warning  Member 'getUriLastSegment' of the import declaration should be sorted alphabetically  sort-imports
  13:1  error    './traversal' import is duplicated                                                    no-duplicate-imports

/media/2TA/DevStuff/BIIIF/field-studio/utils/organisms/ui/terminology.ts
    6:15  warning  'ContentResourceType' is defined but never used. Allowed unused vars must match /^_/u                               @typescript-eslint/no-unused-vars
   90:5   error    Object Literal Property name `Archive Explorer` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  116:5   error    Object Literal Property name `IIIF Collection` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  117:5   error    Object Literal Property name `IIIF Manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  118:5   error    Object Literal Property name `IIIF Canvas` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  119:5   error    Object Literal Property name `W3C Web Annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  131:5   error    Object Literal Property name `Source Manifests` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  132:5   error    Object Literal Property name `Archive Layout` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  133:5   error    Object Literal Property name `Assign to Collection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  134:5   error    Object Literal Property name `Create Collection` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  149:5   error    Object Literal Property name `Archive Explorer` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  175:5   error    Object Literal Property name `IIIF Collection` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  176:5   error    Object Literal Property name `IIIF Manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  177:5   error    Object Literal Property name `IIIF Canvas` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  178:5   error    Object Literal Property name `W3C Web Annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  190:5   error    Object Literal Property name `Source Manifests` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  191:5   error    Object Literal Property name `Archive Layout` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  192:5   error    Object Literal Property name `Assign to Collection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  193:5   error    Object Literal Property name `Create Collection` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/sanitization.ts
   21:3  error  Object Literal Property name `ALLOWED_TAGS` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   22:3  error  Object Literal Property name `ALLOWED_ATTR` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   23:3  error  Object Literal Property name `ALLOW_DATA_ATTR` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   25:3  error  Object Literal Property name `SANITIZE_DOM` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   27:3  error  Object Literal Property name `KEEP_CONTENT` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   29:3  error  Object Literal Property name `FORBID_ATTR` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
   31:3  error  Object Literal Property name `RETURN_TRUSTED_TYPE` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   35:3  error  Object Literal Property name `ALLOWED_TAGS` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   36:3  error  Object Literal Property name `ALLOWED_ATTR` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   37:3  error  Object Literal Property name `KEEP_CONTENT` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   45:3  error  Object Literal Property name `ALLOWED_TAGS` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   46:3  error  Object Literal Property name `ALLOWED_ATTR` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   47:3  error  Object Literal Property name `KEEP_CONTENT` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   48:3  error  Object Literal Property name `RETURN_TRUSTED_TYPE` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  295:5  error  Object Literal Property name `ALLOWED_TAGS` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  296:5  error  Object Literal Property name `ALLOWED_ATTR` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  297:5  error  Object Literal Property name `ALLOW_DATA_ATTR` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  298:5  error  Object Literal Property name `FORBID_ATTR` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  299:5  error  Object Literal Property name `RETURN_TRUSTED_TYPE` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  370:3  error  Object Literal Property name `ALLOWED_TAGS` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  377:3  error  Object Literal Property name `ALLOWED_ATTR` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  387:3  error  Object Literal Property name `ALLOW_DATA_ATTR` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  388:3  error  Object Literal Property name `SANITIZE_DOM` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  389:3  error  Object Literal Property name `KEEP_CONTENT` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  390:3  error  Object Literal Property name `FORBID_ATTR` must match one of the following formats: camelCase, PascalCase          @typescript-eslint/naming-convention
  391:3  error  Object Literal Property name `RETURN_TRUSTED_TYPE` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/utils/uiTerminology.ts
   28:5  error  Object Literal Property name `Archive Explorer` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   56:5  error  Object Literal Property name `IIIF Collection` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
   57:5  error  Object Literal Property name `IIIF Manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
   58:5  error  Object Literal Property name `IIIF Canvas` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
   59:5  error  Object Literal Property name `W3C Web Annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
   73:5  error  Object Literal Property name `Source Manifests` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
   74:5  error  Object Literal Property name `Archive Layout` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
   75:5  error  Object Literal Property name `Assign to Collection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
   76:5  error  Object Literal Property name `Create Collection` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
   92:5  error  Object Literal Property name `Archive Explorer` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  120:5  error  Object Literal Property name `IIIF Collection` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  121:5  error  Object Literal Property name `IIIF Manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  122:5  error  Object Literal Property name `IIIF Canvas` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  123:5  error  Object Literal Property name `W3C Web Annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  137:5  error  Object Literal Property name `Source Manifests` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  138:5  error  Object Literal Property name `Archive Layout` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  139:5  error  Object Literal Property name `Assign to Collection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  140:5  error  Object Literal Property name `Create Collection` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  157:5  error  Object Literal Property name `Archive Explorer` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  185:5  error  Object Literal Property name `IIIF Collection` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention
  186:5  error  Object Literal Property name `IIIF Manifest` must match one of the following formats: camelCase, PascalCase         @typescript-eslint/naming-convention
  187:5  error  Object Literal Property name `IIIF Canvas` must match one of the following formats: camelCase, PascalCase           @typescript-eslint/naming-convention
  188:5  error  Object Literal Property name `W3C Web Annotation` must match one of the following formats: camelCase, PascalCase    @typescript-eslint/naming-convention
  202:5  error  Object Literal Property name `Source Manifests` must match one of the following formats: camelCase, PascalCase      @typescript-eslint/naming-convention
  203:5  error  Object Literal Property name `Archive Layout` must match one of the following formats: camelCase, PascalCase        @typescript-eslint/naming-convention
  204:5  error  Object Literal Property name `Assign to Collection` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention
  205:5  error  Object Literal Property name `Create Collection` must match one of the following formats: camelCase, PascalCase     @typescript-eslint/naming-convention
  326:3  error  Object Literal Property name `TERMINOLOGY_MAP` must match one of the following formats: camelCase, PascalCase       @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/vite-env.d.ts
  4:12  error  Type Property name `BASE_URL` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/vite.config.ts
   6:11  warning  'env' is assigned a value but never used. Allowed unused vars must match /^_/u                   @typescript-eslint/no-unused-vars
  16:11  error    Object Literal Property name `@` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

/media/2TA/DevStuff/BIIIF/field-studio/vitest.config.ts
  43:9  error  Object Literal Property name `@` must match one of the following formats: camelCase, PascalCase  @typescript-eslint/naming-convention

✖ 2504 problems (827 errors, 1677 warnings)
  0 errors and 71 warnings potentially fixable with the `--fix` option.

