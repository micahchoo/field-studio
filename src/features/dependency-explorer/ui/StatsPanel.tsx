/**
 * Stats Panel - Shows overall dependency statistics
 */

import React, { useMemo } from 'react';
import type { DependencyGraph } from '../types';
import { CopyableSection, formatStatsAsMarkdown } from './CopyableSection';

interface StatsPanelProps {
  data: DependencyGraph;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data }) => {
  const { stats, externalDependencies, circularDependencies, orphans } = data;

  const markdown = useMemo(() => formatStatsAsMarkdown(data), [data]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Overview Cards */}
        <CopyableSection title="Overview" getMarkdown={() => markdown}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="description"
              label="Total Files"
              value={data.totalFiles}
              color="blue"
            />
            <StatCard
              icon="arrow_forward"
              label="Total Imports"
              value={stats.totalImports}
              color="purple"
            />
            <StatCard
              icon="logout"
              label="Total Exports"
              value={stats.totalExports}
              color="green"
            />
            <StatCard
              icon="calculate"
              label="Avg Imports/File"
              value={stats.avgImportsPerFile.toFixed(1)}
              color="orange"
            />
          </div>
        </CopyableSection>

        {/* Most Imported Files */}
        <section>
          <h2 className="text-lg font-semibold text-nb-black/20 mb-4">
            Most Imported Files
          </h2>
          <div className="bg-nb-white border border-nb-black/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-nb-cream">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-nb-black/50">
                    File
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-nb-black/50 w-24">
                    Imports
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nb-black/10">
                {stats.mostImported.map(({ file, count }, idx) => (
                  <tr key={idx} className="hover:bg-nb-cream">
                    <td className="px-4 py-2 font-mono text-xs text-nb-black/50">
                      {file}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-blue/20 text-nb-blue">
                        {count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* External Dependencies */}
        <section>
          <h2 className="text-lg font-semibold text-nb-black/20 mb-4 flex items-center gap-2">
            <span className="material-icons text-nb-orange">language</span>
            External Dependencies ({externalDependencies.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {externalDependencies.map((dep, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-nb-orange/20 text-nb-orange text-sm border border-nb-orange"
              >
                {dep}
              </span>
            ))}
          </div>
        </section>

        {/* Issues Summary */}
        <section>
          <h2 className="text-lg font-semibold text-nb-black/20 mb-4 flex items-center gap-2">
            <span className="material-icons text-nb-red">warning</span>
            Potential Issues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 border ${
              circularDependencies.length > 0
                ? 'bg-nb-red/10 border-nb-red/30'
                : 'bg-nb-green/10 border-nb-green/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-nb-black/20">
                    {circularDependencies.length}
                  </div>
                  <div className="text-sm text-nb-black/50">
                    Circular Dependencies
                  </div>
                </div>
                <span className={`material-icons text-3xl ${
                  circularDependencies.length > 0 ? 'text-nb-red' : 'text-nb-green'
                }`}>
                  {circularDependencies.length > 0 ? 'sync_problem' : 'check_circle'}
                </span>
              </div>
            </div>

            <div className={`p-4 border ${
              orphans.length > 0
                ? 'bg-yellow-50/20/20 border-yellow-200'
                : 'bg-nb-green/10 border-nb-green/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-nb-black/20">
                    {orphans.length}
                  </div>
                  <div className="text-sm text-nb-black/50">
                    Unused Files
                  </div>
                </div>
                <span className={`material-icons text-3xl ${
                  orphans.length > 0 ? 'text-nb-yellow' : 'text-nb-green'
                }`}>
                  {orphans.length > 0 ? 'link_off' : 'check_circle'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-nb-blue/10 border-nb-blue/30',
    purple: 'bg-nb-purple/10 border-nb-purple/20',
    green: 'bg-nb-green/10 border-nb-green/30',
    orange: 'bg-nb-orange/20 border-nb-orange',
    red: 'bg-nb-red/10 border-nb-red/30',
  };

  const iconClasses = {
    blue: 'text-nb-blue',
    purple: 'text-nb-purple',
    green: 'text-nb-green',
    orange: 'text-nb-orange',
    red: 'text-nb-red',
  };

  return (
    <div className={`p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <span className={`material-icons ${iconClasses[color]}`}>{icon}</span>
        <div>
          <div className="text-2xl font-bold text-nb-black/20">{value}</div>
          <div className="text-xs text-nb-black/50">{label}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
