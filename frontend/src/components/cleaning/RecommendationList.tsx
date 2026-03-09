import React, { useState, useEffect } from 'react';
import type { Recommendation } from '../../services/cleaningService';

interface RecommendationListProps {
    recommendations: Recommendation[];
    onSelectionChange: (selectedIds: string[], strategyOverrides: Record<string, string>) => void;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations, onSelectionChange }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(recommendations.map(r => r.id))); // Default all selected
    const [strategies, setStrategies] = useState<Record<string, string>>({});

    // Initialize with default strategies
    useEffect(() => {
        const initialStrategies: Record<string, string> = {};
        recommendations.forEach(r => {
            initialStrategies[r.id] = r.strategy;
        });
        setStrategies(initialStrategies);
    }, [recommendations]);

    // Notify parent of changes
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
            <div className="text-center p-12 obsidian-card rounded-sm border border-dashed border-white/20">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-white font-light tracking-widest uppercase text-lg mb-1">Data Integrity Verified</h3>
                <p className="text-gray-400 font-mono text-xs tracking-wider">No issues found! Your dataset meets all quality standards.</p>
            </div>
        );
    }

    const getSeverityStyles = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    return (
        <div className="grid grid-cols-1 gap-5 pb-24">
            {recommendations.map((rec) => (
                <div
                    key={rec.id}
                    onClick={() => toggleSelection(rec.id)}
                    className={`group relative glass-panel p-6 rounded-sm border transition-all duration-300 cursor-pointer ${selectedIds.has(rec.id)
                        ? 'border-primary shadow-[0_0_15px_rgba(255,105,51,0.1)]'
                        : 'border-white/5 hover:border-white/20 opacity-80'
                        }`}
                >
                    <div className="flex items-start gap-6">
                        <div className="relative flex items-center justify-center mt-1.5">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(rec.id)}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelection(rec.id);
                                }}
                                className={`w-6 h-6 border-gray-300 rounded-lg focus:ring-4 focus:ring-primary-blue/20 transition-all cursor-pointer ${selectedIds.has(rec.id) ? 'accent-primary-blue' : ''
                                    }`}
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center flex-wrap gap-3">
                                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm border ${getSeverityStyles(rec.severity)}`}>
                                            {rec.severity}
                                        </span>
                                        <h4 className="text-lg font-bold text-white tracking-widest uppercase flex items-center flex-wrap gap-2">
                                            {rec.issue_type.replace('_', ' ')}
                                            {rec.column && (
                                                <span className="text-xs font-mono bg-primary/5 text-primary px-2 py-1 rounded-sm border border-primary/20">
                                                    {rec.column}
                                                </span>
                                            )}
                                        </h4>
                                    </div>
                                    <p className="text-gray-400 font-mono text-xs tracking-wider leading-relaxed max-w-2xl">{rec.description}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        Impact: {rec.impact}
                                    </div>
                                </div>

                                {selectedIds.has(rec.id) && (
                                    <div className="w-full xl:w-72 obsidian-card p-5 rounded-sm border border-white/10" onClick={(e) => e.stopPropagation()}>
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-3 text-shadow-[0_0_10px_rgba(255,105,51,0.5)]">Correction Strategy</label>
                                        <div className="relative">
                                            <select
                                                value={strategies[rec.id] || rec.strategy}
                                                onChange={(e) => handleStrategyChange(rec.id, e.target.value)}
                                                className="w-full pl-4 pr-10 py-2.5 bg-black/50 text-xs font-mono tracking-widest uppercase text-white border border-white/10 rounded-sm focus:border-primary outline-none transition-all appearance-none cursor-pointer shadow-sm"
                                            >
                                                {rec.strategy_options.map(opt => (
                                                    <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Indicator Checkmark */}
                    {selectedIds.has(rec.id) && (
                        <div className="absolute top-4 right-4 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                            <svg className="w-20 h-20 transform rotate-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
