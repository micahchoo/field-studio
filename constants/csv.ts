/**
 * CSV Import/Export Constants
 * 
 * Configuration for CSV metadata import and export functionality.
 */

export interface CSVColumnDefinition {
  key: string;
  description: string;
  category: 'iiif' | 'dublin-core';
}

/**
 * IIIF properties supported for CSV import/export
 */
export const CSV_SUPPORTED_PROPERTIES: string[] = [
  'label',
  'summary',
  'metadata.title',
  'metadata.creator',
  'metadata.date',
  'metadata.description',
  'metadata.subject',
  'metadata.rights',
  'metadata.source',
  'metadata.type',
  'metadata.format',
  'metadata.identifier',
  'metadata.language',
  'metadata.coverage',
  'metadata.publisher',
  'requiredStatement.label',
  'requiredStatement.value',
  'rights',
  'navDate'
];

/**
 * Column definitions for CSV metadata template export
 */
export const CSV_TEMPLATE_COLUMNS: CSVColumnDefinition[] = [
  // IIIF core properties
  { key: 'label', description: 'Human-readable title for the item (required)', category: 'iiif' },
  { key: 'summary', description: 'Brief description of the content', category: 'iiif' },
  { key: 'rights', description: 'License URL (e.g., https://creativecommons.org/licenses/by/4.0/)', category: 'iiif' },
  { key: 'navDate', description: 'Navigation date in ISO 8601 format (YYYY-MM-DD)', category: 'iiif' },
  { key: 'requiredStatement.value', description: 'Required attribution text', category: 'iiif' },

  // Dublin Core (metadata.* format for csvImporter compatibility)
  { key: 'metadata.title', description: 'Title of the resource', category: 'dublin-core' },
  { key: 'metadata.creator', description: 'Person or organization responsible for creating the content', category: 'dublin-core' },
  { key: 'metadata.date', description: 'Date associated with the resource (YYYY-MM-DD or YYYY)', category: 'dublin-core' },
  { key: 'metadata.description', description: 'Detailed description of the content', category: 'dublin-core' },
  { key: 'metadata.subject', description: 'Topic or keywords (semicolon-separated for multiple)', category: 'dublin-core' },
  { key: 'metadata.type', description: 'Nature of the resource (e.g., Image, Text, Dataset)', category: 'dublin-core' },
  { key: 'metadata.format', description: 'File format or medium', category: 'dublin-core' },
  { key: 'metadata.identifier', description: 'Unique identifier for the resource', category: 'dublin-core' },
  { key: 'metadata.source', description: 'Related resource from which this was derived', category: 'dublin-core' },
  { key: 'metadata.language', description: 'Language of the content (ISO 639-1 code)', category: 'dublin-core' },
  { key: 'metadata.coverage', description: 'Spatial or temporal coverage (location, time period)', category: 'dublin-core' },
  { key: 'metadata.rights', description: 'Copyright or access rights statement', category: 'dublin-core' },
  { key: 'metadata.publisher', description: 'Entity responsible for making the resource available', category: 'dublin-core' },
];

/**
 * Aliases for CSV column auto-detection
 * Maps common column names to their IIIF property equivalent
 */
export const CSV_COLUMN_ALIASES: Record<string, string> = {
  // Direct IIIF matches
  'label': 'label',
  'summary': 'summary',
  'rights': 'rights',
  'navdate': 'navDate',
  'navDate': 'navDate',
  'requiredstatement.value': 'requiredStatement.value',
  'requiredStatement.value': 'requiredStatement.value',
  'requiredstatement.label': 'requiredStatement.label',
  'requiredStatement.label': 'requiredStatement.label',

  // metadata.* format
  'metadata.title': 'metadata.title',
  'metadata.creator': 'metadata.creator',
  'metadata.date': 'metadata.date',
  'metadata.description': 'metadata.description',
  'metadata.subject': 'metadata.subject',
  'metadata.type': 'metadata.type',
  'metadata.format': 'metadata.format',
  'metadata.identifier': 'metadata.identifier',
  'metadata.source': 'metadata.source',
  'metadata.language': 'metadata.language',
  'metadata.coverage': 'metadata.coverage',
  'metadata.rights': 'metadata.rights',
  'metadata.publisher': 'metadata.publisher',

  // dc:* format aliases (legacy support)
  'dc:title': 'metadata.title',
  'dc:creator': 'metadata.creator',
  'dc:date': 'metadata.date',
  'dc:description': 'metadata.description',
  'dc:subject': 'metadata.subject',
  'dc:type': 'metadata.type',
  'dc:format': 'metadata.format',
  'dc:identifier': 'metadata.identifier',
  'dc:source': 'metadata.source',
  'dc:language': 'metadata.language',
  'dc:coverage': 'metadata.coverage',
  'dc:rights': 'metadata.rights',
  'dc:publisher': 'metadata.publisher',

  // Common friendly names
  'title': 'metadata.title',
  'creator': 'metadata.creator',
  'author': 'metadata.creator',
  'date': 'metadata.date',
  'description': 'metadata.description',
  'subject': 'metadata.subject',
  'keywords': 'metadata.subject',
  'tags': 'metadata.subject',
  'type': 'metadata.type',
  'format': 'metadata.format',
  'identifier': 'metadata.identifier',
  'source': 'metadata.source',
  'language': 'metadata.language',
  'coverage': 'metadata.coverage',
  'location': 'metadata.coverage',
  'publisher': 'metadata.publisher',
  'attribution': 'requiredStatement.value',
};

/**
 * Get CSV template columns filtered by category
 */
export function getCSVColumnsByCategory(category: 'iiif' | 'dublin-core' | 'both'): CSVColumnDefinition[] {
  if (category === 'both') return CSV_TEMPLATE_COLUMNS;
  return CSV_TEMPLATE_COLUMNS.filter(col => col.category === category);
}
