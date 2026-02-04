# Testing Suite based on Atomic — Implementation Plan                                    
Now I have a comprehensive understanding of the project. Let me compile a complete testing plan based on all the documentation and code I've reviewed.

---

# Comprehensive Test Suite Plan for Field Studio

## Executive Summary

Based on my analysis of the Atomic System Architecture, Implementation Plan, ESLint config, audit scripts, and current test suite state, the existing tests have **good structural organization** but suffer from three critical problems that make them "not great":

1. **Inconsistent adherence to architectural patterns** - Mocks violate atomic design constraints
2. **AI-generated code chaos** - No automated enforcement of testing patterns
3. **Mock-heavy, implementation-coupled tests** - Tests verify code structure, not user value

Here is a comprehensive plan for a **modular, AI-resilient test suite**.

---

## 1. Testing Philosophy: "Guardrails, Not Guidelines"

Given AI-generated code is inconsistent, the test suite must **enforce constraints automatically**, not document them for humans to follow.

### Core Principles

| Principle | Enforcement Mechanism |
|-----------|----------------------|
| **Atomic Layer Compliance** | ESLint rules + runtime prop validation |
| **User-Goal Testing** | Required `IDEAL OUTCOME` / `FAILURE PREVENTED` pattern |
| **No Implementation Coupling** | Ban mocks of internal modules; use real data |
| **Feature-Sliced Isolation** | Import boundary tests per FSD layer |

---

## 2. Test Suite Architecture

### 2.1 Directory Structure (Aligned with FSD + Atomic)

```
src/test/
├── __tests__/
│   ├── README.md                    # User-goal testing philosophy
│   │
│   ├── shared/                      # Tests for shared layer (atoms, molecules, lib)
│   │   ├── atoms/
│   │   │   ├── Button.test.tsx      # Zero mocks, design token validation
│   │   │   └── Input.test.tsx
│   │   ├── molecules/
│   │   │   ├── SearchField.test.tsx # Local state only, props-driven
│   │   │   └── FilterInput.test.tsx
│   │   └── lib/
│   │       ├── useDebouncedValue.test.ts
│   │       └── useContextualStyles.test.ts
│   │
│   ├── features/                    # Tests for feature slices
│   │   ├── archive/
│   │   │   ├── organisms/
│   │   │   │   └── ArchiveGrid.test.tsx
│   │   │   └── model/
│   │   │       └── archiveFilter.test.ts
│   │   ├── board-design/
│   │   └── metadata-edit/
│   │
│   ├── integration/                 # Cross-feature workflows
│   │   ├── import-to-export.test.ts
│   │   └── edit-to-view.test.ts
│   │
│   └── e2e/                         # Full user journeys
│       ├── field-researcher-workflow.test.ts
│       └── archivist-workflow.test.ts
│
├── fixtures/                        # Test data hierarchy
│   ├── atoms/                       # Minimal props for atoms
│   ├── molecules/                   # ContextualClassNames fixtures
│   ├── entities/                    # IIIF entity factories
│   ├── real-data/                   # From .Images iiif test/
│   │   └── README.md                # How to use real files
│   └── index.ts                     # Barrel exports
│
├── utils/                           # Test utilities
│   ├── renderWithProviders.tsx      # Template wrappers
│   ├── assertAtomicCompliance.ts    # Layer violation detection
│   ├── createIIIFEntity.ts          # Factory functions
│   └── matchIdealPattern.ts         # IDEAL/FAILURE test helper
│
└── setup.ts                         # Vitest setup (minimal mocks)
```

### 2.2 Test Categories by Atomic Layer

| Layer | Test Location | What to Test | What NOT to Test |
|-------|--------------|--------------|------------------|
| **Atoms** | `shared/atoms/` | Props → output mapping, a11y, tokens | Hooks, context, business logic |
| **Molecules** | `shared/molecules/` | Local state, composition, props flow | Domain hooks, API calls |
| **Organisms** | `features/*/organisms/` | Domain logic, feature integration | Other features' internals |
| **Templates** | `shared/templates/` | Context provision, prop drilling | Data fetching |
| **Integration** | `integration/` | Cross-feature workflows | Implementation details |

---

