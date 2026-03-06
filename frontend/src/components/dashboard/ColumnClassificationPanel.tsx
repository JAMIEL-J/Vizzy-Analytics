import React, { useState } from 'react';
import { useFilterStore, type ClassificationRole } from '../../store/useFilterStore';

interface ColumnClassificationPanelProps {
    columns: {
        dimensions: string[];
        metrics: string[];
        targets: string[];
        dates: string[];
        excluded: string[];
    };
    isDark: boolean;
}

const ROLES: { label: string; value: ClassificationRole; description: string }[] = [
    { label: 'Dimension', value: 'Dimension', description: 'Categorical grouping column' },
    { label: 'Metric', value: 'Metric', description: 'Numeric column for aggregation' },
    { label: 'Date', value: 'Date', description: 'Time series column' },
    { label: 'Target', value: 'Target', description: 'Prediction / outcome column' },
    { label: 'Excluded', value: 'Excluded', description: 'IDs or noise columns to ignore' },
];

export const ColumnClassificationPanel: React.FC<ColumnClassificationPanelProps> = ({ columns, isDark }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { classification_overrides, setClassificationOverride } = useFilterStore();

    // Flatten columns into a unified list [{ name, detectedRole }]
    const allCols: { name: string; detectedRole: ClassificationRole }[] = [];
    columns.dimensions.forEach(c => allCols.push({ name: c, detectedRole: 'Dimension' }));
    columns.metrics.forEach(c => allCols.push({ name: c, detectedRole: 'Metric' }));
    columns.dates.forEach(c => allCols.push({ name: c, detectedRole: 'Date' }));
    columns.targets.forEach(c => allCols.push({ name: c, detectedRole: 'Target' }));
    columns.excluded.forEach(c => allCols.push({ name: c, detectedRole: 'Excluded' }));

    // Sort alphabetically
    allCols.sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className={`mb-6 rounded-lg border overflow-hidden ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-5 py-3 flex items-center justify-between text-left transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}
            >
                <div>
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Column Classification
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Review how Vizzy detected your columns. Override roles if necessary.
                    </p>
                </div>
                <svg
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className={`p-5 pt-2 border-t text-sm ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {allCols.map(col => {
                            const isOverridden = !!classification_overrides[col.name];
                            const currentRole = classification_overrides[col.name] || col.detectedRole;

                            return (
                                <div key={col.name} className={`flex flex-col gap-1.5 p-3 rounded border ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-100 bg-gray-50'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} truncate mr-2`} title={col.name}>
                                            {col.name}
                                        </span>
                                        {isOverridden && (
                                            <span className="text-[10px] uppercase font-bold text-indigo-500 px-1.5 py-0.5 rounded bg-indigo-500/10">Manual</span>
                                        )}
                                    </div>
                                    <select
                                        value={currentRole}
                                        onChange={(e) => setClassificationOverride(col.name, e.target.value as ClassificationRole)}
                                        className={`w-full px-2 py-1.5 text-xs rounded border transition-colors focus:ring-1 focus:ring-indigo-500 ${isDark
                                            ? 'bg-gray-900 border-gray-700 text-gray-300 focus:border-indigo-500 hover:border-gray-600'
                                            : 'bg-white border-gray-200 text-gray-700 focus:border-indigo-400 hover:border-gray-300'
                                            }`}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label} - {r.description}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
