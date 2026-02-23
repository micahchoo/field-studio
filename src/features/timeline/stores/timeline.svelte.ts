/**
 * Timeline — State container (Category 2)
 *
 * Replaces useTimeline React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts.
 *
 * Temporal visualization of IIIF items grouped by date with
 * zoom levels (day/month/year).
 *
 * Usage in Svelte component:
 *   const timeline = new TimelineStore();
 *   timeline.loadFromCanvases(canvases);
 *
 *   // Reactive reads
 *   timeline.groups       // grouped items at current zoom
 *   timeline.zoomLevel    // 'day' | 'month' | 'year'
 *   timeline.hasData      // whether any items have dates
 *   timeline.totalItems   // count of dated items
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ZoomLevel = 'day' | 'month' | 'year';

export interface TimelineItem {
  id: string;
  label: string;
  date: Date;
  canvasId: string;
}

export interface TimelineGroup {
  key: string;
  date: Date;
  displayDate: string;
  items: TimelineItem[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

export class TimelineStore {
  // -- Reactive state --
  #groups = $state<TimelineGroup[]>([]);
  #zoomLevel = $state<ZoomLevel>('month');
  #selectedDate = $state<string | null>(null);
  #minDate = $state<Date | null>(null);
  #maxDate = $state<Date | null>(null);
  #totalItems = $state(0);

  // -- Non-reactive: raw items preserved for re-grouping on zoom change --
  #rawItems: TimelineItem[] = [];

  // ──────────────────────────────────────────────
  // Reactive getters
  // ──────────────────────────────────────────────

  get groups(): TimelineGroup[] { return this.#groups; }
  get zoomLevel(): ZoomLevel { return this.#zoomLevel; }
  get selectedDate(): string | null { return this.#selectedDate; }
  get minDate(): Date | null { return this.#minDate; }
  get maxDate(): Date | null { return this.#maxDate; }
  get totalItems(): number { return this.#totalItems; }
  get hasData(): boolean { return this.#totalItems > 0; }

  // ──────────────────────────────────────────────
  // Data loading — extract timeline items from canvases
  // ──────────────────────────────────────────────

  /**
   * Extract dated items from canvases with navDate.
   *
   * Pseudocode:
   *   For each canvas with a navDate field:
   *     Parse the ISO 8601 date string
   *     If valid, create a TimelineItem
   *   Store raw items for re-grouping on zoom change
   *   Calculate min/max date range
   *   Group items by current zoom level
   */
  loadFromCanvases(
    canvases: Array<{
      id: string;
      label?: string;
      navDate?: string;
    }>
  ): void {
    const items: TimelineItem[] = [];

    for (const canvas of canvases) {
      if (!canvas.navDate) continue;

      const parsed = new Date(canvas.navDate);
      // Validate: check that Date constructor produced a valid date
      if (isNaN(parsed.getTime())) continue;

      items.push({
        id: `${canvas.id}-timeline`,
        label: canvas.label || canvas.id,
        date: parsed,
        canvasId: canvas.id,
      });
    }

    // Sort by date ascending
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    this.#rawItems = items;
    this.#totalItems = items.length;

    if (items.length > 0) {
      this.#minDate = items[0].date;
      this.#maxDate = items[items.length - 1].date;
    } else {
      this.#minDate = null;
      this.#maxDate = null;
    }

    // Group by current zoom level
    this.#groups = this.#groupByZoom(items);
  }

  // ──────────────────────────────────────────────
  // Zoom level control
  // ──────────────────────────────────────────────

  /** Change zoom level and re-group items */
  setZoomLevel(level: ZoomLevel): void {
    this.#zoomLevel = level;
    this.#groups = this.#groupByZoom(this.#rawItems);
    // Clear selection when zoom changes (groups keys change)
    this.#selectedDate = null;
  }

  /** Set the selected date group key */
  setSelectedDate(date: string | null): void {
    this.#selectedDate = date;
  }

  /** Toggle selection of a date group key */
  toggleDate(date: string): void {
    this.#selectedDate = this.#selectedDate === date ? null : date;
  }

  // ──────────────────────────────────────────────
  // Display utilities
  // ──────────────────────────────────────────────

  /**
   * Suggested number of grid columns based on zoom level.
   * Finer zoom = more columns for the layout grid.
   */
  getGridColumns(): number {
    switch (this.#zoomLevel) {
      case 'day': return 7;   // week-like layout
      case 'month': return 4; // quarter-like layout
      case 'year': return 3;  // compact layout
    }
  }

  /**
   * Get the normalized position (0..1) of a date within the timeline range.
   * Used for positioning items on a linear timeline axis.
   */
  getTimelinePosition(date: Date): number {
    if (!this.#minDate || !this.#maxDate) return 0;

    const min = this.#minDate.getTime();
    const max = this.#maxDate.getTime();
    const range = max - min;

    if (range === 0) return 0.5; // Single date, center it

    return (date.getTime() - min) / range;
  }

  // ──────────────────────────────────────────────
  // Date formatting
  // ──────────────────────────────────────────────

  /**
   * Format a date for display based on the current zoom level.
   *   - year:  "2024"
   *   - month: "January 2024"
   *   - day:   "15 January 2024"
   */
  formatDisplayDate(date: Date): string {
    switch (this.#zoomLevel) {
      case 'year':
        return `${date.getFullYear()}`;
      case 'month':
        return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
      case 'day':
        return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    }
  }

  /** Format time as HH:MM */
  formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Format as short date: "15 Jan 2024" */
  formatShortDate(date: Date): string {
    return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ──────────────────────────────────────────────
  // Internal: date key generation
  // ──────────────────────────────────────────────

  /**
   * Generate a grouping key from a date based on the current zoom level.
   *   - year:  "2024"
   *   - month: "2024-01"
   *   - day:   "2024-01-15"
   */
  #getDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');

    switch (this.#zoomLevel) {
      case 'year':
        return `${y}`;
      case 'month':
        return `${y}-${m}`;
      case 'day':
        return `${y}-${m}-${d}`;
    }
  }

  // ──────────────────────────────────────────────
  // Internal: grouping engine
  // ──────────────────────────────────────────────

  /**
   * Group items by the current zoom level.
   *
   * Pseudocode:
   *   Build a map of dateKey -> TimelineItem[]
   *   For each key, create a TimelineGroup with:
   *     - key: the date key string
   *     - date: representative Date for the group
   *     - displayDate: formatted label for the group header
   *     - items: all items in this group
   *   Sort groups by date ascending
   */
  #groupByZoom(items: TimelineItem[]): TimelineGroup[] {
    if (items.length === 0) return [];

    // Accumulate items into groups by date key
    const groupMap = new Map<string, TimelineItem[]>();

    for (const item of items) {
      const key = this.#getDateKey(item.date);
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    // Convert map to sorted TimelineGroup array
    const groups: TimelineGroup[] = [];

    for (const [key, groupItems] of groupMap) {
      // Use the earliest item's date as the representative date for the group
      const representativeDate = groupItems[0].date;

      // Build a display-friendly date label for the group header
      const displayDate = this.#formatGroupDate(key, representativeDate);

      groups.push({
        key,
        date: representativeDate,
        displayDate,
        items: groupItems,
      });
    }

    // Sort groups chronologically
    groups.sort((a, b) => a.date.getTime() - b.date.getTime());

    return groups;
  }

  /**
   * Format a group's display date label based on zoom level.
   */
  #formatGroupDate(key: string, date: Date): string {
    switch (this.#zoomLevel) {
      case 'year':
        return `${date.getFullYear()}`;
      case 'month':
        return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
      case 'day': {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return `${dayName}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
      }
    }
  }
}
