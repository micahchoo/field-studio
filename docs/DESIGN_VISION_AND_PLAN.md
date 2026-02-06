# Field Studio - Design Vision & Implementation Plan

## Executive Summary

Field Studio is a local-first, browser-based IIIF archive workbench that bridges the gap between messy field data and structured archival objects. This document provides a comprehensive analysis of the current state and a detailed vision for the ideal look, feel, and user experience.

---

## 1. Current State Analysis — Critical Assessment

### 1.1 Architecture Strengths (Technical Excellence, UX Failure)

The codebase demonstrates sophisticated architectural decisions **that users will never see or appreciate**:

| Aspect | Implementation | Quality |
|--------|---------------|---------|
| **Component Architecture** | Atomic Design (atoms → molecules → organisms → widgets) | ⭐⭐⭐⭐⭐ |
| **State Management** | Feature-based stores with entity layer | ⭐⭐⭐⭐⭐ |
| **Design System** | Centralized tokens in [`src/shared/config/tokens.ts`](src/shared/config/tokens.ts) | ⭐⭐⭐⭐ |
| **Theming** | FieldModeTemplate with contextual styles | ⭐⭐⭐⭐ |
| **IIIF Compliance** | Native Presentation API 3.0 + Image API | ⭐⭐⭐⭐⭐ |
| **Accessibility** | Skip links, keyboard navigation, ARIA patterns | ⭐⭐⭐⭐ |

**⚠️ CRITICAL CAVEAT:** Technical excellence does not translate to user experience. The UI exposes the underlying IIIF data model directly to users, creating a steep learning curve that most will abandon before crossing.

### 1.2 Visual Design Inventory — What's Actually Wrong

#### Color Palette (from screenshots)
```
Primary:    #0066CC (Blue - actions, links, active states)
Surface:    #0F172A (Dark sidebar)
Background: #F8FAFC (Light content area)
Card:       #FFFFFF (White cards)
Border:     #E2E8F0 (Subtle borders)
Text:       #1E293B (Primary text)
Muted:      #64748B (Secondary text)
Accent:     #10B981 (Success states)
Warning:    #F59E0B (Warning states)
Danger:     #EF4444 (Error states)
```

#### Typography Scale
- **Headings**: Inter/System sans-serif, bold weight
- **Body**: Regular weight, 14-16px base
- **Labels**: Uppercase, small size, muted color
- **Monospace**: For IDs and technical fields

### 1.3 Current UI Patterns

| Pattern | Location | Status |
|---------|----------|--------|
| Welcome Modal | `components/` (legacy) | Good foundation |
| Complexity Toggle | Left sidebar | Functional |
| Archive Grid | [`features/archive/ui/organisms/`](src/features/archive/ui/organisms/) | Solid |
| Structure Tree | [`features/structure-view/`](src/features/structure-view/) | Good |
| Staging Area | [`features/staging/`](src/features/staging/) | Two-pane layout |
| Metadata Editor | Spreadsheet view | Functional |
| Board Canvas | [`features/board-design/`](src/features/board-design/) | Empty state shown |
| Global Search | [`features/search/`](src/features/search/) | Building index |

---

## 2. Ideal Look & Feel Vision

### 2.1 Design Philosophy

**"A Professional Studio for Field Researchers"**

The ideal Field Studio should feel like:
- A professional creative tool (Figma, Lightroom)
- A research workspace (Zotero, Obsidian)
- A museum/archive interface (elegant, respectful)

### 2.2 Visual Direction

#### Aesthetic Keywords
- **Focused**: Minimize chrome, maximize content
- **Trustworthy**: Stable, predictable, professional
- **Powerful**: Reveals depth progressively
- **Respectful**: Content (cultural heritage) is primary

#### Lighting & Depth
```
Current: Flat design with minimal shadows
Ideal:   Subtle elevation system

Elevation Levels:
- Level 0: Background canvas
- Level 1: Cards (shadow-sm)
- Level 2: Popovers, dropdowns (shadow-md)
- Level 3: Modals, dialogs (shadow-lg)
- Level 4: Toasts, notifications (shadow-xl + blur)
```

### 2.3 Core UI Components Vision

#### Sidebar Navigation
```
Current: Dark sidebar with icon+text items
Ideal:  
├── Collapsible sections (Archive, Organize, Analyze)
├── Visual hierarchy with indentation
├── Contextual actions on hover
├── Badge counts for items
├── Recent items section
└── Quick filters
```

