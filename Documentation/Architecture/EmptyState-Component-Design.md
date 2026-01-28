# EmptyState Component Design Document

## Executive Summary

This document analyzes BoardView.tsx's empty state implementation (lines 1299-1329) to extract its design patterns, keyboard shortcut integration, and visual layout structure. The goal is to standardize these patterns into a reusable EmptyState component template across all views.

---

## 1. Current BoardView Empty State Analysis

### 1.1 Location & Context
- **File:** `components/views/BoardView.tsx`
- **Lines:** 1299-1329
- **Context:** Shown when `items.length === 0` in the research board canvas

### 1.2 Visual Structure Breakdown

```tsx
// Container Structure
<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
  <div className={`text-center p-10 rounded-3xl 
    ${mode === 'view' ? 'bg-slate-800/95' : 'bg-white/95'} 
    backdrop-blur-md shadow-2xl border 
    ${mode === 'view' ? 'border-slate-700' : 'border-slate-200'} 
    max-w-lg`}>
    
    {/* Icon Section */}
    <Icon name="dashboard" className={`text-6xl mb-6 
      ${mode === 'view' ? 'text-slate-500' : 'text-amber-500'}`} />
    
    {/* Title Section */}
    <h2 className={`text-2xl font-black mb-3 
      ${mode === 'view' ? 'text-white' : 'text-slate-800'}`}>
      Start Your Research Board
    </h2>
    
    {/* Subtitle Section */}
    <p className={`text-sm mb-8 
      ${mode === 'view' ? 'text-slate-400' : 'text-slate-500'}`}>
      Create spatial connections between your archival materials
    </p>
    
    {/* Keyboard Shortcuts List */}
    <div className={`space-y-3 text-left 
      ${mode === 'view' ? 'text-slate-300' : 'text-slate-600'}`}>
      {/* Shortcut items with kbd elements */}
    </div>
  </div>
</div>
```

### 1.3 Design Pattern Elements

#### A. Layout Pattern
| Element | Class Pattern | Purpose |
|---------|--------------|---------|
| Container | `absolute inset-0 flex items-center justify-center` | Center in viewport |
| Card | `text-center p-10 rounded-3xl backdrop-blur-md shadow-2xl border max-w-lg` | Floating card with glass effect |
| Icon | `text-6xl mb-6` | Large visual anchor |
| Title | `text-2xl font-black mb-3` | Bold, prominent heading |
| Subtitle | `text-sm mb-8` | Supporting description |
| Content | `space-y-3 text-left` | Vertical list layout |

#### B. Theming Pattern (Dual Mode Support)

```typescript
// Theme configuration object
const emptyStateThemes = {
  default: {
    card: 'bg-white/95 border-slate-200',
    icon: 'text-amber-500',
    title: 'text-slate-800',
    subtitle: 'text-slate-500',
    text: 'text-slate-600',
    kbd: 'bg-slate-100 text-slate-600',
    accentKbd: 'bg-yellow-100 text-yellow-700'
  },
  dark: {
    card: 'bg-slate-800/95 border-slate-700',
    icon: 'text-slate-500',
    title: 'text-white',
    subtitle: 'text-slate-400',
    text: 'text-slate-300',
    kbd: 'bg-slate-700 text-slate-300',
    accentKbd: 'bg-yellow-900/50 text-yellow-400'
  },
  field: {
    card: 'bg-black/95 border-yellow-400/30',
    icon: 'text-yellow-400',
    title: 'text-yellow-400',
    subtitle: 'text-slate-400',
    text: 'text-slate-300',
    kbd: 'bg-slate-800 text-slate-300',
    accentKbd: 'bg-yellow-400/20 text-yellow-400'
  }
};
```

#### C. Keyboard Shortcut Pattern

```typescript
interface ShortcutItem {
  key: string;           // Display text for key
  label: string;         // Action description
  variant?: 'default' | 'accent' | 'wide';
  minWidth?: string;     // For consistent alignment
}

// Example shortcuts from BoardView
const boardShortcuts: ShortcutItem[] = [
  { key: 'Drag', label: 'Drag media from the Archive panel', variant: 'wide' },
  { key: 'T', label: 'Add sticky notes for annotations', variant: 'accent' },
  { key: 'C', label: 'Connect items to show relationships' },
  { key: 'Space', label: 'Hold to pan around the board' }
];
```

