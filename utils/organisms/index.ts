/**
 * Organisms - Domain-specific business logic
 */

// IIIF domain
export * from './iiif';

// UI domain
export type { AbstractionLevel, TerminologyKey } from './ui/terminology';
export {
  TERMINOLOGY_MAP,
  getTerm,
  getTerms,
  getResourceTypeLabel,
  getTermDescription,
  formatCountWithTerm,
  getAllTerms,
  hasTerm,
} from './ui/terminology';
