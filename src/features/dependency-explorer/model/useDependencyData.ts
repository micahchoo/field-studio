/**
 * Hook for loading and querying dependency data
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DependencyGraph, FileAnalysis, FilterType } from '../types';

interface UseDependencyDataOptions {
  searchQuery?: string;
  filterType?: FilterType;
  sortBy?: 'name' | 'size' | 'imports' | 'exports' | 'dependents';
  sortOrder?: 'asc' | 'desc';
}

interface UseDependencyDataReturn {
  data: DependencyGraph | null;
  isLoading: boolean;
  error: Error | null;
  filteredFiles: FileAnalysis[];
  refresh: () => void;
}

const DATA_URL = '/dependencies.json';

export function useDependencyData(options: UseDependencyDataOptions = {}): UseDependencyDataReturn {
  const { searchQuery = '', filterType = 'all', sortBy = 'name', sortOrder = 'asc' } = options;
  
  const [data, setData] = useState<DependencyGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${DATA_URL}?_=${refreshKey}`);
        if (!response.ok) {
          throw new Error(`Failed to load dependency data: ${response.status}`);
        }
        const json = await response.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => { cancelled = true; };
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const filteredFiles = useMemo(() => {
    if (!data) return [];

    let files = Object.values(data.files);

    // Apply type filter
    if (filterType !== 'all') {
      const filterPatterns: Record<FilterType, RegExp> = {
        all: /.*/,
        components: /\.(tsx|jsx)$/,
        hooks: /use[A-Z].*\.(ts|tsx)$/,
        utils: /(util|helper|lib)\./i,
        services: /Service\.(ts|tsx)$/,
        types: /(types|\.(d\.ts))$/i,
      };
      files = files.filter(f => filterPatterns[filterType].test(f.fileName));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      files = files.filter(f => {
        const searchable = [
          f.filePath,
          f.fileName,
          ...f.exports.map(e => e.name),
          ...f.imports.flatMap(i => i.specifiers),
        ].join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    // Apply sorting
    files.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.filePath.localeCompare(b.filePath);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'imports':
          comparison = a.imports.length - b.imports.length;
          break;
        case 'exports':
          comparison = a.exports.length - b.exports.length;
          break;
        case 'dependents':
          comparison = a.dependents.length - b.dependents.length;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return files;
  }, [data, searchQuery, filterType, sortBy, sortOrder]);

  return { data, isLoading, error, filteredFiles, refresh };
}