**KBD Element Styling:**
```css
/* Base kbd style */
kbd {
  @apply px-3 py-1.5 rounded-lg text-xs font-mono font-bold;
}

/* With min-width for alignment */
kbd.min-w-\[48px\] {
  min-width: 48px;
  text-align: center;
}

/* Accent variant (for primary actions) */
kbd.accent {
  @apply bg-yellow-100 text-yellow-700; /* light */
  @apply bg-yellow-900/50 text-yellow-400; /* dark */
}
```

### 1.4 Typography Scale

| Element | Size | Weight | Tracking | Transform |
|---------|------|--------|----------|-----------|
| Icon | text-6xl (60px) | - | - | - |
| Title | text-2xl (24px) | font-black (900) | - | - |
| Subtitle | text-sm (14px) | normal | - | - |
| Shortcut Key | text-xs (12px) | font-bold (700) | - | - |
| Shortcut Label | text-sm (14px) | normal | - | - |

---

## 2. Enhanced EmptyState Component API

### 2.1 Props Interface

```typescript
export interface EmptyStateProps {
  /** Icon name from material-icons */
  icon: string;
  
  /** Main title text */
  title: string;
  
  /** Optional subtitle/description */
  subtitle?: string;
  
  /** Visual theme variant */
  variant?: 'default' | 'dark' | 'field';
  
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  
  /** Keyboard shortcuts to display */
  shortcuts?: ShortcutItem[];
  
  /** Custom content (replaces shortcuts) */
  children?: React.ReactNode;
  
  /** Card maximum width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Whether to show backdrop blur effect */
  glassmorphism?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

export interface ShortcutItem {
  key: string;
  label: string;
  variant?: 'default' | 'accent' | 'wide';
  icon?: string;
}
```

### 2.2 Component Implementation

```tsx
// components/EmptyState.tsx
import React from 'react';
import { Icon } from './Icon';

const themeConfigs = {
  default: {
    card: 'bg-white/95 border-slate-200',
    icon: 'text-amber-500',
    title: 'text-slate-800',
    subtitle: 'text-slate-500',
    text: 'text-slate-600',
    kbd: 'bg-slate-100 text-slate-600',
    accentKbd: 'bg-yellow-100 text-yellow-700'
  },
  dark: {
    card: 'bg-slate-800/95 border-slate-700',
    icon: 'text-slate-500',
    title: 'text-white',
    subtitle: 'text-slate-400',
    text: 'text-slate-300',
    kbd: 'bg-slate-700 text-slate-300',
    accentKbd: 'bg-yellow-900/50 text-yellow-400'
  },
  field: {
    card: 'bg-black/95 border-yellow-400/30',
    icon: 'text-yellow-400',
    title: 'text-yellow-400',
    subtitle: 'text-slate-400',
    text: 'text-slate-300',
    kbd: 'bg-slate-800 text-slate-300',
    accentKbd: 'bg-yellow-400/20 text-yellow-400'
  }
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  variant = 'default',
  action,
  shortcuts,
  children,
  maxWidth = 'lg',
  glassmorphism = true,
  className = ''
}) => {
  const theme = themeConfigs[variant];
  const glassClass = glassmorphism ? 'backdrop-blur-md' : '';
  
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${className}`}>
      <div className={`text-center p-10 rounded-3xl shadow-2xl border ${glassClass} ${maxWidthClasses[maxWidth]} ${theme.card}`}>
        {/* Icon */}
        <Icon name={icon} className={`text-6xl mb-6 ${theme.icon}`} />
        
        {/* Title */}
        <h2 className={`text-2xl font-black mb-3 ${theme.title}`}>
          {title}
        </h2>
        
        {/* Subtitle */}
        {subtitle && (
          <p className={`text-sm mb-8 ${theme.subtitle}`}>
            {subtitle}
          </p>
        )}
        
        {/* Custom Content or Shortcuts */}
        {children || (shortcuts && (
          <div className={`space-y-3 text-left ${theme.text}`}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center gap-4">
                {shortcut.variant === 'wide' ? (
                  <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${theme.kbd}`}>
                    {shortcut.key}
                  </kbd>
                ) : (
                  <kbd className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-w-[48px] text-center ${
                    shortcut.variant === 'accent' ? theme.accentKbd : theme.kbd
                  }`}>
                    {shortcut.key}
                  </kbd>
                )}
                <span className="text-sm">{shortcut.label}</span>
              </div>
            ))}
          </div>
        ))}
        
        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-8 px-6 py-3 bg-iiif-blue text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors pointer-events-auto"
          >
            {action.icon && <Icon name={action.icon} className="mr-2" />}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## 3. View-Specific Empty State Templates

