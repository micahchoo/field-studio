/**
 * Stats Panel - Shows overall dependency statistics
 */

import React from 'react';
import type { DependencyGraph } from '../types';

interface StatsPanelProps {
  data: DependencyGraph;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data }) => {
  const { stats, externalDependencies, circularDependencies, orphans } = data;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Overview Cards */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Overview
          </h2>
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
        </section>

        {/* Most Imported Files */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Most Imported Files
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    File
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400 w-24">
                    Imports
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats.mostImported.map(({ file, count }, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {file}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
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
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span className="material-icons text-orange-500">language</span>
            External Dependencies ({externalDependencies.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {externalDependencies.map((dep, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm rounded-full border border-orange-200 dark:border-orange-800"
              >
                {dep}
              </span>
            ))}
          </div>
        </section>

        {/* Issues Summary */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span className="material-icons text-red-500">warning</span>
            Potential Issues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${
              circularDependencies.length > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {circularDependencies.length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Circular Dependencies
                  </div>
                </div>
                <span className={`material-icons text-3xl ${
                  circularDependencies.length > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {circularDependencies.length > 0 ? 'sync_problem' : 'check_circle'}
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              orphans.length > 0
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {orphans.length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Unused Files
                  </div>
                </div>
                <span className={`material-icons text-3xl ${
                  orphans.length > 0 ? 'text-yellow-500' : 'text-green-500'
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
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const iconClasses = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <span className={`material-icons ${iconClasses[color]}`}>{icon}</span>
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
