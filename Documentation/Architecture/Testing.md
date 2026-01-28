# Field Studio: Testing Infrastructure

This document outlines the current testing gap in Field Studio and provides recommendations for establishing a comprehensive testing strategy.

---

## Current State: Zero Test Coverage

### Verification Results

| Metric | Status | Details |
|--------|--------|---------|
| Test Files | **0** | No `*.test.ts`, `*.test.tsx`, or `*.spec.ts` files found |
| Jest Configuration | **None** | No `jest.config.js` or `jest.config.ts` |
| Vitest Configuration | **None** | No `vitest.config.ts` |
| Cypress Configuration | **None** | No `cypress/` directory or config |
| Playwright Configuration | **None** | No `playwright.config.ts` |
| Test Scripts in package.json | **None** | No `test`, `test:unit`, or `test:e2e` scripts |
| CI Test Runs | **None** | No GitHub Actions test workflow |

### package.json Scripts Analysis

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
    // NO TEST SCRIPTS
  }
}
```

### Missing Testing Documentation

The following documentation files contain **no mention** of testing:

- `README.md` - No testing section
- `Documentation/Architecture/DevelopmentPatterns.md` - No testing patterns
- All component documentation - No usage examples or test guidance

---

## Testing Gap Impact

### Risks

| Risk Area | Impact | Likelihood |
|-----------|--------|------------|
| **Regression Bugs** | High | High - No safety net for changes |
| **IIIF Compliance** | Critical | Medium - Spec violations could go undetected |
| **Export Integrity** | Critical | Medium - Data loss in exports |
| **Cross-Browser Issues** | Medium | High - No automated browser testing |
| **Performance Degradation** | Medium | Medium - No benchmarks |
| **Accessibility Violations** | High | Medium - No a11y testing |

### Affected Code Areas

```
High-Risk Untested Code:
├── services/
│   ├── vault.ts (1134 lines) - Core state management
│   ├── exportService.ts (58KB) - Archive export
│   ├── staticSiteExporter.ts (31KB) - Site generation
│   ├── iiifBuilder.ts (21KB) - IIIF construction
│   └── csvImporter.ts (19KB) - Data import
├── components/
│   ├── BoardView.tsx (62KB) - Complex interactions
│   ├── ArchiveView.tsx (40KB) - Tree manipulation
│   └── Inspector.tsx (41KB) - Property editing
└── public/sw.js (6465 bytes) - Service Worker (critical)
```

---

## Recommended Testing Strategy

### 1. Unit Testing (Priority: Critical)

**Framework:** Vitest (recommended for Vite projects)

**Target Coverage:** 70%+ for services, 50%+ for utilities

#### Service Tests

```typescript
// services/__tests__/vault.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { vault, NormalizedState } from '../vault';

describe('Vault State Management', () => {
  let state: NormalizedState;

  beforeEach(() => {
    state = vault.createEmptyState();
  });

  describe('normalize', () => {
    it('should flatten nested IIIF structure', () => {
      const manifest = createMockManifest();
      const normalized = vault.normalize(manifest);
      
      expect(normalized.entities.Manifest).toHaveProperty(manifest.id);
      expect(Object.keys(normalized.entities.Canvas)).toHaveLength(3);
    });

    it('should preserve extension properties', () => {
      const manifest = createMockManifest({
        'custom:field': 'value'
      });
      const normalized = vault.normalize(manifest);
      
      expect(normalized.extensions[manifest.id]).toEqual({
        'custom:field': 'value'
      });
    });
  });

  describe('denormalize', () => {
    it('should reconstruct valid IIIF manifest', () => {
      const manifest = createMockManifest();
      const normalized = vault.normalize(manifest);
      const reconstructed = vault.denormalize(normalized);
      
      expect(reconstructed).toHaveProperty('type', 'Manifest');
      expect(reconstructed.items).toHaveLength(3);
    });
  });
});
```

#### Utility Tests

```typescript
// utils/__tests__/iiifBehaviors.test.ts
import { describe, it, expect } from 'vitest';
import { getConflictingBehaviors, isValidBehavior } from '../iiifBehaviors';

