
/**
 * Help Content Configurations
 *
 * Centralized help content for just-in-time contextual assistance.
 * Organized by view/context for screen-relevant help.
 */

import { TooltipContent } from '@/src/shared/ui/molecules/Tooltip';

// ============================================================================
// Quick Reference Items (per-view keyboard shortcuts & actions)
// ============================================================================

export interface QuickRefItem {
  icon: string;
  label: string;
  shortcut?: string;
  description?: string;
}

export const QUICK_REF_ARCHIVE: QuickRefItem[] = [
  { icon: 'folder_open', label: 'Open folder', description: 'Drag a folder onto the window to ingest files' },
  { icon: 'upload_file', label: 'Add files', shortcut: 'Cmd+O', description: 'Select individual files to add' },
  { icon: 'auto_awesome', label: 'Auto-organize', description: 'Folder names become Collections automatically' },
  { icon: 'photo_camera', label: 'Extract metadata', description: 'EXIF data like GPS and dates are captured' },
];

export const QUICK_REF_STRUCTURE: QuickRefItem[] = [
  { icon: 'add', label: 'Add item', shortcut: 'N', description: 'Create a new Manifest or Collection' },
  { icon: 'drag_indicator', label: 'Reorder', description: 'Drag items to reorganize hierarchy' },
  { icon: 'content_copy', label: 'Duplicate', shortcut: 'Cmd+D', description: 'Clone selected item' },
  { icon: 'delete', label: 'Delete', shortcut: 'Del', description: 'Remove selected item' },
  { icon: 'expand_more', label: 'Expand all', shortcut: 'Cmd+E', description: 'Show all nested items' },
];

export const QUICK_REF_VIEWER: QuickRefItem[] = [
  { icon: 'zoom_in', label: 'Zoom', shortcut: 'Scroll', description: 'Scroll to zoom in/out' },
  { icon: 'pan_tool', label: 'Pan', shortcut: 'Space+Drag', description: 'Hold space and drag to pan' },
  { icon: 'draw', label: 'Annotate', shortcut: 'A', description: 'Draw annotations on the canvas' },
  { icon: 'info', label: 'Inspector', shortcut: 'I', description: 'Toggle metadata inspector' },
  { icon: 'fullscreen', label: 'Fullscreen', shortcut: 'F', description: 'Enter fullscreen mode' },
];

export const QUICK_REF_BOARD: QuickRefItem[] = [
  { icon: 'near_me', label: 'Select', shortcut: 'V', description: 'Select and move items' },
  { icon: 'pan_tool', label: 'Pan', shortcut: 'H', description: 'Pan the board view' },
  { icon: 'link', label: 'Connect', shortcut: 'C', description: 'Draw connections between items' },
  { icon: 'sticky_note_2', label: 'Note', shortcut: 'T', description: 'Add a text note' },
  { icon: 'content_copy', label: 'Duplicate', shortcut: 'Cmd+D', description: 'Clone selected item' },
  { icon: 'undo', label: 'Undo', shortcut: 'Cmd+Z', description: 'Undo last action' },
];

export const QUICK_REF_METADATA: QuickRefItem[] = [
  { icon: 'edit', label: 'Edit cell', shortcut: 'Enter', description: 'Press Enter to edit selected cell' },
  { icon: 'tab', label: 'Next cell', shortcut: 'Tab', description: 'Move to next cell' },
  { icon: 'view_column', label: 'Add column', description: 'Click + to add a metadata field' },
  { icon: 'filter_list', label: 'Filter', description: 'Type in column header to filter' },
  { icon: 'download', label: 'Export CSV', description: 'Export metadata as spreadsheet' },
];

export const QUICK_REF_STAGING: QuickRefItem[] = [
  { icon: 'upload', label: 'Ingest', description: 'Add new items to staging area' },
  { icon: 'edit', label: 'Edit', description: 'Edit staging item details' },
  { icon: 'publish', label: 'Publish', description: 'Move items to archive' },
  { icon: 'delete', label: 'Delete', shortcut: 'Del', description: 'Remove from staging' },
  { icon: 'undo', label: 'Undo', shortcut: 'Cmd+Z', description: 'Undo last action' },
];

// ============================================================================
// Tooltip Content (field-level help)
// ============================================================================