### 3.1 BoardView Template

```typescript
const BoardViewEmptyState = () => (
  <EmptyState
    icon="dashboard"
    title="Start Your Research Board"
    subtitle="Create spatial connections between your archival materials"
    variant={mode === 'view' ? 'dark' : 'default'}
    shortcuts={[
      { key: 'Drag', label: 'Drag media from the Archive panel', variant: 'wide' },
      { key: 'T', label: 'Add sticky notes for annotations', variant: 'accent' },
      { key: 'C', label: 'Connect items to show relationships' },
      { key: 'Space', label: 'Hold to pan around the board' }
    ]}
  />
);
```

### 3.2 ArchiveView Template

```typescript
const ArchiveViewEmptyState = () => (
  <EmptyState
    icon="inventory_2"
    title="No Items Found"
    subtitle="Try adjusting your filters or add new items to the archive"
    variant={fieldMode ? 'field' : 'default'}
    action={{
      label: "Import Items",
      icon: "file_upload",
      onClick: openImportDialog
    }}
  />
);
```

### 3.3 CollectionsView Template

```typescript
const CollectionsViewEmptyState = () => (
  <EmptyState
    icon="account_tree"
    title="Select a Structural Node"
    subtitle="Choose a Collection or Manifest to view and edit its contents"
    shortcuts={[
      { key: 'Click', label: 'Select a node to view details', variant: 'wide' },
      { key: 'Drag', label: 'Drag items to reorganize', variant: 'wide' },
      { key: 'Del', label: 'Delete selected items', variant: 'accent' }
    ]}
  />
);
```

### 3.4 SearchView Template

```typescript
const SearchViewEmptyState = () => (
  <EmptyState
    icon="search"
    title="Start Searching"
    subtitle="Enter a query to search across your archive"
    variant="default"
    maxWidth="md"
  />
);
```

---

## 4. Migration Strategy

### 4.1 Current Implementations to Replace

| View | Current Pattern | Lines | Replace With |
|------|----------------|-------|--------------|
| ArchiveView | Simple icon + text | ~5 | EmptyState with action |
| CollectionsView | Already updated | - | Keep current |
| BoardView | Complex custom (lines 1299-1329) | ~30 | EmptyState with shortcuts |
| SearchView | Simple text | ~3 | EmptyState |
| MetadataSpreadsheet | Simple text | ~3 | EmptyState |

### 4.2 Migration Steps

1. **Phase 1:** Update BoardView (highest impact)
2. **Phase 2:** Update ArchiveView with action button
3. **Phase 3:** Update SearchView and MetadataSpreadsheet

---

## 5. Accessibility Considerations

### 5.1 ARIA Attributes

```tsx
<div 
  role="region"
  aria-label={title}
  aria-describedby="empty-state-description"
>
  <p id="empty-state-description" className="sr-only">
    {subtitle}
  </p>
  {/* ... */}
</div>
```

### 5.2 Keyboard Navigation
- Action button must be keyboard accessible
- Shortcuts should be announced by screen readers
- Focus management for actionable empty states

---

## 6. Testing Checklist

- [ ] All three variants render correctly
- [ ] Glassmorphism effect works in all themes
- [ ] Keyboard shortcuts align properly
- [ ] Action button is clickable (pointer-events-auto)
- [ ] Responsive behavior at different viewport sizes
- [ ] Screen reader announcements work correctly

---

## 7. Conclusion

BoardView's empty state demonstrates excellent design patterns:
- **Dual-mode theming** (edit/view modes)
- **Keyboard shortcut integration** with visual hierarchy
- **Glassmorphism card** design with backdrop blur
- **Consistent spacing** using Tailwind's spacing scale

The proposed EmptyState component encapsulates these patterns while providing flexibility for:
- Custom shortcuts per view
- Action buttons for primary CTAs
- Three theme variants (default, dark, field)
- Optional glassmorphism effect

**Estimated Impact:**
- Consolidate ~50 lines of duplicated empty state code
- Consistent user experience across all views
- Reduced maintenance burden
