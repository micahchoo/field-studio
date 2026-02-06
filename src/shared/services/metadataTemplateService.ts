
import { SourceManifest, SourceManifests } from '@/src/shared/types';
import { getCSVColumnsByCategory, SUPPORTED_LANGUAGES } from '@/src/shared/constants';

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

/**
 * Get columns based on vocabulary selection
 * Uses centralized CSV_TEMPLATE_COLUMNS from constants.ts
 */
function getColumns(vocabulary: VocabularyOption): { key: string; description: string }[] {
  switch (vocabulary) {
    case 'iiif':
      return getCSVColumnsByCategory('iiif');
    case 'dublin-core':
      return getCSVColumnsByCategory('dublin-core');
    case 'both':
      return getCSVColumnsByCategory('both');
    default:
      return getCSVColumnsByCategory('iiif');
  }
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content from source manifests
 */
function generateCSV(sourceManifests: SourceManifests, options: MetadataTemplateOptions): string {
  const columns = getColumns(options.vocabulary);

  // Header row
  const headers = ['filename', 'manifest', ...columns.map(c => c.key)];
  const rows: string[] = [headers.join(',')];

  // Data rows - one per file
  for (const manifest of sourceManifests.manifests) {
    for (const file of manifest.files) {
      const row = [
        escapeCSV(file.name),
        escapeCSV(manifest.name),
        ...columns.map(() => '') // Empty values for user to fill
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Generate instructions text
 */
function generateInstructions(options: MetadataTemplateOptions): string {
  const columns = getColumns(options.vocabulary);

  const instructions = `
IIIF Field Studio - Metadata Template Instructions
================================================

This CSV file contains your archive structure with columns for adding metadata.
Fill in the values and re-import to apply metadata to your items.

FILE STRUCTURE
--------------
- filename: The original file name (DO NOT MODIFY)
- manifest: The manifest/folder this file belongs to (DO NOT MODIFY)

COLUMN DESCRIPTIONS
-------------------
${columns.map(c => `${c.key}: ${c.description}`).join('\n')}

FORMATTING GUIDELINES
--------------------
1. Dates should be in ISO 8601 format: YYYY-MM-DD (e.g., 2024-01-15)
2. Rights URLs should be complete URLs (e.g., https://creativecommons.org/licenses/by/4.0/)
3. For multiple values, separate with semicolons (e.g., "keyword1; keyword2; keyword3")
4. Language is set to: ${options.language}
5. Text can include Unicode characters

VOCABULARY USED
---------------
${options.vocabulary === 'iiif' ? 'IIIF Presentation API 3.0 properties' :
  options.vocabulary === 'dublin-core' ? 'Dublin Core Metadata Element Set (metadata.* format)' :
  'Combined IIIF and Dublin Core vocabularies'}

COLUMN FORMAT
-------------
- IIIF core properties use their standard names: label, summary, rights, navDate
- Dublin Core properties use the format: metadata.{property} (e.g., metadata.creator, metadata.date)
- This format is compatible with the CSV Import feature in the Catalog view

RE-IMPORTING
------------
1. Save your edited CSV file
2. In Field Studio, go to the Metadata view
3. Use the "Import CSV" option
4. Select your edited file
5. Review the preview and confirm

TIPS
----
- Empty cells will be ignored (existing metadata preserved)
- You can delete rows for files you don't want to update
- The manifest column determines which IIIF Manifest the metadata applies to
- For batch operations, copy values down to apply to multiple files

Generated: ${new Date().toISOString()}
`.trim();

  return instructions;
}

/**
 * Export metadata template as CSV + instructions
 */
export function exportMetadataTemplate(
  sourceManifests: SourceManifests,
  options: MetadataTemplateOptions = {
    vocabulary: 'both',
    language: 'en',
    includeInstructions: true
  }
): MetadataTemplateExport {
  return {
    csv: generateCSV(sourceManifests, options),
    instructions: options.includeInstructions ? generateInstructions(options) : ''
  };
}

/**
 * Generate a preview of the first N rows
 */
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

/**
 * Get available vocabulary options with descriptions
 */
export function getVocabularyOptions(): { value: VocabularyOption; label: string; description: string }[] {
  return [
    {
      value: 'iiif',
      label: 'IIIF Only',
      description: 'Core IIIF Presentation API properties (label, summary, rights, etc.)'
    },
    {
      value: 'dublin-core',
      label: 'Dublin Core Only',
      description: 'Standard Dublin Core metadata elements (dc:title, dc:creator, etc.)'
    },
    {
      value: 'both',
      label: 'IIIF + Dublin Core',
      description: 'Full vocabulary with both IIIF properties and Dublin Core elements'
    }
  ];
}

/**
 * Download helper - triggers browser download
 */
export function downloadMetadataTemplate(
  sourceManifests: SourceManifests,
  options: MetadataTemplateOptions,
  baseName: string = 'metadata-template'
): void {
  const { csv, instructions } = exportMetadataTemplate(sourceManifests, options);

  // Download CSV
  const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const csvUrl = URL.createObjectURL(csvBlob);
  const csvLink = document.createElement('a');
  csvLink.href = csvUrl;
  csvLink.download = `${baseName}.csv`;
  csvLink.click();
  URL.revokeObjectURL(csvUrl);

  // Download instructions if included
  if (instructions) {
    const txtBlob = new Blob([instructions], { type: 'text/plain;charset=utf-8;' });
    const txtUrl = URL.createObjectURL(txtBlob);
    const txtLink = document.createElement('a');
    txtLink.href = txtUrl;
    txtLink.download = `${baseName}-instructions.txt`;
    // Small delay to avoid browser blocking multiple downloads
    setTimeout(() => {
      txtLink.click();
      URL.revokeObjectURL(txtUrl);
    }, 100);
  }
}
