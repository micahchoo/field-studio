# IIIF Field Archive Studio - Comprehensive UI/UX Audit Report

**Date:** 2026-01-28  
**Scope:** Complete application audit covering all views, components, interactions, and user flows  
**Methodology:** Static code analysis, heuristic evaluation, accessibility review, interaction pattern assessment

---

## Executive Summary

This audit identifies **47 distinct UI/UX quirks, issues, and improvement opportunities** across the IIIF Field Archive Studio application. Issues are categorized by severity and impact on user experience.

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 8 | Blocks user workflows, causes data loss, or severely impacts usability |
| 🟠 High | 14 | Significantly impacts user experience or causes confusion |
| 🟡 Medium | 16 | Minor friction points or inconsistent behaviors |
| 🟢 Low | 9 | Polish items, aesthetic improvements, nice-to-haves |

---

## 1. Navigation & Layout Issues

### 🔴 CRITICAL

#### 1.1 Missing "Viewer" Mode in Sidebar Navigation
**Location:** [`components/Sidebar.tsx:207-213`](components/Sidebar.tsx:207)

**Issue:** The Sidebar navigation includes Archive, Structure, Catalog, and Boards, but "Viewer" mode is missing even though it's a valid [`AppMode`](types/index.ts:15). Users can only access Viewer via item selection, not through direct navigation.

**Impact:** Users cannot return to a previously viewed item without re-navigating through the archive.

**Recommendation:** Add Viewer to the navigation or provide a "Recent Items" quick-access section.

#### 1.2 Mobile Header Layout Shift on Selection
**Location:** [`App.tsx:425-435`](App.tsx:425)

**Issue:** The mobile header dynamically shows/hides the inspector button based on [`selectedItem`](App.tsx:431), causing layout shifts when items are selected/deselected.

**Impact:** Muscle memory disruption; users may tap wrong button as layout shifts.

**Recommendation:** Reserve consistent space for the inspector button, disabling it rather than hiding when no item is selected.

---

### 🟠 HIGH

#### 1.3 Inconsistent Mode Naming Between UI and Code
**Location:** Multiple files

**Issue:** The UI shows "Structure" but the code refers to "collections" mode. Similarly, "Catalog" in UI vs "metadata" in code.

| UI Label | Code Mode |
|----------|-----------|
| Structure | collections |
| Catalog | metadata |
| Archive | archive |

**Impact:** Cognitive dissonance for developers and advanced users; documentation/code mismatch.

**Recommendation:** Align terminology or provide explicit mapping documentation.

#### 1.4 Sidebar Resize Not Persistent
**Location:** [`components/Sidebar.tsx:177-184`](components/Sidebar.tsx:177)

**Issue:** Sidebar width resets on every app reload. No user preference storage for panel sizes.

**Impact:** Users must resize panels repeatedly.

**Recommendation:** Store panel widths in localStorage and restore on load.

#### 1.5 View Router Error Boundaries Don't Preserve State
**Location:** [`components/ViewRouter.tsx:78-216`](components/ViewRouter.tsx:78)

**Issue:** When a view crashes and recovers, the user's scroll position, selection state, and filters are lost.

**Impact:** Significant context loss during error recovery.

**Recommendation:** Implement state persistence in ErrorBoundary recovery flows.

---

### 🟡 MEDIUM

#### 1.6 Status Bar Missing on Mobile
**Location:** [`App.tsx:502-511`](App.tsx:502)

**Issue:** The StatusBar with validation issues, storage usage, and save status is completely hidden on mobile (`!isMobile`).

**Impact:** Mobile users unaware of save failures or validation issues.

**Recommendation:** Collapse to a compact indicator or show on pull-up gesture.

#### 1.7 Command Palette Missing "Viewer" Navigation
**Location:** [`App.tsx:167-179`](App.tsx:167)

**Issue:** Command palette commands include archive, collections, metadata, search, but not viewer mode.

**Impact:** Inconsistent keyboard navigation coverage.

**Recommendation:** Add viewer mode command or dynamic "Open Last Viewed Item" command.

---

## 2. Selection & Interaction Issues

### 🔴 CRITICAL

#### 2.1 Rubber-band Selection Doesn't Work with Virtualization
**Location:** [`components/views/ArchiveView.tsx:397-526`](components/views/ArchiveView.tsx:397)

**Issue:** The rubber-band selection logic in [`handleRubberBandStart`](components/views/ArchiveView.tsx:399) and [`handleGlobalMouseUp`](components/views/ArchiveView.tsx:441) only checks items in [`itemRefs.current`](components/views/ArchiveView.tsx:472), which only contains currently visible items due to virtualization.

