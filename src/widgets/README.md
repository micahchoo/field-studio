# Widgets Layer (`src/widgets/`)

The widgets layer is a **composition layer** that combines organisms from multiple features into view-specific slots without owning business logic.

## Purpose

Widgets are pure composition layers that sit between **features** and **app/pages**:
- They combine organisms from multiple features
- They don't contain business logic
- They are specific to view slots (sidebar, header, toolbar)
- They follow the Atomic Design hierarchy

## Structure

```
src/widgets/
├── README.md                    # This file
├── AnnotationToolbar/           # Composes annotation + viewer molecules
│   ├── AnnotationToolbar.tsx
│   └── index.ts
├── FilterPanel/                 # Composes archive + search organisms
│   ├── FilterPanel.tsx
│   └── index.ts
└── NavigationHeader/            # Composes navigation + user context
    ├── NavigationHeader.tsx
    ├── HeaderTopBar.tsx
    ├── HeaderBreadcrumb.tsx
    ├── HeaderUserMenu.tsx
    └── index.ts
```

## Atomic Design Position

Widgets sit between **Organisms** and **Pages** in the Atomic hierarchy:

```
Pages (Routes)
└── Templates (Context providers)
    └── Widgets ← YOU ARE HERE (composition only)
        └── Organisms (domain components)
            └── Molecules (UI units)
                └── Atoms (primitives)
```

## Guidelines

### ✅ What Belongs in Widgets
- Components that compose organisms from multiple features
- View-specific layout compositions
- Cross-cutting UI concerns (e.g., annotation toolbar with metadata)
- Navigation headers, filter panels, toolbars

### ❌ What Does NOT Belong in Widgets
- Business logic (belongs in features)
- API calls (belongs in features)
- State management (belongs in features or app)
- Single-feature components (belongs in that feature)

## Example: NavigationHeader Widget

```typescript
// widgets/NavigationHeader/NavigationHeader.tsx
import { HeaderTopBar } from './HeaderTopBar';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { HeaderUserMenu } from './HeaderUserMenu';

export interface NavigationHeaderProps {
  cx: ContextualClassNames;
  fieldMode: boolean;
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  cx,
  fieldMode,
  currentMode,
  onModeChange,
}) => (
  <header className={cx.surface}>
    <HeaderTopBar fieldMode={fieldMode} />
    <HeaderBreadcrumb currentMode={currentMode} />
    <HeaderUserMenu />
  </header>
);
```

## Example: AnnotationToolbar Widget

```typescript
// widgets/AnnotationToolbar/AnnotationToolbar.tsx
import { AnnotationControls } from '@/src/features/viewer/ui/molecules';

export interface AnnotationToolbarProps {
  cx: ContextualClassNames;
  fieldMode: boolean;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  cx,
  fieldMode,
}) => (
  <div className={`flex gap-2 ${cx.surface}`}>
    <AnnotationControls cx={cx} fieldMode={fieldMode} />
  </div>
);
```

## Dependency Rules

```
widgets/* ← features/*     (widgets compose features)
widgets/* ← shared/*       (widgets can use shared UI)
features/* ← NOT widgets   (features don't import widgets)
app/* ← widgets            (app/pages compose widgets)
```

## When to Create a Widget

Create a widget when:
1. You need to combine organisms from 2+ features
2. The composition is used in multiple pages
3. The component is view-specific but feature-agnostic
4. It prevents duplication across page components

Don't create a widget when:
1. It only uses organisms from one feature (use feature/ui)
2. It contains business logic (use feature/model)
3. It's only used once (use inline in page)

## Available Widgets

| Widget | Purpose | Composes |
|--------|---------|----------|
| `NavigationHeader` | App header with nav, breadcrumb, user menu | HeaderTopBar, HeaderBreadcrumb, HeaderUserMenu |
| `AnnotationToolbar` | Toolbar for annotation tools | Viewer feature molecules |
| `FilterPanel` | Sidebar filter panel | Archive + Search feature organisms |

## Public API

Widgets don't have a central barrel export. Import directly:

```typescript
import { NavigationHeader } from '@/src/widgets/NavigationHeader';
import { AnnotationToolbar } from '@/src/widgets/AnnotationToolbar';
import { FilterPanel } from '@/src/widgets/FilterPanel';
```
