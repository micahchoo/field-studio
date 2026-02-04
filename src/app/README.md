# App Layer (`src/app/`)

The **app layer** is the root of the application. It handles:
- **Context providers** (fieldMode, settings, intent tracking)
- **Templates** (layout wrappers that provide context to views)
- **Routing** (view dispatcher)
- **Global state** (nothing else should reach here)

## Philosophy

**"Features are context-agnostic. App provides context."**

- Features don't know about `fieldMode`, `settings`, `auth` — these are context
- Features don't know about routing — app dispatches to them
- Features don't know about global state — they use entity layer
- Organisms receive context via props from templates, not via hooks

## Structure

```
src/app/
├── templates/
│   ├── FieldModeTemplate.tsx  ← Provides cx, fieldMode to child organisms
│   ├── BaseTemplate.tsx       ← Base layout (header, sidebar, main)
│   └── README.md
├── providers/
│   ├── index.ts               ← Consolidate all context providers
│   └── README.md
├── routes/
│   ├── ViewRouter.tsx         ← Main view dispatcher
│   └── README.md
└── README.md                  (this file)
```

## Templates

### FieldModeTemplate
Injects fieldMode context and design tokens into child organisms:

```typescript
export const FieldModeTemplate = ({ children }) => {
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);
  const t = useTerminology();
  const isAdvanced = useAbstractionLevel() === 'advanced';

  return children({ cx, fieldMode: settings.fieldMode, t, isAdvanced });
};

// Usage:
<FieldModeTemplate>
  {({ cx, fieldMode, t, isAdvanced }) => (
    <ArchiveView
      root={root}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
      isAdvanced={isAdvanced}
    />
  )}
</FieldModeTemplate>
```

### BaseTemplate
Provides global layout (sidebar, header, main area):

```typescript
export const BaseTemplate = ({ children }) => (
  <div className="flex h-screen">
    <Sidebar />
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  </div>
);
```

## Providers

Consolidate all context providers in one place:

```typescript
// src/app/providers/index.ts
export const AppProviders = ({ children }) => (
  <VaultProvider>
    <UserIntentProvider>
      <ResourceContextProvider>
        <ToastProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </ResourceContextProvider>
    </UserIntentProvider>
  </VaultProvider>
);
```

## Routing

The main view dispatcher:

```typescript
export const ViewRouter = ({ currentMode, selectedId }) => {
  switch (currentMode) {
    case 'archive':
      return (
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <ArchiveView cx={cx} fieldMode={fieldMode} t={t} isAdvanced={isAdvanced} />
          )}
        </FieldModeTemplate>
      );
    case 'board':
      return (
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <BoardView cx={cx} fieldMode={fieldMode} t={t} isAdvanced={isAdvanced} />
          )}
        </FieldModeTemplate>
      );
    case 'metadata':
      return (
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <MetadataView cx={cx} fieldMode={fieldMode} t={t} isAdvanced={isAdvanced} />
          )}
        </FieldModeTemplate>
      );
    // ...
  }
};
```

## Rules

✅ **App layer DOES:**
- Provide context (fieldMode, settings, auth)
- Handle routing
- Consolidate providers
- Manage global UI state (current view, selected id)

❌ **App layer does NOT:**
- Contain UI components (that's features)
- Contain business logic (that's entities/services)
- Import from features directly (use ViewRouter)
- Manage data (that's vault)

## Dependency Flow

```
App.tsx
  ├── <AppProviders>             (VaultProvider, UserIntentProvider, etc)
  │   ├── <BaseTemplate>         (sidebar, header, main)
  │   │   └── <ViewRouter>       (dispatches to features)
  │   │       └── <FieldModeTemplate>
  │   │           └── <ArchiveView /> (organism)
  │   │               ├── <SearchField /> (molecule)
  │   │               └── <ArchiveGrid /> (sub-organism)
```

**Unidirectional:** App → Templates → Features → Molecules → Atoms

## Next Steps

See individual README files:
- `templates/README.md` — Template specifications
- `providers/README.md` — Provider consolidation
- `routes/README.md` — Router implementation
