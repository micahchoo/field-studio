
import React, { useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { SourceManifests } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { SUPPORTED_LANGUAGES } from '@/src/shared/constants';
import {
  downloadMetadataTemplate,
  getVocabularyOptions,
  MetadataTemplateOptions,
  previewMetadataTemplate,
  VocabularyOption
} from '@/src/shared/services/metadataTemplateService';

interface MetadataTemplateExportProps {
  sourceManifests: SourceManifests;
  onClose: () => void;
}

export const MetadataTemplateExport: React.FC<MetadataTemplateExportProps> = ({
  sourceManifests,
  onClose
}) => {
  const [vocabulary, setVocabulary] = useState<VocabularyOption>('both');
  const [language, setLanguage] = useState('en');
  const [includeInstructions, setIncludeInstructions] = useState(true);

  const vocabularyOptions = getVocabularyOptions();

  // Preview first 5 rows
  const preview = useMemo(() => {
    const options: MetadataTemplateOptions = {
      vocabulary,
      language,
      includeInstructions
    };
    return previewMetadataTemplate(sourceManifests, options, 5);
  }, [sourceManifests, vocabulary, language, includeInstructions]);

  const handleDownload = () => {
    const options: MetadataTemplateOptions = {
      vocabulary,
      language,
      includeInstructions
    };
    const baseName = `${sourceManifests.rootPath.replace(/[^a-zA-Z0-9-_]/g, '-')}-metadata`;
    downloadMetadataTemplate(sourceManifests, options, baseName);
    onClose();
  };

  const totalFiles = sourceManifests.manifests.reduce(
    (sum, m) => sum + m.files.length,
    0
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icon name="table_chart" className="text-blue-500" />
              Export Metadata Template
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              CSV template for offline metadata editing
            </p>
          </div>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <Icon name="close" />
          </Button>
        </div>

        {/* Options */}
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Vocabulary selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Vocabulary
              </label>
              <div className="space-y-2">
                {vocabularyOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                      ${vocabulary === opt.value
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="vocabulary"
                      value={opt.value}
                      checked={vocabulary === opt.value}
                      onChange={(e) => setVocabulary(e.target.value as VocabularyOption)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-700">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Other options */}
            <div className="space-y-4">
              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Default Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-400"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Include instructions */}
              <div>
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeInstructions}
                    onChange={(e) => setIncludeInstructions(e.target.checked)}
                  />
                  <div>
                    <div className="font-medium text-sm text-slate-700">
                      Include Instructions File
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Download a .txt file explaining each column
                    </div>
                  </div>
                </label>
              </div>

              {/* Stats */}
              <div className="p-3 bg-slate-100 rounded-lg">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Export Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Manifests:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {sourceManifests.manifests.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Files:</span>{' '}
                    <span className="font-medium text-slate-700">{totalFiles}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">CSV rows:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {totalFiles + 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Columns:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {preview[0]?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icon name="preview" className="text-sm" />
            Preview (first 5 rows)
          </div>
          <div className="border border-slate-200 rounded-lg overflow-auto h-48">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 sticky top-0">
                  {preview[0]?.map((header, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-bold text-slate-600 border-b border-slate-200 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-2 text-slate-700 border-b border-slate-100 truncate max-w-[150px]"
                        title={cell}
                      >
                        {cell || (
                          <span className="text-slate-300 italic">(empty)</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalFiles > 5 && (
            <div className="text-[10px] text-slate-400 mt-2 text-center">
              ...and {totalFiles - 5} more rows
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <Icon name="info" className="text-slate-400" />
            Fill in the template and re-import to apply metadata
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="bare"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button variant="ghost" size="bare"
              onClick={handleDownload}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 flex items-center gap-2"
            >
              <Icon name="download" />
              Download Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
