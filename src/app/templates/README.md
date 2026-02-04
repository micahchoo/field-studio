# App Templates (`src/app/templates/`)

Layout wrappers that provide context to feature organisms. Templates are the bridge between the app layer and feature layer.

## Philosophy

**"Features are context-agnostic. Templates provide context."**

- Features don't import useAppSettings or useContextualStyles
- Features don't know about routing
- Templates inject cx, fieldMode, and layout structure via props/render props

## Available Templates

### FieldModeTemplate

**Responsibility:** Inject fieldMode and design tokens (cx) context

Wraps organisms with app settings context. Organisms receive `cx` and `fieldMode` via render props.

```typescript
import { FieldModeTemplate } from '@/src/app/templates';

export const ArchiveRoute = () => (
  <FieldModeTemplate>
    {({ cx, fieldMode, t, isAdvanced }) => (
      <ArchiveView
        cx={cx}
        fieldMode={fieldMode}
        t={t}
        isAdvanced={isAdvanced}
        // ... other props
      />
    )}
  </FieldModeTemplate>
);
```

**Provides:**
- `cx: ContextualClassNames` — CSS class names for current theme
  - `cx.surface` — Background color (light/dark)
  - `cx.text` — Text color (light/dark)
  - `cx.border` — Border color
  - `cx.input` — Input field styles
  - `cx.button` — Button styles
  - Plus 7+ more tokens
- `fieldMode: boolean` — Is high-contrast field mode active?
- `t: (key: string) => string` — Terminology function (maps IIIF types to user-facing labels based on abstraction level)
- `isAdvanced: boolean` — Progressive disclosure gate (show advanced UI when true)

**No Props:**
- FieldModeTemplate reads settings internally via `useAppSettings()`
- No props to pass — it's a context provider

**When to use:**
- Wrapping any view that needs theme-aware styling
- When organisms need access to design tokens
- For pages that should respect fieldMode toggle

### BaseTemplate

**Responsibility:** Provide overall layout structure (sidebar, header, main)

Wraps the entire app or major sections with consistent layout.

```typescript
import { BaseTemplate } from '@/src/app/templates';

export const MainApp = () => (
  <BaseTemplate
    showSidebar={showSidebar}
    onSidebarToggle={() => setShowSidebar(!showSidebar)}
    headerContent={<AppHeader />}
    sidebarContent={<Sidebar />}
  >
    {/* Main content routed here */}
  </BaseTemplate>
);
```

**Props:**
- `children: ReactNode` — Main content
- `showSidebar?: boolean` — Show/hide sidebar
- `onSidebarToggle?: () => void` — Sidebar toggle callback
- `headerContent?: ReactNode` — Custom header (optional)
- `sidebarContent?: ReactNode` — Custom sidebar (optional)

**Structure:**
```
┌─────────────────────────────────┐
│ Header                          │
├──────────┬──────────────────────┤
│ Sidebar  │ Main (children)      │
│          │                      │
│          │ Your content here    │
│          │                      │
└──────────┴──────────────────────┘
```

**When to use:**
- Wrapping the root app or major sections
- When you need sidebar + header layout
- For multi-pane views

## Composition Pattern

Templates are often composed together:

```typescript
export const ArchiveRoute = () => (
  <BaseTemplate
    showSidebar={showSidebar}
    onSidebarToggle={handleToggleSidebar}
    sidebarContent={<Sidebar />}
  >
    {/* BaseTemplate provides layout; FieldModeTemplate provides context */}
    <FieldModeTemplate>
      {({ cx, fieldMode, t, isAdvanced }) => (
        <ArchiveView cx={cx} fieldMode={fieldMode} t={t} isAdvanced={isAdvanced} />
      )}
    </FieldModeTemplate>
  </BaseTemplate>
);
```

## Usage Guide

### For Organisms

**Organisms receive context via props, not via hooks:**

```typescript
// ✅ CORRECT - Organism receives context as props
export const ArchiveView = ({ cx, fieldMode, t, isAdvanced, root }) => {
  return (
    <div className={cx.surface}>
      {/* Use cx for styling */}
      {/* Use fieldMode for conditional logic */}
      {/* Use t for terminology, isAdvanced for progressive disclosure */}
    </div>
  );
};

interface ArchiveViewProps {
  cx: ContextualClassNames;
  fieldMode: boolean;
  t: (key: string) => string;
  isAdvanced: boolean;
  root: IIIFItem;
}
```

**Organisms do NOT call context hooks:**

```typescript
// ❌ WRONG - Organism shouldn't call hooks
export const ArchiveView = ({ root }) => {
  const cx = useContextualStyles(); // WRONG!
  const { settings } = useAppSettings(); // WRONG!

  return (
    <div className={cx.surface}>
      {/* ... */}
    </div>
  );
};
```

### For Routes/Views

**Routes compose templates and organisms:**

```typescript
export const ArchivePage = () => {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <BaseTemplate
      showSidebar={showSidebar}
      onSidebarToggle={() => setShowSidebar(!showSidebar)}
      sidebarContent={<Sidebar />}
    >
      <FieldModeTemplate>
        {({ cx, fieldMode, t, isAdvanced }) => (
          <ArchiveView
            cx={cx}
            fieldMode={fieldMode}
            t={t}
            isAdvanced={isAdvanced}
            // ... entity data
          />
        )}
      </FieldModeTemplate>
    </BaseTemplate>
  );
};
```

## Rules

✅ **Templates CAN:**
- Provide context via props or render props
- Manage layout structure
- Call context hooks (useAppSettings, useContextualStyles, etc.)
- Compose other templates

❌ **Templates CANNOT:**
- Contain UI business logic
- Know about feature-specific state
- Import from features
- Manage global app state

## Template Hierarchy

```
App (with AppProviders)
  └── BaseTemplate (layout)
      └── FieldModeTemplate (context)
          └── Organisms (ArchiveView, etc.)
              └── Molecules (SearchField, etc.)
                  └── Atoms (Button, etc.)
```

## Reviewer Checklist

Before merging changes to templates:

- [ ] Render-prop callback destructures all four context values: `{ cx, fieldMode, t, isAdvanced }`
- [ ] All four values are forwarded to the organism as props
- [ ] Template does not import from `features/` — organisms are passed in by routes
- [ ] No feature-specific state or logic lives inside the template
- [ ] Hook calls (`useAppSettings`, `useContextualStyles`, `useTerminology`, `useAbstractionLevel`) exist only here — never in organisms or molecules below

## See Also

- `../providers/` — Context provider setup
- `../routes/` — Route dispatcher
- `../README.md` — App layer overview
- `../../features/archive/` — Feature example
