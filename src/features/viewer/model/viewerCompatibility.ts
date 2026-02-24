/**
 * Viewer Compatibility Service -- Pure TS (no framework imports)
 *
 * Validates IIIF exports against known viewer requirements.
 * Produces a compatibility report scoring the manifest against
 * Mirador 3.x, Universal Viewer 4.x, Annona, and Clover.
 *
 * SOURCE: React codebase src/features/viewer/model/viewerCompatibility.ts
 * MIGRATION: Nearly verbatim copy -- this is pure TS with no React deps.
 *
 * EXTERNAL DEPENDENCIES:
 * - IIIF_SPEC from @/src/shared/constants (already migrated)
 * - IIIF_CONFIG: Not yet fully migrated. The generateTestManifest() method
 *   requires IIIF_CONFIG.BASE_URL, IIIF_CONFIG.ID_PATTERNS, which need
 *   to be added to the shared/constants/iiif.ts stub.
 * - isCanvas, isRange from @/src/shared/types (already migrated)
 * - createImageServiceReference, isImageService3: utility functions from
 *   the old @/utils path. These need inline stubs or a new shared/lib utility.
 * - getDerivativePreset from @/src/shared/constants (already migrated)
 *
 * TODO (for final implementation):
 * 1. Expand IIIF_CONFIG stub in shared/constants/iiif.ts with BASE_URL
 *    and ID_PATTERNS (MANIFEST, CANVAS, RANGE)
 * 2. Add createImageServiceReference + isImageService3 utilities to
 *    shared/lib or inline here
 * 3. Wire generateTestManifest() once IIIF_CONFIG is complete
 */

import type {
  IIIFAnnotation,
  IIIFCanvas,
  IIIFCollection,
  IIIFGenericService,
  IIIFItem,
  IIIFManifest,
  ServiceDescriptor,
} from '@/src/shared/types';
import { isCanvas } from '@/src/shared/types';

/** Inline type guard — isRange not yet exported from shared/types */
function isRange(item: IIIFItem): boolean {
  return item.type === 'Range';
}
import { IIIF_SPEC, getDerivativePreset } from '@/src/shared/constants';

// ============================================================================
// Types
// ============================================================================

export type ViewerName = 'mirador' | 'universalviewer' | 'annona' | 'clover';

export interface CompatibilityIssue {
  viewer: ViewerName;
  severity: 'error' | 'warning' | 'info';
  resourceId: string;
  resourceType: string;
  message: string;
  recommendation?: string;
}

export interface CompatibilityReport {
  timestamp: string;
  manifestId: string;
  overallScore: number; // 0-100
  issues: CompatibilityIssue[];
  viewerScores: Record<ViewerName, number>;
}

export interface ViewerRequirement {
  id: string;
  description: string;
  check: (item: IIIFItem) => boolean;
  viewers: ViewerName[];
  severity: 'error' | 'warning' | 'info';
  recommendation: string;
}

// ============================================================================
// IIIF_CONFIG stub (inline until shared/constants is expanded)
// ============================================================================

// PSEUDO: These patterns replicate IIIF_CONFIG from the React codebase.
// In the final implementation, import these from @/src/shared/constants.
const IIIF_CONFIG_STUB = {
  BASE_URL: {
    LEGACY_DOMAINS: ['https://iiif.example.org', 'https://example.org'],
  },
  ID_PATTERNS: {
    MANIFEST: (base: string, slug: string) => `${base}/manifest/${slug}`,
    CANVAS: (manifestId: string, index: number) => `${manifestId}/canvas/${index}`,
    RANGE: (base: string, slug: string) => `${base}/range/${slug}`,
  },
} as const;

// PSEUDO: Stub for createImageServiceReference until shared/lib is expanded.
// Returns a minimal ImageService3 reference object.
function createImageServiceReference(
  serviceId: string,
  profile: string,
): ServiceDescriptor {
  return {
    type: 'ImageService3',
    id: serviceId,
    profile: `level${profile.replace('level', '')}`,
    protocol: IIIF_SPEC.IMAGE_3.PROTOCOL,
  } satisfies IIIFGenericService;
}

