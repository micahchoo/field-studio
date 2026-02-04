
import { useCallback, useEffect, useState } from 'react';
import { FileTree, SourceManifests } from '../../../types';
import { buildSourceManifests, getManifestStats } from '../../../services/stagingService';
import { buildTree } from '../../../services/iiifBuilder';

export interface BuildProgress {
  phase: 'idle' | 'building-tree' | 'detecting-sequences' | 'complete' | 'error';
  message: string;
  percent: number;
}

export interface UseSourceManifestsBuilderReturn {
  sourceManifests: SourceManifests | null;
  progress: BuildProgress;
  error: string | null;
  stats: {
    totalManifests: number;
    totalFiles: number;
    sequencePatterns: Map<string, number>;
  } | null;
  rebuild: () => void;
}

/**
 * Hook that builds SourceManifests from files with progress tracking
 */
export function useSourceManifestsBuilder(files: File[]): UseSourceManifestsBuilderReturn {
  const [sourceManifests, setSourceManifests] = useState<SourceManifests | null>(null);
  const [progress, setProgress] = useState<BuildProgress>({
    phase: 'idle',
    message: '',
    percent: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [buildTrigger, setBuildTrigger] = useState(0);

  const rebuild = useCallback(() => {
    setBuildTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      setSourceManifests(null);
      setProgress({ phase: 'idle', message: '', percent: 0 });
      return;
    }

    let cancelled = false;

    const build = async () => {
      try {
        setError(null);

        // Phase 1: Building tree
        setProgress({
          phase: 'building-tree',
          message: `Analyzing ${files.length} files...`,
          percent: 20
        });

        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));

        if (cancelled) return;

        // Phase 2: Detecting sequences
        setProgress({
          phase: 'detecting-sequences',
          message: 'Detecting file sequences and patterns...',
          percent: 60
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        if (cancelled) return;

        // Build the source manifests
        const result = buildSourceManifests(files);

        if (cancelled) return;

        setSourceManifests(result);
        setProgress({
          phase: 'complete',
          message: `Found ${result.manifests.length} manifests with ${files.length} total files`,
          percent: 100
        });

      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Unknown error during build';
        setError(message);
        setProgress({
          phase: 'error',
          message,
          percent: 0
        });
      }
    };

    build();

    return () => {
      cancelled = true;
    };
  }, [files, buildTrigger]);

  // Compute stats when sourceManifests changes
  const stats = sourceManifests ? getManifestStats(sourceManifests) : null;

  return {
    sourceManifests,
    progress,
    error,
    stats,
    rebuild
  };
}

/**
 * Hook to build from a FileTree instead of raw files
 * (useful when FileTree already exists)
 */
export function useSourceManifestsFromTree(tree: FileTree | null): UseSourceManifestsBuilderReturn {
  const [sourceManifests, setSourceManifests] = useState<SourceManifests | null>(null);
  const [progress, setProgress] = useState<BuildProgress>({
    phase: 'idle',
    message: '',
    percent: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [buildTrigger, setBuildTrigger] = useState(0);

  const rebuild = useCallback(() => {
    setBuildTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!tree) {
      setSourceManifests(null);
      setProgress({ phase: 'idle', message: '', percent: 0 });
      return;
    }

    let cancelled = false;

    const build = async () => {
      try {
        setError(null);

        setProgress({
          phase: 'building-tree',
          message: 'Processing directory structure...',
          percent: 30
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        if (cancelled) return;

        // Flatten tree to files
        const flattenTree = (node: FileTree): File[] => {
          const files: File[] = [];
          node.files.forEach(f => files.push(f));
          node.directories.forEach(dir => files.push(...flattenTree(dir)));
          return files;
        };

        const files = flattenTree(tree);

        setProgress({
          phase: 'detecting-sequences',
          message: 'Detecting file sequences and patterns...',
          percent: 60
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        if (cancelled) return;

        const result = buildSourceManifests(files);

        if (cancelled) return;

        setSourceManifests(result);
        setProgress({
          phase: 'complete',
          message: `Found ${result.manifests.length} manifests`,
          percent: 100
        });

      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Unknown error during build';
        setError(message);
        setProgress({
          phase: 'error',
          message,
          percent: 0
        });
      }
    };

    build();

    return () => {
      cancelled = true;
    };
  }, [tree, buildTrigger]);

  const stats = sourceManifests ? getManifestStats(sourceManifests) : null;

  return {
    sourceManifests,
    progress,
    error,
    stats,
    rebuild
  };
}
