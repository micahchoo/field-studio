/**
 * Field Registry Service — Stub for Svelte Migration
 *
 * TODO: Copy full implementation from React source at
 * field-studio/src/shared/services/fieldRegistry.ts
 *
 * This stub provides the fieldRegistry singleton and DEFAULT_SEARCH_CONFIG
 * used by the static site exporter.
 */

export interface SearchConfig {
  fields: Array<{ name: string; boost?: number }>;
  ref: string;
}

export const DEFAULT_SEARCH_CONFIG = {
  fields: ['label', 'summary', 'metadata'],
};

class FieldRegistry {
  /**
   * Build a search configuration from a list of field names
   */
  buildSearchConfig(fields: string[]): SearchConfig {
    // TODO: Implement full field registry logic
    return {
      fields: fields.map(name => ({ name, boost: 1 })),
      ref: 'pid',
    };
  }
}

export const fieldRegistry = new FieldRegistry();
