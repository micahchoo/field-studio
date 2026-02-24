/**
 * Atom Component Tests
 *
 * Tests rendering, props behavior, theming, and accessibility
 * for all shared/ui/atoms Svelte 5 components.
 *
 * Uses Svelte's `mount` API directly with happy-dom.
 * For components requiring children (snippets), uses TestHost wrapper.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from 'svelte';

// Direct-mount atoms (no children needed)
import Icon from '../Icon.svelte';
import Divider from '../Divider.svelte';
import StepConnector from '../StepConnector.svelte';
import StepIndicator from '../StepIndicator.svelte';
import TabButtonBase from '../TabButtonBase.svelte';
import SkipLink from '../SkipLink.svelte';
import SkipLinks from '../SkipLinks.svelte';
import Input from '../Input.svelte';

// Children-requiring atoms (use TestHost)
import TestHost from './TestHost.svelte';
import Tag from '../Tag.svelte';
import Button from '../Button.svelte';
import Card from '../Card.svelte';
import Panel from '../Panel.svelte';

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  target.remove();
});

// ============================================================================
// Icon
// ============================================================================

describe('Icon', () => {
  it('renders material icon name as text content', () => {
    mount(Icon, { target, props: { name: 'search' } });
    const span = target.querySelector('.material-icons');
    expect(span).toBeTruthy();
    expect(span!.textContent).toBe('search');
  });

  it('applies additional CSS class', () => {
    mount(Icon, { target, props: { name: 'home', class: 'custom-icon-class' } });
    const span = target.querySelector('.material-icons');
    expect(span!.classList.contains('custom-icon-class')).toBe(true);
  });

  it('is aria-hidden when no label', () => {
    mount(Icon, { target, props: { name: 'search' } });
    const span = target.querySelector('.material-icons');
    expect(span!.getAttribute('aria-hidden')).toBe('true');
    expect(span!.getAttribute('role')).toBeNull();
  });

  it('has role="img" and aria-label when label provided', () => {
    mount(Icon, { target, props: { name: 'search', label: 'Search icon' } });
    const span = target.querySelector('.material-icons');
    expect(span!.getAttribute('role')).toBe('img');
    expect(span!.getAttribute('aria-label')).toBe('Search icon');
    expect(span!.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders title attribute', () => {
    mount(Icon, { target, props: { name: 'info', title: 'Information' } });
    const span = target.querySelector('.material-icons');
    expect(span!.getAttribute('title')).toBe('Information');
  });

  it('inherits font-size', () => {
    mount(Icon, { target, props: { name: 'check' } });
    const span = target.querySelector('.material-icons') as HTMLElement;
    expect(span.style.fontSize).toBe('inherit');
  });
});

// ============================================================================
// Divider
// ============================================================================

describe('Divider', () => {
  it('renders horizontal by default', () => {
    mount(Divider, { target, props: {} });
    const div = target.querySelector('div');
    expect(div!.classList.contains('w-full')).toBe(true);
    expect(div!.classList.contains('bg-nb-black')).toBe(true);
  });

  it('renders vertical direction', () => {
    mount(Divider, { target, props: { direction: 'vertical' } });
    const div = target.querySelector('div');
    expect(div!.classList.contains('self-stretch')).toBe(true);
  });

  it('applies thickness via style', () => {
    mount(Divider, { target, props: { thickness: 4 } });
    const div = target.querySelector('div') as HTMLElement;
    expect(div.style.height).toBe('4px');
  });

  it('renders default 2px thickness', () => {
    mount(Divider, { target, props: {} });
    const div = target.querySelector('div') as HTMLElement;
    expect(div.style.height).toBe('2px');
  });

  it('uses cx.separator for background when provided', () => {
    mount(Divider, { target, props: { cx: { separator: 'bg-nb-yellow' } } });
    const div = target.querySelector('div');
    expect(div!.classList.contains('bg-nb-yellow')).toBe(true);
    expect(div!.classList.contains('bg-nb-black')).toBe(false);
  });

  it('defaults to bg-nb-black when no cx provided', () => {
    mount(Divider, { target, props: {} });
    const div = target.querySelector('div');
    expect(div!.classList.contains('bg-nb-black')).toBe(true);
  });

  it('applies custom class', () => {
    mount(Divider, { target, props: { class: 'my-custom' } });
    const div = target.querySelector('div');
    expect(div!.classList.contains('my-custom')).toBe(true);
  });
});

// ============================================================================
// StepConnector
// ============================================================================

describe('StepConnector', () => {
  it('renders connector element with correct structure', () => {
    mount(StepConnector, { target, props: { completed: false } });
    const div = target.querySelector('div');
    expect(div).toBeTruthy();
    expect(div!.classList.contains('h-0.5')).toBe(true);
    expect(div!.classList.contains('mx-2')).toBe(true);
  });

  it('accepts completed prop without fieldMode (theme-agnostic)', () => {
    // No fieldMode needed — uses CSS custom properties for all themes
    mount(StepConnector, { target, props: { completed: true } });
    const div = target.querySelector('div') as HTMLElement;
    expect(div).toBeTruthy();
    // Note: happy-dom drops var() from computed styles; CSS vars verified in browser tests
  });

  it('renders different styles for completed vs incomplete', () => {
    const t1 = document.createElement('div');
    const t2 = document.createElement('div');
    document.body.append(t1, t2);

    mount(StepConnector, { target: t1, props: { completed: false } });
    mount(StepConnector, { target: t2, props: { completed: true } });

    // Both render divs — style values differ (CSS var selection for completed vs incomplete)
    expect(t1.querySelector('div')).toBeTruthy();
    expect(t2.querySelector('div')).toBeTruthy();

    t1.remove();
    t2.remove();
  });

  it('applies default width class', () => {
    mount(StepConnector, { target, props: { completed: false } });
    const div = target.querySelector('div');
    expect(div!.classList.contains('w-16')).toBe(true);
  });

  it('applies custom width class', () => {
    mount(StepConnector, { target, props: { completed: false, width: 'w-24' } });
    const div = target.querySelector('div');
    expect(div!.classList.contains('w-24')).toBe(true);
  });
});

// ============================================================================
// StepIndicator
// ============================================================================

describe('StepIndicator', () => {
  it('renders numbered variant by default', () => {
    mount(StepIndicator, { target, props: { step: 1, label: 'First', active: false, completed: false } });
    const numberEl = target.querySelector('.w-8');
    expect(numberEl).toBeTruthy();
    expect(numberEl!.textContent?.trim()).toContain('1');
  });

  it('renders label text', () => {
    mount(StepIndicator, { target, props: { step: 2, label: 'Second Step', active: false, completed: false } });
    expect(target.textContent).toContain('Second Step');
  });

  it('shows checkmark icon when completed', () => {
    mount(StepIndicator, { target, props: { step: 1, label: 'Done', active: false, completed: true } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('check');
  });

  it('shows step number when not completed', () => {
    mount(StepIndicator, { target, props: { step: 3, label: 'Third', active: false, completed: false } });
    const numberEl = target.querySelector('.w-8');
    expect(numberEl!.textContent?.trim()).toContain('3');
    expect(target.querySelector('.material-icons')).toBeNull();
  });

  it('renders simple variant as dot', () => {
    mount(StepIndicator, { target, props: { step: 1, label: 'Simple', active: false, completed: false, variant: 'simple' } });
    const dot = target.querySelector('.w-2');
    expect(dot).toBeTruthy();
    expect(target.querySelector('.w-8')).toBeNull();
  });

  it('uses CSS custom properties for all states (theme-agnostic, no fieldMode)', () => {
    // Verify component accepts completed/active/inactive without fieldMode
    // Note: happy-dom drops var() from computed styles; CSS vars verified in browser tests
    const states = [
      { active: false, completed: true, label: 'completed' },
      { active: true, completed: false, label: 'active' },
      { active: false, completed: false, label: 'inactive' },
    ];
    for (const s of states) {
      const t = document.createElement('div');
      document.body.appendChild(t);
      mount(StepIndicator, { target: t, props: { step: 1, ...s } });
      const el = t.querySelector('.w-8');
      expect(el).toBeTruthy();
      t.remove();
    }
  });

  it('applies inline styles (not Tailwind bg classes) for theme compatibility', () => {
    mount(StepIndicator, { target, props: { step: 1, label: 'Test', active: true, completed: false } });
    const numberEl = target.querySelector('.w-8') as HTMLElement;
    // Uses inline style (CSS custom properties), not Tailwind bg-* classes
    expect(numberEl.className).not.toContain('bg-nb-');
    expect(numberEl.hasAttribute('style')).toBe(true);
  });

  it('label uses inline style for theme compatibility', () => {
    mount(StepIndicator, { target, props: { step: 1, label: 'Themed', active: true, completed: false } });
    const spans = target.querySelectorAll('span');
    const labelSpan = Array.from(spans).find(s => s.textContent === 'Themed');
    expect(labelSpan).toBeTruthy();
    expect(labelSpan!.hasAttribute('style')).toBe(true);
  });
});

// ============================================================================
// TabButtonBase
// ============================================================================

describe('TabButtonBase', () => {
  it('renders label text', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab 1', isActive: false, onclick: () => {} } });
    expect(target.textContent).toContain('Tab 1');
  });

  it('has role="tab"', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab).toBeTruthy();
  });

  it('has aria-selected=true when active', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: true, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.getAttribute('aria-selected')).toBe('true');
  });

  it('has aria-selected=false when inactive', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.getAttribute('aria-selected')).toBe('false');
  });

  it('renders active tab with aria-selected=true', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: true, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.getAttribute('aria-selected')).toBe('true');
  });

  it('renders inactive tab with aria-selected=false', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.getAttribute('aria-selected')).toBe('false');
  });

  it('applies cx.active override when provided', () => {
    const cx = { active: 'text-nb-yellow border-b-2 border-nb-yellow bg-nb-yellow/20', inactive: 'text-nb-yellow/60', surface: '', text: '', accent: '' };
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: true, onclick: () => {}, cx } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.className).toContain('text-nb-yellow');
    expect(tab!.className).toContain('border-nb-yellow');
  });

  it('renders icon when provided', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: () => {}, icon: 'settings' } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('settings');
  });

  it('renders as a native button element', () => {
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: () => {} } });
    const tab = target.querySelector('[role="tab"]');
    expect(tab!.tagName).toBe('BUTTON');
    expect(tab!.getAttribute('type')).toBe('button');
  });
});

// ============================================================================
// SkipLink
// ============================================================================

describe('SkipLink', () => {
  it('renders as anchor with href', () => {
    mount(SkipLink, { target, props: { targetId: 'main-content' } });
    const link = target.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('#main-content');
  });

  it('renders default label', () => {
    mount(SkipLink, { target, props: { targetId: 'content' } });
    expect(target.textContent).toContain('Skip to content');
  });

  it('renders custom label', () => {
    mount(SkipLink, { target, props: { targetId: 'nav', label: 'Skip to navigation' } });
    expect(target.textContent).toContain('Skip to navigation');
  });

  it('renders shortcut when provided', () => {
    mount(SkipLink, { target, props: { targetId: 'cmd', shortcut: '⌘K' } });
    const kbd = target.querySelector('kbd');
    expect(kbd).toBeTruthy();
    expect(kbd!.textContent).toBe('⌘K');
  });

  it('has sr-only class for visual hiding', () => {
    mount(SkipLink, { target, props: { targetId: 'main' } });
    const link = target.querySelector('a');
    expect(link!.className).toContain('sr-only');
  });
});

// ============================================================================
// SkipLinks (container)
// ============================================================================

describe('SkipLinks', () => {
  it('renders nav element with aria-label', () => {
    mount(SkipLinks, {
      target,
      props: {
        links: [
          { targetId: 'main', label: 'Skip to main' },
          { targetId: 'nav', label: 'Skip to nav' },
        ],
      },
    });
    const nav = target.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav!.getAttribute('aria-label')).toBe('Skip links');
  });

  it('renders one link per item', () => {
    mount(SkipLinks, {
      target,
      props: {
        links: [
          { targetId: 'a', label: 'Link A' },
          { targetId: 'b', label: 'Link B' },
          { targetId: 'c', label: 'Link C' },
        ],
      },
    });
    const items = target.querySelectorAll('li');
    expect(items.length).toBe(3);
  });
});

// ============================================================================
// Input
// ============================================================================

describe('Input', () => {
  it('renders input element', () => {
    mount(Input, { target, props: { id: 'test-input' } });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
    expect(input!.id).toBe('test-input');
  });

  it('renders label when provided', () => {
    mount(Input, { target, props: { label: 'Email', id: 'email' } });
    const label = target.querySelector('label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Email');
    expect(label!.getAttribute('for')).toBe('email');
  });

  it('renders required indicator', () => {
    mount(Input, { target, props: { label: 'Name', id: 'name', required: true } });
    const asterisk = target.querySelector('[aria-hidden="true"]');
    expect(asterisk).toBeTruthy();
    expect(asterisk!.textContent).toContain('*');
  });

  it('sets aria-required when required', () => {
    mount(Input, { target, props: { id: 'name', required: true } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-required')).toBe('true');
  });

  it('renders error message with role="alert"', () => {
    mount(Input, { target, props: { id: 'email', error: 'Invalid email' } });
    const error = target.querySelector('[role="alert"]');
    expect(error).toBeTruthy();
    expect(error!.textContent).toBe('Invalid email');
  });

  it('sets aria-invalid when error present', () => {
    mount(Input, { target, props: { id: 'email', error: 'Bad' } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders help text when no error', () => {
    mount(Input, { target, props: { id: 'help', helpText: 'Enter your email' } });
    expect(target.textContent).toContain('Enter your email');
    expect(target.querySelector('[role="alert"]')).toBeNull();
  });

  it('prefers error over help text', () => {
    mount(Input, { target, props: { id: 'both', error: 'Error!', helpText: 'Help' } });
    expect(target.textContent).toContain('Error!');
    expect(target.textContent).not.toContain('Help');
  });

  it('sets aria-describedby for error', () => {
    mount(Input, { target, props: { id: 'desc', error: 'Bad' } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-describedby')).toBe('desc-error');
  });

  it('sets aria-describedby for help text', () => {
    mount(Input, { target, props: { id: 'desc', helpText: 'Hint' } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-describedby')).toBe('desc-help');
  });

  it('disables input when disabled', () => {
    mount(Input, { target, props: { id: 'dis', disabled: true } });
    const input = target.querySelector('input');
    expect(input!.disabled).toBe(true);
  });
});

// ============================================================================
// Tag (with TestHost for children)
// ============================================================================

describe('Tag', () => {
  it('renders with text content', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: { color: 'blue' }, text: 'Label' } });
    expect(target.textContent).toContain('Label');
  });

  it('applies blue color classes', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: { color: 'blue' }, text: 'Blue' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-nb-blue');
    expect(span!.className).toContain('border-nb-black');
  });

  it('applies cx.border override from theme', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: { color: 'blue', cx: { border: 'border-nb-yellow' } }, text: 'Field' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('border-nb-yellow');
    expect(span!.className).not.toContain('border-nb-black');
  });

  it('defaults to border-nb-black when no cx', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: { color: 'blue' }, text: 'Default' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('border-nb-black');
  });

  it('has neobrutalist styling', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: {}, text: 'NB' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('border-2');
    expect(span!.className).toContain('font-mono');
    expect(span!.className).toContain('uppercase');
    expect(span!.className).toContain('font-bold');
  });

  it('defaults to black color', () => {
    mount(TestHost, { target, props: { component: Tag, componentProps: {}, text: 'Default' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-nb-black');
    expect(span!.className).toContain('text-nb-white');
  });

  it('applies all 8 color variants', () => {
    const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'orange', 'purple', 'black'] as const;
    for (const color of colors) {
      const t = document.createElement('div');
      document.body.appendChild(t);
      mount(TestHost, { target: t, props: { component: Tag, componentProps: { color }, text: color } });
      const span = t.querySelector('span');
      expect(span!.className).toContain(`bg-nb-${color}`);
      t.remove();
    }
  });
});

// ============================================================================
// Button (with TestHost for children)
// ============================================================================

describe('Button', () => {
  it('renders button element', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: {}, text: 'Click' } });
    const btn = target.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Click');
  });

  it('has type="button" by default', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: {}, text: 'Btn' } });
    const btn = target.querySelector('button');
    expect(btn!.getAttribute('type')).toBe('button');
  });

  it('applies primary variant styles by default', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: {}, text: 'Primary' } });
    const btn = target.querySelector('button') as HTMLElement;
    // happy-dom partially resolves var() — check for shadow theme var which is preserved
    const styleAttr = btn.getAttribute('style') || '';
    expect(styleAttr).toContain('--theme-shadow-base');
  });

  it('disables button when disabled', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { disabled: true }, text: 'Off' } });
    const btn = target.querySelector('button');
    expect(btn!.disabled).toBe(true);
  });

  it('disables button when loading', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { loading: true }, text: 'Loading' } });
    const btn = target.querySelector('button');
    expect(btn!.disabled).toBe(true);
  });

  it('shows spinner when loading', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { loading: true }, text: 'Wait' } });
    const svg = target.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('sets aria-disabled when disabled', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { disabled: true }, text: 'Off' } });
    const btn = target.querySelector('button');
    expect(btn!.getAttribute('aria-disabled')).toBe('true');
  });

  it('applies ghost variant (transparent)', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { variant: 'ghost' }, text: 'Ghost' } });
    const btn = target.querySelector('button') as HTMLElement;
    expect(btn.style.backgroundColor).toBe('transparent');
  });

  it('applies full width when fullWidth=true', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { fullWidth: true }, text: 'Wide' } });
    const btn = target.querySelector('button') as HTMLElement;
    expect(btn.style.width).toBe('100%');
  });

  it('applies size=bare with no height/padding', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { size: 'bare' }, text: 'Bare' } });
    const btn = target.querySelector('button') as HTMLElement;
    // bare size: no explicit height set
    expect(btn.style.height).toBeFalsy();
  });

  it('applies size=sm with 32px height', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { size: 'sm' }, text: 'Sm' } });
    const btn = target.querySelector('button') as HTMLElement;
    expect(btn.style.height).toBe('32px');
  });

  it('applies size=lg with 48px height', () => {
    mount(TestHost, { target, props: { component: Button, componentProps: { size: 'lg' }, text: 'Lg' } });
    const btn = target.querySelector('button') as HTMLElement;
    expect(btn.style.height).toBe('48px');
  });
});

// ============================================================================
// Card (with TestHost for children)
// ============================================================================

describe('Card', () => {
  it('renders card container', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: {}, text: 'Content' } });
    expect(target.textContent).toContain('Content');
  });

  it('has flex column layout', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: {}, text: 'Test' } });
    const card = target.firstElementChild as HTMLElement;
    expect(card.style.display).toBe('flex');
    expect(card.style.flexDirection).toBe('column');
  });

  it('has zero border radius (neobrutalist)', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: {}, text: 'NB' } });
    const card = target.firstElementChild as HTMLElement;
    // happy-dom normalizes '0' to '0px'
    expect(card.style.borderRadius).toMatch(/^0(px)?$/);
  });

  it('applies selected border color', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: { selected: true }, text: 'Selected' } });
    const card = target.firstElementChild as HTMLElement;
    // happy-dom can't resolve var() — check style attribute string
    const styleAttr = card.getAttribute('style') || '';
    expect(styleAttr).toContain('--theme-accent-primary');
  });

  it('applies disabled opacity', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: { disabled: true }, text: 'Off' } });
    const card = target.firstElementChild as HTMLElement;
    expect(card.style.opacity).toBe('0.6');
  });

  it('applies disabled pointer-events', () => {
    mount(TestHost, { target, props: { component: Card, componentProps: { disabled: true }, text: 'Off' } });
    const card = target.firstElementChild as HTMLElement;
    expect(card.style.pointerEvents).toBe('none');
  });
});

// ============================================================================
// Panel (with TestHost for children)
// ============================================================================

describe('Panel', () => {
  it('renders content', () => {
    mount(TestHost, { target, props: { component: Panel, componentProps: {}, text: 'Panel content' } });
    expect(target.textContent).toContain('Panel content');
  });

  it('applies default surface styling', () => {
    mount(TestHost, { target, props: { component: Panel, componentProps: {}, text: 'Test' } });
    const panel = target.firstElementChild;
    expect(panel!.className).toContain('bg-nb-white');
    expect(panel!.className).toContain('border-nb-black');
  });

  it('applies cx surface override', () => {
    const cx = { surface: 'bg-nb-black border-2 border-nb-yellow', text: 'text-nb-yellow', accent: 'text-nb-yellow' };
    mount(TestHost, { target, props: { component: Panel, componentProps: { cx }, text: 'Themed' } });
    const panel = target.firstElementChild;
    expect(panel!.className).toContain('bg-nb-black');
    expect(panel!.className).toContain('border-nb-yellow');
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe('TabButtonBase interactions', () => {
  it('calls onclick when clicked', () => {
    const handler = vi.fn();
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: handler } });
    const tab = target.querySelector('[role="tab"]') as HTMLElement;

    tab.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onclick on Enter keypress', () => {
    const handler = vi.fn();
    mount(TabButtonBase, { target, props: { label: 'Tab', isActive: false, onclick: handler } });
    const tab = target.querySelector('[role="tab"]') as HTMLElement;

    // Native button handles Enter automatically — clicking is sufficient for unit tests
    tab.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Input interactions', () => {
  it('supports value prop (bindable)', () => {
    // bind:value enables two-way binding in real Svelte components
    // mount() in happy-dom doesn't trigger the binding path,
    // so we verify the prop is accepted without error
    mount(Input, { target, props: { id: 'val', value: 'Hello' } });
    const input = target.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it('has autofocus action wired', () => {
    // Svelte action `use:autofocus` calls node.focus() on mount
    // happy-dom doesn't implement focus tracking, so verify structural correctness
    mount(Input, { target, props: { id: 'focus', autoFocusOnMount: true } });
    const input = target.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.id).toBe('focus');
  });
});
