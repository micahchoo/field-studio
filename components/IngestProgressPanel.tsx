/**
 * IngestProgressPanel - Visual progress display for ingest operations
 *
 * Features:
 * - Progress bar with file count ("23 of 1000")
 * - Current stage indicator
 * - Speed metric ("5 files/sec")
 * - ETA display ("~2 min remaining")
 * - Activity log (collapsible, last 20 items)
 * - Pause/Resume/Cancel buttons
 * - Per-file status list (expandable)
 * - Error display with retry option
 * - Responsive design with animated transitions
 *
 * @example
 * <IngestProgressPanel
 *   progress={progress}
 *   controls={controls}
 *   variant="compact"
 * />
 */

import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { EmptyState } from './EmptyState';
import {
  FileStatus,
  IngestActivityLogEntry,
  IngestFileInfo,
  IngestProgress,
  IngestStage
} from '../types';
import { formatETA, formatSpeed, IngestControls } from '../hooks/useIngestProgress';

// ============================================================================
// Types
// ============================================================================

export interface IngestProgressPanelProps {
  /** Current progress state */
  progress: IngestProgress | null;
  /** Control functions */
  controls: IngestControls;
  /** Visual variant */
  variant?: 'full' | 'compact' | 'minimal';
  /** Whether to show the activity log by default */
  showLogByDefault?: boolean;
  /** Whether to show the file list by default */
  showFilesByDefault?: boolean;
  /** Callback when user clicks retry on a failed file */
  onRetryFile?: (fileId: string) => void;
  /** Callback when ingest is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Stage Display Configuration
// ============================================================================

const STAGE_CONFIG: Record<IngestStage, { icon: string; label: string; color: string }> = {
  scanning: { icon: 'search', label: 'Scanning files...', color: 'text-blue-500' },
  processing: { icon: 'memory', label: 'Processing files...', color: 'text-blue-500' },
  saving: { icon: 'save', label: 'Saving to storage...', color: 'text-amber-500' },
  derivatives: { icon: 'image', label: 'Generating derivatives...', color: 'text-purple-500' },
  complete: { icon: 'check_circle', label: 'Complete!', color: 'text-green-500' },
  cancelled: { icon: 'cancel', label: 'Cancelled', color: 'text-slate-500' },
  error: { icon: 'error', label: 'Error occurred', color: 'text-red-500' }
};

const FILE_STATUS_CONFIG: Record<FileStatus, { icon: string; color: string; label: string }> = {
  pending: { icon: 'hourglass_empty', color: 'text-slate-400', label: 'Pending' },
  processing: { icon: 'sync', color: 'text-blue-500', label: 'Processing' },
  completed: { icon: 'check_circle', color: 'text-green-500', label: 'Completed' },
  error: { icon: 'error', color: 'text-red-500', label: 'Error' },
  skipped: { icon: 'skip_next', color: 'text-amber-500', label: 'Skipped' }
};

const LOG_LEVEL_CONFIG: Record<IngestActivityLogEntry['level'], { icon: string; color: string }> = {
  info: { icon: 'info', color: 'text-blue-400' },
  warning: { icon: 'warning', color: 'text-amber-400' },
  error: { icon: 'error', color: 'text-red-400' },
  success: { icon: 'check_circle', color: 'text-green-400' }
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Progress bar component with animated fill
 */
const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => (
  <div className={`relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${className}`}>
    <div
      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

/**
 * Stage indicator with icon and label
 */
const StageIndicator: React.FC<{ stage: IngestStage }> = ({ stage }) => {
  const config = STAGE_CONFIG[stage];
  return (
    <div className="flex items-center gap-2">
      <Icon name={config.icon} className={`text-lg ${config.color} ${stage === 'processing' ? 'animate-pulse' : ''}`} />
      <span className={`font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
};

/**
 * File status badge
 */
const FileStatusBadge: React.FC<{ status: FileStatus }> = ({ status }) => {
  const config = FILE_STATUS_CONFIG[status];
  return (
    <div className={`flex items-center gap-1 text-xs ${config.color}`}>
      <Icon name={config.icon} className={`text-sm ${status === 'processing' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </div>
  );
};

/**
 * Activity log entry
 */
const LogEntry: React.FC<{ entry: IngestActivityLogEntry }> = ({ entry }) => {
  const config = LOG_LEVEL_CONFIG[entry.level];
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
      <Icon name={config.icon} className={`text-sm mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{entry.message}</p>
        <p className="text-xs text-slate-400">{time}</p>
      </div>
    </div>
  );
};

/**
 * File list item
 */
const FileListItem: React.FC<{
  file: IngestFileInfo;
  onRetry?: () => void;
}> = ({ file, onRetry }) => (
  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <FileStatusBadge status={file.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 dark:text-slate-300 truncate" title={file.name}>
          {file.name}
        </p>
        {file.error && (
          <p className="text-xs text-red-500 truncate" title={file.error}>
            {file.error}
          </p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {file.status === 'processing' && (
        <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}
      {file.status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Retry"
        >
          <Icon name="refresh" className="text-sm text-slate-500" />
        </button>
      )}
    </div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const IngestProgressPanel: React.FC<IngestProgressPanelProps> = ({
  progress,
  controls,
  variant = 'full',
  showLogByDefault = false,
  showFilesByDefault = false,
  onRetryFile,
  onCancel,
  className = ''
}) => {
  const [showLog, setShowLog] = useState(showLogByDefault);
  const [showFiles, setShowFiles] = useState(showFilesByDefault);

  // Memoized stats
  const stats = useMemo(() => {
    if (!progress) return null;
    return {
      completedPercent: progress.filesTotal > 0
        ? Math.round((progress.filesCompleted / progress.filesTotal) * 100)
        : 0,
      hasErrors: progress.filesError > 0,
      hasFailedFiles: progress.files.some(f => f.status === 'error'),
      recentLog: progress.activityLog.slice(-5)
    };
  }, [progress]);

  // Handle cancel
  const handleCancel = () => {
    controls.cancel();
    onCancel?.();
  };

  // Minimal variant - just progress bar and percentage
  if (variant === 'minimal') {
    if (!progress) return null;
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <StageIndicator stage={progress.stage} />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {progress.overallProgress}%
          </span>
        </div>
        <ProgressBar progress={progress.overallProgress} />
      </div>
    );
  }

  // Compact variant - key stats without expandable sections
  if (variant === 'compact') {
    if (!progress) return null;
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <StageIndicator stage={progress.stage} />
          <div className="flex items-center gap-2">
            {!progress.isPaused && progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <button
                onClick={() => controls.pause()}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Pause"
              >
                <Icon name="pause" className="text-sm text-slate-500" />
              </button>
            )}
            {progress.isPaused && (
              <button
                onClick={() => controls.resume()}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Resume"
              >
                <Icon name="play_arrow" className="text-sm text-green-500" />
              </button>
            )}
            {progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <button
                onClick={handleCancel}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Cancel"
              >
                <Icon name="cancel" className="text-sm text-red-500" />
              </button>
            )}
          </div>
        </div>

        <ProgressBar progress={progress.overallProgress} className="mb-3" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {progress.filesCompleted}
              <span className="text-sm font-normal text-slate-400"> / {progress.filesTotal}</span>
            </p>
            <p className="text-xs text-slate-500">Files</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {formatSpeed(progress.speed)}
            </p>
            <p className="text-xs text-slate-500">Speed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {formatETA(progress.etaSeconds)}
            </p>
            <p className="text-xs text-slate-500">ETA</p>
          </div>
        </div>

        {progress.filesError > 0 && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-center gap-2">
            <Icon name="error" className="text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {progress.filesError} file(s) failed
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full variant - all features
  if (!progress) {
    return (
      <EmptyState
        icon="hourglass_empty"
        title="No Active Ingest"
        message="Start an ingest operation to see progress here"
        className={className}
      />
    );
  }

  const pendingFiles = progress.files.filter(f => f.status === 'pending');
  const processingFiles = progress.files.filter(f => f.status === 'processing');
  const completedFiles = progress.files.filter(f => f.status === 'completed');
  const errorFiles = progress.files.filter(f => f.status === 'error');

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <StageIndicator stage={progress.stage} />
          <div className="flex items-center gap-1">
            {!progress.isPaused && progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <button
                onClick={() => controls.pause()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Pause"
              >
                <Icon name="pause" className="text-slate-500" />
              </button>
            )}
            {progress.isPaused && (
              <button
                onClick={() => controls.resume()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Resume"
              >
                <Icon name="play_arrow" className="text-green-500" />
              </button>
            )}
            {progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Cancel"
              >
                <Icon name="cancel" className="text-red-500" />
              </button>
            )}
          </div>
        </div>

        {/* Main Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar progress={progress.overallProgress} />
          </div>
          <span className="text-lg font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
            {progress.overallProgress}%
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {progress.filesCompleted}
            <span className="text-sm font-normal text-slate-400">/{progress.filesTotal}</span>
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Files</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {formatSpeed(progress.speed)}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Speed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {formatETA(progress.etaSeconds)}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">ETA</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {progress.filesError > 0 ? (
              <span className="text-red-500">{progress.filesError}</span>
            ) : (
              '0'
            )}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Errors</p>
        </div>
      </div>

      {/* Current File */}
      {progress.currentFile && progress.stage === 'processing' && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current File</p>
          <div className="flex items-center gap-3">
            <Icon name="image" className="text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {progress.currentFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {(progress.currentFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="w-24">
              <ProgressBar progress={progress.currentFile.progress} />
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon name="history" className="text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Activity Log</span>
            <span className="text-xs text-slate-400">({progress.activityLog.length} entries)</span>
          </div>
          <Icon
            name={showLog ? 'expand_less' : 'expand_more'}
            className="text-slate-400 transition-transform"
          />
        </button>

        {showLog && (
          <div className="max-h-48 overflow-y-auto">
            {progress.activityLog.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400 italic">No activity yet</p>
            ) : (
              progress.activityLog.slice().reverse().map((entry, idx) => (
                <LogEntry key={`${entry.timestamp}-${idx}`} entry={entry} />
              ))
            )}
          </div>
        )}
      </div>

      {/* File List */}
      <div>
        <button
          onClick={() => setShowFiles(!showFiles)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon name="folder_open" className="text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Files</span>
            <div className="flex items-center gap-1 text-xs">
              {completedFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                  {completedFiles.length}
                </span>
              )}
              {processingFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {processingFiles.length}
                </span>
              )}
              {errorFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                  {errorFiles.length}
                </span>
              )}
              {pendingFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {pendingFiles.length}
                </span>
              )}
            </div>
          </div>
          <Icon
            name={showFiles ? 'expand_less' : 'expand_more'}
            className="text-slate-400 transition-transform"
          />
        </button>

        {showFiles && (
          <div className="max-h-64 overflow-y-auto">
            {progress.files.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400 italic">No files to process</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Show error files first */}
                {errorFiles.map(file => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    onRetry={onRetryFile ? () => onRetryFile(file.id) : undefined}
                  />
                ))}
                {/* Then processing */}
                {processingFiles.map(file => (
                  <FileListItem key={file.id} file={file} />
                ))}
                {/* Then completed */}
                {completedFiles.map(file => (
                  <FileListItem key={file.id} file={file} />
                ))}
                {/* Then pending */}
                {pendingFiles.map(file => (
                  <FileListItem key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IngestProgressPanel;
