import React from 'react';

interface KPICardProps {
    value: string | number;
    label: string;
    change?: number;
    prefix?: string;
    suffix?: string;
    trendLabel?: string;
    variant?: 'default' | 'minimal';
}

export const KPICard: React.FC<KPICardProps> = ({
    value,
    label,
    change,
    prefix = '',
    suffix = '',
    trendLabel = 'vs last period',
    variant = 'default'
}) => {
    // Format value if it's a number
    const formattedValue = typeof value === 'number'
        ? new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            notation: value > 1000000 ? "compact" : "standard"
        }).format(value)
        : value;

    const containerClasses = variant === 'default'
        ? "bg-white dark:bg-[#111827] rounded-xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 min-w-[200px] flex flex-col justify-between h-full"
        : "flex flex-col justify-between h-full"; // Minimal: no border/shadow/bg/padding (handled by parent)

    return (
        <div className={containerClasses}>
            <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
                    {label}
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {prefix}{formattedValue}{suffix}
                </div>
            </div>
            {change !== undefined && (
                <div className={`text-xs mt-4 font-medium flex items-center w-fit px-2 py-1 rounded-full ${change >= 0 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                    <span className="mr-1 font-bold">{change >= 0 ? '↑' : '↓'}</span>
                    {Math.abs(change)}% <span className="text-gray-400 ml-1.5 font-normal">{trendLabel}</span>
                </div>
            )}
        </div>
    );
};
