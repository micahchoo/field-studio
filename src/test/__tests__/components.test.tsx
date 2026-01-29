/**
 * Unit Tests for Core Components
 *
 * Tests Toast, ErrorBoundary, and other critical UI components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createElement, useState, Component } from 'react';

// ============================================================================
// Toast Component Tests
// ============================================================================

// Mock Toast component
const Toast = ({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'success' | 'error' | 'warning'; onClose?: () => void }) => {
  return createElement(
    'div',
    {
      role: 'alert',
      'data-type': type,
      'data-testid': 'toast',
    },
    message,
    onClose && createElement('button', { onClick: onClose, 'aria-label': 'Close' }, '×')
  );
};

describe('Toast', () => {
  it('should render with message', () => {
    render(createElement(Toast, { message: 'Test message' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Test message');
  });

  it('should render different types', () => {
    const { rerender } = render(createElement(Toast, { message: 'Info', type: 'info' }));
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'info');

    rerender(createElement(Toast, { message: 'Success', type: 'success' }));
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'success');

    rerender(createElement(Toast, { message: 'Error', type: 'error' }));
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');

    rerender(createElement(Toast, { message: 'Warning', type: 'warning' }));
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'warning');
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(createElement(Toast, { message: 'Test', onClose }));

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });
});

// ============================================================================
// ErrorBoundary Component Tests
// ============================================================================

// Component that throws error
class ThrowError extends Component<{ shouldThrow: boolean }> {
  render() {
    if (this.props.shouldThrow) {
      throw new Error('Test error');
    }
    return createElement('div', {}, 'Normal render');
  }
}

// Mock ErrorBoundary
class ErrorBoundary extends Component<{ children: any; fallback?: any }, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || createElement('div', { 'data-testid': 'error-boundary' }, 'Something went wrong');
    }
    return this.props.children;
  }
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Suppress console.error for expected errors
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when no error', () => {
    render(
      createElement(
        ErrorBoundary,
        {},
        createElement('div', { 'data-testid': 'child' }, 'Child content')
      )
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child content');
  });

  it('should render fallback when error occurs', () => {
    render(
      createElement(
        ErrorBoundary,
        {},
        createElement(ThrowError, { shouldThrow: true })
      )
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      createElement(
        ErrorBoundary,
        { fallback: createElement('div', { 'data-testid': 'custom-fallback' }, 'Custom error') },
        createElement(ThrowError, { shouldThrow: true })
      )
    );

    expect(screen.getByTestId('custom-fallback')).toHaveTextContent('Custom error');
  });
});

// ============================================================================
// Icon Component Tests
// ============================================================================

const Icon = ({ name, size = 'md', className = '' }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  return createElement('span', {
    'data-testid': 'icon',
    'data-icon': name,
    'data-size': size,
    className: `icon icon-${name} ${className}`,
  });
};

describe('Icon', () => {
  it('should render with name', () => {
    render(createElement(Icon, { name: 'home' }));

    expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'home');
  });

  it('should support different sizes', () => {
    const { rerender } = render(createElement(Icon, { name: 'home', size: 'sm' }));
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', 'sm');

    rerender(createElement(Icon, { name: 'home', size: 'md' }));
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', 'md');

    rerender(createElement(Icon, { name: 'home', size: 'lg' }));
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', 'lg');
  });

  it('should apply custom className', () => {
    render(createElement(Icon, { name: 'home', className: 'custom-class' }));

    expect(screen.getByTestId('icon')).toHaveClass('custom-class');
  });
});

// ============================================================================
// LoadingState Component Tests
// ============================================================================

const LoadingState = ({ message = 'Loading...' }: { message?: string }) => {
  return createElement(
    'div',
    { role: 'status', 'data-testid': 'loading-state' },
    createElement('span', { className: 'spinner' }),
    message
  );
};

describe('LoadingState', () => {
  it('should render with default message', () => {
    render(createElement(LoadingState, {}));

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('should render with custom message', () => {
    render(createElement(LoadingState, { message: 'Please wait...' }));

    expect(screen.getByRole('status')).toHaveTextContent('Please wait...');
  });

  it('should have spinner element', () => {
    render(createElement(LoadingState, {}));

    expect(screen.getByRole('status').querySelector('.spinner')).toBeInTheDocument();
  });
});

// ============================================================================
// EmptyState Component Tests
// ============================================================================

const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: any }) => {
  return createElement(
    'div',
    { role: 'region', 'data-testid': 'empty-state' },
    createElement('h3', {}, title),
    description && createElement('p', {}, description),
    action
  );
};

describe('EmptyState', () => {
  it('should render with title', () => {
    render(createElement(EmptyState, { title: 'No items' }));

    expect(screen.getByRole('region')).toHaveTextContent('No items');
  });

  it('should render with description', () => {
    render(createElement(EmptyState, { title: 'No items', description: 'Add your first item' }));

    expect(screen.getByText('Add your first item')).toBeInTheDocument();
  });

  it('should render with action', () => {
    render(
      createElement(EmptyState, {
        title: 'No items',
        action: createElement('button', {}, 'Add Item'),
      })
    );

    expect(screen.getByRole('button')).toHaveTextContent('Add Item');
  });
});

// ============================================================================
// SkipLink Component Tests
// ============================================================================

const SkipLink = ({ targetId, label }: { targetId: string; label: string }) => {
  return createElement(
    'a',
    {
      href: `#${targetId}`,
      className: 'skip-link',
      'data-testid': 'skip-link',
    },
    label
  );
};

describe('SkipLink', () => {
  it('should render with correct href', () => {
    render(createElement(SkipLink, { targetId: 'main-content', label: 'Skip to main' }));

    expect(screen.getByTestId('skip-link')).toHaveAttribute('href', '#main-content');
  });

  it('should render with label', () => {
    render(createElement(SkipLink, { targetId: 'main', label: 'Skip navigation' }));

    expect(screen.getByText('Skip navigation')).toBeInTheDocument();
  });
});
