/** Metadata Harvester -- Stub */
export interface ExtractedMetadata {
  title?: string;
  creator?: string;
  date?: string;
  description?: string;
  rights?: string;
  [key: string]: unknown;
}
export async function extractMetadata(_file: File): Promise<ExtractedMetadata> {
  return {};
}
export const metadataHarvester = { extractMetadata };
