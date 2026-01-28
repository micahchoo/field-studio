/**
 * Viewer Compatibility Service
 * Validates IIIF exports against known viewer requirements
 *
 * Tested Viewers:
 * - Mirador 3.x
 * - Universal Viewer 4.x
 * - Annona
 * - Clover
 */

import { IIIFItem, IIIFManifest, IIIFCanvas, IIIFCollection, IIIFAnnotation, isCanvas, isRange } from '../types';
import { isImageService3, createImageServiceReference } from '../utils';
import { IIIF_CONFIG, IIIF_SPEC, getDerivativePreset } from '../constants';

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
// Viewer Requirements Database
// ============================================================================

const REQUIREMENTS: ViewerRequirement[] = [
  // Context requirements
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
    recommendation: `Set @context to "${IIIF_SPEC.PRESENTATION_3.CONTEXT}"`
  },

  // ID requirements
  {
    id: 'http-id',
    description: 'Resource ID must be a valid HTTP(S) URI',
    check: (item) => item.id?.startsWith('http://') || item.id?.startsWith('https://'),
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Use HTTP or HTTPS URLs for all resource IDs'
  },

  // Label requirements
  {
    id: 'label-present',
    description: 'Manifest must have a label',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return item.label && Object.keys(item.label).length > 0;
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Add a label to the manifest'
  },

  // Canvas requirements
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
    recommendation: 'Set width and height on all canvases'
  },

  {
    id: 'canvas-has-content',
    description: 'Canvas must have painting annotation',
    check: (item) => {
      if (item.type !== 'Canvas') return true;
      const canvas = item as IIIFCanvas;
      return canvas.items?.some(page =>
        page.items?.some((anno: IIIFAnnotation) => anno.motivation === 'painting')
      ) ?? false;
    },
    viewers: ['mirador', 'universalviewer', 'annona', 'clover'],
    severity: 'error',
    recommendation: 'Add at least one painting annotation to each canvas'
  },

  // Image Service requirements
  {
    id: 'image-service-protocol',
    description: 'ImageService3 must include protocol property',
    check: (item) => {
      if (item.type !== 'Canvas') return true;
      const canvas = item as IIIFCanvas;
      const paintings = canvas.items?.flatMap(p => p.items || []) || [];
      for (const anno of paintings) {
        if (anno.body && !Array.isArray(anno.body)) {
          const services = (anno.body as any).service || [];
          for (const svc of services) {
            // Use centralized type check for ImageService3
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
    recommendation: `Add protocol: "${IIIF_SPEC.IMAGE_3.PROTOCOL}" to ImageService3`
  },

  // Thumbnail requirements
  {
    id: 'manifest-thumbnail',
    description: 'Manifest should have a thumbnail for navigation',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return Array.isArray(item.thumbnail) && item.thumbnail.length > 0;
    },
    viewers: ['mirador', 'universalviewer'],
    severity: 'warning',
    recommendation: 'Add a thumbnail to the manifest for better navigation UX'
  },

  // Annotation requirements
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
    recommendation: 'Ensure all annotations have a target property'
  },

  // Mirador-specific
  {
    id: 'mirador-items-array',
    description: 'Manifest items must be an array',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      return Array.isArray((item as IIIFManifest).items);
    },
    viewers: ['mirador'],
    severity: 'error',
    recommendation: 'Ensure manifest.items is an array of Canvases'
  },

  // Universal Viewer specific
  {
    id: 'uv-behavior',
    description: 'Paged manifests should have behavior: ["paged"]',
    check: (item) => {
      if (item.type !== 'Manifest') return true;
      // This is just a recommendation, not required
      return true;
    },
    viewers: ['universalviewer'],
    severity: 'info',
    recommendation: 'Add behavior: ["paged"] for book-like navigation in UV'
  },

  // Range requirements
  {
    id: 'range-items',
    description: 'Range must reference valid Canvas IDs or other Ranges',
    check: (item) => {
      if (item.type !== 'Range') return true;
      const range = item as any;
      if (!range.items) return false;
      return range.items.every((ref: any) =>
        ref.id && (isCanvas(ref) || isRange(ref))
      );
    },
    viewers: ['mirador', 'universalviewer'],
    severity: 'error',
    recommendation: 'Ensure Range items array contains valid Canvas or Range references'
  },

  // Collection requirements
  {
    id: 'collection-items',
    description: 'Collection must have items array',
    check: (item) => {
      if (item.type !== 'Collection') return true;
      return Array.isArray((item as IIIFCollection).items);
    },
    viewers: ['mirador', 'universalviewer', 'clover'],
    severity: 'error',
    recommendation: 'Ensure collection.items is an array'
  },

  // Annona specific
  {
    id: 'annona-annotation-body',
    description: 'Annotation body should have type for Annona rendering',
    check: (item) => {
      if (item.type !== 'Annotation') return true;
      const anno = item as IIIFAnnotation;
      if (!anno.body) return true;
      if (Array.isArray(anno.body)) {
        return anno.body.every(b => b.type);
      }
      return !!(anno.body as any).type;
    },
    viewers: ['annona'],
    severity: 'warning',
    recommendation: 'Add type property to annotation bodies for proper Annona rendering'
  }
];

// ============================================================================
// Compatibility Service
// ============================================================================

class ViewerCompatibilityService {
  /**
   * Run full compatibility check against all viewers
   */
  checkCompatibility(root: IIIFItem): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const viewerIssues: Record<ViewerName, number> = {
      mirador: 0,
      universalviewer: 0,
      annona: 0,
      clover: 0
    };