describe('IIIF Behaviors', () => {
  describe('getConflictingBehaviors', () => {
    it('should return conflicting behavior pairs', () => {
      expect(getConflictingBehaviors('auto-advance')).toContain('no-auto-advance');
      expect(getConflictingBehaviors('repeat')).toContain('no-repeat');
    });
  });
});
```

#### Hook Tests

```typescript
// hooks/__tests__/useURLState.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useURLState } from '../useURLState';

describe('useURLState', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('should parse initial state from URL', () => {
    window.location.hash = '#mode=boards&id=test-123';
    
    const { result } = renderHook(() => useURLState('archive'));
    
    expect(result.current.urlState.mode).toBe('boards');
    expect(result.current.urlState.selectedId).toBe('test-123');
  });

  it('should update URL when mode changes', () => {
    const { result } = renderHook(() => useURLState('archive'));
    
    act(() => {
      result.current.setMode('viewer');
    });
    
    expect(window.location.hash).toContain('mode=viewer');
  });
});
```

---

### 2. Integration Testing (Priority: High)

**Framework:** Vitest + Testing Library

**Target:** Component interactions and service integration

```typescript
// components/__tests__/BoardView.integration.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardView } from '../views/BoardView';
import { createMockRoot } from '../../test-utils/factories';

describe('BoardView Integration', () => {
  it('should allow drag-and-drop from archive', () => {
    const root = createMockRoot();
    render(<BoardView root={root} settings={defaultSettings} />);
    
    const dropZone = screen.getByTestId('board-canvas');
    const mockDataTransfer = {
      getData: vi.fn().mockReturnValue('canvas-123'),
    };
    
    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });
    
    expect(screen.getByText('Canvas Label')).toBeInTheDocument();
  });

  it('should maintain connection after item move', () => {
    // Test connection persistence through state changes
  });
});
```

---

### 3. E2E Testing (Priority: Medium)

**Framework:** Playwright (recommended)

**Critical User Journeys:**

```typescript
// e2e/ingest-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete ingest and export flow', async ({ page }) => {
  // 1. Upload files
  await page.goto('/');
  await page.getByText('Upload Files').click();
  await page.setInputFiles('input[type="file"]', [
    'fixtures/image1.jpg',
    'fixtures/image2.jpg'
  ]);
  
  // 2. Organize in staging
  await page.waitForSelector('[data-testid="staging-workbench"]');
  await page.dragAndDrop(
    '[data-testid="source-item-1"]',
    '[data-testid="collection-1"]'
  );
  
  // 3. Edit metadata
  await page.click('[data-testid="metadata-tab"]');
  await page.fill('[data-testid="label-input"]', 'Test Manifest');
  
  // 4. Export
  await page.click('[data-testid="export-button"]');
  await page.click('[data-testid="export-standard"]');
  
  // Verify download
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toMatch(/archive-.*\.zip/);
});
```

---

### 4. IIIF Compliance Testing (Priority: Critical)

**Custom Validator Tests:**

```typescript
// services/__tests__/iiifCompliance.test.ts
import { describe, it, expect } from 'vitest';
import { validateManifest } from '../validator';

describe('IIIF Presentation API 3.0 Compliance', () => {
  describe('Required Properties', () => {
    it('should reject manifest without @context', () => {
      const manifest = createValidManifest();
      delete (manifest as any)['@context'];
      
      const issues = validateManifest(manifest);
      
      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'required',
          property: '@context'
        })
      );
    });

    it('should reject canvas without width/height', () => {
      const manifest = createValidManifest();
      delete (manifest.items[0] as any).width;
      
      const issues = validateManifest(manifest);
      
      expect(issues.some(i => 
        i.property === 'width' && i.message.includes('required')
      )).toBe(true);
    });
  });

  describe('Viewer Compatibility', () => {
    it('should flag unsupported features for Mirador', () => {
      const manifest = createManifestWith('choice');
      const report = checkCompatibility(manifest);
      
      expect(report.mirador.warnings).toContain('Choice not fully supported');
    });
  });
});
```

---

### 5. Service Worker Testing (Priority: High)

**Challenge:** Testing `public/sw.js` requires specialized setup

```typescript
// public/__tests__/sw.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ServiceWorkerTestEnvironment } from 'vitest-sw';