// PSEUDO: Stub for isImageService3 check.
function isImageService3(svc: Record<string, unknown>): boolean {
  return svc?.type === 'ImageService3';
}

// ============================================================================
// Viewer Requirements Database
// ============================================================================

/**
 * Static array of 13 viewer requirement checks.
 * Each requirement defines:
 * - A check function that returns true if the item passes
 * - Which viewers are affected
 * - Severity level and recommendation text
 *
 * Rule 2.F: Static data at top level (no framework wrapper needed)
 */
const REQUIREMENTS: ViewerRequirement[] = [
  // --- Context requirements ---
  {
    id: 'context-v3',
    description: 'Manifest must use IIIF Presentation API 3.0 context',
    check: (item) => {
      const context = item['@context'];
      if (Array.isArray(context)) {
        return context.includes(IIIF_SPEC.PRESENTATION_3.CONTEXT);
      }
      return context === IIIF_SPEC.PRESENTATION_3.CONTEXT;
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: `Set @context to "${IIIF_SPEC.PRESENTATION_3.CONTEXT}"`,
  },

  // --- ID requirements ---
  {
    id: 'http-id',
    description: 'Resource ID must be a valid HTTP(S) URI',
    check: (item) => item.id?.startsWith('http://') || item.id?.startsWith('https://'),
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Use HTTP or HTTPS URLs for all resource IDs',
  },

  // --- Label requirements ---
  {
    id: 'label-present',
    description: 'Manifest must have a label',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return item.label !== undefined && Object.keys(item.label).length > 0;
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Add a label to the manifest',
  },

  // --- Canvas requirements ---
  {
    id: 'canvas-dimensions',
    description: 'Canvas must have width and height',
    check: (item) => {
      if (item.type !== 'Canvas') return true;
      const canvas = item as IIIFCanvas;
      return typeof canvas.width === 'number' && typeof canvas.height === 'number';
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Set width and height on all canvases',
  },

  {
    id: 'canvas-has-content',
    description: 'Canvas must have painting annotation',
    check: (item) => {
      if (item.type !== 'Canvas') return true;
      const canvas = item as IIIFCanvas;
      return canvas.items?.some(page =>
        page.items?.some((anno: IIIFAnnotation) => anno.motivation === 'painting'),
      ) ?? false;
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Add at least one painting annotation to each canvas',
  },

  // --- Image Service requirements ---
  {
    id: 'image-service-protocol',
    description: 'ImageService3 must include protocol property',
    check: (item) => {
      if (item.type !== 'Canvas') return true;
      const canvas = item as IIIFCanvas;
      const paintings = canvas.items?.flatMap(p => p.items || []) || [];
      for (const anno of paintings) {
        if (anno.body && !Array.isArray(anno.body)) {
          const services = (anno.body as unknown as Record<string, unknown>).service as
            | Record<string, unknown>[]
            | undefined;
          if (!services) continue;
          for (const svc of services) {
            if (isImageService3(svc) && !svc.protocol) {
              return false;
            }
          }
        }
      }
      return true;
    },
    viewers: ['mirador', 'universalviewer'],
    severity: 'warning',
    recommendation: `Add protocol: "${IIIF_SPEC.IMAGE_3.PROTOCOL}" to ImageService3`,
  },

  // --- Thumbnail requirements ---
  {
    id: 'manifest-thumbnail',
    description: 'Manifest should have a thumbnail for navigation',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return Array.isArray(item.thumbnail) && item.thumbnail.length > 0;
    },
    viewers: ['mirador', 'universalviewer'],
    severity: 'warning',
    recommendation: 'Add a thumbnail to the manifest for better navigation UX',
  },

  // --- Annotation requirements ---
  {
    id: 'annotation-target',
    description: 'Annotation must have a valid target',
    check: (item) => {
      if (item.type !== 'Annotation') return true;
      const anno = item as IIIFAnnotation;
      return !!anno.target;
    },
    viewers: ['mirador', 'universalviewer', 'annona'],
    severity: 'error',
    recommendation: 'Ensure all annotations have a target property',
  },

  // --- Mirador-specific ---
  {
    id: 'mirador-items-array',
    description: 'Manifest items must be an array',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return Array.isArray((item as IIIFManifest).items);
    },
    viewers: ['mirador'],
    severity: 'error',
    recommendation: 'Ensure manifest.items is an array of Canvases',
  },

  // --- Universal Viewer specific ---
  {
    id: 'uv-behavior',
    description: 'Paged manifests should have behavior: ["paged"]',
    check: (_item) => {
      // This is just a recommendation, always passes
      return true;
    },
    viewers: ['universalviewer'],
    severity: 'info',
    recommendation: 'Add behavior: ["paged"] for book-like navigation in UV',
  },

  // --- Range requirements ---
  {
    id: 'range-items',
    description: 'Range must reference valid Canvas IDs or other Ranges',
    check: (item) => {
      if (item.type !== 'Range') return true;
      const range = item as { items?: Array<{ id?: string; type?: string }> };
      if (!range.items) return false;
      return range.items.every((ref) =>
        ref.id && (isCanvas(ref as IIIFItem) || isRange(ref as IIIFItem)),
      );
    },
    viewers: ['mirador', 'universalviewer'],
    severity: 'error',
    recommendation: 'Ensure Range items array contains valid Canvas or Range references',
  },

  // --- Collection requirements ---
  {
    id: 'collection-items',
    description: 'Collection must have items array',
    check: (item) => {
      if (item.type !== 'Collection') return true;
      return Array.isArray((item as IIIFCollection).items);
    },
    viewers: ['mirador', 'universalviewer', 'clover'],
    severity: 'error',
    recommendation: 'Ensure collection.items is an array',
  },

  // --- Annona specific ---
  {
    id: 'annona-annotation-body',
    description: 'Annotation body should have type for Annona rendering',
    check: (item) => {
      if (item.type !== 'Annotation') return true;
      const anno = item as IIIFAnnotation;
      if (!anno.body) return true;
      if (Array.isArray(anno.body)) {
        return anno.body.every(b => (b as unknown as Record<string, unknown>).type);
      }
      return !!(anno.body as unknown as Record<string, unknown>).type;
    },
    viewers: ['annona'],
    severity: 'warning',
    recommendation: 'Add type property to annotation bodies for proper Annona rendering',
  },
];

// ============================================================================
// Compatibility Service
// ============================================================================

class ViewerCompatibilityService {
  /**
   * Run full compatibility check against all viewers.
   *
   * Traverses the IIIF resource tree (manifest -> canvases -> annotations)
   * and checks each resource against all 13 requirements.
   *
   * Scoring: 100 base per viewer, -15 per error, -5 per warning, -1 per info.
   * Overall score is the average of all four viewer scores.
   *
   * @param root - Root IIIF resource (typically a Manifest)
   * @returns Complete compatibility report
   */
  checkCompatibility(root: IIIFItem): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const viewerIssues: Record<ViewerName, number> = {
      mirador: 0,
      universalviewer: 0,
      annona: 0,
      clover: 0,
    };

    // Recursive traversal of the IIIF tree
    const traverse = (item: IIIFItem) => {
      for (const req of REQUIREMENTS) {
        if (!req.check(item)) {
          for (const viewer of req.viewers) {
            viewerIssues[viewer]++;
            issues.push({
              viewer,
              severity: req.severity,
              resourceId: item.id,
              resourceType: item.type,
              message: req.description,
              recommendation: req.recommendation,
            });
          }
        }
      }

      // Traverse children (items, annotations)
      const children = (item as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
      const annotations = item.annotations;
      const allChildren = [...(children || []), ...(annotations || [])];
      for (const child of allChildren) {
        if (child && typeof child === 'object' && 'type' in child) {
          traverse(child as IIIFItem);
        }
      }

      // Traverse structures (ranges)
      const structures = (item as unknown as Record<string, unknown>).structures as IIIFItem[] | undefined;
      if (structures) {
        for (const range of structures) {
          traverse(range);
        }
      }
    };

    traverse(root);

    // Calculate scores
    const errorPenalty = 15;
    const warningPenalty = 5;
    const infoPenalty = 1;

    const viewerScores: Record<ViewerName, number> = {
      mirador: 100,
      universalviewer: 100,
      annona: 100,
      clover: 100,
    };

    for (const issue of issues) {
      const penalty =
        issue.severity === 'error' ? errorPenalty :
        issue.severity === 'warning' ? warningPenalty : infoPenalty;
      viewerScores[issue.viewer] = Math.max(0, viewerScores[issue.viewer] - penalty);
    }

    const overallScore = Math.round(
      (viewerScores.mirador + viewerScores.universalviewer +
       viewerScores.annona + viewerScores.clover) / 4,
    );

    return {
      timestamp: new Date().toISOString(),
      manifestId: root.id,
      overallScore,
      issues,
      viewerScores,
    };
  }

  /**
   * Check compatibility for a specific viewer only.
   *
   * @param root   - Root IIIF resource
   * @param viewer - Target viewer name
   * @returns Issues specific to the requested viewer
   */
  checkForViewer(root: IIIFItem, viewer: ViewerName): CompatibilityIssue[] {
    const report = this.checkCompatibility(root);
    return report.issues.filter(i => i.viewer === viewer);
  }

  /**
   * Get all recommendations for a specific viewer.
   *
   * @param viewer - Target viewer name
   * @returns Array of recommendation strings
   */
  getViewerRecommendations(viewer: ViewerName): string[] {
    return REQUIREMENTS
      .filter(r => r.viewers.includes(viewer))
      .map(r => r.recommendation);
  }

  /**
   * Generate a test manifest for compatibility testing.
   *
   * PSEUDO: This creates a minimal valid manifest with 2 canvases,
   * painting annotations, image services, comment annotations, and
   * a Range structure. Used for self-testing the compatibility checker.
   *
   * TODO: Wire up properly once IIIF_CONFIG is fully migrated.
   * Currently uses IIIF_CONFIG_STUB (inline) for ID patterns.
   *
   * @returns A complete IIIFManifest for testing
   */
  generateTestManifest(): IIIFManifest {
    const baseUrl = `${IIIF_CONFIG_STUB.BASE_URL.LEGACY_DOMAINS[1]}/iiif`;
    const manifestId = IIIF_CONFIG_STUB.ID_PATTERNS.MANIFEST(baseUrl, `test-${Date.now()}`);
    const preset = getDerivativePreset();

    return {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label: { en: ['Compatibility Test Manifest'] },
      summary: { en: ['A test manifest for verifying viewer compatibility'] },
      metadata: [
        { label: { en: ['Source'] }, value: { en: ['IIIF Field Studio'] } },
        { label: { en: ['Generated'] }, value: { en: [new Date().toISOString()] } },
      ],
      thumbnail: [{
        id: `${baseUrl}/image/test/full/${preset.thumbnailWidth},/0/default.jpg`,
        type: 'Image' as const,
        format: 'image/jpeg',
      }],
      viewingDirection: 'left-to-right',
      behavior: ['individuals'],
      items: [
        {
          id: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 1),
          type: 'Canvas' as const,
          label: { en: ['Test Canvas 1'] },
          width: 1000,
          height: 1500,
          items: [{
            id: `${manifestId}/canvas/1/page/1`,
            type: 'AnnotationPage' as const,
            items: [{
              id: `${manifestId}/canvas/1/annotation/1`,
              type: 'Annotation' as const,
              motivation: 'painting' as const,
              target: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 1),
              body: {
                id: `${baseUrl}/image/test1/full/max/0/default.jpg`,
                type: 'Image' as const,
                format: 'image/jpeg',
                service: [createImageServiceReference(`${baseUrl}/image/test1`, 'level2')],
              },
            }],
          }],
          annotations: [{
            id: `${manifestId}/canvas/1/page/annotations`,
            type: 'AnnotationPage' as const,
            items: [{
              id: `${manifestId}/canvas/1/annotation/comment`,
              type: 'Annotation' as const,
              motivation: 'commenting' as const,
              target: `${IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 1)}#xywh=100,100,200,200`,
              body: {
                type: 'TextualBody' as const,
                value: 'Test comment annotation',
                format: 'text/plain',
              },
            }],
          }],
        },
        {
          id: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 2),
          type: 'Canvas' as const,
          label: { en: ['Test Canvas 2'] },
          width: 1000,
          height: 1500,
          items: [{
            id: `${manifestId}/canvas/2/page/1`,
            type: 'AnnotationPage' as const,
            items: [{
              id: `${manifestId}/canvas/2/annotation/1`,
              type: 'Annotation' as const,
              motivation: 'painting' as const,
              target: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 2),
              body: {
                id: `${baseUrl}/image/test2/full/max/0/default.jpg`,
                type: 'Image' as const,
                format: 'image/jpeg',
                service: [createImageServiceReference(`${baseUrl}/image/test2`, 'level2')],
              },
            }],
          }],
        },
      ],
      structures: [{
        id: IIIF_CONFIG_STUB.ID_PATTERNS.RANGE(baseUrl, '1'),
        type: 'Range' as const,
        label: { en: ['Chapter 1'] },
        items: [
          { id: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 1), type: 'Canvas' as const },
          { id: IIIF_CONFIG_STUB.ID_PATTERNS.CANVAS(manifestId, 2), type: 'Canvas' as const },
        ],
      }],
    } as IIIFManifest;
  }

  /**
   * Format a compatibility report as Markdown.
   * Useful for export/documentation generation.
   *
   * @param report - Compatibility report to format
   * @returns Markdown string
   */
  formatReportMarkdown(report: CompatibilityReport): string {
    const lines: string[] = [
      '# Viewer Compatibility Report',
      '',
      `**Generated**: ${report.timestamp}`,
      `**Manifest**: ${report.manifestId}`,
      `**Overall Score**: ${report.overallScore}/100`,
      '',
      '## Viewer Scores',
      '',
      '| Viewer | Score | Status |',
      '|--------|-------|--------|',
    ];

    for (const [viewer, score] of Object.entries(report.viewerScores)) {
      const status = score >= 80 ? 'Good' : score >= 50 ? 'Issues' : 'Critical';
      lines.push(`| ${viewer} | ${score}/100 | ${status} |`);
    }

    if (report.issues.length > 0) {
      lines.push('', '## Issues', '');

      const errorIssues = report.issues.filter(i => i.severity === 'error');
      const warningIssues = report.issues.filter(i => i.severity === 'warning');
      const infoIssues = report.issues.filter(i => i.severity === 'info');

      if (errorIssues.length > 0) {
        lines.push('### Errors', '');
        for (const issue of errorIssues) {
          lines.push(`- **[${issue.viewer}]** ${issue.message}`);
          lines.push(`  - Resource: \`${issue.resourceId}\``);
          if (issue.recommendation) {
            lines.push(`  - Fix: ${issue.recommendation}`);
          }
        }
        lines.push('');
      }

      if (warningIssues.length > 0) {
        lines.push('### Warnings', '');
        for (const issue of warningIssues) {
          lines.push(`- **[${issue.viewer}]** ${issue.message}`);
        }
        lines.push('');
      }

      if (infoIssues.length > 0) {
        lines.push('### Info', '');
        for (const issue of infoIssues) {
          lines.push(`- **[${issue.viewer}]** ${issue.message}`);
        }
      }
    } else {
      lines.push('', '## No Issues Found', '', 'Manifest is fully compatible with all tested viewers.');
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const viewerCompatibility = new ViewerCompatibilityService();
