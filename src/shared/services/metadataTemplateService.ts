// Pure TypeScript — no Svelte-specific conversion

/**
 * Metadata Template Service
 *
 * Generates CSV templates and instructions for batch metadata editing.
 */

// ============================================================================
// Types
// ============================================================================

export type VocabularyOption = 'iiif' | 'dublin-core' | 'both';

export interface MetadataTemplateOptions {
  vocabulary: VocabularyOption;
  language: string;
  includeInstructions: boolean;
}

export interface MetadataTemplateExport {
  csv: string;
  instructions: string;
}

interface SourceFile {
  name: string;
}

interface SourceManifest {
  name: string;
  files: SourceFile[];
}

interface SourceManifests {
  manifests: SourceManifest[];
}

interface ColumnDefinition {
  key: string;
  description: string;
}

// ============================================================================
// Column definitions (inline, no external dependency)
// ============================================================================

const IIIF_COLUMNS: ColumnDefinition[] = [
  { key: 'label', description: 'Human-readable title for the item (required)' },
  { key: 'summary', description: 'Brief description of the content' },
  { key: 'rights', description: 'License URL (e.g., https://creativecommons.org/licenses/by/4.0/)' },
  { key: 'navDate', description: 'Navigation date in ISO 8601 format (YYYY-MM-DD)' },
  { key: 'requiredStatement.value', description: 'Required attribution text' },
];

const DC_COLUMNS: ColumnDefinition[] = [
  { key: 'metadata.title', description: 'Title of the resource' },
  { key: 'metadata.creator', description: 'Person or organization responsible for creating the content' },
  { key: 'metadata.date', description: 'Date associated with the resource (YYYY-MM-DD or YYYY)' },
  { key: 'metadata.description', description: 'Detailed description of the content' },
  { key: 'metadata.subject', description: 'Topic or keywords (semicolon-separated for multiple)' },
  { key: 'metadata.type', description: 'Nature of the resource (e.g., Image, Text, Dataset)' },
  { key: 'metadata.format', description: 'File format or medium' },
  { key: 'metadata.identifier', description: 'Unique identifier for the resource' },
  { key: 'metadata.source', description: 'Related resource from which this was derived' },
  { key: 'metadata.language', description: 'Language of the content (ISO 639-1 code)' },
  { key: 'metadata.coverage', description: 'Spatial or temporal coverage (location, time period)' },
  { key: 'metadata.rights', description: 'Copyright or access rights statement' },
  { key: 'metadata.publisher', description: 'Entity responsible for making the resource available' },
];

function getColumns(vocabulary: VocabularyOption): ColumnDefinition[] {
  switch (vocabulary) {
    case 'iiif': return IIIF_COLUMNS;
    case 'dublin-core': return DC_COLUMNS;
    case 'both': return [...IIIF_COLUMNS, ...DC_COLUMNS];
    default: return IIIF_COLUMNS;
  }
}

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCSV(sourceManifests: SourceManifests, options: MetadataTemplateOptions): string {
  const columns = getColumns(options.vocabulary);
  const headers = ['filename', 'manifest', ...columns.map(c => c.key)];
  const rows: string[] = [headers.join(',')];

  for (const manifest of sourceManifests.manifests) {
    for (const file of manifest.files) {
      const row = [
        escapeCSV(file.name),
        escapeCSV(manifest.name),
        ...columns.map(() => '')
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

function generateInstructions(options: MetadataTemplateOptions): string {
  const columns = getColumns(options.vocabulary);
  return `IIIF Field Studio - Metadata Template Instructions
================================================

Fill in the values and re-import to apply metadata to your items.

COLUMN DESCRIPTIONS
-------------------
${columns.map(c => `${c.key}: ${c.description}`).join('\n')}

Language is set to: ${options.language}
Generated: ${new Date().toISOString()}`.trim();
}

// ============================================================================
// Public API
// ============================================================================

export function exportMetadataTemplate(
  sourceManifests: SourceManifests,
  options: MetadataTemplateOptions = { vocabulary: 'both', language: 'en', includeInstructions: true }
): MetadataTemplateExport {
  return {
    csv: generateCSV(sourceManifests, options),
    instructions: options.includeInstructions ? generateInstructions(options) : ''
  };
}

export function previewMetadataTemplate(
  sourceManifests: SourceManifests,
  options: MetadataTemplateOptions,
  maxRows: number = 5
): string[][] {
  const columns = getColumns(options.vocabulary);
  const headers = ['filename', 'manifest', ...columns.map(c => c.key)];
  const preview: string[][] = [headers];

  let rowCount = 0;
  for (const manifest of sourceManifests.manifests) {
    for (const file of manifest.files) {
      if (rowCount >= maxRows) break;
      preview.push([file.name, manifest.name, ...columns.map(() => '')]);
      rowCount++;
    }
    if (rowCount >= maxRows) break;
  }

  return preview;
}

export function getVocabularyOptions(): { value: VocabularyOption; label: string; description: string }[] {
  return [
    { value: 'iiif', label: 'IIIF Only', description: 'Core IIIF Presentation API properties' },
    { value: 'dublin-core', label: 'Dublin Core Only', description: 'Standard Dublin Core metadata elements' },
    { value: 'both', label: 'IIIF + Dublin Core', description: 'Full vocabulary with both IIIF properties and Dublin Core elements' }
  ];
}

export function downloadMetadataTemplate(
  sourceManifests: SourceManifests,
  options: MetadataTemplateOptions,
  baseName: string = 'metadata-template'
): void {
  const { csv, instructions } = exportMetadataTemplate(sourceManifests, options);

  const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const csvUrl = URL.createObjectURL(csvBlob);
  const csvLink = document.createElement('a');
  csvLink.href = csvUrl;
  csvLink.download = `${baseName}.csv`;
  csvLink.click();
  URL.revokeObjectURL(csvUrl);

  if (instructions) {
    const txtBlob = new Blob([instructions], { type: 'text/plain;charset=utf-8;' });
    const txtUrl = URL.createObjectURL(txtBlob);
    const txtLink = document.createElement('a');
    txtLink.href = txtUrl;
    txtLink.download = `${baseName}-instructions.txt`;
    setTimeout(() => {
      txtLink.click();
      URL.revokeObjectURL(txtUrl);
    }, 100);
  }
}
