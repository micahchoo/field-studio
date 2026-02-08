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
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import {
  FileStatus,
  IngestActivityLogEntry,
  IngestFileInfo,
  IngestProgress,
  IngestStage
} from '@/src/shared/types';
import { formatETA, formatSpeed, IngestControls } from '@/src/shared/lib/hooks/useIngestProgress';

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
  scanning: { icon: 'search', label: 'Scanning files...', color: 'text-nb-blue' },
  processing: { icon: 'memory', label: 'Processing files...', color: 'text-nb-blue' },
  saving: { icon: 'save', label: 'Saving to storage...', color: 'text-nb-orange' },
  derivatives: { icon: 'image', label: 'Generating derivatives...', color: 'text-nb-purple' },
  complete: { icon: 'check_circle', label: 'Complete!', color: 'text-nb-green' },
  cancelled: { icon: 'cancel', label: 'Cancelled', color: 'text-nb-black/50' },
  error: { icon: 'error', label: 'Error occurred', color: 'text-nb-red' }
};

const FILE_STATUS_CONFIG: Record<FileStatus, { icon: string; color: string; label: string }> = {
  pending: { icon: 'hourglass_empty', color: 'text-nb-black/40', label: 'Pending' },
  processing: { icon: 'sync', color: 'text-nb-blue', label: 'Processing' },
  completed: { icon: 'check_circle', color: 'text-nb-green', label: 'Completed' },
  error: { icon: 'error', color: 'text-nb-red', label: 'Error' },
  skipped: { icon: 'skip_next', color: 'text-nb-orange', label: 'Skipped' }
};

