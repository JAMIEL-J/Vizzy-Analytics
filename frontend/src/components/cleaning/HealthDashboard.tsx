import React from 'react';
import type { RiskLevel, HealthScore } from '../../services/cleaningService';

interface HealthDashboardProps {
    healthScore: HealthScore | number;
    riskLevel: RiskLevel;
    issues?: {
        missing_values?: never; // Mock, depends on what structure `issues_detected` has
        [key: string]: any;
    };
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ healthScore, riskLevel, issues: _issues = {} }) => {
    const scoreValue = typeof healthScore === 'object' ? healthScore.score : healthScore;
    const safeScore = isNaN(scoreValue) ? 0 : scoreValue;

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * safeScore) / 100;

    // Use dummy counts from issues if available or hardcode to match UI slightly.
    // Assuming backend will provide actual metrics eventually, but template has Nulls, Duplicates, Errors
    // Let's use breakdown logic from backend if available
    const breakdown = typeof healthScore === 'object' ? healthScore.breakdown : null;

    return (
        <section className="bg-surface-container-lowest dark:bg-surface rounded-xl p-8 shadow-sm dark:shadow-2xl border border-outline-variant/10 dark:border-outline-variant">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-on-surface font-headline font-semibold text-lg">Health Dashboard</h3>
                <span className="px-2.5 py-1 bg-secondary-container/30 dark:bg-primary/10 text-on-secondary-container dark:text-primary text-[10px] font-bold uppercase tracking-wider rounded">Live Sync</span>
            </div>
            
            <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-64 h-64">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            fill="none"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-surface-container-low dark:text-surface-container-high"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            fill="none"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={isNaN(offset) ? circumference : offset}
                            strokeLinecap="round"
                            className="text-primary transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-5xl font-bold font-headline text-on-surface">
                            {Math.round(safeScore)}
                            <span className="text-2xl text-on-surface-variant">%</span>
                        </span>
                        <span className="text-xs font-medium text-on-surface-variant mt-1">Data Health Score</span>
                    </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-secondary text-sm font-medium">
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                    <span>Risk Level: {riskLevel}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-outline-variant/10 dark:border-outline-variant">
                <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Null Penalty</p>
                    <p className="text-xl font-bold font-headline text-on-surface">{breakdown?.missing_values_penalty ? `-${breakdown.missing_values_penalty.toFixed(1)}` : '0'}</p>
                    <div className="h-1 w-8 bg-amber-400 dark:bg-amber-500 mx-auto mt-2 rounded-full"></div>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Dups Penalty</p>
                    <p className="text-xl font-bold font-headline text-on-surface">{breakdown?.duplicates_penalty ? `-${breakdown.duplicates_penalty.toFixed(1)}` : '0'}</p>
                    <div className="h-1 w-8 bg-error mx-auto mt-2 rounded-full"></div>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Other Issues</p>
                    <p className="text-xl font-bold font-headline text-on-surface">{breakdown?.other_penalty ? `-${breakdown.other_penalty.toFixed(1)}` : '0'}</p>
                    <div className="h-1 w-8 bg-primary mx-auto mt-2 rounded-full"></div>
                </div>
            </div>
        </section>
    );
};
