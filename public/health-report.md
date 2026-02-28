# Health Report — 2026-02-28
**Composite: 47/100 (RED)**

**Trend:** +0 from previous (47)

| Dimension | Score | Grade | Weight |
|-----------|-------|-------|--------|
| coupling | 57 | YELLOW | 25% |
| deadCode | 55 | YELLOW | 25% |
| circularDeps | 0 | RED | 10% |
| fsdBoundaries | 70 | YELLOW | 15% |
| importDepth | 86 | GREEN | 10% |
| barrelHealth | 0 | RED | 10% |
| complexity | 0 | RED | 5% |

## Flags

- **[RED]** coupling: src/shared/ui/atoms/Button.svelte has 94 dependents (God module)
- **[RED]** coupling: src/shared/ui/atoms/Icon.svelte has 134 dependents (God module)
- **[RED]** barrelHealth: src/entities/manifest/model/vault/index.ts re-exports 59 symbols
- **[RED]** barrelHealth: src/features/metadata-edit/ui/atoms/index.ts re-exports 43 symbols
- **[RED]** barrelHealth: src/features/viewer/model/index.ts re-exports 84 symbols
- **[RED]** barrelHealth: src/features/viewer/ui/atoms/index.ts re-exports 43 symbols
- **[RED]** barrelHealth: src/shared/lib/hooks/index.ts re-exports 51 symbols
- **[RED]** barrelHealth: src/shared/services/index.ts re-exports 55 symbols
- **[RED]** barrelHealth: src/shared/types/index.ts re-exports 81 symbols
- **[RED]** barrelHealth: src/shared/ui/molecules/index.ts re-exports 67 symbols
- **[RED]** complexity: src/app/ui/App.svelte: 1112 lines
- **[RED]** complexity: src/entities/manifest/model/validation/validationHealer.ts: 1079 lines
- **[RED]** complexity: src/features/export/model/exportService.ts: 1545 lines
- **[RED]** complexity: src/features/export/model/staticSiteExporter.ts: 1053 lines
- **[YELLOW]** deadCode: 41 orphan files (6.8%)
- **[YELLOW]** circularDeps: Cycle (depth 2): src/shared/constants/index.ts → src/shared/constants/image.ts → src/shared/constants/index.ts
- **[YELLOW]** circularDeps: Cycle (depth 2): src/shared/constants/iiif.ts → src/shared/constants/index.ts → src/shared/constants/iiif.ts
- **[YELLOW]** circularDeps: Cycle (depth 2): src/features/metadata-edit/ui/molecules/MetadataFieldsPanel.svelte → src/features/metadata-edit/ui/atoms/MetadataFieldRenderer.svelte → src/features/metadata-edit/ui/molecules/MetadataFieldsPanel.svelte
- **[YELLOW]** circularDeps: Cycle (depth 2): src/features/staging/ui/molecules/IngestProgressPanel.svelte → src/features/staging/ui/atoms/IngestFileList.svelte → src/features/staging/ui/molecules/IngestProgressPanel.svelte
- **[YELLOW]** circularDeps: Cycle (depth 2): src/features/board-design/ui/molecules/TemplateItemPicker.svelte → src/features/board-design/ui/organisms/BoardOnboarding.svelte → src/features/board-design/ui/molecules/TemplateItemPicker.svelte
- **[YELLOW]** circularDeps: Cycle (depth 2): src/features/viewer/ui/atoms/SearchResultItem.svelte → src/features/viewer/ui/molecules/ViewerSearchPanel.svelte → src/features/viewer/ui/atoms/SearchResultItem.svelte
- **[YELLOW]** circularDeps: Cycle (depth 2): src/features/viewer/ui/atoms/ViewerToolbarActions.svelte → src/features/viewer/ui/molecules/ViewerToolbar.svelte → src/features/viewer/ui/atoms/ViewerToolbarActions.svelte
- **[YELLOW]** fsdBoundaries: cross-feature: src/features/export/ui/organisms/ExportDialog.svelte → src/features/metadata-edit/lib/inspectorValidation.ts
- **[YELLOW]** fsdBoundaries: cross-feature: src/features/staging/model/stagingWorkbenchHelpers.ts → src/features/ingest/model/csvImporter.ts
- **[YELLOW]** fsdBoundaries: cross-feature: src/features/staging/ui/atoms/FileTreeNode.svelte → src/features/structure-view/ui/atoms/ExpandButton.svelte
- **[YELLOW]** barrelHealth: 2/45 barrels use export * (4%)
- **[YELLOW]** barrelHealth: src/features/board-design/model/index.ts re-exports 26 symbols
- **[YELLOW]** barrelHealth: src/features/board-design/ui/atoms/index.ts re-exports 21 symbols
- **[YELLOW]** barrelHealth: src/features/dependency-explorer/index.ts re-exports 22 symbols
- **[YELLOW]** barrelHealth: src/features/staging/model/index.ts re-exports 25 symbols
- **[YELLOW]** barrelHealth: src/features/viewer/ui/molecules/index.ts re-exports 30 symbols
- **[YELLOW]** barrelHealth: src/shared/actions/index.ts re-exports 24 symbols
- **[YELLOW]** barrelHealth: src/shared/constants/index.ts re-exports 36 symbols
- **[YELLOW]** barrelHealth: src/shared/stores/index.ts re-exports 35 symbols
- **[YELLOW]** barrelHealth: src/shared/ui/layout/index.ts re-exports 37 symbols
- **[YELLOW]** complexity: src/app/ui/ViewRouter.svelte: 793 lines
- **[YELLOW]** complexity: src/entities/annotation/model/contentSearchService.ts: 629 lines
- **[YELLOW]** complexity: src/entities/canvas/model/avService.ts: 514 lines
- **[YELLOW]** complexity: src/entities/canvas/model/imageSourceResolver.ts: 555 lines
- **[YELLOW]** complexity: src/entities/collection/model/stagingService.ts: 536 lines
- **[YELLOW]** complexity: src/entities/manifest/model/builders/iiifBuilder.ts: 705 lines
- **[YELLOW]** complexity: src/entities/manifest/model/trash/trashService.ts: 755 lines
- **[YELLOW]** complexity: src/features/board-design/model/index.ts: 604 lines
- **[YELLOW]** complexity: src/features/board-design/stores/boardVault.svelte.ts: 547 lines
- **[YELLOW]** complexity: src/features/board-design/ui/organisms/BoardCanvas.svelte: 508 lines
- **[YELLOW]** complexity: src/features/board-design/ui/organisms/BoardOnboarding.svelte: 537 lines
- **[YELLOW]** complexity: src/features/export/model/archivalPackageService.ts: 623 lines
- **[YELLOW]** complexity: src/features/ingest/model/csvImporter.ts: 515 lines
- **[YELLOW]** complexity: src/features/metadata-edit/lib/inspectorValidation.ts: 864 lines
- **[YELLOW]** complexity: src/features/metadata-edit/ui/organisms/BatchEditor.svelte: 555 lines
- **[YELLOW]** complexity: src/features/metadata-edit/ui/organisms/Inspector.svelte: 599 lines
- **[YELLOW]** complexity: src/features/staging/model/index.ts: 776 lines
- **[YELLOW]** complexity: src/features/staging/stores/stagingState.svelte.ts: 682 lines
- **[YELLOW]** complexity: src/features/structure-view/stores/structureTree.svelte.ts: 597 lines
- **[YELLOW]** complexity: src/features/viewer/actions/annotorious.ts: 545 lines
- **[YELLOW]** complexity: src/features/viewer/model/annotation.svelte.ts: 525 lines
- **[YELLOW]** complexity: src/features/viewer/model/viewer.svelte.ts: 658 lines
- **[YELLOW]** complexity: src/features/viewer/model/viewerCompatibility.ts: 629 lines
- **[YELLOW]** complexity: src/shared/constants/canopyTemplates.ts: 591 lines
- **[YELLOW]** complexity: src/shared/lib/hooks/stagingState.svelte.ts: 531 lines
- **[YELLOW]** complexity: src/shared/services/specBridge.ts: 661 lines
- **[YELLOW]** complexity: src/shared/types/index.ts: 561 lines
- **[YELLOW]** complexity: src/widgets/AuthDialog/ui/AuthDialog.svelte: 556 lines
- **[YELLOW]** complexity: src/widgets/KeyboardShortcuts/ui/KeyboardShortcutsOverlay.svelte: 511 lines
- **[YELLOW]** complexity: src/widgets/NavigationSidebar/ui/organisms/Sidebar.svelte: 891 lines
- **[YELLOW]** complexity: src/widgets/QCDashboard/ui/QCDashboard.svelte: 622 lines
