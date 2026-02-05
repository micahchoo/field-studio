# Timeline Feature (`src/features/timeline/`)

Temporal visualization of IIIF items with navDate property.

## Architecture

This feature follows Atomic Design + Feature-Sliced Design principles:

```
src/features/timeline/
├── ui/organisms/
│   └── TimelineView.tsx      ← Main organism (composes molecules)
├── model/
│   └── index.ts              ← useTimeline hook + domain logic
├── index.ts                  ← Public API
└── README.md                 ← This file
```

## Organism: TimelineView

The TimelineView organism receives context via props from FieldModeTemplate:

```typescript
<FieldModeTemplate>
  {({ cx, fieldMode }) => (
    <TimelineView
      root={root}
      onSelect={handleSelect}
      cx={cx}
      fieldMode={fieldMode}
    />
  )}
</FieldModeTemplate>
```

**Key Design Decisions:**
- No `useAppSettings()` or `useContextualStyles()` calls in organism
- `cx` and `fieldMode` received via props from template
- All UI elements composed from molecules in `src/shared/ui/molecules/`
- Date calculations in `useTimeline` hook

## Model: useTimeline Hook

Encapsulates all timeline state and date logic:

```typescript
const {
  groups,
  minDate,
  maxDate,
  totalItems,
  zoomLevel,
  selectedDate,
  setZoomLevel,
  setSelectedDate,
  toggleDate,
  hasItems,
  // ...more
} = useTimeline(root);
```

**Responsibilities:**
- Extract items with navDate from IIIF tree
- Sort items chronologically
- Group by zoom level (day/month/year)
- Track selected date
- Calculate date range for minimap

## Zoom Levels

| Level | Grouping | Grid Columns |
|-------|----------|--------------|
| Day | By date (YYYY-MM-DD) | 4-6 |
| Month | By month (YYYY-MM) | 6-8 |
| Year | By year (YYYY) | 8-12 |

## Types

```typescript
type ZoomLevel = 'day' | 'month' | 'year';

interface TimelineGroup {
  date: string;
  displayDate: string;
  items: IIIFCanvas[];
}

interface TimelineState {
  groups: TimelineGroup[];
  minDate: Date | null;
  maxDate: Date | null;
  totalItems: number;
  zoomLevel: ZoomLevel;
  selectedDate: string | null;
}

interface UseTimelineReturn extends TimelineState {
  setZoomLevel: (level: ZoomLevel) => void;
  setSelectedDate: (date: string | null) => void;
  toggleDate: (date: string) => void;
  hasItems: boolean;
}
```

## Date Format Support

The timeline uses the IIIF `navDate` property which should be ISO 8601 format:

```json
{
  "navDate": "2024-01-15T10:30:00Z"
}
```

## Date Utilities

```typescript
import {
  formatDisplayDate,
  formatTime,
  formatShortDate,
  getDateKey,
  getGridColumns,
  getTimelinePosition,
} from '@/src/features/timeline';

// Format based on zoom level
const display = formatDisplayDate(date, 'month'); // "January 2024"

// Format time
const time = formatTime(date); // "10:30 AM"

// Get date key for grouping
const key = getDateKey(date, 'day'); // "2024-01-15"

// Get grid column count
const columns = getGridColumns('year'); // 12
```

## Molecules Used

| Molecule | Purpose |
|----------|---------|
| `TimelineTick` | Date header with item count |
| `EmptyState` | No dated items state |

## Public API

```typescript
// Component
export { TimelineView } from './ui/organisms/TimelineView';
export type { TimelineViewProps } from './ui/organisms/TimelineView';

// Model
export {
  useTimeline,
  formatDisplayDate,
  formatTime,
  formatShortDate,
  getDateKey,
  getGridColumns,
  getTimelinePosition,
  type ZoomLevel,
  type TimelineGroup,
  type UseTimelineReturn,
} from './model';
```

## Usage

```typescript
import { TimelineView } from '@/src/features/timeline';

<FieldModeTemplate>
  {({ cx, fieldMode }) => (
    <TimelineView
      root={root}
      onSelect={handleSelect}
      cx={cx}
      fieldMode={fieldMode}
    />
  )}
</FieldModeTemplate>
```
