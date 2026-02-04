/**
 * DebouncedInput Molecule Test
 *
 * Tests follow the IDEAL OUTCOME / FAILURE PREVENTED pattern.
 * Code informs tests, not vice versa.
 *
 * Each test maps to a real user interaction and defines what success looks like.
 */

import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DebouncedInput } from '@/src/shared/ui/molecules/DebouncedInput';
import 'fake-indexeddb/auto';

// Mock Input atom
vi.mock('@/src/shared/ui/atoms', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      {...props}
    />
  ),
}));

/**
 * Wrapper component to test controlled behavior
 */
const TestWrapper = (props: any) => {
  const [value, setValue] = useState(props.initialValue || '');
  return (
    <DebouncedInput
      {...props}
      value={value}
      onChange={(newValue: string) => {
        setValue(newValue);
        props.onChange?.(newValue);
      }}
    />
  );
};

describe('DebouncedInput Molecule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('USER INTERACTION: Type into debounced input', () => {
    it('IDEAL OUTCOME: Input updates local state immediately for UI responsiveness', () => {
      // Arrange
      const onChange = vi.fn();
      render(<TestWrapper initialValue="" onChange={onChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Act: User types
      fireEvent.change(input, { target: { value: 'test input' } });

      // Assert: Input value updates immediately
      expect(input.value).toBe('test input');

      console.log('✓ IDEAL OUTCOME: Input value updates immediately in UI');
    });

    it('IDEAL OUTCOME: onChange called after debounce period (300ms default)', async () => {
      // Arrange
      const onChange = vi.fn();
      render(<TestWrapper initialValue="" onChange={onChange} />);

      const input = screen.getByRole('textbox');

      // Act: User types
      fireEvent.change(input, { target: { value: 'hello' } });

      // Assert: onChange not called immediately
      expect(onChange).not.toHaveBeenCalled();

      // Act: Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert: onChange called with final value
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('hello');
      });

      console.log('✓ IDEAL OUTCOME: onChange fires after 300ms debounce');
    });

    it('IDEAL OUTCOME: onChange fires only once after rapid typing', async () => {
      // Arrange
      const onChange = vi.fn();
      render(<TestWrapper initialValue="" onChange={onChange} />);

      const input = screen.getByRole('textbox');

      // Act: Rapid typing (simulating fast user input)
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.change(input, { target: { value: 'abcd' } });
      fireEvent.change(input, { target: { value: 'abcde' } });

      // Assert: onChange not called yet
      expect(onChange).not.toHaveBeenCalled();

      // Act: Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert: onChange called exactly once with final value
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('abcde');
      });

      console.log('✓ IDEAL OUTCOME: Rapid typing results in single onChange call');
    });

    it('FAILURE PREVENTED: No onChange thrashing during rapid typing', async () => {
      // Arrange
      const onChange = vi.fn();
      render(<TestWrapper initialValue="" onChange={onChange} />);

      const input = screen.getByRole('textbox');

      // Act: Simulate 10 rapid keystrokes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(input, { target: { value: `char${i}` } });
      }

      // Assert: onChange should NOT be called 10 times
      expect(onChange).not.toHaveBeenCalledTimes(10);

      // Act: Let debounce complete
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert: Only 1 call after debounce
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      console.log('✓ FAILURE PREVENTED: No onChange thrashing during rapid typing');
    });

    it('FAILURE PREVENTED: Timer cleanup on unmount prevents memory leaks', () => {
      // Arrange
      const onChange = vi.fn();
      const { unmount } = render(<TestWrapper initialValue="" onChange={onChange} />);

      const input = screen.getByRole('textbox');

      // Act: Start typing then unmount before debounce completes
      fireEvent.change(input, { target: { value: 'unfinished' } });
      unmount();

      // Act: Advance timers (would throw if timeout not cleaned)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Assert: No errors, no callback after unmount
      expect(onChange).not.toHaveBeenCalled();

      console.log('✓ FAILURE PREVENTED: Timer cleanup on unmount prevents memory leaks');
    });
  });

  describe('USER INTERACTION: Type with custom debounce timing', () => {
    it('IDEAL OUTCOME: Custom debounceMs respected (500ms)', async () => {
      // Arrange
      const onChange = vi.fn();
      render(<TestWrapper initialValue="" onChange={onChange} debounceMs={500} />);

      const input = screen.getByRole('textbox');

      // Act: Type and wait only 300ms (default)
      fireEvent.change(input, { target: { value: 'custom' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert: onChange NOT called yet (needs 500ms)
      expect(onChange).not.toHaveBeenCalled();

      // Act: Wait remaining 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Assert: onChange called after full 500ms
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('custom');
      });

      console.log('✓ IDEAL OUTCOME: Custom debounceMs (500ms) respected');
    });
  });

  describe('USER INTERACTION: Input with validation', () => {
    it('IDEAL OUTCOME: Validation errors displayed inline when showValidationErrors enabled', async () => {
      // Arrange
      const onChange = vi.fn();
      const onValidationError = vi.fn();
      render(
        <TestWrapper
          initialValue=""
          onChange={onChange}
          validation={{ maxLength: 10 }}
          showValidationErrors
          onValidationError={onValidationError}
        />
      );

      const input = screen.getByRole('textbox');

      // Act: Type beyond maxLength
      fireEvent.change(input, { target: { value: 'this is way too long' } });

      // Assert: Validation error shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Assert: onValidationError callback fired
      expect(onValidationError).toHaveBeenCalled();

      console.log('✓ IDEAL OUTCOME: Validation errors display inline');
    });

    it('IDEAL OUTCOME: Validation sanitizes input while preserving typing', async () => {
      // Arrange
      const onChange = vi.fn();
      render(
        <TestWrapper
          initialValue=""
          onChange={onChange}
          validation={{ maxLength: 5 }}
        />
      );

      const input = screen.getByRole('textbox');

      // Act: Type beyond limit
      fireEvent.change(input, { target: { value: '1234567890' } });

      // Assert: Input shows sanitized value
      expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(5);

      console.log('✓ IDEAL OUTCOME: Input sanitized while preserving UX');
    });

    it('FAILURE PREVENTED: Silent validation failures without showValidationErrors', async () => {
      // Arrange
      const onChange = vi.fn();
      render(
        <TestWrapper
          initialValue=""
          onChange={onChange}
          validation={{ maxLength: 10 }}
          showValidationErrors={false}
        />
      );

      const input = screen.getByRole('textbox');

      // Act: Type beyond limit
      fireEvent.change(input, { target: { value: 'way too long input here' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert: No error alert shown (silently handled)
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      console.log('✓ FAILURE PREVENTED: No visual errors when showValidationErrors disabled');
    });
  });

  describe('USER INTERACTION: External value changes', () => {
    it('IDEAL OUTCOME: External value updates sync when not actively typing', async () => {
      // Arrange
      const { rerender } = render(
        <DebouncedInput value="initial" onChange={vi.fn()} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // Act: External value change
      rerender(<DebouncedInput value="updated" onChange={vi.fn()} />);

      // Assert: Input reflects new value
      expect(input.value).toBe('updated');

      console.log('✓ IDEAL OUTCOME: External value changes sync to input');
    });
  });

  describe('ACCESSIBILITY: Screen reader support', () => {
    it('IDEAL OUTCOME: Input has correct ARIA attributes', () => {
      // Arrange
      render(
        <DebouncedInput
          value=""
          onChange={vi.fn()}
          aria-label="Search input"
          aria-describedby="search-help"
        />
      );

      const input = screen.getByRole('textbox');

      // Assert: ARIA attributes present
      expect(input).toHaveAttribute('aria-label', 'Search input');
      expect(input).toHaveAttribute('aria-describedby', 'search-help');

      console.log('✓ IDEAL OUTCOME: Input has correct ARIA attributes');
    });

    it('IDEAL OUTCOME: Invalid state announced to screen readers', async () => {
      // Arrange
      render(
        <DebouncedInput
          value=""
          onChange={vi.fn()}
          validation={{ maxLength: 5 }}
          showValidationErrors
        />
      );

      const input = screen.getByRole('textbox');

      // Act: Trigger validation error
      fireEvent.change(input, { target: { value: 'too long' } });

      // Assert: aria-invalid set
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });

      console.log('✓ IDEAL OUTCOME: Invalid state announced via aria-invalid');
    });
  });
});