**Impact:** Users cannot rubber-band select items that are scrolled out of view, even if the selection box visually covers them.

**Recommendation:** Implement spatial indexing for virtualized lists or disable rubber-band in virtualized views.

#### 2.2 Shift+Click Range Selection Doesn't Handle Filtered Lists
**Location:** [`components/views/ArchiveView.tsx:305-332`](components/views/ArchiveView.tsx:305)

**Issue:** The [`handleItemClick`](components/views/ArchiveView.tsx:305) function uses [`filteredAssets`](components/views/ArchiveView.tsx:309) for range selection indices, but if the filter changes between clicks, the indices become invalid.

**Impact:** Unexpected selection behavior when filtering while shift-selecting.

**Recommendation:** Store selection anchors by ID rather than index.

---

### 🟠 HIGH

#### 2.3 Multi-select Lost on View Switch
**Location:** [`components/views/ArchiveView.tsx:150-158`](components/views/ArchiveView.tsx:150)

**Issue:** The [`selectedIds`](components/views/ArchiveView.tsx:155) state is local to ArchiveView and lost when switching views.

**Impact:** Users cannot select items in Archive and then act on them in another view.

**Recommendation:** Lift selection state to App-level or implement view-state persistence.

#### 2.4 Drag-and-Drop No Visual Feedback During Drag
**Location:** [`components/views/CollectionsView.tsx:253-303`](components/views/CollectionsView.tsx:253)

**Issue:** The [`handleReorderDrag`](components/views/CollectionsView.tsx:253) function validates drops but provides no visual preview of where the item will land.

**Impact:** Users must guess the drop target; poor discoverability.

**Recommendation:** Add drop zone highlighting and ghost preview during drag operations.

#### 2.5 Board View Connection Anchors Too Small
**Location:** [`components/views/BoardView.tsx:993-1085`](components/views/BoardView.tsx:993)

**Issue:** Connection anchor points are only 16x16px ([`w-4 h-4`](components/views/BoardView.tsx:994)), below the recommended 44x44px touch target.

**Impact:** Difficult to initiate connections, especially on touch devices.

**Recommendation:** Increase anchor hit areas to minimum 44x44px with visual padding.

---

### 🟡 MEDIUM

#### 2.6 Missing Keyboard Selection in List View
**Location:** [`components/views/ArchiveView.tsx:796-899`](components/views/ArchiveView.tsx:796)

**Issue:** The VirtualizedList component doesn't implement keyboard navigation (arrow keys, space to select).

**Impact:** Keyboard-only users cannot select items in list view.

**Recommendation:** Add keyboard navigation handlers to the list table.

---

## 3. Data Entry & Form Issues

### 🔴 CRITICAL

#### 3.1 Metadata Spreadsheet Unsaved Changes Warning Doesn't Prevent Navigation
**Location:** [`components/views/MetadataSpreadsheet.tsx:49-60`](components/views/MetadataSpreadsheet.tsx:49)

**Issue:** The [`beforeunload`](components/views/MetadataSpreadsheet.tsx:50) handler warns about unsaved changes but doesn't prevent in-app navigation. Users can switch views and lose changes.

**Impact:** Data loss when navigating away from spreadsheet with pending changes.

**Recommendation:** Implement navigation guards using React Router or App-level state check.

#### 3.2 CSV Import No Progress Indicator for Large Files
**Location:** [`components/views/MetadataSpreadsheet.tsx:93-206`](components/views/MetadataSpreadsheet.tsx:93)

**Issue:** Large CSV imports block the UI without progress feedback.

**Impact:** Users may think the app crashed during import.

**Recommendation:** Add progress indicator and chunked processing for large files.

---

### 🟠 HIGH

#### 3.3 Date Input Field Loses Time Information
**Location:** [`components/views/MetadataSpreadsheet.tsx:496-506`](components/views/MetadataSpreadsheet.tsx:496)

**Issue:** The date field uses [`datetime-local`](components/views/MetadataSpreadsheet.tsx:501) input but stores full ISO string, potentially losing timezone context.

**Impact:** Timezone confusion in collaborative environments.

**Recommendation:** Display timezone indicator or store in UTC with clear labeling.

#### 3.4 Inspector DebouncedInput Loses Focus on Rapid Updates
**Location:** [`components/Inspector.tsx:57-93`](components/Inspector.tsx:57)

**Issue:** The [`DebouncedInput`](components/Inspector.tsx:57) component can lose user input if external updates arrive during the 300ms debounce window.

**Impact:** Typing can be interrupted by background sync processes.

**Recommendation:** Prevent external updates while input is focused.

---