**Implementation**: `src/widgets/NavigationSidebar/`

#### Archive Grid
```
Current: Basic grid with thumbnails
Ideal:
├── Masonry layout option
├── Size slider (compact/comfortable)
├── Metadata overlay on hover
├── Multi-select with rubberband
├── Empty state with CTA
├── Infinite scroll with virtualization
└── View presets (gallery/filmstrip/list)
```

**Implementation**: [`src/features/archive/ui/organisms/ArchiveGrid.tsx`](src/features/archive/ui/organisms/ArchiveGrid.tsx)

#### Structure Tree
```
Current: Basic tree with expand/collapse
Ideal:
├── Inline editing of labels
├── Drag handles for reordering
├── Drop zones with visual feedback
├── Breadcrumb integration
├── Quick actions (add, delete, duplicate)
├── Search/filter within tree
└── Multi-select for batch operations
```

**Implementation**: [`src/features/structure-view/ui/organisms/StructureTreeView.tsx`](src/features/structure-view/ui/organisms/StructureTreeView.tsx)

#### Metadata Editor
```
Current: Spreadsheet table view
Ideal:
├── Dual-pane (list + form)
├── Field type icons
├── Validation inline
├── Batch edit mode
├── Template application
├── History/undo per field
└── AI-assisted suggestions
```

**Implementation**: [`src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx`](src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx)

#### Board Design Canvas
```
Current: Empty canvas with prompt
Ideal:
├── Infinite canvas with zoom
├── Card-based items
├── Connection lines (curved)
├── Mini-map navigator
├── Layer/z-index control
├── Presentation mode
└── Export to IIIF Manifest
```

**Implementation**: `src/features/board-design/ui/organisms/BoardCanvas.tsx`

---

## 3. Implementation Plan

### Phase 1: Design System Foundation

#### 3.1 Expand Design Tokens
**File**: [`src/shared/config/tokens.ts`](src/shared/config/tokens.ts)

Add tokens for:
```typescript
// Shadow elevation system
export const ELEVATION = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
} as const;

// Animation timing
export const ANIMATION = {
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Z-index scale
export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
} as const;
```

#### 3.2 Create New Atom Components
**Location**: [`src/shared/ui/atoms/`](src/shared/ui/atoms/)

| Component | Purpose | Priority |
|-----------|---------|----------|
| `Badge.tsx` | Status indicators, counts | High |
| `Avatar.tsx` | User/project avatars | Medium |
| `Skeleton.tsx` | Loading states | High |
| `Switch.tsx` | Toggle controls | High |
| `Slider.tsx` | Range inputs (grid size) | Medium |
| `Progress.tsx` | Import/processing progress | High |
| `Separator.tsx` | Visual dividers | Medium |
| `Tooltip.tsx` | Contextual help | High |
| `ScrollArea.tsx` | Custom scrollbars | Medium |

#### 3.3 Enhance Molecule Components
**Location**: [`src/shared/ui/molecules/`](src/shared/ui/molecules/)

| Component | Enhancement | File |
|-----------|-------------|------|
| `EmptyState.tsx` | Add illustration support, CTA variants | ✅ Exists |
| `LoadingState.tsx` | Skeleton variants, progress indicators | ✅ Exists |
| `ContextMenu.tsx` | Nested menus, keyboard nav, icons | ✅ Exists |
| `Toolbar.tsx` | Overflow handling, grouping | ✅ Exists |
| `SelectionToolbar.tsx` | Bulk actions, count display | ✅ Exists |

### Phase 2: Feature Enhancements

#### 2.1 Archive View Improvements
**Files**:
- [`src/features/archive/ui/organisms/ArchiveView.tsx`](src/features/archive/ui/organisms/ArchiveView.tsx)
- [`src/features/archive/ui/organisms/ArchiveGrid.tsx`](src/features/archive/ui/organisms/ArchiveGrid.tsx)
- [`src/features/archive/ui/organisms/ArchiveHeader.tsx`](src/features/archive/ui/organisms/ArchiveHeader.tsx)

**Changes**:
```typescript
// Add to ArchiveViewProps
interface ArchiveViewProps {
  // ... existing props
  
  // New props
  viewDensity?: 'compact' | 'comfortable' | 'spacious';
  onDensityChange?: (density: ViewDensity) => void;
  sortOptions?: SortOption[];
  groupBy?: 'date' | 'type' | 'location' | 'none';
}
```