const LOG_LEVEL_CONFIG: Record<IngestActivityLogEntry['level'], { icon: string; color: string }> = {
  info: { icon: 'info', color: 'text-nb-blue' },
  warning: { icon: 'warning', color: 'text-nb-orange' },
  error: { icon: 'error', color: 'text-nb-red' },
  success: { icon: 'check_circle', color: 'text-nb-green' }
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Progress bar component with animated fill
 */
const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => (
  <div className={`relative h-2 bg-nb-cream/80 overflow-hidden ${className}`}>
    <div
      className="absolute top-0 left-0 h-full bg-gradient-to-r from-nb-blue/100 to-blue-400 transition-nb ease-out"
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
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-nb-cream/50 transition-nb">
      <Icon name={config.icon} className={`text-sm mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-nb-black/70 truncate">{entry.message}</p>
        <p className="text-xs text-nb-black/40">{time}</p>
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
  <div className="flex items-center justify-between py-2 px-3 hover:bg-nb-cream/50 transition-nb">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <FileStatusBadge status={file.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-nb-black/70 truncate" title={file.name}>
          {file.name}
        </p>
        {file.error && (
          <p className="text-xs text-nb-red truncate" title={file.error}>
            {file.error}
          </p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {file.status === 'processing' && (
        <div className="w-16 h-1 bg-nb-cream overflow-hidden">
          <div
            className="h-full bg-nb-blue transition-nb "
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}
      {file.status === 'error' && onRetry && (
        <Button variant="ghost" size="bare"
          onClick={onRetry}
          className="p-1 hover:bg-nb-cream transition-nb"
          title="Retry"
        >
          <Icon name="refresh" className="text-sm text-nb-black/50" />
        </Button>
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
      <div className={`bg-nb-white p-3 shadow-brutal-sm border border-nb-black/20 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <StageIndicator stage={progress.stage} />
          <span className="text-sm font-medium text-nb-black/50">
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
      <div className={`bg-nb-white p-4 shadow-brutal-sm border border-nb-black/20 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <StageIndicator stage={progress.stage} />
          <div className="flex items-center gap-2">
            {!progress.isPaused && progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <Button variant="ghost" size="bare"
                onClick={() => controls.pause()}
                className="p-1.5 hover:bg-nb-cream transition-nb"
                title="Pause"
              >
                <Icon name="pause" className="text-sm text-nb-black/50" />
              </Button>
            )}
            {progress.isPaused && (
              <Button variant="ghost" size="bare"
                onClick={() => controls.resume()}
                className="p-1.5 hover:bg-nb-cream transition-nb"
                title="Resume"
              >
                <Icon name="play_arrow" className="text-sm text-nb-green" />
              </Button>
            )}
            {progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <Button variant="ghost" size="bare"
                onClick={handleCancel}
                className="p-1.5 hover:bg-nb-cream transition-nb"
                title="Cancel"
              >
                <Icon name="cancel" className="text-sm text-nb-red" />
              </Button>
            )}
          </div>
        </div>

        <ProgressBar progress={progress.overallProgress} className="mb-3" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-nb-black/70">
              {progress.filesCompleted}
              <span className="text-sm font-normal text-nb-black/40"> / {progress.filesTotal}</span>
            </p>
            <p className="text-xs text-nb-black/50">Files</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-nb-black/70">
              {formatSpeed(progress.speed)}
            </p>
            <p className="text-xs text-nb-black/50">Speed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-nb-black/70">
              {formatETA(progress.etaSeconds)}
            </p>
            <p className="text-xs text-nb-black/50">ETA</p>
          </div>
        </div>

        {progress.filesError > 0 && (
          <div className="mt-3 p-2 bg-nb-red/10 flex items-center gap-2">
            <Icon name="error" className="text-nb-red" />
            <span className="text-sm text-nb-red">
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
    <div className={`bg-nb-white shadow-brutal-sm border border-nb-black/20 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-nb-black/20">
        <div className="flex items-center justify-between mb-3">
          <StageIndicator stage={progress.stage} />
          <div className="flex items-center gap-1">
            {!progress.isPaused && progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <Button variant="ghost" size="bare"
                onClick={() => controls.pause()}
                className="p-2 hover:bg-nb-cream transition-nb"
                title="Pause"
              >
                <Icon name="pause" className="text-nb-black/50" />
              </Button>
            )}
            {progress.isPaused && (
              <Button variant="ghost" size="bare"
                onClick={() => controls.resume()}
                className="p-2 hover:bg-nb-cream transition-nb"
                title="Resume"
              >
                <Icon name="play_arrow" className="text-nb-green" />
              </Button>
            )}
            {progress.stage !== 'complete' && progress.stage !== 'cancelled' && progress.stage !== 'error' && (
              <Button variant="ghost" size="bare"
                onClick={handleCancel}
                className="p-2 hover:bg-nb-cream transition-nb"
                title="Cancel"
              >
                <Icon name="cancel" className="text-nb-red" />
              </Button>
            )}
          </div>
        </div>

        {/* Main Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar progress={progress.overallProgress} />
          </div>
          <span className="text-lg font-bold text-nb-black/70 w-12 text-right">
            {progress.overallProgress}%
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-nb-black/20 bg-nb-cream">
        <div className="text-center">
          <p className="text-2xl font-bold text-nb-black/70">
            {progress.filesCompleted}
            <span className="text-sm font-normal text-nb-black/40">/{progress.filesTotal}</span>
          </p>
          <p className="text-xs text-nb-black/50 uppercase tracking-wide">Files</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-nb-black/70">
            {formatSpeed(progress.speed)}
          </p>
          <p className="text-xs text-nb-black/50 uppercase tracking-wide">Speed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-nb-black/70">
            {formatETA(progress.etaSeconds)}
          </p>
          <p className="text-xs text-nb-black/50 uppercase tracking-wide">ETA</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-nb-black/70">
            {progress.filesError > 0 ? (
              <span className="text-nb-red">{progress.filesError}</span>
            ) : (
              '0'
            )}
          </p>
          <p className="text-xs text-nb-black/50 uppercase tracking-wide">Errors</p>
        </div>
      </div>

      {/* Current File */}
      {progress.currentFile && progress.stage === 'processing' && (
        <div className="px-4 py-3 border-b border-nb-black/20">
          <p className="text-xs text-nb-black/50 uppercase tracking-wide mb-1">Current File</p>
          <div className="flex items-center gap-3">
            <Icon name="image" className="text-nb-black/40" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-nb-black/70 truncate">
                {progress.currentFile.name}
              </p>
              <p className="text-xs text-nb-black/50">
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
      <div className="border-b border-nb-black/20">
        <Button variant="ghost" size="bare"
          onClick={() => setShowLog(!showLog)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-nb-cream/50 transition-nb"
        >
          <div className="flex items-center gap-2">
            <Icon name="history" className="text-nb-black/40" />
            <span className="font-medium text-nb-black/70">Activity Log</span>
            <span className="text-xs text-nb-black/40">({progress.activityLog.length} entries)</span>
          </div>
          <Icon
            name={showLog ? 'expand_less' : 'expand_more'}
            className="text-nb-black/40 transition-transform"
          />
        </Button>

        {showLog && (
          <div className="max-h-48 overflow-y-auto">
            {progress.activityLog.length === 0 ? (
              <p className="px-4 py-3 text-sm text-nb-black/40 italic">No activity yet</p>
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
        <Button variant="ghost" size="bare"
          onClick={() => setShowFiles(!showFiles)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-nb-cream/50 transition-nb"
        >
          <div className="flex items-center gap-2">
            <Icon name="folder_open" className="text-nb-black/40" />
            <span className="font-medium text-nb-black/70">Files</span>
            <div className="flex items-center gap-1 text-xs">
              {completedFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-nb-green/20 text-nb-green rounded">
                  {completedFiles.length}
                </span>
              )}
              {processingFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-nb-blue/20 text-nb-blue rounded">
                  {processingFiles.length}
                </span>
              )}
              {errorFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-nb-red/20 text-nb-red rounded">
                  {errorFiles.length}
                </span>
              )}
              {pendingFiles.length > 0 && (
                <span className="px-1.5 py-0.5 bg-nb-cream text-nb-black/60 rounded">
                  {pendingFiles.length}
                </span>
              )}
            </div>
          </div>
          <Icon
            name={showFiles ? 'expand_less' : 'expand_more'}
            className="text-nb-black/40 transition-transform"
          />
        </Button>

        {showFiles && (
          <div className="max-h-64 overflow-y-auto">
            {progress.files.length === 0 ? (
              <p className="px-4 py-3 text-sm text-nb-black/40 italic">No files to process</p>
            ) : (
              <div className="divide-y divide-nb-black/10">
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
