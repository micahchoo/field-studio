/** IIIF specification descriptions and implications per resource type */
export const IIIF_SPECS: Record<string, {
  desc: string;
  implication: string;
}> = {
  'Collection': {
    desc: 'The master container for multiple research units. It groups Manifests into a cohesive archive.',
    implication: 'Treats nested items as part of a curated series. This level cannot have its own visual pixels, only child links.'
  },
  'Manifest': {
    desc: 'The primary unit of description. Represents a single physical artifact, document, or field notebook.',
    implication: 'The "Atomic" unit of research. All internal views are considered parts of ONE cohesive physical object.'
  },
  'Canvas': {
    desc: 'A virtual workspace where media is pinned. It defines the coordinates for all your scholarly notes.',
    implication: 'Pins media to a specific coordinate grid. Annotations created here are forever linked to these pixel addresses.'
  },
  'Range': {
    desc: 'A structural division within a manifest, like a chapter or section.',
    implication: 'Provides navigation structure for long or complex objects.'
  }
};
