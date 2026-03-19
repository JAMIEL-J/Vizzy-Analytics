import React, { useState } from 'react';
import { useFilterStore, type ClassificationRole } from '../../store/useFilterStore';
import { Button } from '@/components/ui/button';

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

export const ColumnClassificationPanel: React.FC<ColumnClassificationPanelProps> = ({ columns }) => {
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
        <div className="mb-6 rounded-xl border border-transparent dark:border-white/5 overflow-hidden bg-surface-container-lowest dark:bg-surface-container/80 dark:backdrop-blur-md relative z-10">
            <Button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-bg-hover"
                variant="ghost"
                size="none"
            >
                <div>
                    <h3 className="font-serif text-[17px] text-themed-main tracking-wide">
                        Column Classification
                    </h3>
                    <p className="text-[13px] font-serif mt-0.5 text-themed-muted">
                        Review how Vizzy detected your columns. Override roles if necessary.
                    </p>
                </div>
                <svg
                    className={`w-5 h-5 transition-transform text-themed-muted ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </Button>

            {isOpen && (
                <div className="p-5 pt-2 border-t border-border-main text-sm">
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {allCols.map(col => {
                            const isOverridden = !!classification_overrides[col.name];
                            const currentRole = classification_overrides[col.name] || col.detectedRole;

                            return (
                                <div key={col.name} className="flex flex-col gap-1.5 p-3 rounded-sm border border-border-main bg-gray-50/80 dark:bg-black/20 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="font-serif text-[14px] text-themed-main truncate mr-2" title={col.name}>
                                            {col.name}
                                        </span>
                                        {isOverridden && (
                                            <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20">Manual</span>
                                        )}
                                    </div>
                                    <select
                                        value={currentRole}
                                        onChange={(e) => setClassificationOverride(col.name, e.target.value as ClassificationRole)}
                                        className="w-full px-2 py-1.5 text-[13px] font-serif rounded-sm border border-border-main bg-bg-card dark:bg-black/50 text-themed-main transition-colors focus:ring-1 focus:ring-primary focus:border-primary hover:border-primary/30 outline-none cursor-pointer"
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
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