describe('IIIF Image API Service Worker', () => {
  let swEnv: ServiceWorkerTestEnvironment;

  beforeAll(async () => {
    swEnv = await ServiceWorkerTestEnvironment.create('./sw.js');
  });

  it('should intercept IIIF image requests', async () => {
    const response = await swEnv.fetch('/iiif/image/abc/full/500,/0/default.jpg');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
  });

  it('should generate valid info.json', async () => {
    const response = await swEnv.fetch('/iiif/image/abc/info.json');
    const info = await response.json();
    
    expect(info).toHaveProperty('@context');
    expect(info).toHaveProperty('protocol');
    expect(info.tiles).toBeDefined();
  });
});
```

---

## Test Configuration

### Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test-setup.ts',
        '**/*.d.ts',
      ],
    },
  },
});
```

### Test Setup File

```typescript
// test-setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB
global.indexedDB = require('fake-indexeddb');

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Testing Utilities

### Mock Factories

```typescript
// test-utils/factories.ts
import { IIIFManifest, IIIFCanvas } from '../types';

export function createMockManifest(overrides?: Partial<IIIFManifest>): IIIFManifest {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: 'https://example.com/manifest-1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [
      createMockCanvas({ id: 'https://example.com/canvas-1' }),
      createMockCanvas({ id: 'https://example.com/canvas-2' }),
    ],
    ...overrides,
  };
}

export function createMockCanvas(overrides?: Partial<IIIFCanvas>): IIIFCanvas {
  return {
    id: 'https://example.com/canvas-1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1200,
    height: 1600,
    items: [],
    ...overrides,
  };
}
```

### Test Helpers

```typescript
// test-utils/helpers.ts
import { render } from '@testing-library/react';
import { VaultProvider } from '../hooks/useIIIFEntity';

export function renderWithVault(ui: React.ReactElement, { initialState } = {}) {
  return render(
    <VaultProvider initialState={initialState}>
      {ui}
    </VaultProvider>
  );
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Install Vitest and Testing Library
- [ ] Configure test environment
- [ ] Write first unit tests for `utils/iiifBehaviors.ts`
- [ ] Set up GitHub Actions workflow

### Phase 2: Core Services (Weeks 2-3)
- [ ] Tests for `services/vault.ts`
- [ ] Tests for `services/validator.ts`
- [ ] Tests for `services/validationHealer.ts`
- [ ] Tests for `services/csvImporter.ts`

### Phase 3: Components (Weeks 4-5)
- [ ] Tests for `Inspector.tsx`
- [ ] Tests for `MetadataEditor.tsx`
- [ ] Tests for `BoardView.tsx` interactions
- [ ] Tests for `ArchiveView.tsx` tree operations

### Phase 4: Integration & E2E (Week 6)
- [ ] Set up Playwright
- [ ] Write critical path E2E tests
- [ ] Add visual regression testing
- [ ] Document testing patterns

### Phase 5: Compliance & Quality (Week 7)
- [ ] IIIF spec compliance test suite
- [ ] Viewer compatibility tests
- [ ] Performance benchmarks
- [ ] Accessibility audit tests

---

## Testing Best Practices

### Do's

1. **Test behavior, not implementation**
   ```typescript
   // Good: Test what the user sees
   expect(screen.getByText('Export Complete')).toBeInTheDocument();
   
   // Bad: Test internal state
   expect(component.state.exportStatus).toBe('complete');
   ```

2. **Use semantic queries**
   ```typescript
   // Good
   screen.getByRole('button', { name: /export/i });
   
   // Bad
   screen.getByTestId('export-btn');
   ```

3. **Mock external dependencies**
   ```typescript
   vi.mock('../services/exportService', () => ({
     exportService: {
       exportArchive: vi.fn().mockResolvedValue({ blob: new Blob() }),
     },
   }));
   ```

### Don'ts

1. **Don't test third-party libraries**
2. **Don't write tests that pass when broken**
3. **Don't over-mock - test real interactions where possible**
4. **Don't skip cleanup in tests**

---

## Related Documentation

- [DevelopmentPatterns.md](./DevelopmentPatterns.md) - Development guidelines
- [Services.md](./Services.md) - Service layer (high priority for testing)
- [Components.md](./Components.md) - Component catalog