## 3. Modular Test Building Blocks

### 3.1 The `assertAtomicCompliance` Utility

A test utility that **automatically verifies** components follow atomic layer constraints:

```typescript
// src/test/utils/assertAtomicCompliance.ts
import { render } from '@testing-library/react';
import { parseSource } from './parseSource';

export async function assertAtomicCompliance(
  Component: React.ComponentType<any>,
  options: {
    layer: 'atom' | 'molecule' | 'organism';
    sourcePath: string;
  }
) {
  const source = await parseSource(options.sourcePath);
  
  const violations: string[] = [];
  
  // ATOM: No hook imports
  if (options.layer === 'atom') {
    if (source.includes('useState') || source.includes('useEffect')) {
      violations.push('Atoms cannot use React hooks');
    }
    if (source.match(/from ['"][^'"]*hooks['"]/)) {
      violations.push('Atoms cannot import from hooks/');
    }
  }
  
  // MOLECULE: No context hooks
  if (options.layer === 'molecule') {
    const forbidden = ['useAppSettings', 'useContextualStyles', 'useTerminology'];
    for (const hook of forbidden) {
      if (source.includes(hook)) {
        violations.push(`Molecules cannot use ${hook} - receive via props`);
      }
    }
  }
  
  // ORGANISM: No cross-feature imports
  if (options.layer === 'organism') {
    // Detected via ESLint, but can double-check here
  }
  
  return {
    pass: violations.length === 0,
    violations,
  };
}
```

### 3.2 The `matchIdealPattern` Helper

Enforces the `IDEAL OUTCOME` / `FAILURE PREVENTED` test structure:

```typescript
// src/test/utils/matchIdealPattern.ts
import { expect } from 'vitest';

export function itIdeal(
  description: string,
  testFn: () => void | Promise<void>
) {
  return it(`IDEAL OUTCOME: ${description}`, async () => {
    console.log(`\n🎯 Testing: ${description}`);
    await testFn();
    console.log(`✅ IDEAL achieved: ${description}`);
  });
}

export function itPrevents(
  failure: string,
  testFn: () => void | Promise<void>
) {
  return it(`FAILURE PREVENTED: ${failure}`, async () => {
    console.log(`\n🛡️ Preventing: ${failure}`);
    await testFn();
    console.log(`✅ FAILURE prevented: ${failure}`);
  });
}

// Usage in tests:
describe('User Goal: Import media', () => {
  describe('User Interaction: Drag-drop files', () => {
    itIdeal('Canvas created with correct dimensions', () => {
      // test code
    });
    
    itPrevents('Silent import failures', () => {
      // test code
    });
  });
});
```

### 3.3 The `renderWithTemplate` Provider

Eliminates mock chaos by providing **real context via templates**:

```typescript
// src/test/utils/renderWithProviders.tsx
import { render } from '@testing-library/react';
import { FieldModeTemplate } from '@/src/shared/templates/FieldModeTemplate';

export function renderWithTemplate(
  ui: React.ReactElement,
  options: {
    fieldMode?: boolean;
    abstractionLevel?: 'simple' | 'advanced';
  } = {}
) {
  const { fieldMode = false, abstractionLevel = 'simple' } = options;
  
  return render(
    <FieldModeTemplate 
      fieldMode={fieldMode} 
      abstractionLevel={abstractionLevel}
    >
      {({ cx, t, isAdvanced }) => 
        React.cloneElement(ui, { cx, fieldMode, t, isAdvanced })
      }
    </FieldModeTemplate>
  );
}
```

---

## 4. AI-Resilient Enforcement Mechanisms

### 4.1 ESLint Rules for Test Quality

Add to `eslint.config.js`:

```javascript
// Test-specific quality rules
{
  files: ['**/*.test.{ts,tsx}'],
  rules: {
    // Enforce IDEAL/FAILURE pattern
    'no-restricted-syntax': ['error', {
      selector: 'CallExpression[callee.name="it"] Literal[value!=/IDEAL OUTCOME|FAILURE PREVENTED/]',
      message: 'Tests must use itIdeal() or itPrevents() helpers, or start with "IDEAL OUTCOME:" or "FAILURE PREVENTED:"',
    }],
    
    // Ban implementation-detail mocks
    'no-restricted-imports': ['error', {
      patterns: [
        // Ban mocking internal modules
        { 
          group: ['**/mocks/@/services/*', '**/mocks/@/hooks/*'],
          message: 'Do not mock internal modules. Use real implementations or fixture data.'
        },
      ],
    }],
    
    // Require real data for integration tests
    'test-data-requirement': 'warn', // Custom rule
  },
}
```