export const TOOLTIPS: Record<string, TooltipContent> = {
  // IIIF Resource Types
  'resource-collection': {
    title: 'Collection',
    body: 'A group of related Manifests or other Collections. Use it like a folder to organize your archive.',
    action: 'Right-click to add nested items'
  },
  'resource-manifest': {
    title: 'Manifest',
    body: 'Represents a single intellectual work - like a book, a map, or a photo series. Contains one or more Canvases.',
    action: 'Click to view in detail'
  },
  'resource-canvas': {
    title: 'Canvas',
    body: 'A virtual surface where content is placed. Think of it as a page where images, audio, or video are "painted".',
    action: 'Double-click to open in viewer'
  },
  'resource-annotation': {
    title: 'Annotation',
    body: 'Connects content to a Canvas. Can be an image, text transcription, comment, or other media.',
  },
  'resource-range': {
    title: 'Range',
    body: 'Defines a table of contents or structure within a Manifest. Groups Canvases into logical sections.',
  },

  // Common Fields
  'field-label': {
    title: 'Label',
    body: 'The display name shown to users. Can be in multiple languages.',
    action: 'Click to edit'
  },
  'field-summary': {
    title: 'Summary',
    body: 'A brief description of the resource. Shown in search results and previews.',
  },
  'field-metadata': {
    title: 'Metadata',
    body: 'Descriptive key-value pairs like Title, Creator, Date. Use Dublin Core terms for interoperability.',
    action: 'Click + to add a field'
  },
  'field-rights': {
    title: 'Rights',
    body: 'A URL to a license or rights statement. Use Creative Commons or RightsStatements.org URIs.',
  },
  'field-thumbnail': {
    title: 'Thumbnail',
    body: 'A small preview image. Auto-generated from content but can be customized.',
  },
  'field-navDate': {
    title: 'Navigation Date',
    body: 'A date for sorting or timeline display. Use ISO 8601 format (YYYY-MM-DD).',
  },
  'field-behavior': {
    title: 'Behavior',
    body: 'Hints for viewers on how to display content. Examples: "paged" for books, "continuous" for scrolls.',
  },

  // Actions
  'action-ingest': {
    title: 'Ingest Files',
    body: 'Import files from your computer. Folders become Collections, files become Canvases with Manifests.',
    action: 'Drag files here or click to browse',
    shortcut: 'Cmd+O'
  },
  'action-export': {
    title: 'Export Archive',
    body: 'Package your work for sharing or hosting. Choose between raw IIIF, static site, or archival formats.',
    shortcut: 'Cmd+E'
  },
  'action-validate': {
    title: 'Validate',
    body: 'Check your archive for errors and best-practice issues. Fixes common problems automatically.',
    shortcut: 'Cmd+Shift+V'
  },

  // Inspector sections
  'inspector-core': {
    title: 'Core Properties',
    body: 'Essential fields like label and summary. These are required for a valid IIIF resource.',
  },
  'inspector-descriptive': {
    title: 'Descriptive Metadata',
    body: 'Key-value pairs describing the content. Use consistent field names across your archive.',
  },
  'inspector-technical': {
    title: 'Technical Properties',
    body: 'Advanced settings like behaviors, services, and viewing hints. Most users can skip these.',
  },
  'inspector-structural': {
    title: 'Structural Properties',
    body: 'Relationships to other resources. Part-of references, linked items, and navigation structures.',
  },

  // Export options
  'export-canopy': {
    title: 'Canopy Template',
    body: 'A ready-to-deploy Next.js website with search, faceted browsing, and responsive image viewer.',
  },
  'export-raw': {
    title: 'Raw IIIF',
    body: 'Just the JSON manifests and image files. Use this to host on your own server or import elsewhere.',
  },
  'export-ocfl': {
    title: 'OCFL Package',
    body: 'Oxford Common File Layout - a preservation format for digital archives with versioning support.',
  },
};

// ============================================================================
// First-Time Hints (inline contextual prompts)
// ============================================================================

export const HINTS = {
  'empty-archive': 'Drag a folder here to get started, or click "Add Files" to select individual items.',
  'first-manifest': 'Great! Your first item. Click it to see details in the Inspector panel on the right.',
  'first-export': 'Ready to share? Click Export to package your archive for the web.',
  'metadata-tip': 'Add descriptive metadata to make your content searchable and accessible.',
  'validation-errors': 'Some items have issues. Click the warning icon to see what needs attention.',
  'keyboard-shortcuts': 'Press ? anytime to see available keyboard shortcuts for the current view.',
};

// ============================================================================
// Welcome Messages (per-view, shown once)
// ============================================================================

export const WELCOME_MESSAGES: Record<string, { title: string; body: string; tips: string[] }> = {
  archive: {
    title: 'Welcome to the Archive',
    body: 'This is where you import and organize your raw files. Drag folders to create structure automatically.',
    tips: [
      'Folder names become Collection labels',
      'GPS and date metadata is extracted from photos',
      'Supported formats: images, audio, video, PDFs'
    ]
  },
  structure: {
    title: 'Structure View',
    body: 'See and edit the IIIF hierarchy. Drag items to reorganize, right-click for options.',
    tips: [
      'Collections contain Manifests',
      'Manifests contain Canvases',
      'Use Ranges to create a table of contents'
    ]
  },
  viewer: {
    title: 'Viewer Workbench',
    body: 'Deep inspection mode. Zoom, pan, and annotate your content.',
    tips: [
      'Scroll to zoom, drag to pan',
      'Press A to start annotating',
      'Annotations are saved with the image'
    ]
  },
  board: {
    title: 'Board View',
    body: 'A freeform canvas for visual thinking. Arrange items spatially and draw connections.',
    tips: [
      'Drag items from the tree to add them',
      'Press C to draw connections',
      'Export the board as a new Manifest'
    ]
  }
};
