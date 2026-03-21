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
    const [isOpen, setIsOpen] = useState(true);
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
        <div className="mb-6 rounded-[24px] border border-[#eceeee] dark:border-[#2a2d33] overflow-hidden bg-white dark:bg-[#17181b] relative z-10">
            <Button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-[#f8f9f9] dark:hover:bg-[#1f2127]"
                variant="ghost"
                size="none"
            >
                <div>
                    <h3 className="text-[18px] font-extrabold text-[#2d2f2f] dark:text-[#eceff4] tracking-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>
                        Column Classification
                    </h3>
                    <p className="text-[14px] mt-1 text-[#5a5c5c] dark:text-[#a3a8b3]" style={{ fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 400 }}>
                        Review how Vizzy detected your columns. Override roles if necessary.
                    </p>
                </div>
                <svg
                    className={`w-5 h-5 transition-transform text-[#7a7c7c] dark:text-[#a3a8b3] ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </Button>

            {isOpen && (
                <div className="p-6 pt-4 border-t border-[#eceeee] dark:border-[#2a2d33] text-sm">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                        {allCols.map(col => {
                            const isOverridden = !!classification_overrides[col.name];
                            const currentRole = classification_overrides[col.name] || col.detectedRole;

                            return (
                                <div key={col.name} className="flex flex-col gap-2 p-4 rounded-[16px] border border-[#e4e4e7] dark:border-[#2f333b] bg-[#f3f4f4] dark:bg-[#202329] shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9aa0a5] dark:text-[#8f95a1]" style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>
                                            {currentRole}
                                        </span>
                                        {isOverridden && (
                                            <span className="text-[10px] uppercase font-bold text-[#765600] px-1.5 py-0.5 rounded-full bg-[#f4efe2] border border-[#e3d8be]">Manual</span>
                                        )}
                                    </div>
                                    <span className="text-[14px] font-semibold text-[#2d2f2f] dark:text-[#eceff4] truncate" style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }} title={col.name}>
                                        {col.name}
                                    </span>
                                    <select
                                        value={currentRole}
                                        onChange={(e) => setClassificationOverride(col.name, e.target.value as ClassificationRole)}
                                        className="w-full px-2.5 py-2 text-[12px] rounded-[12px] border border-[#d7d9db] dark:border-[#3a3f49] bg-white dark:bg-[#17181b] text-[#2d2f2f] dark:text-[#eceff4] focus:ring-1 focus:ring-[#765600]/40 focus:border-[#765600]/50 outline-none cursor-pointer"
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
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
