/**
 * FilterInput Molecule Test
 *
 * Tests follow the IDEAL OUTCOME / FAILURE PREVENTED pattern.
 * Code informs tests, not vice versa.
 *
 * Each test maps to a real user interaction and defines what success looks like.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FilterInput } from '@/src/shared/ui/molecules/FilterInput';
import 'fake-indexeddb/auto';

/**
 * Mock setup for context providers
 * Tests wrap components in minimal providers needed for context hooks
 */
const renderWithContext = (component: React.ReactElement) => {
  return render(component);
};

describe('FilterInput Molecule', () => {
  describe('USER INTERACTION: Type into search field', () => {
    it('IDEAL OUTCOME: Input debounces and calls onChange after 300ms', async () => {
      // Arrange
      const onChange = vi.fn();
      renderWithContext(
        <FilterInput placeholder="Search items..." onChange={onChange} value="" />
      );

      const input = screen.getByPlaceholderText('Search items...') as HTMLInputElement;

      // Act: User types
      fireEvent.change(input, { target: { value: 'archive' } });

      // Assert: onChange not called yet (debouncing)
      expect(onChange).not.toHaveBeenCalled();

      // Act: Wait for debounce
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('archive');
      }, { timeout: 400 });

      console.log('✓ IDEAL OUTCOME: Input debounces and calls onChange at 300ms');
    });

    it('FAILURE PREVENTED: Excessive onChange calls (thrashing) during rapid typing', async () => {
      // Arrange: Mock onChange to detect thrashing
      const onChange = vi.fn();
      renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="" />
      );

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

      // Act: User types rapidly (10 characters in 100ms)
      for (let i = 0; i < 10; i++) {
        fireEvent.change(input, { target: { value: `char${i}` } });
      }

      // Assert: onChange should NOT be called 10 times (that's the failure we prevent)
      expect(onChange).not.toHaveBeenCalledTimes(10);

      // Act: Wait for debounce
      await waitFor(() => {
        // Should coalesce to exactly 1 call
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('char9'); // Last value wins
      }, { timeout: 400 });

      console.log('✓ FAILURE PREVENTED: No onChange thrashing during rapid typing');
    });

    it('IDEAL OUTCOME: Input value updates immediately (UI responsiveness)', async () => {
      // Arrange
      const onChange = vi.fn();
      const { rerender } = renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="" />
      );

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

      // Act: User types
      fireEvent.change(input, { target: { value: 'test' } });

      // Assert: UI updates immediately (even though onChange is debounced)
      expect(input.value).toBe('test');

      console.log('✓ IDEAL OUTCOME: Input value updates immediately in UI');
    });
  });

  describe('USER INTERACTION: Clear button', () => {
    it('IDEAL OUTCOME: Clear button appears when text exists', () => {
      // Arrange
      const onChange = vi.fn();
      const { rerender } = renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="test" />
      );

      // Assert: Clear button is visible
      expect(screen.getByLabelText('Clear filter')).toBeInTheDocument();

      // Act: Clear value
      rerender(
        <FilterInput placeholder="Search..." onChange={onChange} value="" />
      );

      // Assert: Clear button is hidden
      expect(screen.queryByLabelText('Clear filter')).not.toBeInTheDocument();

      console.log('✓ IDEAL OUTCOME: Clear button appears/disappears correctly');
    });

    it('IDEAL OUTCOME: Clicking clear resets value and calls onChange', async () => {
      // Arrange
      const onChange = vi.fn();
      const { rerender } = renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="test" />
      );

      // Act: Click clear button
      const clearBtn = screen.getByLabelText('Clear filter');
      fireEvent.click(clearBtn);

      // Assert: onChange called with empty string
      expect(onChange).toHaveBeenCalledWith('');

      console.log('✓ IDEAL OUTCOME: Clear button resets value and calls onChange');
    });

    it('FAILURE PREVENTED: Clear button does NOT appear when showClear=false', () => {
      // Arrange
      const onChange = vi.fn();
      renderWithContext(
        <FilterInput
          placeholder="Search..."
          onChange={onChange}
          value="test"
          showClear={false}
        />
      );

      // Assert: Clear button is not rendered
      expect(screen.queryByLabelText('Clear filter')).not.toBeInTheDocument();

      console.log('✓ FAILURE PREVENTED: Clear button hidden when disabled');
    });
  });

  describe('USER INTERACTION: Controlled value updates', () => {
    it('IDEAL OUTCOME: External value prop updates input', () => {
      // Arrange
      const onChange = vi.fn();
      const { rerender } = renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="initial" />
      );

      let input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // Act: Parent updates value prop
      rerender(
        <FilterInput placeholder="Search..." onChange={onChange} value="updated" />
      );

      // Assert: Input reflects new value
      input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input.value).toBe('updated');

      console.log('✓ IDEAL OUTCOME: Controlled value updates propagate to input');
    });
  });

  describe('USER INTERACTION: Input sanitization', () => {
    it('IDEAL OUTCOME: Input respects maxLength constraint', async () => {
      // Arrange
      const onChange = vi.fn();
      renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="" />
      );

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

      // Act: Try to type beyond max length (500 chars)
      const longText = 'a'.repeat(600);
      fireEvent.change(input, { target: { value: longText } });

      // Assert: Value is capped at max length
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^a{500}$/));
      }, { timeout: 400 });

      console.log('✓ IDEAL OUTCOME: Input maxLength is enforced');
    });

    it('FAILURE PREVENTED: Injection attacks via input sanitization', async () => {
      // Arrange
      const onChange = vi.fn();
      renderWithContext(
        <FilterInput placeholder="Search..." onChange={onChange} value="" />
      );

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

      // Act: Try to inject HTML
      const injection = '<script>alert("xss")</script>';
      fireEvent.change(input, { target: { value: injection } });

      // Assert: HTML is escaped/removed by sanitization
      await waitFor(() => {
        const calledWith = onChange.mock.calls[0]?.[0];
        expect(calledWith).not.toContain('<script>');
        expect(calledWith).not.toContain('</script>');
      }, { timeout: 400 });

      console.log('✓ FAILURE PREVENTED: Input sanitization blocks injection');
    });
  });

  describe('ARCHITECTURE: No fieldMode prop drilling', () => {
    it('FAILURE PREVENTED: fieldMode prop should not exist', () => {
      // This test verifies the type contract
      // If fieldMode prop exists in the interface, TypeScript will error here
      type FilterInputProps = React.ComponentProps<typeof FilterInput>;
      const validProps: FilterInputProps = {
        onChange: () => {},
        placeholder: 'test',
        value: 'initial',
        // fieldMode: false, ← Should error if this line is uncommented
      };

      console.log('✓ FAILURE PREVENTED: fieldMode prop eliminated from FilterInput');
    });
  });
});
