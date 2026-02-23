<!--
  BaseTemplate — App shell layout template.
  React source: src/app/templates/BaseTemplate.tsx (112 lines)
  Architecture: Template (layout-only, no business logic, snippet slots)

  Structure:
  ┌─────────────────────────────────────────┐
  │ Header (optional)                       │
  ├──────────────────────────────────────────┤
  │ Body                                    │
  │  ├── Sidebar (optional, 256px)          │
  │  └── Main content area                 │
  └──────────────────────────────────────────┘

  All slots are Svelte 5 snippets (not named slots).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    /** Main content area */
    children: Snippet;
    /** Whether to show the sidebar */
    showSidebar?: boolean;
    /** Callback when sidebar toggle is clicked */
    onSidebarToggle?: () => void;
    /** Optional header content snippet */
    headerContent?: Snippet;
    /** Optional sidebar content snippet */
    sidebarContent?: Snippet;
  }

  let {
    children,
    showSidebar = true,
    onSidebarToggle,
    headerContent,
    sidebarContent,
  }: Props = $props();
</script>

<div class="flex flex-col h-screen bg-nb-black">
  <!-- Header -->
  <header
    class="flex items-center justify-between h-16 px-4 border-b border-nb-black/20 bg-nb-black shrink-0"
  >
    <!-- Sidebar toggle -->
    <Button
      variant="ghost"
      size="bare"
      onclick={onSidebarToggle}
      aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
      title={showSidebar ? 'Hide sidebar (Cmd+\\)' : 'Show sidebar (Cmd+\\)'}
      class="p-2"
    >
      <Icon name="menu" class="w-5 h-5" />
    </Button>

    <!-- Custom header content (flex-1 centred area) -->
    <div class="flex-1 mx-4">
      {#if headerContent}
        {@render headerContent()}
      {/if}
    </div>
  </header>

  <!-- Main layout: sidebar + content -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    {#if showSidebar && sidebarContent}
      <aside
        class="w-64 border-r border-nb-black/20 bg-nb-black overflow-y-auto shrink-0"
        role="navigation"
        aria-label="Main navigation"
      >
        {@render sidebarContent()}
      </aside>
    {/if}

    <!-- Main content area -->
    <main
      id="main-content"
      class={cn(
        'flex-1 min-h-0 flex flex-col',
        !showSidebar && 'w-full'
      )}
    >
      {@render children()}
    </main>
  </div>
</div>
