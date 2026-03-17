import React from 'react';

interface KPICardProps {
    value: string | number;
    label: string;
    change?: number;
    prefix?: string;
    suffix?: string;
    trendLabel?: string;
    variant?: 'default' | 'minimal';
    compact?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
    value,
    label,
    change,
    prefix = '',
    suffix = '',
    trendLabel = 'vs last period',
    variant = 'default',
    compact = false,
}) => {
    // Format value if it's a number
    const formattedValue = typeof value === 'number'
        ? new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            notation: compact && Math.abs(value) >= 1000 ? "compact" : "standard"
        }).format(value)
        : value;

    const containerClasses = variant === 'default'
        ? "obsidian-card rounded-sm p-6 border border-white/5 shadow-[0_0_20px_rgba(255,105,51,0.02)] min-w-[200px] flex flex-col justify-between h-full relative overflow-hidden group hover:border-primary/30 transition-all duration-300"
        : "flex flex-col justify-between h-full relative overflow-hidden group"; // Minimal: no border/shadow/bg/padding (handled by parent)

    return (
        <div className={containerClasses}>
            <div className="relative z-10">
                <div className="text-[13px] text-gray-600 dark:text-gray-400 font-serif tracking-wide mb-2">
                    {label}
                </div>
                <div className="text-3xl font-serif tracking-tighter text-gray-900 dark:text-white group-hover:text-primary transition-colors drop-shadow-md">
                    {prefix}{formattedValue}{suffix}
                </div>
            </div>
            {change !== undefined && (
                <div className={`relative z-10 text-[12px] font-serif tracking-wide mt-4 flex items-center w-fit px-2 py-1.5 rounded-sm border ${change >= 0 ? 'text-primary bg-primary/10 border-primary/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>
                    <span className="mr-1">{change >= 0 ? '↑' : '↓'}</span>
                    {Math.abs(change)}% <span className="text-gray-500 ml-1.5 opacity-60 font-normal">{trendLabel}</span>
                </div>
            )}
        </div>
    );
};
