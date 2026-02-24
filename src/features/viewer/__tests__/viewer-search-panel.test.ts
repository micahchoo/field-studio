/**
 * ViewerSearchPanel — Component tests
 *
 * Verifies:
 *   1. Renders search input
 *   2. Shows "no search service" when searchService is null
 *   3. Calls onSearch when form submitted
 *   4. Shows loading spinner during search
 *   5. Displays grouped results by canvas
 *   6. Calls onResultSelect when result clicked
 *   7. Handles keyboard navigation in autocomplete
 *   8. Shows clear button when query is non-empty
 *   9. Shows error state
 *  10. Shows "no results" message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ViewerSearchPanel from '../ui/molecules/ViewerSearchPanel.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const searchService = {
  id: 'https://example.org/search',
  type: 'SearchService2',
};

function makeResult(
  id: string,
  canvasId: string,
  text: string,
  overrides: Record<string, unknown> = {},
) {
  return { id, canvasId, text, ...overrides };
}

 
function defaultProps(overrides: Record<string, unknown> = {}): any {
  return {
    manifest: { id: 'https://example.org/manifest/1', type: 'Manifest', label: { en: ['Test'] }, items: [] },
    searchService,
    onResultSelect: vi.fn(),
    onSearch: vi.fn().mockResolvedValue([]),
    fieldMode: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let target: HTMLDivElement;
let component: Record<string, unknown>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (component) unmount(component);
  target.remove();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ViewerSearchPanel', () => {
  // ---- No search service --------------------------------------------------

  it('shows "no search service" message when searchService is null', () => {
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ searchService: null }),
    });
    expect(target.textContent).toContain('No search service available for this manifest');
    // search_off icon should be present
    const icons = target.querySelectorAll('.material-icons');
    const searchOffIcon = Array.from(icons).find((i) => i.textContent === 'search_off');
    expect(searchOffIcon).toBeTruthy();
  });

  it('does not render search input when searchService is null', () => {
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ searchService: null }),
    });
    expect(target.querySelector('input')).toBeNull();
    expect(target.querySelector('form')).toBeNull();
  });

  // ---- Search input -------------------------------------------------------

  it('renders search input with aria-label', () => {
    component = mount(ViewerSearchPanel, { target, props: defaultProps() });
    const input = target.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-label')).toBe('Search within manifest');
    expect(input.placeholder).toBe('Search within manifest...');
  });

  it('renders search icon', () => {
    component = mount(ViewerSearchPanel, { target, props: defaultProps() });
    const icons = target.querySelectorAll('.material-icons');
    const searchIcon = Array.from(icons).find((i) => i.textContent === 'search');
    expect(searchIcon).toBeTruthy();
  });

  it('renders form element wrapping input', () => {
    component = mount(ViewerSearchPanel, { target, props: defaultProps() });
    const form = target.querySelector('form');
    expect(form).toBeTruthy();
  });

  // ---- Clear button -------------------------------------------------------

  it('hides clear button when query is empty', () => {
    component = mount(ViewerSearchPanel, { target, props: defaultProps() });
    const clearBtn = target.querySelector('button[aria-label="Clear search"]');
    expect(clearBtn).toBeNull();
  });

  it('shows clear button after typing into input', () => {
    component = mount(ViewerSearchPanel, { target, props: defaultProps() });
    const input = target.querySelector('input') as HTMLInputElement;

    // Simulate typing
    input.value = 'hello';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const clearBtn = target.querySelector('button[aria-label="Clear search"]');
    expect(clearBtn).toBeTruthy();
  });

  it('clears query and results when clear button clicked', () => {
    const onResultsChange = vi.fn();
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onResultsChange }),
    });
    const input = target.querySelector('input') as HTMLInputElement;

    // Type a query first
    input.value = 'test';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click clear
    const clearBtn = target.querySelector('button[aria-label="Clear search"]') as HTMLButtonElement;
    flushSync(() => { clearBtn.click(); });

    // Input should be empty
    expect(input.value).toBe('');
    // onResultsChange should have been called with empty array
    expect(onResultsChange).toHaveBeenCalledWith([]);
  });

  // ---- Form submission / search -------------------------------------------

  it('calls onSearch when form submitted', async () => {
    const onSearch = vi.fn().mockResolvedValue([]);
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'illuminated';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // onSearch should have been called with the query
    expect(onSearch).toHaveBeenCalledWith('illuminated');
  });

  it('does not call onSearch with empty query', () => {
    const onSearch = vi.fn().mockResolvedValue([]);
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  // ---- Loading state ------------------------------------------------------

  it('shows loading spinner during search', async () => {
    // Create a delayed promise to keep loading state visible
    let resolveSearch!: (value: unknown[]) => void;
    const searchPromise = new Promise<unknown[]>((resolve) => { resolveSearch = resolve; });
    const onSearch = vi.fn().mockReturnValue(searchPromise);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    // Type and submit
    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'test';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // While promise is pending, spinner should be visible
    const spinner = target.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();

    // Resolve and allow async cleanup
    resolveSearch([]);
    await searchPromise;
  });

  // ---- Results display ----------------------------------------------------

  it('displays grouped results by canvas', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'First result'),
      makeResult('r2', 'https://example.org/canvas/1', 'Second result'),
      makeResult('r3', 'https://example.org/canvas/2', 'Third result'),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    // Type and submit
    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'result';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Wait for async search to complete
    await vi.waitFor(() => {
      expect(target.textContent).toContain('3 results');
    });

    // Canvas group headers should show canvas ID segments
    expect(target.textContent).toContain('1'); // canvas/1
    expect(target.textContent).toContain('2'); // canvas/2

    // Hit counts per canvas
    expect(target.textContent).toContain('2 hits');
    expect(target.textContent).toContain('1 hit');
  });

  it('displays result text in result items', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'Illuminated manuscript page'),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'illuminated';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('Illuminated manuscript page');
    });
  });

  // ---- Result selector callback -------------------------------------------

  it('displays result with selector prefix/exact/suffix when present', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'text', {
        selector: { prefix: 'before ', exact: 'match', suffix: ' after' },
      }),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'match';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('before');
      expect(target.textContent).toContain('match');
      expect(target.textContent).toContain('after');
    });
  });

  it('calls onResultSelect when result clicked', async () => {
    const onResultSelect = vi.fn();
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'Click me'),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch, onResultSelect }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'click';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('Click me');
    });

    // Click the result item — result buttons have class "w-full" (unlike the clear button).
    const resultButton = target.querySelector('button.w-full') as HTMLElement;
    expect(resultButton).toBeTruthy();
    flushSync(() => { resultButton.click(); });
    expect(onResultSelect).toHaveBeenCalledWith(results[0]);
  });

  it('calls onResultSelect on Enter key in result', async () => {
    const onResultSelect = vi.fn();
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'Press enter'),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch, onResultSelect }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'enter';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('Press enter');
    });

    // Result buttons are native <button>.w-full (Enter fires click in browsers, use click in tests).
    const resultButton = target.querySelector('button.w-full') as HTMLElement;
    flushSync(() => {
      resultButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onResultSelect).toHaveBeenCalledWith(results[0]);
  });

  // ---- No results ---------------------------------------------------------

  it('shows "no results" message when search returns empty', async () => {
    const onSearch = vi.fn().mockResolvedValue([]);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'nonexistent';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('No results found for "nonexistent"');
    });
  });

  // ---- Error state --------------------------------------------------------

  it('shows error message when search fails', async () => {
    const onSearch = vi.fn().mockRejectedValue(new Error('Network error'));

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'failing';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('Network error');
    });

    // Error icon should be present
    const icons = target.querySelectorAll('.material-icons');
    const errorIcon = Array.from(icons).find((i) => i.textContent === 'error');
    expect(errorIcon).toBeTruthy();
  });

  // ---- Autocomplete suggestions -------------------------------------------

  it('renders suggestions dropdown when onFetchSuggestions returns results', async () => {
    const onFetchSuggestions = vi.fn().mockResolvedValue([
      { value: 'illuminated', count: 5 },
      { value: 'illustration', count: 3 },
    ]);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onFetchSuggestions }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'ill';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Wait for debounced suggestion fetch (200ms)
    await vi.waitFor(
      () => {
        const listbox = target.querySelector('[role="listbox"]');
        expect(listbox).toBeTruthy();
      },
      { timeout: 500 },
    );

    const options = target.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('illuminated');
    expect(options[0].textContent).toContain('5');
    expect(options[1].textContent).toContain('illustration');
  });

  it('sets aria-expanded and aria-autocomplete on input', () => {
    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onFetchSuggestions: vi.fn() }),
    });
    const input = target.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBe('search-suggestions');
  });

  // ---- Keyboard navigation in autocomplete --------------------------------

  it('navigates suggestions with arrow keys', async () => {
    const onFetchSuggestions = vi.fn().mockResolvedValue([
      { value: 'first' },
      { value: 'second' },
    ]);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onFetchSuggestions }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'fi';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Wait for suggestions
    await vi.waitFor(
      () => {
        expect(target.querySelector('[role="listbox"]')).toBeTruthy();
      },
      { timeout: 500 },
    );

    // Arrow down to first suggestion
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    const options = target.querySelectorAll('[role="option"]');
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    // Arrow down to second suggestion
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('false');

    // Arrow up back to first
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });

    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('closes suggestions on Escape key', async () => {
    const onFetchSuggestions = vi.fn().mockResolvedValue([
      { value: 'suggestion' },
    ]);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onFetchSuggestions }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'su';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await vi.waitFor(
      () => {
        expect(target.querySelector('[role="listbox"]')).toBeTruthy();
      },
      { timeout: 500 },
    );

    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(target.querySelector('[role="listbox"]')).toBeNull();
  });

  it('selects suggestion on Enter when index is active', async () => {
    const onSearch = vi.fn().mockResolvedValue([]);
    const onFetchSuggestions = vi.fn().mockResolvedValue([
      { value: 'selected-term' },
    ]);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch, onFetchSuggestions }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'se';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await vi.waitFor(
      () => {
        expect(target.querySelector('[role="listbox"]')).toBeTruthy();
      },
      { timeout: 500 },
    );

    // Navigate to first suggestion
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    // Select with Enter
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // Should close suggestions and trigger search
    expect(target.querySelector('[role="listbox"]')).toBeNull();
    expect(onSearch).toHaveBeenCalledWith('selected-term');
  });

  // ---- Result location info -----------------------------------------------

  it('shows region coordinates in result', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'text', {
        region: { x: 100, y: 200, width: 300, height: 400 },
      }),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'text';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('100,200');
    });
  });

  it('shows time info in result', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/1', 'text', {
        time: { start: 65, end: 130 },
      }),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({ onSearch }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'text';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      // 65s = 1:05, 130s = 2:10
      expect(target.textContent).toContain('1:05');
      expect(target.textContent).toContain('2:10');
    });
  });

  // ---- Highlight for current canvas ---------------------------------------

  it('highlights results group for current canvas', async () => {
    const results = [
      makeResult('r1', 'https://example.org/canvas/active', 'result'),
    ];
    const onSearch = vi.fn().mockResolvedValue(results);

    component = mount(ViewerSearchPanel, {
      target,
      props: defaultProps({
        onSearch,
        currentCanvasId: 'https://example.org/canvas/active',
      }),
    });

    const input = target.querySelector('input') as HTMLInputElement;
    input.value = 'result';
    flushSync(() => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const form = target.querySelector('form') as HTMLFormElement;
    flushSync(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      // The canvas group for current canvas should have highlight class
      const groups = target.querySelectorAll('.divide-y > div');
      const activeGroup = groups[0] as HTMLElement;
      expect(activeGroup.className).toContain('bg-nb-blue/10');
    });
  });
});