### 4.2 Pre-Commit Hooks

```bash
#!/bin/bash
# .husky/pre-commit (or equivalent)

# 1. Run atomic compliance check
npm run test:atomic-compliance

# 2. Verify test pattern adherence
npm run test:pattern-check

# 3. Run affected tests only
npm run test:changed
```

### 4.3 The `scripts/audit-tests.ts` Script

Extend the existing `audit-props.ts` pattern for tests:

```typescript
#!/usr/bin/env node
/**
 * Test Suite Quality Audit
 * 
 * Scans all test files and reports:
 * - IDEAL/FAILURE pattern adherence
 * - Mock usage violations
 * - Atomic layer compliance
 * - Real data usage percentage
 */

import fs from 'fs';
import path from 'path';

interface TestAuditResult {
  totalTests: number;
  idealPatternTests: number;
  failurePatternTests: number;
  mockViolations: Array<{ file: string; line: number; mock: string }>;
  realDataTests: number;
  atomicViolations: Array<{ file: string; layer: string; violation: string }>;
}

function auditTestFile(filePath: string): Partial<TestAuditResult> {
  const content = fs.readFileSync(filePath, 'utf8');
  
  return {
    idealPatternTests: (content.match(/IDEAL OUTCOME/g) || []).length,
    failurePatternTests: (content.match(/FAILURE PREVENTED/g) || []).length,
    mockViolations: findMockViolations(content, filePath),
    usesRealData: content.includes('ActionTestData') || 
                  content.includes('createTestFile') ||
                  content.includes('.Images iiif test'),
  };
}

// Generate report comparing to targets
const TARGETS = {
  idealPatternPercentage: 100,
  mockFreePercentage: 80,
  realDataPercentage: 50,
};
```

---

## 5. Layer-Specific Testing Strategies

### 5.1 Atoms (`shared/ui/atoms/`)

**Testing Strategy:** Pure function verification

```typescript
// src/test/__tests__/shared/atoms/Button.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/src/shared/ui/atoms';
import { assertAtomicCompliance } from '@/test/utils/assertAtomicCompliance';

describe('Button Atom', () => {
  // Automatic atomic compliance check
  it('ARCHITECTURE: Has zero hooks and pure props-driven output', async () => {
    const compliance = await assertAtomicCompliance(Button, {
      layer: 'atom',
      sourcePath: 'src/shared/ui/atoms/Button.tsx',
    });
    expect(compliance.violations).toEqual([]);
  });
  
  itIdeal('Renders with correct variant styles', () => {
    render(<Button variant="primary">Click</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600'); // From design tokens
  });
  
  itIdeal('Respects disabled state', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 5.2 Molecules (`shared/ui/molecules/`)

**Testing Strategy:** Props-driven, context-free

```typescript
// src/test/__tests__/shared/molecules/SearchField.test.tsx
import { describe, expect, it } from 'vitest';
import { renderWithTemplate } from '@/test/utils/renderWithProviders';
import { assertAtomicCompliance } from '@/test/utils/assertAtomicCompliance';
import { itIdeal, itPrevents } from '@/test/utils/matchIdealPattern';

