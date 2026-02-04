# App Routes (`src/app/routes/`)

Route dispatcher that maps app modes to feature views. Routes are wrapped with templates and context providers.

## ViewRouter

**Responsibility:** Route requests to appropriate feature based on app mode

Maps `currentMode` (archive, boards, metadata, etc.) to the correct view component.

```typescript
import { ViewRouter } from '@/src/app/routes';

export const App = () => {
  const [mode, setMode] = useState('archive');
  const [selectedId, setSelectedId] = useState(null);

  return (
    <ViewRouter
      currentMode={mode}
      selectedId={selectedId}
      root={root}
      showSidebar={showSidebar}
      onModeChange={setMode}
      onSelect={setSelectedId}
      onSidebarToggle={toggleSidebar}
    />
  );
};
```

## Usage

### Minimal Setup

```typescript
import { ViewRouter } from '@/src/app/routes';
import { AppProviders } from '@/src/app/providers';

export default function App() {
  const [mode, setMode] = useState<AppMode>('archive');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <AppProviders>
      <ViewRouter
        currentMode={mode}
        selectedId={selectedId}
        root={root} // From vault or loaded state
        showSidebar={showSidebar}
        onModeChange={setMode}
        onSelect={setSelectedId}
        onSidebarToggle={() => setShowSidebar(!showSidebar)}
        sidebarContent={<Sidebar />}
        headerContent={<Header />}
      />
    </AppProviders>
  );
}
```

## Supported Modes

Routes dispatch to different views based on `currentMode`:

| Mode | Feature | Phase | Status |
|------|---------|-------|--------|
| `archive` | Browse/organize collections | 4 | TBD |
| `boards` | Board layout design | 4 | TBD |
| `metadata` | Edit metadata | 4 | TBD |
| `staging` | Two-pane import workbench | 4 | TBD |
| `search` | Full-text search | Future | - |
| `viewer` | IIIF viewer | Future | - |
| `collections` | Structure/hierarchy | Future | - |

## Implementation Pattern (Phase 4+)

When features are implemented, routes follow this pattern:

```typescript
export const ViewRouter: React.FC<ViewRouterProps> = ({
  currentMode,
  selectedId,
  root,
  // ... other props
}) => {
  return (
    <BaseTemplate showSidebar={showSidebar} onSidebarToggle={onSidebarToggle}>
      <FieldModeTemplate>
        {({ cx, fieldMode, t, isAdvanced }) => {
          switch (currentMode) {
            case 'archive':
              return (
                <ArchiveView
                  root={root}
                  selectedId={selectedId}
                  cx={cx}
                  fieldMode={fieldMode}
                  t={t}
                  isAdvanced={isAdvanced}
                  onSelect={onSelect}
                />
              );

            case 'boards':
              return (
                <BoardDesignView
                  root={root}
                  selectedId={selectedId}
                  cx={cx}
                  fieldMode={fieldMode}
                  t={t}
                  isAdvanced={isAdvanced}
                  onUpdate={onUpdate}
                />
              );

            // ... more cases

            default:
              return <div>Unknown mode: {currentMode}</div>;
          }
        }}
      </FieldModeTemplate>
    </BaseTemplate>
  );
};
```

## Strangler Fig Pattern

During Phase 4 implementation:

1. **Current state:** ViewRouter wraps old `components/ViewRouter`
2. **Implementation:** Add new feature imports (ArchiveView, BoardView, etc.)
3. **Switchover:** Update case statements to use new feature views
4. **Cleanup:** Delete old components once all routes are migrated

## Rules

✅ **Routes CAN:**
- Map modes to views
- Use templates for layout/context
- Compose feature organisms
- Handle route-specific logic

❌ **Routes CANNOT:**
- Contain business logic
- Know about feature internals
- Manage entity state (use vault)
- Access other routes directly

## See Also

- `../templates/` — Layout templates
- `../providers/` — Context providers
- `../../entities/` — Domain models
- `../../features/` — Feature implementations
