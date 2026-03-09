import React from 'react';
import type { RiskLevel, HealthScore } from '../../services/cleaningService';

interface HealthDashboardProps {
    healthScore: HealthScore | number;
    riskLevel: RiskLevel;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ healthScore, riskLevel }) => {
    // Determine the numeric score
    const scoreValue = typeof healthScore === 'object' ? healthScore.score : healthScore;
    const safeScore = isNaN(scoreValue) ? 0 : scoreValue;
    const grade = typeof healthScore === 'object' ? healthScore.grade : null;
    const breakdown = typeof healthScore === 'object' ? healthScore.breakdown : null;

    // Semantic Risk Coloring (Independent of Health Score)
    const getRiskStyles = (level: RiskLevel) => {
        const l = level.toLowerCase();
        if (l === 'high') return {
            text: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            badge: 'bg-red-500/10 text-red-500 border-red-500/20'
        };
        if (l === 'medium') return {
            text: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        };
        return {
            text: 'text-primary',
            bg: 'bg-primary/5',
            border: 'border-primary/20',
            badge: 'bg-primary/10 text-primary border-primary/20'
        };
    };

    const riskStyles = getRiskStyles(riskLevel);

    // Score-based coloring for the gauge only
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * safeScore) / 100;

    return (
        <div className={`relative overflow-hidden p-8 rounded-sm glass-panel border ${riskStyles.border} ${riskStyles.bg} shadow-xl mb-8 transition-all duration-500`}>
            {/* Background Decorative Elements */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-[80px] pointer-events-none translate-x-1/3 -translate-y-1/3 ${riskStyles.text.replace('text', 'bg')}`}></div>

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 z-10">
                {/* Left Section: Gauge & Grade */}
                <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-sm">
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-gray-200/50 dark:text-gray-700/50"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={isNaN(offset) ? circumference : offset}
                                className={`${getScoreColor(safeScore)} transition-all duration-1500 ease-out`}
                                style={{ strokeLinecap: 'round' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                            <span className={`text-3xl font-black tracking-tighter leading-none ${getScoreColor(safeScore)}`}>
                                {Math.round(safeScore)}<span className="text-[14px] ml-0.5">%</span>
                            </span>
                            {grade && (
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none">Rating</span>
                                    <span className={`text-2xl font-black leading-tight ${getScoreColor(safeScore)}`}>{grade}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-light uppercase tracking-widest text-white">Dataset Health Profile</h3>
                            <div className={`px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-widest ${riskStyles.badge}`}>
                                {riskLevel} Risk
                            </div>
                        </div>
                        <p className="text-gray-400 font-mono text-xs tracking-wider max-w-md leading-relaxed mt-2">
                            Current quality analysis indicates a <span className={`font-bold uppercase ${riskStyles.text}`}>{riskLevel} risk</span> environment.
                            {safeScore < 90 && " Critical optimization points found."}
                        </p>
                    </div>
                </div>

                {/* Right Section: Penalty Breakdown (Glassmorphic Table) */}
                {breakdown && (
                    <div className="w-full lg:w-auto p-5 obsidian-card rounded-sm shadow-[0_0_15px_rgba(255,105,51,0.05)] min-w-[280px]">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 17h8m-8-4h8m-8-4h8m-9.707 1.293l3 3m0-3l-3 3M6.707 15.293l3 3m0-3l-3 3M1 18h.01M1 14h.01M1 10h.01"></path></svg>
                            Penalty Breakdown
                        </h4>
                        <div className="space-y-3">
                            <BreakdownRow label="Missing Values" value={breakdown.missing_values_penalty} />
                            <BreakdownRow label="Outliers" value={breakdown.outliers_penalty} />
                            <BreakdownRow label="Duplicates" value={breakdown.duplicates_penalty} />
                            <BreakdownRow label="System Logic" value={breakdown.other_penalty} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const BreakdownRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex justify-between items-center group">
        <span className="text-xs font-mono text-gray-400 transition-colors group-hover:text-primary tracking-wider">{label}</span>
        <span className={`text-xs font-mono font-bold tracking-wider ${value > 0 ? 'text-red-500' : 'text-primary'} tabular-nums`}>
            {value > 0 ? `-${value.toFixed(1)}` : '0.0'}
        </span>
    </div>
);
