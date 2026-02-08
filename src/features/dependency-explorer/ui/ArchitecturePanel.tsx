/**
 * Architecture Panel - Admin insights for code organization
 * 
 * Provides high-level architectural analysis including:
 * - Layered architecture visualization (app, widgets, features, entities, shared)
 * - Import/export patterns across layers
 * - Code health metrics
 * - Feature dependency mapping
 */

import React, { useMemo } from 'react';
import type { DependencyGraph, FileAnalysis } from '../types';
import { CopyableSection, formatCrossLayerDepsAsMarkdown, formatHealthMetricsAsMarkdown, formatHeavyFilesAsMarkdown, formatHotFilesAsMarkdown, formatLayersAsMarkdown } from './CopyableSection';

interface ArchitecturePanelProps {
  data: DependencyGraph;
}

interface LayerStats {
  name: string;
  files: FileAnalysis[];
  totalImports: number;
  totalExports: number;
  externalDeps: Set<string>;
  internalDeps: Set<string>;
  avgLines: number;
  typeImports: number;
  valueImports: number;
}

export const ArchitecturePanel: React.FC<ArchitecturePanelProps> = ({ data }) => {
  const layers = useMemo(() => {
    const files = Object.values(data.files);
    
    const layerConfigs = [
      { name: 'App', pattern: /^src\/app\//, color: 'bg-nb-purple' },
      { name: 'Widgets', pattern: /^src\/widgets\//, color: 'bg-nb-blue' },
      { name: 'Features', pattern: /^src\/features\//, color: 'bg-nb-green' },
      { name: 'Entities', pattern: /^src\/entities\//, color: 'bg-nb-orange' },
      { name: 'Shared', pattern: /^src\/shared\//, color: 'bg-rose-500' },
      { name: 'Utils', pattern: /^utils\//, color: 'bg-nb-blue/100' },
      { name: 'UI Primitives', pattern: /^ui\//, color: 'bg-nb-blue/100' },
      { name: 'Other', pattern: /.*/, color: 'bg-nb-black/40' },
    ];

    return layerConfigs.map(config => {
      const layerFiles = files.filter(f => config.pattern.test(f.filePath));
      
      const stats: LayerStats = {
        name: config.name,
        files: layerFiles,
        totalImports: 0,
        totalExports: 0,
        externalDeps: new Set(),
        internalDeps: new Set(),
        avgLines: 0,
        typeImports: 0,
        valueImports: 0,
      };

      let totalLines = 0;
      
      layerFiles.forEach(file => {
        stats.totalImports += file.imports.length;
        stats.totalExports += file.exports.length;
        totalLines += file.lines;
        
        file.imports.forEach(imp => {
          if (imp.isExternal) {
            stats.externalDeps.add(imp.source);
          } else if (!imp.isInternalAlias) {
            stats.internalDeps.add(imp.source);
          }
          
          if (imp.isTypeImport) {
            stats.typeImports++;
          } else {
            stats.valueImports++;
          }
        });
      });

      stats.avgLines = layerFiles.length > 0 ? Math.round(totalLines / layerFiles.length) : 0;
      
      return { ...stats, color: config.color };
    }).filter(l => l.files.length > 0);
  }, [data]);

  // Calculate cross-layer dependencies
  const crossLayerDeps = useMemo(() => {
    const deps: Record<string, Record<string, number>> = {};
    
    layers.forEach(sourceLayer => {
      deps[sourceLayer.name] = {};
      
      sourceLayer.files.forEach(file => {
        file.imports.forEach(imp => {
          if (imp.isInternalAlias || imp.isExternal) return;
          
          // Find which layer this import belongs to
          const targetLayer = layers.find(l => 
            l.name !== sourceLayer.name && 
            imp.source.includes(l.name.toLowerCase())
          );
          
          if (targetLayer) {
            deps[sourceLayer.name][targetLayer.name] = 
              (deps[sourceLayer.name][targetLayer.name] || 0) + 1;
          }
        });
      });
    });
    
    return deps;
  }, [layers]);

  // Find hot files (most dependents)
  const hotFiles = useMemo(() => {
    return Object.values(data.files)
      .sort((a, b) => b.dependents.length - a.dependents.length)
      .slice(0, 10);
  }, [data]);

  // Find heavy files (most imports)
  const heavyFiles = useMemo(() => {
    return Object.values(data.files)
      .sort((a, b) => b.imports.length - a.imports.length)
      .slice(0, 10);
  }, [data]);

  // Calculate code health metrics
  const healthMetrics = useMemo(() => {
    const files = Object.values(data.files);
    const totalFiles = files.length;
    
    // Files with no exports (potential issues)
    const noExports = files.filter(f => f.exports.length === 0);
    
    // Files with too many imports (potential god files)
    const highImportFiles = files.filter(f => f.imports.length > 20);
    
    // Files with high fan-out (used by many)
    const highFanOut = files.filter(f => f.dependents.length > 10);
    
    // Large files
    const largeFiles = files.filter(f => f.lines > 500);
    
    return {
      noExports: noExports.length,
      highImportFiles: highImportFiles.length,
      highFanOut: highFanOut.length,
      largeFiles: largeFiles.length,
      healthyPercentage: Math.round(
        ((totalFiles - noExports.length - highImportFiles.length - largeFiles.length) / totalFiles) * 100
      ),
    };
  }, [data]);

  const layersMarkdown = useMemo(() => formatLayersAsMarkdown(layers), [layers]);
  const crossLayerMarkdown = useMemo(() => formatCrossLayerDepsAsMarkdown(layers, crossLayerDeps), [layers, crossLayerDeps]);
  const healthMarkdown = useMemo(() => formatHealthMetricsAsMarkdown(healthMetrics), [healthMetrics]);
  const hotFilesMarkdown = useMemo(() => formatHotFilesAsMarkdown(hotFiles, 'Most Referenced Files'), [hotFiles]);
  const heavyFilesMarkdown = useMemo(() => formatHeavyFilesAsMarkdown(heavyFiles, 'Most Import-Heavy Files'), [heavyFiles]);

  return (
    <div className="h-full overflow-auto p-6 space-y-8">
      {/* Layer Overview */}
      <CopyableSection title="Architecture Layers" getMarkdown={() => layersMarkdown}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {layers.map(layer => (
            <div 
              key={layer.name}
              className="bg-nb-white border border-nb-black/20 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 ${layer.color}`} />
                <h3 className="font-medium text-nb-black/20">{layer.name}</h3>
                <span className="ml-auto text-xs text-nb-black/50">{layer.files.length} files</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-nb-black/50">
                  <span>Imports:</span>
                  <span className="font-medium">{layer.totalImports}</span>
                </div>
                <div className="flex justify-between text-nb-black/50">
                  <span>Exports:</span>
                  <span className="font-medium">{layer.totalExports}</span>
                </div>
                <div className="flex justify-between text-nb-black/50">
                  <span>Avg Lines:</span>
                  <span className="font-medium">{layer.avgLines}</span>
                </div>
                <div className="flex justify-between text-nb-black/50">
                  <span>External Deps:</span>
                  <span className="font-medium">{layer.externalDeps.size}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-nb-black/10">
                  <div className="flex gap-2 text-xs">
                    <span className="px-1.5 py-0.5 bg-nb-purple/10 text-nb-purple rounded">
                      {layer.typeImports} types
                    </span>
                    <span className="px-1.5 py-0.5 bg-nb-blue/20 text-nb-blue rounded">
                      {layer.valueImports} values
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CopyableSection>

      {/* Cross-Layer Dependencies */}
      <CopyableSection title="Cross-Layer Dependencies" getMarkdown={() => crossLayerMarkdown}>
        <div className="bg-nb-white border border-nb-black/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-nb-cream">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-nb-black/50">From \ To</th>
                {layers.map(l => (
                  <th key={l.name} className="px-2 py-2 text-center font-medium text-nb-black/50">
                    <div className={`w-2 h-2 ${l.color} mx-auto mb-1`} />
                    <span className="text-xs">{l.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-nb-black/10">
              {layers.map(sourceLayer => (
                <tr key={sourceLayer.name}>
                  <td className="px-4 py-2 font-medium text-nb-black/70">
                    {sourceLayer.name}
                  </td>
                  {layers.map(targetLayer => {
                    const count = crossLayerDeps[sourceLayer.name]?.[targetLayer.name] || 0;
                    const intensity = Math.min(count / 10, 1);
                    return (
                      <td key={targetLayer.name} className="px-2 py-2 text-center">
                        {count > 0 ? (
                          <span 
                            className="inline-flex items-center justify-center w-8 h-6 text-xs font-medium"
                            style={{
                              backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.4})`,
                              color: intensity > 0.5 ? '#1d4ed8' : '#3b82f6',
                            }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-nb-black/30">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CopyableSection>

      {/* Health Metrics */}
      <CopyableSection title="Code Health Metrics" getMarkdown={() => healthMarkdown}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-nb-white border border-nb-black/20 p-4 text-center">
            <div className={`text-2xl font-bold ${healthMetrics.healthyPercentage > 80 ? 'text-nb-green' : healthMetrics.healthyPercentage > 60 ? 'text-nb-orange' : 'text-nb-red'}`}>
              {healthMetrics.healthyPercentage}%
            </div>
            <div className="text-xs text-nb-black/50 mt-1">Healthy Files</div>
          </div>
          
          <div className="bg-nb-white border border-nb-black/20 p-4 text-center">
            <div className="text-2xl font-bold text-nb-black/70">
              {healthMetrics.noExports}
            </div>
            <div className="text-xs text-nb-black/50 mt-1">No Exports</div>
            {healthMetrics.noExports > 0 && (
              <div className="text-xs text-nb-orange mt-1">May be entry points</div>
            )}
          </div>
          
          <div className="bg-nb-white border border-nb-black/20 p-4 text-center">
            <div className={`text-2xl font-bold ${healthMetrics.highImportFiles < 10 ? 'text-nb-green' : 'text-nb-orange'}`}>
              {healthMetrics.highImportFiles}
            </div>
            <div className="text-xs text-nb-black/50 mt-1">High Import Count</div>
            <div className="text-xs text-nb-black/40 mt-1">{`>20 imports`}</div>
          </div>
          
          <div className="bg-nb-white border border-nb-black/20 p-4 text-center">
            <div className={`text-2xl font-bold ${healthMetrics.highFanOut < 20 ? 'text-nb-green' : 'text-nb-orange'}`}>
              {healthMetrics.highFanOut}
            </div>
            <div className="text-xs text-nb-black/50 mt-1">High Fan-out</div>
            <div className="text-xs text-nb-black/40 mt-1">{`>10 dependents`}</div>
          </div>
          
          <div className="bg-nb-white border border-nb-black/20 p-4 text-center">
            <div className={`text-2xl font-bold ${healthMetrics.largeFiles < 30 ? 'text-nb-green' : 'text-nb-orange'}`}>
              {healthMetrics.largeFiles}
            </div>
            <div className="text-xs text-nb-black/50 mt-1">Large Files</div>
            <div className="text-xs text-nb-black/40 mt-1">{`>500 lines`}</div>
          </div>
        </div>
      </CopyableSection>

      {/* Hot Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CopyableSection title="Most Referenced Files" getMarkdown={() => hotFilesMarkdown}>
          <div className="bg-nb-white border border-nb-black/20 divide-y divide-nb-black/10">
            {hotFiles.map((file, idx) => (
              <div key={file.filePath} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-medium text-nb-black/40 w-6">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-nb-black/20 truncate">
                    {file.fileName}
                  </div>
                  <div className="text-xs text-nb-black/50 truncate">{file.directory}/</div>
                </div>
                <span className="inline-flex items-center px-2 py-1 text-xs bg-nb-orange/20 text-nb-orange">
                  {file.dependents.length} refs
                </span>
              </div>
            ))}
          </div>
        </CopyableSection>

        <CopyableSection title="Most Import-Heavy Files" getMarkdown={() => heavyFilesMarkdown}>
          <div className="bg-nb-white border border-nb-black/20 divide-y divide-nb-black/10">
            {heavyFiles.map((file, idx) => (
              <div key={file.filePath} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-medium text-nb-black/40 w-6">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-nb-black/20 truncate">
                    {file.fileName}
                  </div>
                  <div className="text-xs text-nb-black/50 truncate">{file.directory}/</div>
                </div>
                <span className="inline-flex items-center px-2 py-1 text-xs bg-nb-purple/10 text-nb-purple">
                  {file.imports.length} imports
                </span>
              </div>
            ))}
          </div>
        </CopyableSection>
      </div>
    </div>
  );
};

export default ArchitecturePanel;