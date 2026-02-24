// All IIIFCanvas-specific casts removed: IIIFCanvas extends IIIFItem; summary, rights,
// requiredStatement, navDate, annotations are all inherited from IIIFItem.
import { type CSVColumnMapping, getIIIFValue, IIIFCanvas, IIIFItem, isCanvas } from '@/src/shared/types';
import { uiLog } from '@/src/shared/services/logger';
import {
  createLanguageMap,
  formatNavDate,
  isValidRightsUri
} from '@/utils';
import { CSV_COLUMN_ALIASES, CSV_SUPPORTED_PROPERTIES } from '@/src/shared/constants';

export type { CSVColumnMapping };

export interface CSVImportResult {
  matched: number;
  unmatched: number;
  errors: string[];
}

export interface CSVExportOptions {
  /** Properties to include in export (defaults to all supported) */
  properties?: string[];
  /** Language to prefer when extracting values */
  language?: string;
  /** Include internal IIIF ID column */
  includeId?: boolean;
  /** Include item type column */
  includeType?: boolean;
  /** Filter to specific item types */
  itemTypes?: ('Canvas' | 'Manifest' | 'Collection' | 'Range')[];
}

export interface CSVExportResult {
  csv: string;
  itemCount: number;
  columnCount: number;
}

/** @deprecated Use CSV_SUPPORTED_PROPERTIES from constants.ts instead */
export const SUPPORTED_IIIF_PROPERTIES: string[] = CSV_SUPPORTED_PROPERTIES;

export type SupportedIIIFProperty = string;

export class CSVImporterService {

  parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  getSupportedProperties(): string[] {
    return [...SUPPORTED_IIIF_PROPERTIES];
  }

  detectFilenameColumn(headers: string[]): string | null {
    const candidates = ['filename', 'file', 'name', 'image', 'id', 'identifier', 'file_name', 'asset'];
    for (const candidate of candidates) {
      const found = headers.find(h => h.toLowerCase() === candidate.toLowerCase());
      if (found) return found;
    }
    return headers[0] || null;
  }

  /**
   * Auto-detect column mappings based on header names
   * Supports both direct IIIF property names and common aliases
   * Uses CSV_COLUMN_ALIASES from constants.ts for centralized configuration
   */
  autoDetectMappings(headers: string[], filenameColumn: string): CSVColumnMapping[] {
    const mappings: CSVColumnMapping[] = [];

    for (const header of headers) {
      // Skip filename column and manifest column (context only)
      if (header === filenameColumn || header.toLowerCase() === 'manifest') {
        continue;
      }

      // Try to find a matching IIIF property using centralized aliases
      const lowerHeader = header.toLowerCase();
      const mappedProperty = CSV_COLUMN_ALIASES[header] || CSV_COLUMN_ALIASES[lowerHeader];

      if (mappedProperty && CSV_SUPPORTED_PROPERTIES.includes(mappedProperty)) {
        mappings.push({
          csvColumn: header,
          iiifProperty: mappedProperty,
          language: 'en'
        });
      }
    }

    return mappings;
  }

  /**
   * Check if a CSV appears to be from the staging metadata template export
   */
  isFromStagingTemplate(headers: string[]): boolean {
    // Staging template always has 'filename' and 'manifest' columns
    const hasFilename = headers.some(h => h.toLowerCase() === 'filename');
    const hasManifest = headers.some(h => h.toLowerCase() === 'manifest');
    // And uses metadata.* or IIIF property names
    const hasMetadataProps = headers.some(h => h.startsWith('metadata.') || ['label', 'summary', 'rights', 'navDate'].includes(h));

    return hasFilename && hasManifest && hasMetadataProps;
  }

  applyMappings(
    root: IIIFItem,
    rows: Record<string, string>[],
    filenameColumn: string,
    mappings: CSVColumnMapping[]
  ): { updatedRoot: IIIFItem; result: CSVImportResult } {
    const result: CSVImportResult = { matched: 0, unmatched: 0, errors: [] };
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;

    const canvasMap = new Map<string, IIIFCanvas>();
    this.collectCanvases(newRoot, canvasMap);

    for (const row of rows) {
      const filename = row[filenameColumn];
      if (!filename) {
        result.errors.push(`Row missing filename in column "${filenameColumn}"`);
        continue;
      }

      const canvas = this.findCanvasByFilename(canvasMap, filename);
      if (!canvas) {
        result.unmatched++;
        continue;
      }

      for (const mapping of mappings) {
        const value = row[mapping.csvColumn];
        if (!value) continue;

        try {
          this.applyPropertyToCanvas(canvas, mapping.iiifProperty, value, mapping.language || 'en');
        } catch (e) {
          result.errors.push(`Error applying ${mapping.iiifProperty} to ${filename}: ${e}`);
        }
      }
      result.matched++;
    }

    return { updatedRoot: newRoot, result };
  }

