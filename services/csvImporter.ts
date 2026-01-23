import { IIIFItem, IIIFCanvas } from '../types';

export interface CSVColumnMapping {
  csvColumn: string;
  iiifProperty: string;
  language?: string;
}

export interface CSVImportResult {
  matched: number;
  unmatched: number;
  errors: string[];
}

export const SUPPORTED_IIIF_PROPERTIES: string[] = [
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

export type SupportedIIIFProperty = string;

class CSVImporterService {

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
    if (item.type === 'Canvas') {
      const canvas = item as IIIFCanvas;
      const label = canvas.label?.['none']?.[0] || canvas.label?.['en']?.[0] || '';
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
      canvas.label = this.toLanguageMap(value, language);
    } else if (property === 'summary') {
      (canvas as any).summary = this.toLanguageMap(value, language);
    } else if (property === 'navDate') {
      canvas.navDate = this.parseDate(value);
    } else if (property === 'rights') {
      (canvas as any).rights = value;
    } else if (property.startsWith('metadata.')) {
      const metaKey = property.replace('metadata.', '');
      if (!canvas.metadata) canvas.metadata = [];

      const existing = canvas.metadata.find(m =>
        m.label?.['en']?.[0]?.toLowerCase() === metaKey.toLowerCase()
      );

      if (existing) {
        existing.value = this.toLanguageMap(value, language);
      } else {
        canvas.metadata.push({
          label: { en: [this.capitalizeFirst(metaKey)] },
          value: this.toLanguageMap(value, language)
        });
      }
    } else if (property.startsWith('requiredStatement.')) {
      const part = property.replace('requiredStatement.', '');
      if (!(canvas as any).requiredStatement) {
        (canvas as any).requiredStatement = { label: { en: ['Attribution'] }, value: { en: [''] } };
      }
      if (part === 'label') {
        (canvas as any).requiredStatement.label = this.toLanguageMap(value, language);
      } else if (part === 'value') {
        (canvas as any).requiredStatement.value = this.toLanguageMap(value, language);
      }
    }
  }

  private toLanguageMap(value: string, language: string): Record<string, string[]> {
    return { [language]: [value] };
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private parseDate(value: string): string {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Ignore invalid date
    }
    return value;
  }
}

export const csvImporter = new CSVImporterService();