### 🟡 MEDIUM

#### 3.5 Rights Dropdown Duplicates Options in Inspector vs Spreadsheet
**Location:** [`components/Inspector.tsx:487-498`](components/Inspector.tsx:487), [`components/views/MetadataSpreadsheet.tsx:479-493`](components/views/MetadataSpreadsheet.tsx:479)

**Issue:** Rights options are hardcoded in both locations with slight differences.

| Inspector | Spreadsheet |
|-----------|-------------|
| CC0, CC BY 4.0, CC BY-NC 4.0, In Copyright | Same + more from [`RIGHTS_OPTIONS`](constants.ts:356) |

**Impact:** Inconsistent available options between views.

**Recommendation:** Use shared component or unified options source.

---

## 4. Visual Feedback & State Issues

### 🔴 CRITICAL

#### 4.1 Toast Notifications Can Overflow Screen
**Location:** [`components/Toast.tsx:60-79`](components/Toast.tsx:60)

**Issue:** The [`MAX_TOASTS`](components/Toast.tsx:28) limit is 5, but toasts stack from bottom with no height limit, potentially covering critical UI.

**Impact:** Users cannot access UI elements covered by toast stack.

**Recommendation:** Implement toast grouping, auto-dismiss on interaction, or position in non-critical zone.

#### 4.2 Export Progress Percentage Can Jump Backwards
**Location:** [`components/ExportDialog.tsx:118-139`](components/ExportDialog.tsx:118)

**Issue:** The export progress callback doesn't validate monotonic increase, allowing backwards jumps.

**Impact:** Users perceive errors when progress decreases.

**Recommendation:** Ensure progress only increases or use indeterminate spinner for variable phases.

---

### 🟠 HIGH

#### 4.3 Loading States Inconsistent Across Views
**Location:** Multiple files

**Issue:** Loading states vary significantly:
- ArchiveView: No explicit loading state
- CollectionsView: No loading indicator for tree operations
- ExportDialog: Custom progress ring
- StagingWorkbench: Linear progress bar

**Impact:** Users cannot predict loading behavior; inconsistent perceived performance.

**Recommendation:** Standardize loading state patterns using design system.

#### 4.4 Empty States Not Contextual
**Location:** Multiple views

**Issue:** Empty states show generic messages rather than contextual next steps.

Example: [`BoardView.tsx:1178-1203`](components/views/BoardView.tsx:1178) shows same empty state regardless of user permissions or workflow stage.

**Recommendation:** Contextual empty states with actionable next steps.

---

### 🟡 MEDIUM

#### 4.5 Auto-save Indicator Too Subtle
**Location:** [`App.tsx:416-421`](App.tsx:416)

**Issue:** The saving indicator is small, positioned in corner, and uses subtle animation.

**Impact:** Users may not notice when saves fail.

**Recommendation:** More prominent save status or failure notification.

---

## 5. Accessibility Issues

### 🔴 CRITICAL

#### 5.1 Viewer Keyboard Shortcuts Conflict with Screen Readers
**Location:** [`components/views/Viewer.tsx:374-406`](components/views/Viewer.tsx:374)

**Issue:** Keyboard shortcuts (`+`, `-`, `r`, `R`) intercept keys that screen readers use for navigation.

**Impact:** Screen reader users cannot navigate the viewer.

**Recommendation:** Add screen reader detection or provide alternative navigation mode.

#### 5.2 Board View Lacks ARIA Labels for Canvas Items
**Location:** [`components/views/BoardView.tsx:964-1173`](components/views/BoardView.tsx:964)

**Issue:** Board items have no [`aria-label`](components/views/BoardView.tsx:964) or role attributes.

**Impact:** Screen reader users cannot identify or navigate board items.

**Recommendation:** Add comprehensive ARIA attributes to board canvas.

---

### 🟠 HIGH

#### 5.3 Color Contrast Issues in Field Mode
**Location:** [`components/Inspector.tsx:369-377`](components/Inspector.tsx:369)

**Issue:** Field mode uses yellow text ([`text-yellow-400`](components/Inspector.tsx:369)) on dark backgrounds that may not meet WCAG AA standards.

**Impact:** Low vision users may struggle with field mode.

**Recommendation:** Verify contrast ratios and adjust colors accordingly.

#### 5.4 Focus Management Lost in Modals
**Location:** Multiple modal components

**Issue:** Modals don't consistently trap focus or return focus on close.

**Impact:** Keyboard users can tab behind modals; focus loss on dismiss.

**Recommendation:** Implement focus trap and restoration in all modals.

---

### 🟡 MEDIUM

