/**
 * Form Molecule Tests
 *
 * Tests FormInput, FormSection, SelectField, FilterInput, SearchField,
 * DebouncedInput, DropdownSelect, RangeSelector
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';

import FormInput from '../FormInput.svelte';
import SelectField from '../SelectField.svelte';
import FilterInput from '../FilterInput.svelte';
import SearchField from '../SearchField.svelte';
import LoadingState from '../LoadingState.svelte';
import DebouncedInput from '../DebouncedInput.svelte';
import TestHost from './TestHost.svelte';
import FormSection from '../FormSection.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cx = {} as any;

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  target.remove();
});

// ============================================================================
// FormInput
// ============================================================================

describe('FormInput', () => {
  it('renders input element', () => {
    mount(FormInput, { target, props: { cx } });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('renders label when provided', () => {
    mount(FormInput, { target, props: { label: 'Email', cx } });
    const label = target.querySelector('label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Email');
  });

  it('renders required asterisk', () => {
    mount(FormInput, { target, props: { label: 'Name', required: true, cx } });
    expect(target.textContent).toContain('*');
  });

  it('renders textarea when type is textarea', () => {
    mount(FormInput, { target, props: { type: 'textarea', cx } });
    const textarea = target.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(target.querySelector('input')).toBeNull();
  });

  it('renders error with role="alert"', () => {
    mount(FormInput, { target, props: { error: 'Bad input', cx } });
    const alert = target.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert!.textContent).toBe('Bad input');
  });

  it('sets aria-invalid on error', () => {
    mount(FormInput, { target, props: { error: 'Error!', cx } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders hint text when no error', () => {
    mount(FormInput, { target, props: { hint: 'Enter email address', cx } });
    expect(target.textContent).toContain('Enter email address');
    expect(target.querySelector('[role="alert"]')).toBeNull();
  });

  it('prefers error over hint', () => {
    mount(FormInput, { target, props: { error: 'Error!', hint: 'Help text', cx } });
    expect(target.textContent).toContain('Error!');
    expect(target.textContent).not.toContain('Help text');
  });

  it('applies disabled state', () => {
    mount(FormInput, { target, props: { disabled: true, cx } });
    const input = target.querySelector('input');
    expect(input!.disabled).toBe(true);
  });

  it('sets aria-describedby for error', () => {
    mount(FormInput, { target, props: { error: 'Bad', cx } });
    const input = target.querySelector('input');
    expect(input!.getAttribute('aria-describedby')).toContain('-error');
  });

  it('sets placeholder', () => {
    mount(FormInput, { target, props: { placeholder: 'Type here', cx } });
    const input = target.querySelector('input');
    expect(input!.placeholder).toBe('Type here');
  });

  it('renders number input type', () => {
    mount(FormInput, { target, props: { type: 'number', min: 0, max: 100, step: 5, cx } });
    const input = target.querySelector('input');
    expect(input!.type).toBe('number');
    expect(input!.min).toBe('0');
    expect(input!.max).toBe('100');
    expect(input!.step).toBe('5');
  });

  it('applies default neobrutalist styling', () => {
    mount(FormInput, { target, props: { cx } });
    const input = target.querySelector('input');
    expect(input!.className).toContain('border-2');
    expect(input!.className).toContain('font-mono');
  });

  it('renders label with cx.label override', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mount(FormInput, { target, props: { label: 'Test', cx: { label: 'custom-label-class' } as any } });
    const label = target.querySelector('label');
    expect(label!.className).toContain('custom-label-class');
  });

  it('renders label associated with input via for/id', () => {
    mount(FormInput, { target, props: { label: 'Test', cx } });
    const label = target.querySelector('label');
    const input = target.querySelector('input');
    expect(label!.getAttribute('for')).toBe(input!.id);
  });
});

// ============================================================================
// FormSection (children-requiring)
// ============================================================================

describe('FormSection', () => {
  it('renders section element', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Details', cx }, text: 'Content' } });
    const section = target.querySelector('section');
    expect(section).toBeTruthy();
  });

  it('renders title text', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Settings', cx }, text: 'Body' } });
    expect(target.textContent).toContain('Settings');
  });

  it('renders children content when open', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Test', cx }, text: 'Inner Content' } });
    expect(target.textContent).toContain('Inner Content');
  });

  it('has aria-expanded=true by default', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Test', cx }, text: 'Body' } });
    const btn = target.querySelector('button');
    expect(btn!.getAttribute('aria-expanded')).toBe('true');
  });

  it('has aria-controls referencing section id', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Test', cx }, text: 'Body' } });
    const btn = target.querySelector('button');
    const controlsId = btn!.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    const contentDiv = target.querySelector(`#${controlsId}`);
    expect(contentDiv).toBeTruthy();
  });

  it('renders icon when provided', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Test', icon: 'settings', cx }, text: 'Body' } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
  });

  it('renders chevron_right icon for toggle', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Test', cx }, text: 'Body' } });
    const icons = target.querySelectorAll('.material-icons');
    const chevron = Array.from(icons).find(i => i.textContent === 'chevron_right');
    expect(chevron).toBeTruthy();
  });

  it('toggles open state on button click', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'Toggle', cx }, text: 'Body' } });
    const btn = target.querySelector('button') as HTMLElement;
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    flushSync(() => { btn.click(); });
    // After click + flush, aria-expanded should be false
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('applies cx.surface for section border', () => {
    mount(TestHost, { target, props: { component: FormSection, componentProps: { title: 'T', cx: { surface: 'border-2 border-nb-yellow' } }, text: 'B' } });
    const section = target.querySelector('section');
    expect(section!.className).toContain('border-nb-yellow');
  });
});

// ============================================================================
// SelectField
// ============================================================================

describe('SelectField', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Charlie' },
  ];

  it('renders select element', () => {
    mount(SelectField, { target, props: { options, cx } });
    const select = target.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('renders all flat options', () => {
    mount(SelectField, { target, props: { options, cx } });
    const opts = target.querySelectorAll('option');
    expect(opts.length).toBe(3);
    expect(opts[0].textContent).toBe('Alpha');
    expect(opts[0].value).toBe('a');
  });

  it('renders label when provided', () => {
    mount(SelectField, { target, props: { options, label: 'Language', cx } });
    const label = target.querySelector('label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Language');
  });

  it('renders required asterisk', () => {
    mount(SelectField, { target, props: { options, label: 'Field', required: true, cx } });
    expect(target.textContent).toContain('*');
  });

  it('renders hint text', () => {
    mount(SelectField, { target, props: { options, label: 'Field', hint: 'Choose one', cx } });
    expect(target.textContent).toContain('Choose one');
  });

  it('renders optgroups when groups provided', () => {
    const groups = [
      { label: 'Fruits', options: [{ value: 'apple', label: 'Apple' }] },
      { label: 'Vegs', options: [{ value: 'carrot', label: 'Carrot' }] },
    ];
    mount(SelectField, { target, props: { groups, cx } });
    const optgroups = target.querySelectorAll('optgroup');
    expect(optgroups.length).toBe(2);
    expect(optgroups[0].label).toBe('Fruits');
  });

  it('applies disabled state', () => {
    mount(SelectField, { target, props: { options, disabled: true, cx } });
    const select = target.querySelector('select');
    expect(select!.disabled).toBe(true);
  });

  it('applies neobrutalist styling', () => {
    mount(SelectField, { target, props: { options, cx } });
    const select = target.querySelector('select');
    expect(select!.className).toContain('border-2');
    expect(select!.className).toContain('font-mono');
  });
});

// ============================================================================
// FilterInput
// ============================================================================

describe('FilterInput', () => {
  it('renders input element', () => {
    mount(FilterInput, { target, props: { cx } });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('renders search icon', () => {
    mount(FilterInput, { target, props: { cx } });
    const icons = target.querySelectorAll('.material-icons');
    const searchIcon = Array.from(icons).find(i => i.textContent === 'search');
    expect(searchIcon).toBeTruthy();
  });

  it('has placeholder', () => {
    mount(FilterInput, { target, props: { placeholder: 'Filter...', cx } });
    const input = target.querySelector('input');
    expect(input!.placeholder).toBe('Filter...');
  });

  it('renders clear button when input has value', () => {
    mount(FilterInput, { target, props: { value: 'hello', cx } });
    const buttons = target.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    // Should have both search and close icons
    const icons = target.querySelectorAll('.material-icons');
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// SearchField
// ============================================================================

describe('SearchField', () => {
  it('renders input element', () => {
    mount(SearchField, { target, props: { cx } });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('renders search icon', () => {
    mount(SearchField, { target, props: { cx } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('search');
  });

  it('renders clear button when has value', () => {
    mount(SearchField, { target, props: { value: 'test', cx } });
    const buttons = target.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// DebouncedInput
// ============================================================================

describe('DebouncedInput', () => {
  it('renders input element', () => {
    mount(DebouncedInput, { target, props: { cx } });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('sets placeholder', () => {
    mount(DebouncedInput, { target, props: { placeholder: 'Type...', cx } });
    const input = target.querySelector('input');
    expect(input!.placeholder).toBe('Type...');
  });

  it('renders with initial value', () => {
    mount(DebouncedInput, { target, props: { value: 'initial', cx } });
    const input = target.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('initial');
  });

  it('shows character count when showCharCount enabled', () => {
    mount(DebouncedInput, { target, props: { value: 'hello', maxLength: 100, showCharCount: true, cx } });
    expect(target.textContent).toContain('5');
    expect(target.textContent).toContain('100');
  });
});

// ============================================================================
// LoadingState (bonus - simple non-form molecule)
// ============================================================================

describe('LoadingState', () => {
  it('renders spinner with role="status"', () => {
    mount(LoadingState, { target, props: { cx } });
    const spinner = target.querySelector('[role="status"]');
    expect(spinner).toBeTruthy();
  });

  it('has default aria-label "Loading"', () => {
    mount(LoadingState, { target, props: { cx } });
    const spinner = target.querySelector('[role="status"]');
    expect(spinner!.getAttribute('aria-label')).toBe('Loading');
  });

  it('renders custom message', () => {
    mount(LoadingState, { target, props: { message: 'Processing...', cx } });
    expect(target.textContent).toContain('Processing...');
    const spinner = target.querySelector('[role="status"]');
    expect(spinner!.getAttribute('aria-label')).toBe('Processing...');
  });

  it('applies size sm classes', () => {
    mount(LoadingState, { target, props: { size: 'sm', cx } });
    const spinner = target.querySelector('[role="status"]');
    expect(spinner!.className).toContain('w-4');
    expect(spinner!.className).toContain('h-4');
  });

  it('applies size lg classes', () => {
    mount(LoadingState, { target, props: { size: 'lg', cx } });
    const spinner = target.querySelector('[role="status"]');
    expect(spinner!.className).toContain('w-12');
    expect(spinner!.className).toContain('h-12');
  });

  it('renders inline mode', () => {
    mount(LoadingState, { target, props: { inline: true, cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('inline-flex');
  });

  it('renders block mode by default', () => {
    mount(LoadingState, { target, props: { cx } });
    const container = target.firstElementChild;
    expect(container!.className).not.toContain('inline-flex');
    expect(container!.className).toContain('py-12');
  });

  it('applies animate-spin to spinner', () => {
    mount(LoadingState, { target, props: { cx } });
    const spinner = target.querySelector('[role="status"]');
    expect(spinner!.className).toContain('animate-spin');
  });
});