describe('SearchField Molecule', () => {
  // Compliance: No context hooks
  it('ARCHITECTURE: Receives cx and fieldMode via props', async () => {
    const compliance = await assertAtomicCompliance(SearchField, {
      layer: 'molecule',
      sourcePath: 'src/shared/ui/molecules/SearchField.tsx',
    });
    expect(compliance.violations).toEqual([]);
  });
  
  itIdeal('Debounces onChange after 300ms', async () => {
    // Uses real debounce, not mock
    const onChange = vi.fn();
    
    const { getByRole } = renderWithTemplate(
      <SearchField onChange={onChange} />,
      { fieldMode: false }
    );
    
    // Test actual debounce behavior
  });
  
  itPrevents('Hook calls in molecule layer', () => {
    // TypeScript-level verification
    type Props = React.ComponentProps<typeof SearchField>;
    // Verify no 'settings' or direct context in props
  });
});
```

### 5.3 Organisms (`features/*/ui/organisms/`)

**Testing Strategy:** Domain logic with real data

```typescript
// src/test/__tests__/features/archive/organisms/ArchiveGrid.test.tsx
import { describe, expect, it } from 'vitest';
import { ActionTestData } from '@/test/fixtures';
import { itIdeal } from '@/test/utils/matchIdealPattern';

describe('ArchiveGrid Organism', () => {
  itIdeal('Renders manifests from real archive data', async () => {
    const files = ActionTestData.forImport.sequence();
    
    const { getByRole } = renderWithProviders(
      <ArchiveGrid files={files} />,
      { includeVault: true }
    );
    
    // Verify actual IIIF structure created
    expect(getByRole('grid')).toBeInTheDocument();
  });
});
```

---

## 6. Real Data Strategy

### 6.1 Fixture Hierarchy

| Fixture Type | Location | Purpose |
|--------------|----------|---------|
| **Minimal** | `fixtures/atoms/` | Props for unit tests |
| **Contextual** | `fixtures/molecules/` | `cx`, `fieldMode`, `t()` objects |
| **Entity** | `fixtures/entities/` | IIIF Collection/Manifest/Canvas factories |
| **Real Files** | `.Images iiif test/` | Actual images, CSVs, etc. |

### 6.2 The `createIIIFEntity` Factory

```typescript
// src/test/fixtures/entities/index.ts
export const createIIIFEntity = {
  canvas: (overrides?: Partial<IIIFCanvas>): IIIFCanvas => ({
    id: `https://test.com/canvas/${nanoid()}`,
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1000,
    height: 1000,
    items: [],
    ...overrides,
  }),
  
  manifest: (canvases: IIIFCanvas[] = []): IIIFManifest => ({
    id: `https://test.com/manifest/${nanoid()}`,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: canvases,
  }),
};
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `src/test/utils/` with compliance helpers
- [ ] Implement `assertAtomicCompliance()`
- [ ] Implement `itIdeal()` / `itPrevents()` helpers
- [ ] Create `renderWithTemplate()` provider
- [ ] Add test-specific ESLint rules

### Phase 2: Shared Layer Tests (Week 2-3)
- [ ] Rewrite atom tests with zero mocks
- [ ] Rewrite molecule tests with props-driven pattern
- [ ] Add atomic compliance checks to CI
- [ ] Achieve 100% shared layer coverage

### Phase 3: Feature Tests (Week 4-6)
- [ ] Migrate organism tests to feature-based structure
- [ ] Convert mocks to real data fixtures
- [ ] Implement cross-feature integration tests
- [ ] Add `audit-tests.ts` quality gate

### Phase 4: Enforcement (Week 7-8)
- [ ] Add pre-commit hooks for test quality
- [ ] Automate IDEAL/FAILURE pattern checking
- [ ] Generate test quality reports
- [ ] Document patterns for AI code generation

---

## 8. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| IDEAL/FAILURE pattern adherence | 19% | 100% | `grep -r "IDEAL OUTCOME" src/test` |
| Mock-free tests | ~70% | 90% | Count `vi.mock` occurrences |
| Real data usage | 33% | 60% | `ActionTestData` usage |
| Atomic compliance violations | Unknown | 0 | `assertAtomicCompliance()` |
| Test pass rate | 81.5% | 95%+ | Vitest output |

---

## 9. Key Takeaways for AI-Generated Code

1. **Never trust AI to follow patterns** - Enforce with automation
2. **Mocks are technical debt** - Use real data and fixtures
3. **Tests must verify architecture** - Not just functionality
4. **User goals are the spec** - Not implementation details
5. **Compliance is testable** - Assert atomic constraints in tests

This modular approach ensures that even as AI generates inconsistent code, the test suite **automatically rejects violations** and **guides toward correct patterns** through failing tests rather than documentation.