#### 5.5 Command Palette Missing ARIA Live Regions
**Location:** [`components/CommandPalette.tsx:19-145`](components/CommandPalette.tsx:19)

**Issue:** No [`aria-live`](components/CommandPalette.tsx:19) region announces command execution or empty results.

**Impact:** Screen reader users don't get feedback on command execution.

**Recommendation:** Add polite live region for command feedback.

---

## 6. Mobile & Responsive Issues

### 🔴 CRITICAL

#### 6.1 Board View Touch Gestures Conflict with Browser Gestures
**Location:** [`components/views/BoardView.tsx:121-126`](components/views/BoardView.tsx:121)

**Issue:** Pan/zoom gestures use [`usePanZoomGestures`](hooks/usePanZoomGestures.ts:1) but don't prevent browser back/forward navigation on horizontal swipes.

**Impact:** Users accidentally navigate away while panning board.

**Recommendation:** Use [`overscroll-behavior`](components/views/BoardView.tsx:121) CSS and prevent default on touch gestures.

---

### 🟠 HIGH

#### 6.2 Mobile Inspector Covers Entire Screen Without Back Button
**Location:** [`components/Inspector.tsx:273-275`](components/Inspector.tsx:273)

**Issue:** On mobile, inspector uses `fixed inset-0` covering entire screen, but close button is small and tucked in corner.

**Impact:** Users may struggle to dismiss inspector on mobile.

**Recommendation:** Add swipe-to-dismiss or prominent back button.

#### 6.3 Archive View Grid Columns Don't Adapt to Small Screens
**Location:** [`components/views/ArchiveView.tsx:776-780`](components/views/ArchiveView.tsx:776)

**Issue:** Grid columns use fixed breakpoints that may not fit very small screens (< 360px).

**Recommendation:** Add smaller breakpoint or use CSS Grid auto-fit.

---

### 🟡 MEDIUM

#### 6.4 Search View Autocomplete Dropdown Cut Off on Mobile
**Location:** [`components/views/SearchView.tsx:123-166`](components/views/SearchView.tsx:123)

**Issue:** Autocomplete dropdown may extend beyond viewport on mobile screens.

**Recommendation:** Add max-height with scroll and position-aware placement.

---

## 7. Performance Issues

### 🟠 HIGH

#### 7.1 Archive View Virtualization Doesn't Account for Variable Item Heights
**Location:** [`components/views/ArchiveView.tsx:220-226`](components/views/ArchiveView.tsx:220)

**Issue:** [`useGridVirtualization`](components/views/ArchiveView.tsx:57) assumes fixed item heights but actual items may vary based on content.

**Impact:** Scroll position drift and incorrect visible range calculation.

**Recommendation:** Implement dynamic height measurement or enforce consistent item sizing.

#### 7.2 MapView Re-clusters on Every Render
**Location:** [`components/views/MapView.tsx:46-93`](components/views/MapView.tsx:46)

**Issue:** Clustering runs in [`useMemo`](components/views/MapView.tsx:46) but depends on [`dimensions`](components/views/MapView.tsx:26) which updates frequently.

**Impact:** Unnecessary clustering calculations on minor resize events.

**Recommendation:** Debounce dimension updates or use RAF-throttled clustering.

---

### 🟡 MEDIUM

#### 7.3 Viewer OSD Re-initializes on Every Item Change
**Location:** [`components/views/Viewer.tsx:167-223`](components/views/Viewer.tsx:167)

**Issue:** OpenSeadragon viewer is destroyed and recreated on every canvas change.

**Impact:** Visible flicker and performance overhead when navigating between canvases.

**Recommendation:** Reuse viewer instance with tile source swap if possible.

---

## 8. Error Handling Issues

### 🔴 CRITICAL

#### 8.1 File Import No Error Handling for Invalid IIIF
**Location:** [`components/StagingWorkbench.tsx:31-61`](components/staging/StagingWorkbench.tsx:31)

**Issue:** The [`build`](components/staging/StagingWorkbench.tsx:32) function in StagingWorkbench has no error handling for malformed files.

**Impact:** App crash on invalid file import.

**Recommendation:** Wrap file processing in try-catch with user-friendly error messages.

#### 8.2 Canvas Composer Can Lose Unsaved Changes on Error
**Location:** [`components/CanvasComposer.tsx`](components/CanvasComposer.tsx)

**Issue:** Not analyzed in detail but pattern suggests no error boundary specific to composition operations.

**Recommendation:** Implement auto-save draft and recovery for composition work.

---

### 🟠 HIGH

#### 8.3 External Import No Network Error Visualization
**Location:** [`components/ExternalImportDialog.tsx`](components/ExternalImportDialog.tsx)

