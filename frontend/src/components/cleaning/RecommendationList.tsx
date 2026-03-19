import React, { useState, useEffect } from 'react';
import type { Recommendation } from '../../services/cleaningService';

interface RecommendationListProps {
    recommendations: Recommendation[];
    onSelectionChange: (selectedIds: string[], strategyOverrides: Record<string, string>) => void;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations, onSelectionChange }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(recommendations.map(r => r.id)));
    const [strategies, setStrategies] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialStrategies: Record<string, string> = {};
        recommendations.forEach(r => {
            initialStrategies[r.id] = r.strategy;
        });
        setStrategies(initialStrategies);
    }, [recommendations]);

    useEffect(() => {
        onSelectionChange(Array.from(selectedIds), strategies);
    }, [selectedIds, strategies, onSelectionChange]);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleStrategyChange = (id: string, newStrategy: string) => {
        setStrategies(prev => ({
            ...prev,
            [id]: newStrategy
        }));
    };

    if (recommendations.length === 0) {
        return (
            <div className="text-center p-12 bg-surface-container-low dark:bg-surface rounded-xl border-2 border-dashed border-outline-variant">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">done_all</span>
                </div>
                <h3 className="text-on-surface font-headline font-bold text-lg mb-1">Data Integrity Verified</h3>
                <p className="text-on-surface-variant text-sm">No issues found! Your dataset meets all quality standards.</p>
            </div>
        );
    }

    const getSeverityDetails = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'high':
            case 'critical': 
                return {
                    wrapper: 'border-l-4 border-error hover:bg-surface-container-low dark:hover:bg-surface-container',
                    badge: 'bg-error-container text-on-error-container dark:bg-error/20 dark:text-error dark:border-error/30'
                };
            case 'medium':
            case 'warning':
                return {
                    wrapper: 'border-l-4 border-amber-400 dark:border-amber-500 hover:bg-surface-container-low dark:hover:bg-surface-container',
                    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20'
                };
            default:
                return {
                    wrapper: 'border-l-4 border-primary hover:bg-surface-container-low dark:hover:bg-surface-container',
                    badge: 'bg-primary-fixed text-on-primary-fixed-variant dark:bg-primary/20 dark:text-primary dark:border-primary/30'
                };
        }
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-on-surface font-headline font-semibold text-lg">Recommendations</h3>
                <div className="flex items-center gap-4">
                    <button className="text-xs font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">filter_list</span> Filter
                    </button>
                    <button className="text-xs font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">sort</span> Sort
                    </button>
                </div>
            </div>

            {recommendations.map((rec) => {
                const styles = getSeverityDetails(rec.severity);
                const isSelected = selectedIds.has(rec.id);

                return (
                    <div
                        key={rec.id}
                        className={`bg-surface-container-lowest dark:bg-surface rounded-xl p-5 shadow-sm transition-all border border-outline-variant/10 dark:border-outline-variant cursor-pointer group ${styles.wrapper} ${isSelected ? 'ring-1 ring-primary/20 dark:ring-primary/50' : 'opacity-80 hover:opacity-100'}`}
                        onClick={() => toggleSelection(rec.id)}
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`${styles.badge} border text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide`}>
                                        {rec.severity}
                                    </span>
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">{rec.issue_type.replace(/_/g, ' ')}</span>
                                </div>
                                <h4 className="text-base font-bold text-on-surface font-headline mb-1 flex items-center gap-2">
                                    {rec.issue_type.replace(/_/g, ' ')}
                                    {rec.column && (
                                        <code className="text-xs font-mono bg-surface-container-low dark:bg-background px-1.5 py-0.5 rounded border border-outline-variant/50 dark:border-outline-variant text-primary font-medium">
                                            {rec.column}
                                        </code>
                                    )}
                                </h4>
                                <p className="text-sm text-on-surface-variant leading-snug mb-4">{rec.description}</p>
                                
                                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                    <div className="flex-1 max-w-[240px]">
                                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Strategy</label>
                                        <select
                                            value={strategies[rec.id] || rec.strategy}
                                            onChange={(e) => handleStrategyChange(rec.id, e.target.value)}
                                            className="w-full text-sm py-1.5 pl-3 pr-10 border-outline-variant/50 dark:border-outline-variant bg-surface-container-lowest dark:bg-background rounded-lg focus:ring-primary focus:border-primary text-on-surface cursor-pointer"
                                        >
                                            {rec.strategy_options.map(opt => (
                                                <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button className="mt-5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors">
                                        Edit Mapping
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-center gap-3 pt-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        toggleSelection(rec.id);
                                    }}
                                    className="w-5 h-5 rounded border-outline-variant dark:bg-background text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
