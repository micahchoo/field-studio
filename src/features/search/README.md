# Search Feature (`src/features/search/`)

Global search across IIIF items with filtering, autocomplete, and result navigation.

## Architecture

This feature follows Atomic Design + Feature-Sliced Design principles:

```
src/features/search/
├── ui/organisms/
│   └── SearchView.tsx        ← Main organism (composes molecules)
├── model/
│   └── index.ts              ← useSearch hook + domain logic
├── index.ts                  ← Public API
└── README.md                 ← This file
```

## Organism: SearchView

The SearchView organism receives context via props from FieldModeTemplate:

```typescript
<FieldModeTemplate>
  {({ cx, fieldMode, t }) => (
    <SearchView
      root={root}
      onSelect={handleSelect}
      onRevealMap={handleRevealMap}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
    />
  )}
</FieldModeTemplate>
```

**Key Design Decisions:**
- No `useAppSettings()` or `useContextualStyles()` calls in organism
- `cx` and `fieldMode` received via props from template
- `t` (terminology) received via props from template
- All UI elements composed from molecules in `src/shared/ui/molecules/`

## Model: useSearch Hook

Encapsulates all search state and logic:

```typescript
const {
  query,
  results,
  filter,
  indexing,
  autocompleteResults,
  autocompleteIndex,
  showAutocomplete,
  recentSearches,
  // Actions
  setQuery,
  setFilter,
  selectAutocomplete,
  navigateAutocomplete,
  closeAutocomplete,
  clearQuery,
  clearRecentSearches,
} = useSearch(root);
```

**Responsibilities:**
- Index building when root changes
- Debounced search execution (300ms)
- Autocomplete suggestions
- Keyboard navigation
- Recent searches management

## Search Filters

```typescript
type SearchFilter = 'All' | 'Manifest' | 'Canvas' | 'Annotation';
```

- **All**: Search across all IIIF resource types
- **Manifest**: Search manifest labels and metadata only
- **Canvas**: Search canvas labels and metadata only
- **Annotation**: Search annotation content only

## Molecules Used

| Molecule | Purpose |
|----------|---------|
| `SearchField` | Main search input with clear button |
| `FacetPill` | Filter pills (All, Manifest, Canvas, Annotation) |
| `ResultCard` | Individual search result display |
| `EmptyState` | Empty states (no results, initial state) |
| `LoadingState` | Indexing indicator |

## Types

```typescript
interface SearchState {
  query: string;
  results: SearchResult[];
  filter: SearchFilter;
  indexing: boolean;
  autocompleteResults: AutocompleteResult[];
  autocompleteIndex: number;
  showAutocomplete: boolean;
}

interface UseSearchReturn extends SearchState {
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilter) => void;
  selectAutocomplete: (value: string) => void;
  navigateAutocomplete: (direction: 'up' | 'down') => void;
  closeAutocomplete: () => void;
  clearQuery: () => void;
  clearRecentSearches: () => void;
  recentSearches: string[];
}
```

## Public API

```typescript
// Component
export { SearchView } from './ui/organisms/SearchView';
export type { SearchViewProps } from './ui/organisms/SearchView';

// Model
export {
  useSearch,
  getResultCountText,
  shouldSearch,
  type SearchFilter,
  type SearchState,
  type UseSearchReturn,
} from './model';
```

## Usage

```typescript
import { SearchView } from '@/src/features/search';

<FieldModeTemplate>
  {({ cx, fieldMode, t }) => (
    <SearchView
      root={root}
      onSelect={handleSelect}
      onRevealMap={handleRevealMap}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
    />
  )}
</FieldModeTemplate>
```

## Future Decomposition

The following could be extracted to feature-specific molecules:

1. **SearchAutocomplete** - The autocomplete dropdown could become a molecule
2. **SearchFilters** - Filter pill group could be a molecule
3. **SearchResultsList** - Results list with virtualization for large result sets

These are currently inline because they're only used within SearchView. If reused
(e.g., in a sidebar search widget), extract to `ui/molecules/`.