#### 2.2 Structure View Enhancements
**Files**:
- [`src/features/structure-view/ui/organisms/StructureTreeView.tsx`](src/features/structure-view/ui/organisms/StructureTreeView.tsx)
- [`src/features/structure-view/ui/molecules/TreeNodeItem.tsx`](src/features/structure-view/ui/molecules/TreeNodeItem.tsx)

**Features to Add**:
- Inline rename on double-click
- Drag preview with item count
- Drop indicators (before/after/inside)
- Quick action buttons on hover
- Virtual scrolling for large trees

#### 2.3 Board Design Canvas
**Files**:
- `src/features/board-design/ui/organisms/BoardCanvas.tsx`
- [`src/features/board-design/hooks/useCanvasDrag.ts`](src/features/board-design/hooks/useCanvasDrag.ts)

**Features to Add**:
- Pan/zoom with mouse wheel
- Selection box (rubberband)
- Snap-to-grid option
- Connection routing algorithm
- Card templates/presets

### Phase 3: Navigation & Layout

#### 3.1 Enhanced Sidebar
**New File**: `src/widgets/Sidebar/Sidebar.tsx`

```typescript
interface SidebarProps {
  sections: SidebarSection[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  footer?: React.ReactNode;
}

interface SidebarSection {
  id: string;
  label: string;
  icon?: string;
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  shortcut?: string;
  children?: SidebarItem[];
}
```

#### 3.2 Command Palette
**New File**: `src/widgets/CommandPalette/CommandPalette.tsx`

Features:
- Quick navigation between views
- Command search
- Recent actions
- Keyboard shortcuts display
- Contextual commands

#### 3.3 Breadcrumb Enhancement
**File**: [`src/widgets/NavigationHeader/HeaderBreadcrumb.tsx`](src/widgets/NavigationHeader/HeaderBreadcrumb.tsx)

Add:
- Dropdown for sibling navigation
- Home/root quick access
- Collapsible middle items for deep paths
- Drag-and-drop reordering

### Phase 4: Polish & Micro-interactions

#### 4.1 Animation System
**New File**: `src/shared/ui/animations/index.ts`

```typescript
export const transitions = {
  fade: {
    enter: 'transition-opacity duration-200',
    enterFrom: 'opacity-0',
    enterTo: 'opacity-100',
  },
  slideUp: {
    enter: 'transition-all duration-250',
    enterFrom: 'opacity-0 translate-y-4',
    enterTo: 'opacity-100 translate-y-0',
  },
  scale: {
    enter: 'transition-all duration-200',
    enterFrom: 'opacity-0 scale-95',
    enterTo: 'opacity-100 scale-100',
  },
};
```

#### 4.2 Empty States
**File**: [`src/shared/ui/molecules/EmptyState.tsx`](src/shared/ui/molecules/EmptyState.tsx)

Variants needed:
- Initial welcome (no data)
- Search no results
- Filter no matches
- Error/retry state
- Loading placeholder

#### 4.3 Toast Notifications
**File**: `src/widgets/Toast/Toast.tsx`

Features:
- Stacked toasts
- Progress indicators
- Action buttons
- Persistent vs. auto-dismiss
- Position options

---

## 4. File-by-File Implementation Reference

### Critical Files to Modify

| File | Current State | Target State | Effort |
|------|--------------|--------------|--------|
| [`src/shared/config/tokens.ts`](src/shared/config/tokens.ts) | Basic tokens | Complete design system | Medium |
| [`src/shared/ui/atoms/index.ts`](src/shared/ui/atoms/index.ts) | 5 atoms | 15+ atoms | Medium |
| [`src/features/archive/ui/organisms/ArchiveGrid.tsx`](src/features/archive/ui/organisms/ArchiveGrid.tsx) | Basic grid | Masonry + density | High |
| [`src/features/structure-view/ui/organisms/StructureTreeView.tsx`](src/features/structure-view/ui/organisms/StructureTreeView.tsx) | Tree view | Editable + DnD | High |
| [`src/widgets/NavigationHeader/NavigationHeader.tsx`](src/widgets/NavigationHeader/NavigationHeader.tsx) | Header widget | Enhanced nav | Medium |
| [`src/app/templates/FieldModeTemplate.tsx`](src/app/templates/FieldModeTemplate.tsx) | Context provider | Enhanced theming | Low |

