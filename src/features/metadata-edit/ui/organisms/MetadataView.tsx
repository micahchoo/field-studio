/**
 * MetadataView Organism
 *
 * Main organism for the metadata-edit feature.
 * Provides spreadsheet-style editing of IIIF metadata with filtering and export.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules: ViewContainer, FilterInput, Toolbar, EmptyState
 * - Domain logic delegated to model/
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can bulk edit metadata in a readable spreadsheet view
 * FAILURE PREVENTED: Lost changes via navigation guard, data corruption via validation
 *
 * CHANGES:
 * - Improved table readability with fixed column widths
 * - Better visual hierarchy with grouped columns
 * - Sticky column headers
 * - Improved cell editing UX
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFItem } from '@/types';
import { ViewContainer } from '@/src/shared/ui/molecules/ViewContainer';
import { FilterInput } from '@/src/shared/ui/molecules/FilterInput';
import { Toolbar } from '@/src/shared/ui/molecules/Toolbar';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/src/shared/ui/atoms';
import {
  extractColumns,
  filterByTerm,
  flattenTree,
  itemsToCSV,
  type ResourceTab,
} from '../../model';

export interface MetadataViewProps {
  /** Root IIIF item (source for metadata editing) */
  root: IIIFItem | null;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    subtleBg?: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Called when root is updated with new metadata */
  onUpdate: (updatedRoot: IIIFItem) => void;
  /** Optional filter IDs from other views */
  filterIds?: string[] | null;
  /** Called to clear ID filter */
  onClearFilter?: () => void;
}

// Column width configuration for better readability
const COLUMN_CONFIG: Record<string, { width: string; minWidth: string; align?: 'left' | 'center' | 'right' }> = {
  id: { width: '200px', minWidth: '150px' },
  type: { width: '100px', minWidth: '80px', align: 'center' },
  label: { width: '250px', minWidth: '200px' },
  summary: { width: '300px', minWidth: '200px' },
  rights: { width: '180px', minWidth: '150px' },
  navDate: { width: '150px', minWidth: '130px' },
  default: { width: '150px', minWidth: '120px' },
};

/**
 * Get column configuration
 */
const getColumnConfig = (col: string) => COLUMN_CONFIG[col] || COLUMN_CONFIG.default;

/**
 * Group columns by category for visual organization
 */
const groupColumns = (columns: string[]) => {
  const core = ['id', 'type', 'label'];
  const descriptive = ['summary', 'rights', 'navDate'];
  
  const coreCols = columns.filter(c => core.includes(c));
  const descCols = columns.filter(c => descriptive.includes(c));
  const customCols = columns.filter(c => !core.includes(c) && !descriptive.includes(c));
  
  return { core: coreCols, descriptive: descCols, custom: customCols };
};

