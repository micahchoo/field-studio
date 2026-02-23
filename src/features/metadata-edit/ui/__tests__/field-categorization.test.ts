/**
 * Field Categorization Tests -- MetadataTabPanel
 *
 * Tests the metadata field categorization logic used in MetadataTabPanel.svelte
 * to group metadata entries into Basic, Date, Rights, Location, and Other sections.
 *
 * The canonical field arrays are defined in MetadataTabPanel.svelte <script module>.
 * They are duplicated here for testing since Svelte module exports are not directly
 * importable in vitest without the preprocessor.
 *
 * Note: The actual component uses .includes() for substring matching (e.g., a label
 * containing "date" anywhere will match the date category). The categorizeField
 * function below mirrors that behavior exactly.
 *
 * Pure TypeScript -- no DOM required.
 */

import { describe, it, expect } from 'vitest';

// ==================================================================
// Field category arrays (mirrored from MetadataTabPanel.svelte)
// ==================================================================

const BASIC_FIELDS = ['title', 'label', 'description', 'summary', 'subject', 'creator', 'contributor'];
const DATE_FIELDS = ['date', 'navdate', 'created', 'issued', 'modified'];
const RIGHTS_FIELDS = ['rights', 'license', 'attribution', 'requiredstatement', 'provider'];
const LOCATION_FIELDS = ['location', 'coverage', 'spatial', 'navplace'];

/**
 * Categorize a metadata field label into one of the panel sections.
 *
 * Uses substring matching (`.includes()`) on the lowercased label,
 * matching the logic in MetadataTabPanel.svelte's $derived filters.
 *
 * Priority order: basic > date > rights > location > other
 */
function categorizeField(label: string): 'basic' | 'date' | 'rights' | 'location' | 'other' {
  const lbl = label.toLowerCase();
  if (BASIC_FIELDS.some(f => lbl.includes(f))) return 'basic';
  if (DATE_FIELDS.some(f => lbl.includes(f))) return 'date';
  if (RIGHTS_FIELDS.some(f => lbl.includes(f))) return 'rights';
  if (LOCATION_FIELDS.some(f => lbl.includes(f))) return 'location';
  return 'other';
}

// ==================================================================
// Tests
// ==================================================================

