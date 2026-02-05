/**
 * Metadata Edit Feature Atoms
 *
 * Feature-specific atoms for the metadata-edit feature.
 * These atoms decompose massive molecules like CSVImportModal (693 lines)
 * and MetadataEditorPanel (708 lines) into reusable primitives.
 *
 * @module features/metadata-edit/ui/atoms
 */

// Wizard Atoms
export { StepIndicator as WizardStepIndicator } from '@/src/shared/ui/atoms/StepIndicator';
export type { StepIndicatorProps as WizardStepIndicatorProps } from '@/src/shared/ui/atoms/StepIndicator';
export { StepConnector as WizardStepConnector } from '@/src/shared/ui/atoms/StepConnector';
export type { StepConnectorProps as WizardStepConnectorProps } from '@/src/shared/ui/atoms/StepConnector';

// Import Atoms
export { FileDropZone } from './FileDropZone';
export type { FileDropZoneProps } from './FileDropZone';
export { FilePreview } from './FilePreview';
export type { FilePreviewProps } from './FilePreview';
export { AutoMapButton } from './AutoMapButton';
export type { AutoMapButtonProps } from './AutoMapButton';
export { ImportSummary } from './ImportSummary';
export type { ImportSummaryProps } from './ImportSummary';

// Mapping Atoms
export { MappingRow } from './MappingRow';
export type { MappingRowProps } from './MappingRow';
export { ColumnSelector } from './ColumnSelector';
export type { ColumnSelectorProps } from './ColumnSelector';
export { PropertySelector, type PropertyOption } from './PropertySelector';
export type { PropertySelectorProps } from './PropertySelector';
export { LanguageTag, type LanguageOption } from './LanguageTag';
export type { LanguageTagProps } from './LanguageTag';

// Validation Atoms
export { ValidationBadge, type ValidationStatus } from './ValidationBadge';
export type { ValidationBadgeProps } from './ValidationBadge';
export { ValidationFixAction } from './ValidationFixAction';
export type { ValidationFixActionProps } from './ValidationFixAction';