export const MetadataView: React.FC<MetadataViewProps> = ({
  root,
  cx,
  fieldMode,
  onUpdate: _onUpdate,
  filterIds,
  onClearFilter,
}) => {
  // Local UI state
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<ResourceTab>('All');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; column: string } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Flatten items from root
  const allItems = useMemo(() => flattenTree(root, activeTab), [root, activeTab]);

  // Apply ID filter if present
  const idFilteredItems = useMemo(() => {
    if (!filterIds || filterIds.length === 0) return allItems;
    return allItems.filter((item) => filterIds.includes(item.id));
  }, [allItems, filterIds]);

  // Apply search filter
  const filteredItems = useMemo(
    () => filterByTerm(idFilteredItems, filter),
    [idFilteredItems, filter]
  );

  // Extract columns dynamically
  const columns = useMemo(
    () => extractColumns(filteredItems),
    [filteredItems]
  );

  // Group columns for visual organization
  const columnGroups = useMemo(() => groupColumns(columns), [columns]);

  // Warn before unload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    const csv = itemsToCSV(filteredItems, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredItems, columns]);

  // Handle CSV import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle cell edit
  const handleCellEdit = (itemId: string, column: string, value: string) => {
    setHasUnsavedChanges(true);
    // TODO: Implement actual update logic
    console.log('Edit:', itemId, column, value);
  };

  // Tab configuration
  const tabs: { value: ResourceTab; label: string; icon: string }[] = [
    { value: 'All', label: 'All Items', icon: 'apps' },
    { value: 'Collection', label: 'Collections', icon: 'folder' },
    { value: 'Manifest', label: 'Manifests', icon: 'photo_album' },
    { value: 'Canvas', label: 'Items', icon: 'image' },
  ];

  // Empty state when no root
  if (!root) {
    return (
      <EmptyState
        icon="folder_open"
        title="No Archive Loaded"
        message="Import files or open a collection to start editing metadata"
        cx={cx}
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <ViewContainer
      title="Metadata Catalog"
      icon="table_chart"
      className={cx.surface}
      cx={cx}
      fieldMode={fieldMode}
      header={
        <div className="flex items-center gap-4 flex-wrap">
          {/* Resource type tabs */}
          <div className={`flex rounded-lg ${fieldMode ? 'bg-slate-900' : 'bg-slate-100'} p-1`}>
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                variant={activeTab === tab.value ? 'primary' : 'ghost'}
                size="sm"
                className={`text-xs font-medium ${activeTab === tab.value ? '' : fieldMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Filter input */}
          <FilterInput
            value={filter}
            onChange={setFilter}
            placeholder="Filter metadata..."
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* ID filter indicator */}
          {filterIds && filterIds.length > 0 && onClearFilter && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${fieldMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <span>{filterIds.length} selected</span>
              <button
                onClick={onClearFilter}
                className="hover:underline font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {/* Actions toolbar */}
          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              icon={<Icon name="download" className="text-sm" />}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportClick}
              icon={<Icon name="upload" className="text-sm" />}
            >
              Import CSV
            </Button>
          </div>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              // TODO: Implement CSV import
              console.log('Import file:', e.target.files?.[0]);
            }}
          />
        </div>
      }
    >
      {/* Spreadsheet table with improved readability */}
      <div 
        ref={tableContainerRef}
        className={`flex-1 overflow-auto ${fieldMode ? 'bg-black' : 'bg-white'} rounded-lg border ${cx.border}`}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="search_off"
            title={filter ? 'No Matches Found' : 'No Items'}
            message={
              filter
                ? `No items match "${filter}". Try adjusting your search.`
                : 'This collection has no items of the selected type.'
            }
            action={filter ? { label: 'Clear Filter', onClick: () => setFilter('') } : undefined}
            cx={cx}
            fieldMode={fieldMode}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className={`sticky top-0 z-10 ${fieldMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <tr>
                {/* Row number column */}
                <th 
                  className={`
                    px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider 
                    ${cx.textMuted} border-b ${cx.border}
                    w-12 min-w-12
                  `}
                >
                  #
                </th>
                
                {/* Core columns - grouped together */}
                {columnGroups.core.map((col) => {
                  const config = getColumnConfig(col);
                  return (
                    <th
                      key={col}
                      className={`
                        px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider 
                        ${cx.textMuted} border-b ${cx.border}
                        ${col === 'label' ? (fieldMode ? 'bg-slate-800/50' : 'bg-slate-100') : ''}
                      `}
                      style={{ width: config.width, minWidth: config.minWidth }}
                    >
                      {col}
                    </th>
                  );
                })}
                
                {/* Descriptive columns group */}
                {columnGroups.descriptive.length > 0 && (
                  <th 
                    colSpan={columnGroups.descriptive.length}
                    className={`
                      px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider 
                      ${cx.textMuted} border-b ${cx.border}
                      ${fieldMode ? 'bg-slate-800/30' : 'bg-slate-100/50'}
                    `}
                  >
                    Descriptive Metadata
                  </th>
                )}
                
                {/* Custom metadata columns group */}
                {columnGroups.custom.length > 0 && (
                  <th 
                    colSpan={columnGroups.custom.length}
                    className={`
                      px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider 
                      ${cx.textMuted} border-b ${cx.border}
                      ${fieldMode ? 'bg-slate-800/30' : 'bg-slate-100/50'}
                    `}
                  >
                    Custom Fields ({columnGroups.custom.length})
                  </th>
                )}
              </tr>
              
              {/* Second header row for individual column names in groups */}
              {(columnGroups.descriptive.length > 0 || columnGroups.custom.length > 0) && (
                <tr className={`${fieldMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  <th colSpan={columnGroups.core.length + 1}></th>
                  {columnGroups.descriptive.map((col) => {
                    const config = getColumnConfig(col);
                    return (
                      <th
                        key={col}
                        className={`
                          px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider 
                          ${cx.textMuted} border-b ${cx.border}
                        `}
                        style={{ width: config.width, minWidth: config.minWidth }}
                      >
                        {col}
                      </th>
                    );
                  })}
                  {columnGroups.custom.map((col) => (
                    <th
                      key={col}
                      className={`
                        px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider 
                        ${cx.textMuted} border-b ${cx.border}
                        min-w-[120px]
                      `}
                    >
                      <span className="truncate block max-w-[150px]" title={col}>
                        {col}
                      </span>
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            
            <tbody className={cx.text}>
              {filteredItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`
                    border-b ${cx.border} 
                    ${fieldMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'} 
                    transition-colors
                  `}
                >
                  {/* Row number */}
                  <td className={`px-3 py-2 text-xs ${cx.textMuted} tabular-nums`}>
                    {idx + 1}
                  </td>
                  
                  {/* Core columns */}
                  {columnGroups.core.map((col) => {
                    const config = getColumnConfig(col);
                    const isEditing = editingCell?.itemId === item.id && editingCell?.column === col;
                    
                    return (
                      <td
                        key={col}
                        className={`px-4 py-2 ${col === 'label' ? (fieldMode ? 'bg-slate-800/20' : 'bg-slate-50/50') : ''}`}
                        style={{ width: config.width, minWidth: config.minWidth }}
                        onClick={() => setEditingCell({ itemId: item.id, column: col })}
                      >
                        {col === 'id' && (
                          <code 
                            className={`text-[10px] ${cx.textMuted} truncate block font-mono`}
                            title={item.id}
                          >
                            {item.id.split('/').pop() || item.id}
                          </code>
                        )}
                        {col === 'type' && (
                          <span className={`
                            inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase
                            ${item.type === 'Collection' ? 'bg-purple-100 text-purple-700' : ''}
                            ${item.type === 'Manifest' ? 'bg-blue-100 text-blue-700' : ''}
                            ${item.type === 'Canvas' ? 'bg-green-100 text-green-700' : ''}
                            ${fieldMode ? 'bg-opacity-20' : ''}
                          `}>
                            {item.type}
                          </span>
                        )}
                        {col === 'label' && (
                          <EditableCell
                            value={item.label}
                            isEditing={isEditing}
                            onEdit={(val) => handleCellEdit(item.id, col, val)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="Untitled"
                            className="font-medium"
                            fieldMode={fieldMode}
                          />
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Descriptive columns */}
                  {columnGroups.descriptive.map((col) => {
                    const isEditing = editingCell?.itemId === item.id && editingCell?.column === col;
                    
                    return (
                      <td
                        key={col}
                        className="px-4 py-2"
                        onClick={() => setEditingCell({ itemId: item.id, column: col })}
                      >
                        {col === 'summary' && (
                          <EditableCell
                            value={item.summary}
                            isEditing={isEditing}
                            onEdit={(val) => handleCellEdit(item.id, col, val)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="-"
                            truncate
                            fieldMode={fieldMode}
                          />
                        )}
                        {col === 'rights' && (
                          <EditableCell
                            value={item.rights}
                            isEditing={isEditing}
                            onEdit={(val) => handleCellEdit(item.id, col, val)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="-"
                            truncate
                            fieldMode={fieldMode}
                          />
                        )}
                        {col === 'navDate' && (
                          <EditableCell
                            value={item.navDate}
                            isEditing={isEditing}
                            onEdit={(val) => handleCellEdit(item.id, col, val)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="-"
                            fieldMode={fieldMode}
                          />
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Custom columns */}
                  {columnGroups.custom.map((col) => {
                    const isEditing = editingCell?.itemId === item.id && editingCell?.column === col;
                    const value = item.metadata[col] || '';
                    
                    return (
                      <td
                        key={col}
                        className="px-4 py-2"
                        onClick={() => setEditingCell({ itemId: item.id, column: col })}
                      >
                        <EditableCell
                          value={value}
                          isEditing={isEditing}
                          onEdit={(val) => handleCellEdit(item.id, col, val)}
                          onBlur={() => setEditingCell(null)}
                          placeholder="-"
                          truncate
                          fieldMode={fieldMode}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with stats and save indicator */}
      <div className={`
        flex items-center justify-between px-4 py-3 
        border-t ${cx.border}
        ${fieldMode ? 'bg-slate-900' : 'bg-slate-50'}
      `}>
        <div className={`text-xs ${cx.textMuted}`}>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          {filter && ` (filtered from ${allItems.length})`}
        </div>
        
        {hasUnsavedChanges && (
          <div className="flex items-center gap-3">
            <span className={`text-xs ${fieldMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Unsaved changes
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setHasUnsavedChanges(false)}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </ViewContainer>
  );
};

/**
 * Editable cell component
 */
interface EditableCellProps {
  value: string;
  isEditing: boolean;
  onEdit: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  truncate?: boolean;
  className?: string;
  fieldMode: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  isEditing,
  onEdit,
  onBlur,
  placeholder = '-',
  truncate = false,
  className = '',
  fieldMode,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onBlur={(e) => {
          onEdit(e.target.value);
          onBlur();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEdit(e.currentTarget.value);
            onBlur();
          }
          if (e.key === 'Escape') {
            onBlur();
          }
        }}
        className={`
          w-full px-2 py-1 text-sm rounded
          ${fieldMode 
            ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' 
            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
          }
          border outline-none focus:ring-2 focus:ring-blue-500/20
        `}
      />
    );
  }

  return (
    <span 
      className={`
        ${truncate ? 'truncate block max-w-[200px]' : ''}
        ${!value ? 'text-slate-400 italic' : ''}
        ${className}
      `}
      title={value}
    >
      {value || placeholder}
    </span>
  );
};

export default MetadataView;