    // Traverse the tree and check each resource
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
              recommendation: req.recommendation
            });
          }
        }
      }

      // Traverse children
      const children = (item as any).items || (item as any).annotations || [];
      for (const child of children) {
        if (child && typeof child === 'object' && child.type) {
          traverse(child);
        }
      }

      // Traverse structures (ranges)
      if ((item as any).structures) {
        for (const range of (item as any).structures) {
          traverse(range);
        }
      }
    };

    traverse(root);

    // Calculate scores (100 - penalty per issue)
    const errorPenalty = 15;
    const warningPenalty = 5;
    const infoPenalty = 1;

    const viewerScores: Record<ViewerName, number> = {
      mirador: 100,
      universalviewer: 100,
      annona: 100,
      clover: 100
    };

    for (const issue of issues) {
      const penalty =
        issue.severity === 'error' ? errorPenalty :
        issue.severity === 'warning' ? warningPenalty : infoPenalty;
      viewerScores[issue.viewer] = Math.max(0, viewerScores[issue.viewer] - penalty);
    }

    const overallScore = Math.round(
      (viewerScores.mirador + viewerScores.universalviewer +
       viewerScores.annona + viewerScores.clover) / 4
    );

    return {
      timestamp: new Date().toISOString(),
      manifestId: root.id,
      overallScore,
      issues,
      viewerScores
    };
  }

  /**
   * Check compatibility for a specific viewer
   */
  checkForViewer(root: IIIFItem, viewer: ViewerName): CompatibilityIssue[] {
    const report = this.checkCompatibility(root);
    return report.issues.filter(i => i.viewer === viewer);
  }

  /**
   * Get viewer-specific recommendations
   */
  getViewerRecommendations(viewer: ViewerName): string[] {
    return REQUIREMENTS
      .filter(r => r.viewers.includes(viewer))
      .map(r => r.recommendation);
  }

  /**
   * Generate a test manifest for compatibility testing
   */
  generateTestManifest(): IIIFManifest {
    const baseUrl = IIIF_CONFIG.BASE_URL.LEGACY_DOMAINS[1] + '/iiif'; // example.org/iiif
    const manifestId = IIIF_CONFIG.ID_PATTERNS.MANIFEST(baseUrl, `test-${Date.now()}`);
    const preset = getDerivativePreset();

    return {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label: { en: ['Compatibility Test Manifest'] },
      summary: { en: ['A test manifest for verifying viewer compatibility'] },
      metadata: [
        { label: { en: ['Source'] }, value: { en: ['IIIF Field Studio'] } },
        { label: { en: ['Generated'] }, value: { en: [new Date().toISOString()] } }
      ],
      thumbnail: [{
        id: `${baseUrl}/image/test/full/${preset.thumbnailWidth},/0/default.jpg`,
        type: 'Image',
        format: 'image/jpeg'
      }],
      viewingDirection: 'left-to-right',
      behavior: ['individuals'],
      items: [
        {
          id: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 1),
          type: 'Canvas',
          label: { en: ['Test Canvas 1'] },
          width: 1000,
          height: 1500,
          items: [{
            id: `${manifestId}/canvas/1/page/1`,
            type: 'AnnotationPage',
            items: [{
              id: `${manifestId}/canvas/1/annotation/1`,
              type: 'Annotation',
              motivation: 'painting',
              target: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 1),
              body: {
                id: `${baseUrl}/image/test1/full/max/0/default.jpg`,
                type: 'Image',
                format: 'image/jpeg',
                // Use centralized ImageService3 reference creation
                service: [createImageServiceReference(`${baseUrl}/image/test1`, 'level2')]
              }
            }]
          }],
          annotations: [{
            id: `${manifestId}/canvas/1/page/annotations`,
            type: 'AnnotationPage',
            items: [{
              id: `${manifestId}/canvas/1/annotation/comment`,
              type: 'Annotation',
              motivation: 'commenting',
              target: `${IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 1)}#xywh=100,100,200,200`,
              body: {
                type: 'TextualBody',
                value: 'Test comment annotation',
                format: 'text/plain'
              }
            }]
          }]
        },
        {
          id: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 2),
          type: 'Canvas',
          label: { en: ['Test Canvas 2'] },
          width: 1000,
          height: 1500,
          items: [{
            id: `${manifestId}/canvas/2/page/1`,
            type: 'AnnotationPage',
            items: [{
              id: `${manifestId}/canvas/2/annotation/1`,
              type: 'Annotation',
              motivation: 'painting',
              target: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 2),
              body: {
                id: `${baseUrl}/image/test2/full/max/0/default.jpg`,
                type: 'Image',
                format: 'image/jpeg',
                // Use centralized ImageService3 reference creation
                service: [createImageServiceReference(`${baseUrl}/image/test2`, 'level2')]
              }
            }]
          }]
        }
      ],
      structures: [{
        id: IIIF_CONFIG.ID_PATTERNS.RANGE(baseUrl, '1'),
        type: 'Range',
        label: { en: ['Chapter 1'] },
        items: [
          { id: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 1), type: 'Canvas' },
          { id: IIIF_CONFIG.ID_PATTERNS.CANVAS(manifestId, 2), type: 'Canvas' }
        ]
      }]
    } as IIIFManifest;
  }

  /**
   * Format report as markdown for documentation
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
      '|--------|-------|--------|'
    ];

    for (const [viewer, score] of Object.entries(report.viewerScores)) {
      const status = score >= 80 ? '✅ Good' : score >= 50 ? '⚠️ Issues' : '❌ Critical';
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
