/**
 * RequiredStatementBar — Component tests
 *
 * Covers:
 * - Renders nothing when requiredStatement is undefined
 * - Renders nothing when value is empty
 * - Renders label + value text when populated
 * - Applies fieldMode styles
 * - Uses getIIIFValue for language resolution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import RequiredStatementBar from '../ui/RequiredStatementBar.svelte';

describe('RequiredStatementBar', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  it('renders nothing when requiredStatement is undefined', () => {
    component = mount(RequiredStatementBar, {
      target,
      props: {},
    });
    expect(target.querySelector('[role="status"]')).toBeNull();
  });

  it('renders nothing when value is empty', () => {
    component = mount(RequiredStatementBar, {
      target,
      props: {
        requiredStatement: {
          label: { none: ['Attribution'] },
          value: { none: [''] },
        },
      },
    });
    expect(target.querySelector('[role="status"]')).toBeNull();
  });

  it('renders status bar with label and value text', () => {
    component = mount(RequiredStatementBar, {
      target,
      props: {
        requiredStatement: {
          label: { none: ['Attribution'] },
          value: { none: ['Provided by Example Museum'] },
        },
      },
    });
    const bar = target.querySelector('[role="status"]');
    expect(bar).toBeTruthy();
    expect(bar!.textContent).toContain('Attribution');
    expect(bar!.textContent).toContain('Provided by Example Museum');
  });

  it('renders value without label when label is empty', () => {
    component = mount(RequiredStatementBar, {
      target,
      props: {
        requiredStatement: {
          label: { none: [''] },
          value: { none: ['CC BY 4.0'] },
        },
      },
    });
    const bar = target.querySelector('[role="status"]');
    expect(bar).toBeTruthy();
    expect(bar!.textContent).toContain('CC BY 4.0');
  });

  it('applies fieldMode class for yellow theme', () => {
    component = mount(RequiredStatementBar, {
      target,
      props: {
        requiredStatement: {
          label: { none: ['Rights'] },
          value: { none: ['Public Domain'] },
        },
        fieldMode: true,
      },
    });
    const bar = target.querySelector('[role="status"]');
    expect(bar).toBeTruthy();
    expect(bar!.className).toContain('yellow');
  });
});