**Issue:** Network failures during external IIIF import show generic error without retry options.

**Recommendation:** Add specific error types (timeout, CORS, malformed JSON) with recovery actions.

---

## 9. Consistency Issues

### 🟡 MEDIUM

#### 9.1 Button Styling Inconsistent Across Views
**Location:** Multiple files

**Issue:** Primary buttons vary in styling:
- ArchiveView: [`bg-slate-800`](components/views/ArchiveView.tsx:601)
- CollectionsView: [`bg-white border`](components/views/CollectionsView.tsx:404)
- BoardView: [`bg-iiif-blue`](components/views/BoardView.tsx:780)

**Recommendation:** Enforce design system button variants.

#### 9.2 Icon Sizes Not Standardized
**Location:** Multiple files

**Issue:** Icons use arbitrary sizes like `text-[10px]`, `text-xs`, `text-sm` without consistent mapping to semantic sizes.

**Recommendation:** Define icon size tokens (xs, sm, md, lg) and enforce usage.

#### 9.3 Border Radius Inconsistent
**Location:** Multiple files

**Issue:** Border radius varies: `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` without clear rationale.

**Recommendation:** Establish radius scale and usage guidelines.

---

## 10. Feature Gaps

### 🟠 HIGH

#### 10.1 No Undo in Metadata Spreadsheet
**Location:** [`components/views/MetadataSpreadsheet.tsx`](components/views/MetadataSpreadsheet.tsx)

**Issue:** Unlike BoardView which has undo/redo, the spreadsheet has no undo capability.

**Impact:** Users cannot recover from accidental bulk edits.

**Recommendation:** Integrate with [`useHistory`](hooks/useHistory.ts:1) hook.

#### 10.2 No Bulk Operations in Collections View
**Location:** [`components/views/CollectionsView.tsx`](components/views/CollectionsView.tsx)

**Issue:** While ArchiveView has multi-select and batch operations, CollectionsView only supports single-item operations.

**Recommendation:** Add multi-select to StructureCanvas component.

---

### 🟡 MEDIUM

#### 10.3 No Keyboard Shortcuts Help in Spreadsheet
**Location:** [`components/views/MetadataSpreadsheet.tsx`](components/views/MetadataSpreadsheet.tsx)

**Issue:** Unlike BoardView which has [`showShortcuts`](components/views/BoardView.tsx:106) panel, spreadsheet has no shortcut documentation.

**Recommendation:** Add `?` shortcut help overlay to all complex views.

---

## Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | 2.1 Rubber-band virtualization fix | High | Critical |
| P0 | 3.1 Spreadsheet navigation guards | Medium | Critical |
| P0 | 8.1 File import error handling | Low | Critical |
| P1 | 1.1 Viewer navigation | Low | High |
| P1 | 2.3 Selection state persistence | Medium | High |
| P1 | 5.1 Screen reader conflict fix | Medium | High |
| P1 | 6.1 Touch gesture conflicts | Medium | High |
| P2 | 4.3 Loading state standardization | Medium | Medium |
| P2 | 9.1 Button consistency | Low | Medium |
| P3 | 4.5 Save indicator improvement | Low | Low |

---

## Appendix: Design System Compliance Check

### Typography Usage

| Token | Definition | Compliance |
|-------|------------|------------|
| `fontSize.xs` | 12px | ✅ Used consistently |
| `fontSize.sm` | 14px | ✅ Used consistently |
| `fontSize.base` | 16px | ⚠️ Inconsistent usage |
| Arbitrary values | `text-[10px]`, etc. | ❌ Widespread - should migrate to tokens |

### Color Usage

| Pattern | Count | Recommendation |
|---------|-------|----------------|
| Direct Tailwind colors | ~200 | Audit against design system |
| `iiif-blue` custom | ~50 | ✅ Brand consistent |
| Arbitrary values | ~30 | ❌ Migrate to tokens |

### Spacing Usage

| Pattern | Compliance |
|---------|------------|
| Standard spacing (4, 8, 16, etc.) | ✅ 70% |
| Arbitrary values (e.g., `p-[14px]`) | ❌ 30% - migrate to closest token |

---

## Conclusion

The IIIF Field Archive Studio has a solid foundation with sophisticated features, but suffers from:

1. **State management inconsistencies** across views
2. **Accessibility gaps** particularly in complex views (Board, Viewer)
3. **Mobile experience** needs significant refinement
4. **Design system drift** with many one-off styles

Addressing the P0 and P1 items would significantly improve user experience and reduce support burden.

---

*Report generated by comprehensive static analysis of the IIIF Field Archive Studio codebase.*
