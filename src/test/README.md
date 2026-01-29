# Test Suite Documentation

## Overview

This directory contains a comprehensive test suite for the IIIF Field Archive Studio, including unit tests, integration tests, and component tests.

## Test Structure

```
src/test/
├── setup.ts                          # Global test setup and configuration
├── __tests__/                        # Test files
│   ├── iiifTypes.test.ts            # IIIF type utilities
│   ├── mediaTypes.test.ts           # Media type detection
│   ├── iiifValidation.test.ts       # IIIF validation
│   ├── filenameUtils.test.ts        # Filename parsing and sanitization
│   ├── fuzzyMatch.test.ts           # Fuzzy search algorithms
│   ├── sanitization.test.ts         # XSS prevention and HTML sanitization
│   ├── vault.test.ts                # Normalized state management
│   ├── storage.test.ts              # IndexedDB operations
│   ├── actions.test.ts              # Action dispatcher and history
│   ├── iiifBuilder.test.ts          # IIIF resource construction
│   ├── useVaultSelectors.test.tsx   # Vault selector hooks
│   ├── MetadataEditor.test.tsx      # Metadata editing component
│   └── integration.test.tsx         # End-to-end workflows
└── README.md                         # This file
```

## Test Coverage

### Utilities (8 test files)
- **iiifTypes.test.ts** (660 lines): MIME types, language maps, metadata, agents, URIs, dates, rights
- **mediaTypes.test.ts** (521 lines): File type detection, extension mapping, content type classification
- **iiifValidation.test.ts** (496 lines): ID validation, URI checking, duplicate detection
- **filenameUtils.test.ts** (193 lines): Filename sanitization, sequence detection, path parsing
- **fuzzyMatch.test.ts** (174 lines): Fuzzy matching, scoring, highlighting, filtering, sorting
- **sanitization.test.ts** (206 lines): HTML/URL sanitization, XSS prevention, content security

### Services (4 test files)
- **vault.test.ts** (258 lines): Normalized state, entity operations, relationships
- **storage.test.ts** (243 lines): IndexedDB, file storage, quota management
- **actions.test.ts** (294 lines): Action dispatcher, validation, history, undo/redo
- **iiifBuilder.test.ts** (325 lines): Manifest/Canvas/Collection creation, resource construction

### Hooks (1 test file)
- **useVaultSelectors.test.tsx** (203 lines): Entity selectors, manifest/canvas queries, parent/child relationships

### Components (1 test file)
- **MetadataEditor.test.tsx** (241 lines): Metadata editing, validation, accessibility

### Integration (1 test file)
- **integration.test.tsx** (341 lines): Import/export workflows, search, undo/redo

**Total: 15 test files, ~3,800 lines of test code**

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npm test filenameUtils.test.ts
```

### Debug tests
```bash
npm run test:debug
```

## Test Configuration

Tests are configured using Vitest with the following settings:

- **Environment**: happy-dom (lightweight DOM implementation)
- **Setup File**: `src/test/setup.ts` (runs before all tests)
- **Globals**: Enabled (no need to import `describe`, `it`, `expect`)
- **Coverage Provider**: v8
- **Coverage Reports**: text, html, lcov

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../utils/example';

describe('FunctionName', () => {
  it('should do something specific', () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react';
import { useCustomHook } from '../../hooks/useCustomHook';

it('should return expected value', () => {
  const { result } = renderHook(() => useCustomHook());
  expect(result.current).toBe(expectedValue);
});
```

### Testing Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../../components/MyComponent';

it('should render and interact', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  const button = screen.getByRole('button', { name: /click me/i });
  await user.click(button);

  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');

// Mock a module
vi.mock('../../services/storage', () => ({
  saveFile: vi.fn(),
  getFile: vi.fn(),
}));

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
} as any;
```

## Test Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('should calculate total', () => {
  // Arrange
  const items = [1, 2, 3];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(6);
});
```

### Testing Async Operations

```typescript
it('should load data', async () => {
  const data = await loadData();
  expect(data).toBeDefined();
});

it('should wait for element', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  });
});
```

### Testing Error Conditions

```typescript
it('should throw error for invalid input', () => {
  expect(() => processInvalidData()).toThrow('Invalid data');
});

it('should handle error gracefully', async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

  render(<Component fetch={mockFetch} />);

  await waitFor(() => {
    expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
  });
});
```

## Code Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Utilities** | 90% | TBD |
| **Services** | 85% | TBD |
| **Hooks** | 80% | TBD |
| **Components** | 75% | TBD |
| **Overall** | 80% | TBD |

## Continuous Integration

Tests run automatically on:
- **Pre-commit**: via Git hooks (optional)
- **Pull Requests**: via GitHub Actions
- **Main branch**: after merge

## Troubleshooting

### Tests failing with "Cannot find module"
- Check that all imports use correct paths (relative to test file)
- Ensure `tsconfig.json` has correct path mappings

### IndexedDB tests failing
- Happy-dom doesn't fully support IndexedDB
- Consider using jsdom or fake-indexeddb for these tests

### Component tests timing out
- Increase timeout in `vitest.config.ts`
- Use `waitFor` with appropriate timeout option

### Coverage not generated
- Run with `--coverage` flag
- Check that files are not excluded in config

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **One Assertion Per Test**: Keep tests focused and easy to debug
3. **Use Descriptive Test Names**: Test names should clearly state what is being tested
4. **Avoid Test Interdependence**: Each test should be able to run independently
5. **Clean Up After Tests**: Use `afterEach` to reset state
6. **Mock External Dependencies**: Don't rely on real API calls or file system
7. **Test Edge Cases**: Empty inputs, null values, boundary conditions
8. **Accessibility Testing**: Include tests for keyboard navigation and ARIA labels

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass before committing
3. Maintain or improve code coverage
4. Update this README if adding new test categories

---

*Last Updated: 2026-01-29*
