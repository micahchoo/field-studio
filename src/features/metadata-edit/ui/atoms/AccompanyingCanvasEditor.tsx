/**
 * AccompanyingCanvasEditor Atom
 *
 * Editor for the IIIF `accompanyingCanvas` property.
 * Allows setting accompanying content (transcript VTT, image, etc.)
 * for canvases, typically used for AV content.
 *
 * @module features/metadata-edit/ui/atoms/AccompanyingCanvasEditor
 */

import React, { useRef, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { FormInput } from '@/src/shared/ui/molecules/FormInput';

export interface AccompanyingCanvasEditorProps {
  /** Current accompanying canvas URL */
  contentUrl?: string;
  /** Type of accompanying content */
  contentType?: 'transcript' | 'image' | 'other';
  /** Called when content is uploaded */
  onUpload: (file: File) => void;
  /** Called when URL is set manually */
  onSetUrl: (url: string) => void;
  /** Called when content is removed */
  onRemove: () => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
}

export const AccompanyingCanvasEditor: React.FC<AccompanyingCanvasEditorProps> = ({
  contentUrl,
  contentType,
  onUpload,
  onSetUrl,
  onRemove,
  fieldMode = false,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const handleSetUrl = () => {
    if (urlInput.trim()) {
      onSetUrl(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const typeIcons: Record<string, string> = {
    transcript: 'subtitles',
    image: 'image',
    other: 'attachment',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon
          name="picture_in_picture"
          className={`text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}
        />
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
        }`}>
          Accompanying Content
        </span>
      </div>

      {contentUrl ? (
        <div className={`flex items-center gap-3 px-3 py-2.5 border ${
          fieldMode
            ? 'border-nb-black/80 bg-nb-black/50'
            : 'border-nb-black/20 bg-nb-white'
        }`}>
          <Icon
            name={typeIcons[contentType || 'other']}
            className={`text-lg ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}
          />
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium ${fieldMode ? 'text-white' : 'text-nb-black/80'}`}>
              {contentType === 'transcript' ? 'Transcript (VTT)' :
               contentType === 'image' ? 'Accompanying Image' :
               'Accompanying Content'}
            </div>
            <div className={`text-[10px] truncate ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
              {contentUrl}
            </div>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="bare"
              onClick={onRemove}
              icon={<Icon name="close" className="text-sm text-nb-red" />}
              title="Remove"
              aria-label="Remove accompanying content"
            />
          )}
        </div>
      ) : !disabled ? (
        <div className="space-y-2">
          {showUrlInput ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <FormInput
                  value={urlInput}
                  onChange={setUrlInput}
                  type="url"
                  placeholder="https://example.org/transcript.vtt"
                  fieldMode={fieldMode}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleSetUrl} disabled={!urlInput.trim()}>
                Set
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" className="text-sm mr-1" />
                Upload VTT/File
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrlInput(true)}
              >
                <Icon name="link" className="text-sm mr-1" />
                Set URL
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
          No accompanying content
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".vtt,.srt,.txt,image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload accompanying content"
      />
    </div>
  );
};

export default AccompanyingCanvasEditor;