### New Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `src/shared/ui/atoms/Skeleton.tsx` | Loading skeletons | High |
| `src/shared/ui/atoms/Tooltip.tsx` | Contextual help | High |
| `src/shared/ui/atoms/Badge.tsx` | Status/count badges | High |
| `src/widgets/Sidebar/Sidebar.tsx` | Main navigation | High |
| `src/widgets/CommandPalette/CommandPalette.tsx` | Quick actions | Medium |
| `src/widgets/Toast/Toast.tsx` | Notifications | Medium |
| `src/features/board-design/ui/organisms/BoardCanvas.tsx` | Canvas view | High |

---

## 5. UX Audit Findings

### 5.1 Strengths to Preserve

1. **Three-tier complexity system** - Simple/Standard/Advanced is excellent UX
2. **Local-first approach** - Clear privacy/security value proposition
3. **IIIF-native architecture** - Standards compliance is a differentiator
4. **Atomic design structure** - Maintainable, scalable component system
5. **Contextual help** - "Press ? anytime for help" is good pattern

### 5.2 Areas for Improvement

| Issue | Severity | Solution |
|-------|----------|----------|
| Inconsistent empty states | Medium | Standardize EmptyState component |
| No loading skeletons | Medium | Add Skeleton atoms |
| Limited visual feedback | Medium | Add micro-interactions |
| Sidebar lacks organization | Low | Group into collapsible sections |
| No command palette | Low | Add Cmd+K navigation |
| Board canvas is empty | High | Add sample content/tutorial |

### 5.3 Accessibility Gaps

- Missing focus indicators in some areas
- No reduced motion preference support
- Color contrast could be stronger in dark mode
- Missing ARIA live regions for dynamic content

---

## 6. Design Principles

### 6.1 Core Principles

1. **Content First**: The cultural heritage content is the hero
2. **Progressive Disclosure**: Simple by default, powerful when needed
3. **Predictable Patterns**: Use familiar UX conventions
4. **Respectful Tone**: Professional, not playful
5. **Performance Matters**: Perceived speed > actual speed

### 6.2 Interaction Guidelines

| Interaction | Pattern |
|-------------|---------|
| Primary action | Filled button, primary color |
| Secondary action | Outlined button |
| Destructive action | Red filled button with confirmation |
| Selection | Checkboxes (multi), radio (single) |
| Navigation | Left sidebar + top breadcrumb |
| Search | Top-right, always accessible |
| Help | Contextual tooltips + ? shortcut |
| Feedback | Toast notifications |

### 6.3 Responsive Strategy

```
Desktop (1280px+): Full sidebar, multi-pane layouts
Tablet (768px-1279px): Collapsible sidebar, simplified grids
Mobile (<768px): Bottom navigation, single-column views
```

---

## 7. Success Metrics

### 7.1 UX Metrics

- Task completion rate (import → organize → export)
- Time to first archive
- Feature discovery rate
- Help/documentation usage
- Error recovery success

### 7.2 Technical Metrics

- First contentful paint < 1.5s
- Time to interactive < 3s
- Lighthouse accessibility score > 95
- Component test coverage > 80%

---

## 8. Appendix: Reference Implementations

### 8.1 Similar Tools for Inspiration

| Tool | Element to Adapt |
|------|------------------|
| **Adobe Lightroom** | Grid density controls, metadata panels |
| **Figma** | Canvas navigation, layer tree |
| **Obsidian** | Graph view, linked navigation |
| **Zotero** | Collection organization, metadata editing |
| **Canopy IIIF** | IIIF viewer patterns |

### 8.2 IIIF Design Resources

- [IIIF Design Patterns](https://iiif.io/)
- [Canopy IIIF](https://canopy-iiif.vercel.app/) - Reference viewer
- [Universal Viewer](https://universalviewer.io/) - Layout patterns

---

## Conclusion

Field Studio has a strong architectural foundation with its Atomic Design system and IIIF-native approach. The path to the ideal look and feel involves:

1. **Expanding the design token system** for consistency
2. **Creating missing atom/molecule components**
3. **Enhancing key feature views** (archive grid, structure tree, board canvas)
4. **Adding navigation improvements** (command palette, enhanced sidebar)
5. **Polishing with animations and micro-interactions**

The goal is a professional, focused tool that respects the cultural heritage content while providing powerful organizational capabilities.

---

*Document Version: 1.0*
*Last Updated: 2026-02-05*
*Status: Planning Phase*
