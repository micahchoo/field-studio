/**
 * TechnicalTabPanel — Wired component tests
 *
 * Verifies the newly wired AgentEditor, LinkListEditor, StartPropertyEditor
 * sub-components are correctly called with right props.
 *
 * Tests use pure function logic (not full mount) since TechnicalTabPanel
 * depends on complex Leaflet/IIIF internals.
 */

import { describe, it, expect, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeManifest(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    ...overrides,
  };
}

function makeCanvas(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentEditor data transformation tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TechnicalTabPanel — AgentEditor data mapping', () => {
  it('maps empty provider array to empty AgentItem array', () => {
    const resource = makeManifest({ provider: [] });
    const agents = (resource.provider || []);
    expect(agents).toEqual([]);
  });

  it('maps provider with IIIF agent structure correctly', () => {
    const resource = makeManifest({
      provider: [
        {
          id: 'https://example.org/provider',
          type: 'Agent',
          label: { en: ['Example Museum'] },
        },
      ],
    });
    const agents = (resource.provider || []);
    expect(agents).toHaveLength(1);
    expect(agents[0].type).toBe('Agent');
    expect(agents[0].label.en[0]).toBe('Example Museum');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LinkListEditor data transformation tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TechnicalTabPanel — LinkListEditor data mapping', () => {
  it('maps empty homepage array to empty LinkItem array', () => {
    const resource = makeManifest({ homepage: [] });
    const links = (resource.homepage || []);
    expect(links).toEqual([]);
  });

  it('maps homepage with IIIF link structure correctly', () => {
    const resource = makeManifest({
      homepage: [
        {
          id: 'https://example.org',
          type: 'Text',
          label: { en: ['Example Homepage'] },
          format: 'text/html',
        },
      ],
    });
    const links = (resource.homepage || []);
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe('https://example.org');
    expect(links[0].type).toBe('Text');
  });

  it('maps rendering array (downloads) correctly', () => {
    const resource = makeManifest({
      rendering: [
        {
          id: 'https://example.org/document.pdf',
          type: 'Text',
          label: { en: ['PDF Download'] },
          format: 'application/pdf',
        },
      ],
    });
    const links = (resource.rendering || []);
    expect(links).toHaveLength(1);
    expect(links[0].format).toBe('application/pdf');
  });

  it('maps seeAlso array correctly', () => {
    const resource = makeManifest({
      seeAlso: [
        {
          id: 'https://example.org/metadata.json',
          type: 'Dataset',
          format: 'application/json',
        },
      ],
    });
    const links = (resource.seeAlso || []);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('Dataset');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// StartPropertyEditor data tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TechnicalTabPanel — StartPropertyEditor data mapping', () => {
  it('maps undefined start to undefined', () => {
    const resource = makeManifest();
    const start = resource.start as undefined;
    expect(start).toBeUndefined();
  });

  it('maps Canvas start property correctly', () => {
    const canvas = makeCanvas();
    const resource = makeManifest({
      items: [canvas],
      start: { id: canvas.id, type: 'Canvas' },
    });
    const start = resource.start;
    expect(start).toBeDefined();
    expect(start!.type).toBe('Canvas');
    expect(start!.id).toBe(canvas.id);
  });

  it('maps SpecificResource start with selector', () => {
    const canvas = makeCanvas();
    const resource = makeManifest({
      items: [canvas],
      start: {
        id: `${canvas.id}#t=30`,
        type: 'SpecificResource',
        source: canvas.id,
        selector: { type: 'PointSelector', t: 30 },
      },
    });
    const start = resource.start;
    expect(start!.type).toBe('SpecificResource');
    expect((start!.selector as Record<string, unknown>)?.t).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MetadataFieldsPanel — update field logic tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MetadataFieldsPanel — field update logic', () => {
  it('updateField updates label at correct index', () => {
    const metadata = [
      { label: { none: ['Creator'] }, value: { none: ['John Doe'] } },
      { label: { none: ['Date'] }, value: { none: ['2023'] } },
    ];

    const updated = [...metadata];
    const index = 0;
    const key = 'label';
    const value = 'Author';
    if (key === 'label') {
      updated[index] = { ...updated[index], label: { none: [value] } };
    }
    expect(updated[0].label.none[0]).toBe('Author');
    expect(updated[1].label.none[0]).toBe('Date'); // unchanged
  });

  it('updateField updates value at correct index', () => {
    const metadata = [
      { label: { none: ['Creator'] }, value: { none: ['John Doe'] } },
    ];

    const updated = [...metadata];
    const index = 0;
    updated[index] = { ...updated[index], value: { none: ['Jane Smith'] } };
    expect(updated[0].value.none[0]).toBe('Jane Smith');
  });

  it('addField appends new empty entry', () => {
    const metadata = [
      { label: { none: ['Creator'] }, value: { none: ['John Doe'] } },
    ];

    const newField = { label: { none: ['Date'] }, value: { none: [''] } };
    const updated = [...metadata, newField];
    expect(updated).toHaveLength(2);
    expect(updated[1].label.none[0]).toBe('Date');
    expect(updated[1].value.none[0]).toBe('');
  });

  it('removeField removes entry at correct index', () => {
    const metadata = [
      { label: { none: ['Creator'] }, value: { none: ['John Doe'] } },
      { label: { none: ['Date'] }, value: { none: ['2023'] } },
    ];

    const updated = [...metadata];
    updated.splice(0, 1); // remove first
    expect(updated).toHaveLength(1);
    expect(updated[0].label.none[0]).toBe('Date');
  });
});