  private collectCanvases(item: IIIFItem, map: Map<string, IIIFCanvas>) {
    if (isCanvas(item)) {
      const canvas = item;
      const label = getIIIFValue(canvas.label, 'none') || getIIIFValue(canvas.label, 'en') || '';
      map.set(label, canvas);
      map.set(label.toLowerCase(), canvas);

      const withoutExt = label.replace(/\.[^/.]+$/, '');
      map.set(withoutExt, canvas);
      map.set(withoutExt.toLowerCase(), canvas);
    }
    if (item.items) {
      for (const child of item.items) {
        this.collectCanvases(child, map);
      }
    }
  }

  private findCanvasByFilename(map: Map<string, IIIFCanvas>, filename: string): IIIFCanvas | undefined {
    if (map.has(filename)) return map.get(filename);
    if (map.has(filename.toLowerCase())) return map.get(filename.toLowerCase());

    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    if (map.has(withoutExt)) return map.get(withoutExt);
    if (map.has(withoutExt.toLowerCase())) return map.get(withoutExt.toLowerCase());

    return undefined;
  }

  private applyPropertyToCanvas(canvas: IIIFCanvas, property: string, value: string, language: string) {
    if (property === 'label') {
      canvas.label = createLanguageMap(value, language);
    } else if (property === 'summary') {
      canvas.summary = createLanguageMap(value, language);
    } else if (property === 'navDate') {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        canvas.navDate = formatNavDate(parsedDate);
      } else {
        canvas.navDate = value;
      }
    } else if (property === 'rights') {
      if (value.startsWith('http') && !isValidRightsUri(value)) {
        uiLog.warn(`Rights URI "${value}" is not a known Creative Commons or Rights Statements URI`);
      }
      canvas.rights = value;
    } else if (property.startsWith('metadata.')) {
      const metaKey = property.replace('metadata.', '');
      if (!canvas.metadata) canvas.metadata = [];

      const existing = canvas.metadata.find(m =>
        getIIIFValue(m.label, 'en').toLowerCase() === metaKey.toLowerCase()
      );

      if (existing) {
        existing.value = createLanguageMap(value, language);
      } else {
        canvas.metadata.push({
          label: createLanguageMap(this.capitalizeFirst(metaKey), 'en'),
          value: createLanguageMap(value, language)
        });
      }
    } else if (property.startsWith('requiredStatement.')) {
      const part = property.replace('requiredStatement.', '');
      if (!canvas.requiredStatement) {
        canvas.requiredStatement = {
          label: createLanguageMap('Attribution', 'en'),
          value: createLanguageMap('', 'en')
        };
      }
      if (part === 'label') {
        canvas.requiredStatement.label = createLanguageMap(value, language);
      } else if (part === 'value') {
        canvas.requiredStatement.value = createLanguageMap(value, language);
      }
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ============================================================================
  // CSV Export
  // ============================================================================

  exportCSV(root: IIIFItem, options: CSVExportOptions = {}): CSVExportResult {
    const {
      properties = SUPPORTED_IIIF_PROPERTIES,
      language = 'en',
      includeId = true,
      includeType = true,
      itemTypes = ['Canvas']
    } = options;

    const items: IIIFItem[] = [];
    this.collectItems(root, items, itemTypes);

    const headers: string[] = [];
    if (includeId) headers.push('id');
    headers.push('filename');
    if (includeType) headers.push('type');
    headers.push(...properties);

    const rows: string[][] = [];
    for (const item of items) {
      const row: string[] = [];
      if (includeId) row.push(item.id);
      row.push(this.getFilename(item));
      if (includeType) row.push(item.type);
      for (const prop of properties) {
        row.push(this.extractProperty(item, prop, language));
      }
      rows.push(row);
    }

    const csv = this.generateCSV(headers, rows);
    return { csv, itemCount: items.length, columnCount: headers.length };
  }

  exportCSVSmart(root: IIIFItem, options: Omit<CSVExportOptions, 'properties'> = {}): CSVExportResult {
    const {
      language = 'en',
      includeId = true,
      includeType = true,
      itemTypes = ['Canvas']
    } = options;

    const items: IIIFItem[] = [];
    this.collectItems(root, items, itemTypes);

    const propertyHasValues = new Map<string, boolean>();
    for (const prop of SUPPORTED_IIIF_PROPERTIES) {
      for (const item of items) {
        const value = this.extractProperty(item, prop, language);
        if (value) {
          propertyHasValues.set(prop, true);
          break;
        }
      }
    }

    const properties = SUPPORTED_IIIF_PROPERTIES.filter(p => propertyHasValues.get(p));
    return this.exportCSV(root, { ...options, properties, includeId, includeType, itemTypes });
  }

  exportCSVByIds(root: IIIFItem, ids: string[], options: CSVExportOptions = {}): CSVExportResult {
    const {
      properties = SUPPORTED_IIIF_PROPERTIES,
      language = 'en',
      includeId = true,
      includeType = true
    } = options;

    const idSet = new Set(ids);
    const items: IIIFItem[] = [];
    this.collectItemsById(root, items, idSet);

    const headers: string[] = [];
    if (includeId) headers.push('id');
    headers.push('filename');
    if (includeType) headers.push('type');
    headers.push(...properties);

    const rows: string[][] = [];
    for (const item of items) {
      const row: string[] = [];
      if (includeId) row.push(item.id);
      row.push(this.getFilename(item));
      if (includeType) row.push(item.type);
      for (const prop of properties) {
        row.push(this.extractProperty(item, prop, language));
      }
      rows.push(row);
    }

    const csv = this.generateCSV(headers, rows);
    return { csv, itemCount: items.length, columnCount: headers.length };
  }

  private collectItems(item: IIIFItem, result: IIIFItem[], types: string[]): void {
    if (types.includes(item.type)) {
      result.push(item);
    }
    if (item.items) {
      for (const child of item.items) {
        this.collectItems(child, result, types);
      }
    }
    if (types.includes('Annotation') && item.annotations) {
      for (const page of item.annotations) {
        if (page.items) {
          for (const anno of page.items) {
            result.push(anno);
          }
        }
      }
    }
  }

  private collectItemsById(item: IIIFItem, result: IIIFItem[], ids: Set<string>): void {
    if (ids.has(item.id)) {
      result.push(item);
    }
    if (item.items) {
      for (const child of item.items) {
        this.collectItemsById(child, result, ids);
      }
    }
  }

  private getFilename(item: IIIFItem): string {
    return getIIIFValue(item.label) || item.id;
  }

  private extractProperty(item: IIIFItem, property: string, language: string): string {
    if (property === 'label') {
      return this.extractLanguageValue(item.label, language);
    }
    if (property === 'summary') {
      return this.extractLanguageValue(item.summary, language);
    }
    if (property === 'navDate') {
      return item.navDate || '';
    }
    if (property === 'rights') {
      return item.rights || '';
    }
    if (property.startsWith('metadata.')) {
      const metaKey = property.replace('metadata.', '').toLowerCase();
      const metadata = item.metadata || [];
      for (const entry of metadata) {
        const entryLabel = this.extractLanguageValue(entry.label, 'en').toLowerCase();
        if (entryLabel === metaKey) {
          return this.extractLanguageValue(entry.value, language);
        }
      }
      return '';
    }
    if (property.startsWith('requiredStatement.')) {
      const rs = item.requiredStatement;
      if (!rs) return '';
      const part = property.replace('requiredStatement.', '');
      if (part === 'label') {
        return this.extractLanguageValue(rs.label, language);
      }
      if (part === 'value') {
        return this.extractLanguageValue(rs.value, language);
      }
    }
    return '';
  }

  private extractLanguageValue(langMap: Record<string, string[]> | undefined, preferredLang: string): string {
    if (!langMap) return '';
    if (langMap[preferredLang]?.length) {
      return langMap[preferredLang].join('; ');
    }
    if (langMap['none']?.length) {
      return langMap['none'].join('; ');
    }
    if (langMap['@none']?.length) {
      return langMap['@none'].join('; ');
    }
    if (langMap['en']?.length) {
      return langMap['en'].join('; ');
    }
    for (const values of Object.values(langMap)) {
      if (values?.length) {
        return values.join('; ');
      }
    }
    return '';
  }

  private generateCSV(headers: string[], rows: string[][]): string {
    const lines: string[] = [];
    lines.push(headers.map(h => this.escapeCSVField(h)).join(','));
    for (const row of rows) {
      lines.push(row.map(cell => this.escapeCSVField(cell)).join(','));
    }
    return lines.join('\n');
  }

  private escapeCSVField(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return value;
  }

  downloadCSV(csv: string, filename: string = 'iiif-metadata.csv'): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getExportColumns(): Array<{ key: string; label: string; category: string }> {
    return [
      { key: 'label', label: 'Label', category: 'Core' },
      { key: 'summary', label: 'Summary', category: 'Core' },
      { key: 'rights', label: 'Rights URI', category: 'Core' },
      { key: 'navDate', label: 'Navigation Date', category: 'Core' },
      { key: 'metadata.title', label: 'Title', category: 'Dublin Core' },
      { key: 'metadata.creator', label: 'Creator', category: 'Dublin Core' },
      { key: 'metadata.date', label: 'Date', category: 'Dublin Core' },
      { key: 'metadata.description', label: 'Description', category: 'Dublin Core' },
      { key: 'metadata.subject', label: 'Subject', category: 'Dublin Core' },
      { key: 'metadata.rights', label: 'Rights', category: 'Dublin Core' },
      { key: 'metadata.source', label: 'Source', category: 'Dublin Core' },
      { key: 'metadata.type', label: 'Type', category: 'Dublin Core' },
      { key: 'metadata.format', label: 'Format', category: 'Dublin Core' },
      { key: 'metadata.identifier', label: 'Identifier', category: 'Dublin Core' },
      { key: 'metadata.language', label: 'Language', category: 'Dublin Core' },
      { key: 'metadata.coverage', label: 'Coverage', category: 'Dublin Core' },
      { key: 'metadata.publisher', label: 'Publisher', category: 'Dublin Core' },
      { key: 'requiredStatement.label', label: 'Attribution Label', category: 'Attribution' },
      { key: 'requiredStatement.value', label: 'Attribution Value', category: 'Attribution' }
    ];
  }
}

export const csvImporter = new CSVImporterService();