describe('categorizeField', () => {
  // ----------------------------------------------------------------
  // Basic fields
  // ----------------------------------------------------------------
  describe('basic category', () => {
    it('categorizes "Title" as basic', () => {
      expect(categorizeField('Title')).toBe('basic');
    });

    it('categorizes "title" as basic (lowercase)', () => {
      expect(categorizeField('title')).toBe('basic');
    });

    it('categorizes "Label" as basic', () => {
      expect(categorizeField('Label')).toBe('basic');
    });

    it('categorizes "Description" as basic', () => {
      expect(categorizeField('Description')).toBe('basic');
    });

    it('categorizes "Summary" as basic', () => {
      expect(categorizeField('Summary')).toBe('basic');
    });

    it('categorizes "Subject" as basic', () => {
      expect(categorizeField('Subject')).toBe('basic');
    });

    it('categorizes "Creator" as basic', () => {
      expect(categorizeField('Creator')).toBe('basic');
    });

    it('categorizes "Contributor" as basic', () => {
      expect(categorizeField('Contributor')).toBe('basic');
    });

    it('categorizes "Full Description" as basic (substring match)', () => {
      expect(categorizeField('Full Description')).toBe('basic');
    });

    it('categorizes "Original Title" as basic (substring match)', () => {
      expect(categorizeField('Original Title')).toBe('basic');
    });
  });

  // ----------------------------------------------------------------
  // Date fields
  // ----------------------------------------------------------------
  describe('date category', () => {
    it('categorizes "Date" as date', () => {
      expect(categorizeField('Date')).toBe('date');
    });

    it('categorizes "date" as date (lowercase)', () => {
      expect(categorizeField('date')).toBe('date');
    });

    it('categorizes "navDate" as date (lowercased to "navdate")', () => {
      expect(categorizeField('navDate')).toBe('date');
    });

    it('categorizes "Created" as date', () => {
      expect(categorizeField('Created')).toBe('date');
    });

    it('categorizes "Issued" as date', () => {
      expect(categorizeField('Issued')).toBe('date');
    });

    it('categorizes "Modified" as date', () => {
      expect(categorizeField('Modified')).toBe('date');
    });

    it('categorizes "Date Created" as date (substring "date" or "created")', () => {
      expect(categorizeField('Date Created')).toBe('date');
    });

    it('categorizes "Issued Date" as date (substring "issued" or "date")', () => {
      expect(categorizeField('Issued Date')).toBe('date');
    });

    it('categorizes "Last Modified" as date (substring "modified")', () => {
      expect(categorizeField('Last Modified')).toBe('date');
    });
  });

  // ----------------------------------------------------------------
  // Rights fields
  // ----------------------------------------------------------------
  describe('rights category', () => {
    it('categorizes "Rights" as rights', () => {
      expect(categorizeField('Rights')).toBe('rights');
    });

    it('categorizes "License" as rights', () => {
      expect(categorizeField('License')).toBe('rights');
    });

    it('categorizes "Attribution" as rights', () => {
      expect(categorizeField('Attribution')).toBe('rights');
    });

    it('categorizes "RequiredStatement" as rights (lowercased to "requiredstatement")', () => {
      expect(categorizeField('RequiredStatement')).toBe('rights');
    });

    it('categorizes "Provider" as rights', () => {
      expect(categorizeField('Provider')).toBe('rights');
    });

    it('categorizes "Usage Rights" as rights (substring "rights")', () => {
      expect(categorizeField('Usage Rights')).toBe('rights');
    });

    it('categorizes "Content Provider" as rights (substring "provider")', () => {
      expect(categorizeField('Content Provider')).toBe('rights');
    });
  });

  // ----------------------------------------------------------------
  // Location fields
  // ----------------------------------------------------------------
  describe('location category', () => {
    it('categorizes "Location" as location', () => {
      expect(categorizeField('Location')).toBe('location');
    });

    it('categorizes "Coverage" as location', () => {
      expect(categorizeField('Coverage')).toBe('location');
    });

    it('categorizes "Spatial" as location', () => {
      expect(categorizeField('Spatial')).toBe('location');
    });

    it('categorizes "navPlace" as location (lowercased to "navplace")', () => {
      expect(categorizeField('navPlace')).toBe('location');
    });

    it('categorizes "GPS Location" as location (substring "location")', () => {
      expect(categorizeField('GPS Location')).toBe('location');
    });

    it('categorizes "Spatial Coverage" as location (substring "spatial" or "coverage")', () => {
      expect(categorizeField('Spatial Coverage')).toBe('location');
    });
  });

  // ----------------------------------------------------------------
  // Other (uncategorized) fields
  // ----------------------------------------------------------------
  describe('other category', () => {
    it('categorizes "Foo Bar" as other', () => {
      expect(categorizeField('Foo Bar')).toBe('other');
    });

    it('categorizes "Custom" as other', () => {
      expect(categorizeField('Custom')).toBe('other');
    });

    it('categorizes empty string as other', () => {
      expect(categorizeField('')).toBe('other');
    });

    it('categorizes "Format" as other', () => {
      expect(categorizeField('Format')).toBe('other');
    });

    it('categorizes "Publisher" as other (not in any category)', () => {
      // "Publisher" is not in RIGHTS_FIELDS (which has "provider" not "publisher")
      expect(categorizeField('Publisher')).toBe('other');
    });

    it('categorizes "Type" as other', () => {
      expect(categorizeField('Type')).toBe('other');
    });

    it('categorizes "Identifier" as other', () => {
      expect(categorizeField('Identifier')).toBe('other');
    });

    it('categorizes "Notes" as other', () => {
      expect(categorizeField('Notes')).toBe('other');
    });
  });

  // ----------------------------------------------------------------
  // Priority order: basic > date > rights > location > other
  // ----------------------------------------------------------------
  describe('priority ordering', () => {
    it('prioritizes basic over date for labels matching both', () => {
      // "Date Description" contains "description" (basic) and "date" (date)
      // basic is checked first, so it wins
      expect(categorizeField('Date Description')).toBe('basic');
    });

    it('prioritizes basic over rights for labels matching both', () => {
      // "Creator Attribution" contains "creator" (basic) and "attribution" (rights)
      expect(categorizeField('Creator Attribution')).toBe('basic');
    });

    it('prioritizes date over rights for labels matching both', () => {
      // A contrived label matching both date and rights categories
      // "License Issued Date" contains "issued" (date) and "license" (rights)
      // date fields are checked before rights
      expect(categorizeField('License Issued Date')).toBe('date');
    });

    it('prioritizes rights over location for labels matching both', () => {
      // "Rights Coverage" contains "rights" and "coverage"
      expect(categorizeField('Rights Coverage')).toBe('rights');
    });
  });

  // ----------------------------------------------------------------
  // Case insensitivity
  // ----------------------------------------------------------------
  describe('case insensitivity', () => {
    it('handles uppercase "TITLE"', () => {
      expect(categorizeField('TITLE')).toBe('basic');
    });

    it('handles mixed case "dEsCriPtIoN"', () => {
      expect(categorizeField('dEsCriPtIoN')).toBe('basic');
    });

    it('handles uppercase "RIGHTS"', () => {
      expect(categorizeField('RIGHTS')).toBe('rights');
    });

    it('handles uppercase "LOCATION"', () => {
      expect(categorizeField('LOCATION')).toBe('location');
    });

    it('handles uppercase "MODIFIED"', () => {
      expect(categorizeField('MODIFIED')).toBe('date');
    });
  });

  // ----------------------------------------------------------------
  // Exclusion from "other" in actual component logic
  // ----------------------------------------------------------------
  describe('other category exclusion logic (mirrors MetadataTabPanel)', () => {
    /**
     * In MetadataTabPanel.svelte, the "other" filter excludes fields
     * that match basic, date, or rights arrays (but NOT location).
     * This is because location fields are handled separately by
     * the isLocationField prop, not by the field array categorization.
     *
     * The categorizeField function above includes location for completeness,
     * but the actual component's "other" derived only filters out
     * BASIC_FIELDS + DATE_FIELDS + RIGHTS_FIELDS.
     */
    function isOtherInComponent(label: string): boolean {
      const lbl = label.toLowerCase();
      const allCategorized = [...BASIC_FIELDS, ...DATE_FIELDS, ...RIGHTS_FIELDS];
      return !allCategorized.some(f => lbl.includes(f));
    }

    it('location fields fall through to "other" in the component filter', () => {
      // In the actual component, "Location" matches no basic/date/rights field
      // so it ends up in otherMetadata (and the Location section handles it separately)
      expect(isOtherInComponent('Location')).toBe(true);
    });

    it('coverage fields fall through to "other" in the component filter', () => {
      expect(isOtherInComponent('Coverage')).toBe(true);
    });

    it('basic fields are excluded from "other"', () => {
      expect(isOtherInComponent('Title')).toBe(false);
      expect(isOtherInComponent('Creator')).toBe(false);
    });

    it('date fields are excluded from "other"', () => {
      expect(isOtherInComponent('Date')).toBe(false);
      expect(isOtherInComponent('Modified')).toBe(false);
    });

    it('rights fields are excluded from "other"', () => {
      expect(isOtherInComponent('Rights')).toBe(false);
      expect(isOtherInComponent('License')).toBe(false);
    });

    it('truly uncategorized fields are in "other"', () => {
      expect(isOtherInComponent('Format')).toBe(true);
      expect(isOtherInComponent('Custom Note')).toBe(true);
    });
  });
});
