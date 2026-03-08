import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { datasetService } from '../../lib/api/dataset';
import { analyticsService, correlationService, type DashboardAnalytics, type CorrelationMatrix } from '../../lib/api/dashboard';
import GeoMapCard from './GeoMapCard';
import SettingsDropdown from '../../components/common/SettingsDropdown';
import { useFilterStore } from '../../store/useFilterStore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend,
    ScatterChart, Scatter, Treemap,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { ColumnClassificationPanel } from '../../components/dashboard/ColumnClassificationPanel';

// ─── Color Palettes ──────────────────────────────────────────────────────────

const KPI_COLORS = [
    {
        border: 'dark:border-blue-500/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        iconGrad: 'from-cyan-400 to-blue-500',
        iconShadow: 'shadow-blue-500/30',
        arc: 'bg-blue-500/5 dark:bg-blue-500/10',
    },
    {
        border: 'dark:border-purple-500/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]',
        iconGrad: 'from-purple-400 to-fuchsia-500',
        iconShadow: 'shadow-purple-500/30',
        arc: 'bg-purple-500/5 dark:bg-purple-500/10',
    },
    {
        border: 'dark:border-orange-500/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(249,115,22,0.15)]',
        iconGrad: 'from-orange-400 to-red-500',
        iconShadow: 'shadow-orange-500/30',
        arc: 'bg-orange-500/5 dark:bg-orange-500/10',
    },
    {
        border: 'dark:border-cyan-500/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(6,182,212,0.15)]',
        iconGrad: 'from-teal-400 to-cyan-500',
        iconShadow: 'shadow-cyan-500/30',
        arc: 'bg-cyan-500/5 dark:bg-cyan-500/10',
    },
    {
        border: 'dark:border-pink-500/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(236,72,153,0.15)]',
        iconGrad: 'from-pink-400 to-rose-500',
        iconShadow: 'shadow-pink-500/30',
        arc: 'bg-pink-500/5 dark:bg-pink-500/10',
    },
];

const CHART_COLORS = [
    '#818CF8', '#F472B6', '#34D399', '#FBBF24', '#60A5FA', '#F87171',
    '#A78BFA', '#2DD4BF', '#FB923C', '#E879F9', '#38BDF8', '#4ADE80'
];

// (static heatmap grid removed - now driven by real data)

// ─── KPI Icon Map ─────────────────────────────────────────────────────────────

const KPI_ICON_SVG: Record<string, React.ReactNode> = {
    dollar: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    'user-minus': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
    ),
    'trending-up': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
    percent: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
    ),
    activity: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    shield: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    'alert-circle': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    clock: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    repeat: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    ),
    default: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
};

// ─── Dark Tooltip ─────────────────────────────────────────────────────────────

const ThemedTooltip = ({ active, payload, label, formatter, chartColors, chartTitle, valueLabel, formatType }: any) => {
    if (!active || !payload?.length) return null;

    const fp = payload[0]?.payload;
    if (fp?.xLabel && fp?.yLabel) {
        const fmtS = (v: number, lbl: string) => {
            if (formatter) return formatter(v);
            const lblLower = lbl.toLowerCase();
            const isTimeVariant = ['tenure', 'age', 'duration', 'months', 'years', 'days'].some(k => lblLower.includes(k));
            const isCur = formatType === 'currency' || (!isTimeVariant && ['revenue', 'charges', 'cost', 'price', 'amount', 'sales', 'profit', 'income', 'expense']
                .some(k => lblLower.includes(k)));
            const isPct = formatType === 'percentage' || formatType === 'percent' || lbl.includes('%') || lblLower.includes('rate');

            if (isCur) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
            if (isPct) return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
            return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
        };
        return (
            <div
                className="rounded-xl px-4 py-3 shadow-2xl border backdrop-blur-md transition-colors duration-300 min-w-[160px]"
                style={{
                    backgroundColor: chartColors?.tooltip?.bg || 'white',
                    borderColor: chartColors?.tooltip?.border || '#E5E7EB',
                    color: chartColors?.tooltip?.text || '#111827'
                }}
            >
                {chartTitle && <p className="text-[10px] uppercase font-bold tracking-wider mb-2 pb-2 border-b border-gray-500/20 opacity-70">{chartTitle}</p>}
                {fp.label && <p className="text-xs opacity-60 mb-2 pb-2 border-b border-gray-700/10 font-medium">{fp.label}</p>}
                <div className="space-y-1.5">
                    <p className="text-sm flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#818CF8] inline-block" /><span className="opacity-70 text-xs">{fp.xLabel}:</span></span>
                        <span className="font-bold">{fmtS(fp.x, fp.xLabel)}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F472B6] inline-block" /><span className="opacity-70 text-xs">{fp.yLabel}:</span></span>
                        <span className="font-bold">{fmtS(fp.y, fp.yLabel)}</span>
                    </p>
                </div>
            </div>
        );
    }

    let metricName = "Value";
    let dimensionName = "Category";

    // If backend provided an explicit value_label (e.g. "Orders", "Customers"), use it
    if (valueLabel) {
        metricName = valueLabel;
    }

    if (chartTitle) {
        const parts = chartTitle.split(/ by | per /i);
        if (parts.length === 2) {
            if (!valueLabel) metricName = parts[0].trim();
            dimensionName = parts[1].trim();
        } else {
            const titleLower = chartTitle.toLowerCase();
            // Extract dimension from title patterns like "State Breakdown", "City Distribution"
            const extractDim = (suffix: RegExp) => chartTitle.replace(suffix, '').trim() || dimensionName;

            if (titleLower.includes('breakdown')) {
                dimensionName = extractDim(/ breakdown/i);
            } else if (titleLower.includes('distribution')) {
                dimensionName = extractDim(/ distribution/i);
            } else if (titleLower.includes('overview')) {
                dimensionName = extractDim(/ overview/i);
            } else {
                if (!valueLabel) metricName = chartTitle;
            }
        }
    }

    // Pie/Donut charts do not pass `label` to Tooltip, and they set payload[0].name to the slice name (e.g. "California")
    let displayLabel = label;
    let displayPayload = payload;

    if (!displayLabel && payload && payload.length === 1 && typeof payload[0].name === 'string' && payload[0].name !== 'value') {
        displayLabel = payload[0].name;
        displayPayload = [{ ...payload[0], name: metricName }];
    } else if (payload) {
        displayPayload = payload.map((p: any) => ({
            ...p,
            name: (p.name === 'value' || !p.name) ? metricName : p.name
        }));
    }

    return (
        <div
            className="rounded-xl px-4 py-3 shadow-2xl border backdrop-blur-md transition-colors duration-300 min-w-[160px]"
            style={{
                backgroundColor: chartColors?.tooltip?.bg || 'white',
                borderColor: chartColors?.tooltip?.border || '#E5E7EB',
                color: chartColors?.tooltip?.text || '#111827'
            }}
        >
            {chartTitle && <p className="text-[10px] uppercase font-bold tracking-wider mb-2 pb-2 border-b border-gray-500/20 opacity-70 leading-tight">{chartTitle}</p>}

            {displayLabel && (
                <div className="mb-3">
                    <p className="text-[10px] opacity-50 uppercase tracking-wider mb-0.5">{dimensionName}</p>
                    <p className="text-sm font-bold truncate max-w-[200px]">{displayLabel}</p>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {displayPayload.map((p: any, i: number) => {
                    return (
                        <div key={i} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color || p.fill || '#818CF8' }} />
                                <span className="text-xs opacity-70 whitespace-nowrap">{p.name}:</span>
                            </div>
                            <span className="text-sm font-bold tabular-nums">
                                {formatter
                                    ? formatter(p.value)
                                    : typeof p.value === 'number'
                                        ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                        : p.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard = ({ title, value, icon, index, trend, trend_label, subtitle }: { title: string; value: string; icon?: string; index: number; trend?: number; trend_label?: string; subtitle?: string }) => {
    const c = KPI_COLORS[index % KPI_COLORS.length];
    const iconEl = KPI_ICON_SVG[icon || 'default'] ?? KPI_ICON_SVG.default;

    // Trend logic
    const isPositive = trend !== undefined && trend > 0;
    const isNegative = trend !== undefined && trend < 0;
    const isNeutral = trend === 0;

    // Adjust logic if "down is good" (like Churn Rate) based on title heuristics
    const reverseLogic = title.toLowerCase().includes('churn') || title.toLowerCase().includes('bounce');
    const colorClass = isNeutral ? 'text-gray-500 bg-gray-100 dark:bg-gray-800' :
        (isPositive && !reverseLogic) || (isNegative && reverseLogic) ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' :
            'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10';


    return (
        <div className={`bg-white dark:bg-[#16181D] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 ${c.border} ${c.shadow} hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between`}>
            {/* Decorative arc */}
            <div className={`absolute top-0 right-0 w-16 h-16 ${c.arc} rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110`} />

            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconGrad} flex items-center justify-center text-white mb-3 shadow-lg ${c.iconShadow}`}>
                {iconEl}
            </div>

            <div className="flex flex-col gap-1 z-10">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
                <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>

                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                            {isPositive && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            )}
                            {isNegative && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            )}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>

                {trend_label && trend !== undefined && (
                    <p className="text-[10px] text-gray-400 font-medium text-right mt-0.5">{trend_label}</p>
                )}

                {subtitle && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {subtitle}
                    </p>
                )}


            </div>
        </div>
    );
};

// ─── Chart Card Wrapper ───────────────────────────────────────────────────────

const ChartCard = ({ title, children, className, actions }: { title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) => (
    <div className={`bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative group transition-colors duration-300 h-full flex flex-col ${className || ''}`}>
        <div className="flex justify-between items-start mb-5 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
            {actions ? (
                <div className="relative z-10">{actions}</div>
            ) : (
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                </button>
            )}
        </div>
        <div className="flex-1 min-h-0 w-full flex flex-col justify-end">
            {children}
        </div>
    </div>
);

// (Axis defaults moved inside component for dynamic themes)

// ─── ChartRenderer ────────────────────────────────────────────────────────────

const ChartRenderer = ({ chart, chartColors, isDark, onFilterClick }: { chart: any; chartColors: any; isDark: boolean; onFilterClick?: (col: string, val: string) => void }) => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [showOutliers, setShowOutliers] = useState(true);

    const chartData = showOutliers ? chart?.data : (chart?.data_without_outliers || chart?.data);

    const gridProps = { stroke: chartColors.grid, strokeDasharray: '3 3' };
    const axisProps = { stroke: chartColors.axis, fontSize: 11, tickLine: false, axisLine: false };
    const textStyle = { fill: chartColors.text };

    if (!chartData?.length) {
        return (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600">
                <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <span className="text-sm">No data for current filter</span>
            </div>
        );
    }

    // Currency and Rate detection
    const chartTitleLower = (chart.title || '').toLowerCase();
    const formatType = chart?.format_type;

    const forceNotMoney = ['tenure', 'age', 'duration', 'months', 'years', 'days'].some(k => chartTitleLower.includes(k));
    const isMoney = formatType === 'currency' || (!formatType && !forceNotMoney && ['revenue', 'charges', 'cost', 'price', 'amount', 'sales', 'income', 'expense', 'profit', 'dollar', 'payment']
        .some(k => chartTitleLower.includes(k)));
    const isPercent = formatType === 'percentage' || formatType === 'percent' || (!formatType && (chartTitleLower.includes('rate') || chartTitleLower.includes('%')));

    const fmtVal = (v: any): string => {
        if (typeof v !== 'number') return String(v ?? '');
        if (isMoney) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
        if (isPercent) return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
        if (formatType === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
        return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const fmtTick = (v: any) => {
        if (typeof v !== 'number') return v;
        if (isPercent) return `${v}%`;
        return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v;
    };

    // Auto-detect label key from first data row
    const firstRow = chartData[0] || {};
    const nameKey = 'name' in firstRow ? 'name'
        : Object.keys(firstRow).find(k => typeof firstRow[k] === 'string') || 'name';
    const dateKey = 'date' in firstRow ? 'date' : nameKey;

    // The column name this chart represents (for filtering)
    // Often passed by backend as chart.x_axis or chart.dimension
    const filterCol = chart.dimension || chart.x_axis || nameKey;

    const handleSliceClick = (data: any) => {
        if (!onFilterClick || !data) return;
        const val = data[nameKey] || data.name || data.x;
        if (val) onFilterClick(filterCol, String(val));
    };

    const renderOutlierToggle = () => {
        if (!chart.outliers?.count) return null;
        return (
            <div className="flex justify-end mb-2 relative z-10 w-full">
                <button
                    onClick={() => setShowOutliers(!showOutliers)}
                    className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isDark
                        ? (showOutliers ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700')
                        : (showOutliers ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100')
                        }`}
                    title={showOutliers ? "Click to exclude extreme outliers" : "Click to include extreme outliers"}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {chart.outliers.count} {showOutliers ? 'outliers included' : 'outliers excluded'}
                </button>
            </div>
        );
    };

    switch (chart.type) {
        case 'bar':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                            <defs>
                                <linearGradient id="barDark" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#BD00FF" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey={nameKey} {...axisProps} stroke={chartColors.axis} tick={{ ...textStyle }} />
                            <YAxis {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} cursor={{ fill: isDark ? 'rgba(0,240,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#barDark)" maxBarSize={40} onClick={handleSliceClick} cursor={onFilterClick ? "pointer" : "default"} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'hbar': {
            const hbarHeight = chartData.length >= 8 ? Math.min(chartData.length * 28 + 40, 300) : 192;
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={hbarHeight} debounce={50}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                            <defs>
                                <linearGradient id="hbarDark" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#818CF8" />
                                    <stop offset="100%" stopColor="#34D399" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} horizontal={false} />
                            <XAxis type="number" {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <YAxis dataKey={nameKey} type="category" {...axisProps} stroke={chartColors.axis} width={110} tick={{ ...textStyle, fontSize: 11 }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} cursor={{ fill: isDark ? 'rgba(129,140,248,0.05)' : 'rgba(0,0,0,0.05)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="url(#hbarDark)" maxBarSize={22} onClick={handleSliceClick} cursor={onFilterClick ? "pointer" : "default"} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        case 'stacked_bar':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                            <defs>
                                <linearGradient id="stackedPos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F472B6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#F472B6" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="stackedNeg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey={nameKey} {...axisProps} stroke={chartColors.axis} tick={{ ...textStyle }} />
                            <YAxis {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} cursor={{ fill: isDark ? 'rgba(0,240,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                            <Legend iconType="circle" iconSize={8}
                                formatter={(v: string) => <span className="text-xs text-gray-400">{v === 'positive' ? 'Churned' : 'Retained'}</span>} />
                            <Bar dataKey="positive" stackId="a" fill="url(#stackedPos)" maxBarSize={40} name="positive" />
                            <Bar dataKey="negative" stackId="a" fill="url(#stackedNeg)" maxBarSize={40} name="negative" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'pie':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={210} debounce={50}>
                        <PieChart>
                            <defs>
                                {chartData.map((_: any, i: number) => (
                                    <linearGradient key={`pg${i}`} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie data={chartData} cx="38%" cy="50%" outerRadius={80} innerRadius={0}
                                paddingAngle={2} dataKey="value" stroke={isDark ? '#1a1d24' : '#ffffff'}
                                strokeWidth={2} animationBegin={0} animationDuration={800}>
                                {chartData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={`url(#pieGrad${i})`}
                                        onClick={() => handleSliceClick(entry)}
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))', cursor: onFilterClick ? 'pointer' : 'default' }} />
                                ))}
                            </Pie>
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8}
                                formatter={(v: string) => {
                                    const item = chartData.find((d: any) => d.name === v);
                                    const total = chartData.reduce((s: number, d: any) => s + (d.value || 0), 0);
                                    const pct = total > 0 && item ? ((item.value / total) * 100).toFixed(0) : '0';
                                    return <span className="text-xs text-gray-400">{v.length > 12 ? v.slice(0, 12) + '…' : v} <span className="opacity-50">{pct}%</span></span>;
                                }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'donut':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={210} debounce={50}>
                        <PieChart>
                            <defs>
                                {chartData.map((_: any, i: number) => (
                                    <linearGradient key={`dg${i}`} id={`donutGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie data={chartData} cx="38%" cy="50%" innerRadius={52} outerRadius={80}
                                paddingAngle={3} dataKey="value" stroke={isDark ? '#1a1d24' : '#ffffff'}
                                strokeWidth={2} animationBegin={0} animationDuration={800}>
                                {chartData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={`url(#donutGrad${i})`}
                                        onClick={() => handleSliceClick(entry)}
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))', cursor: onFilterClick ? 'pointer' : 'default' }} />
                                ))}
                            </Pie>
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8}
                                formatter={(v: string) => {
                                    const item = chartData.find((d: any) => d.name === v);
                                    const total = chartData.reduce((s: number, d: any) => s + (d.value || 0), 0);
                                    const pct = total > 0 && item ? ((item.value / total) * 100).toFixed(0) : '0';
                                    return <span className="text-xs text-gray-400">{v.length > 12 ? v.slice(0, 12) + '…' : v} <span className="opacity-50">{pct}%</span></span>;
                                }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'line':
        case 'area':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                            <defs>
                                <linearGradient id="areaDark" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey={dateKey} {...axisProps} stroke={chartColors.axis}
                                tickFormatter={v => {
                                    const s = String(v);
                                    if (s.length > 15) return s.slice(0, 12) + '...';
                                    return s;
                                }} tick={{ ...textStyle }} />
                            <YAxis {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} />
                            <Area type="monotone" dataKey="value" stroke="#34D399" strokeWidth={2.5}
                                fill="url(#areaDark)" dot={false} activeDot={{ r: 5, fill: '#34D399', stroke: '#0d0d0d' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'stacked':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                            <defs>
                                {(chart.categories || []).map((cat: string, i: number) => (
                                    <linearGradient key={cat} id={`stackGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.4} />
                                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey={nameKey} {...axisProps} stroke={chartColors.axis} tick={{ ...textStyle }} />
                            <YAxis {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} />
                            <Legend iconType="circle" iconSize={8}
                                formatter={v => <span className="text-xs text-gray-400">{v}</span>} />
                            {(chart.categories || []).map((cat: string, i: number) => (
                                <Area key={cat} type="monotone" dataKey={cat} stackId="a"
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                    fill={`url(#stackGrad${i})`} strokeWidth={1.5} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'scatter':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <ScatterChart margin={{ top: 10, right: 15, bottom: 10, left: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis type="number" dataKey="x" {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <YAxis type="number" dataKey="y" {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} cursor={{ strokeDasharray: '3 3', stroke: chartColors.axis }} />
                            <Scatter data={chartData}>
                                {chartData.map((_: any, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.8} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'treemap': {
            const TreeCell = ({ x, y, width, height, name, index: idx }: any) => {
                const col = CHART_COLORS[Math.abs(String(name).charCodeAt(0)) % CHART_COLORS.length];
                const hov = hoveredIdx === idx;
                return (
                    <g onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => handleSliceClick({ name })}
                        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}>
                        <rect x={x} y={y} width={width} height={height} rx={4}
                            fill={col} stroke={isDark ? "#0d0d0d" : "#ffffff"} strokeWidth={2}
                            style={{ filter: hov ? 'brightness(1.2)' : 'none', transition: 'filter 0.2s' }} />
                        {width > 50 && height > 28 && (
                            <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle"
                                fill="#fff" fontSize={10} fontWeight="600" style={{ pointerEvents: 'none' }}>
                                {String(name).slice(0, 12)}
                            </text>
                        )}
                    </g>
                );
            };
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <Treemap data={chartData} dataKey="value" stroke={isDark ? "#0d0d0d" : "#ffffff"} content={<TreeCell />}>
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} valueLabel={chart.value_label} />} />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            );
        }

        case 'radar':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                        <RadarChart data={chartData.slice(0, 8)}>
                            <PolarGrid stroke={chartColors.grid} />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: chartColors.text }} />
                            <PolarRadiusAxis tick={{ fontSize: 9, fill: chartColors.axis }} />
                            <Radar dataKey="value" stroke="#818CF8" fill="#818CF8" fillOpacity={0.35} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} valueLabel={chart.value_label} />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'geo_map':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <GeoMapCard data={chartData} mapType={chart.geo_meta?.map_type ?? 'world'} chartTitle={chart.title} formatType={chart.format_type} />
                </div>
            );

        default:
            return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Unsupported chart type</div>;
    }
};

// ─── FilterDropdown (template style) ─────────────────────────────────────────

const FilterDropdown = ({
    datasets,
    selectedDatasetId,
    onDatasetChange,
}: {
    datasets: any[];
    selectedDatasetId: string;
    onDatasetChange: (id: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = datasets.find(d => d.id === selectedDatasetId);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 bg-white dark:bg-[#16181D] rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <span className="max-w-[140px] truncate">{selected?.name || 'Select Dataset'}</span>
                <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="py-1">
                        {datasets.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500">No datasets available</p>
                        ) : (
                            datasets.map(ds => (
                                <button
                                    key={ds.id}
                                    onClick={() => { onDatasetChange(ds.id); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${ds.id === selectedDatasetId
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                    <span className="truncate">{ds.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Multi-Filter Panel — slot-based, user-controlled columns ─────────────────
//
// Each of the 4 slots has TWO layers:
//   Top:    Column picker  (shows ALL available cols MINUS those used in other slots)
//   Bottom: Value picker   (multi-select checkboxes for the chosen column)
//
// This means picking a column in slot 1 removes it from slots 2/3/4's picker.

const toLabel = (col: string) =>
    col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const MultiFilterPanel = ({
    geoFilters,
    filterSlots,
    activeFilters,
    onSlotChange,
    onFilterChange,
    onClearAll,
}: {
    geoFilters: Record<string, string[]>;
    filterSlots: (string | null)[];
    activeFilters: Record<string, string[]>;
    onSlotChange: (slotIdx: number, col: string | null) => void;
    onFilterChange: (col: string, values: string[]) => void;
    onClearAll: () => void;
}) => {
    // openPicker: which slot's column-picker is open
    // openValues: which slot's value-list is open
    const [openPicker, setOpenPicker] = useState<number | null>(null);
    const [openValues, setOpenValues] = useState<number | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const allCols = Object.keys(geoFilters);
    const totalActive = Object.values(activeFilters).reduce((n, v) => n + v.length, 0);

    // Close all dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpenPicker(null);
                setOpenValues(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleValue = (col: string, val: string) => {
        const current = activeFilters[col] ?? [];
        const next = current.includes(val)
            ? current.filter(v => v !== val)
            : [...current, val];
        onFilterChange(col, next);
    };

    if (allCols.length === 0) return null;

    return (
        <div ref={panelRef} className="mb-6">
            {/* Panel card */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">

                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filters</span>
                        {totalActive > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                {totalActive} active
                            </span>
                        )}
                    </div>
                    {totalActive > 0 && (
                        <button
                            onClick={onClearAll}
                            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                {/* 4 filter slots in a grid row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {filterSlots.map((selectedCol, slotIdx) => {
                        // Columns available in THIS slot's picker =
                        // all cols minus those already pinned in OTHER slots
                        const takenByOthers = filterSlots
                            .filter((_, i) => i !== slotIdx)
                            .filter(Boolean) as string[];
                        const availableCols = allCols.filter(c => !takenByOthers.includes(c));

                        const slotValues = selectedCol ? (activeFilters[selectedCol] ?? []) : [];
                        const isPickerOpen = openPicker === slotIdx;
                        const isValuesOpen = openValues === slotIdx;

                        return (
                            <div key={slotIdx} className="flex flex-col gap-1.5">

                                {/* ── Column Picker button ── */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setOpenValues(null);
                                            setOpenPicker(isPickerOpen ? null : slotIdx);
                                        }}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${selectedCol
                                            ? 'bg-gray-50 dark:bg-[#1a1f2e] border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200'
                                            : 'bg-gray-50 dark:bg-[#1a1f2e] border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-400'
                                            }`}
                                    >
                                        <span className="truncate">
                                            {selectedCol ? toLabel(selectedCol) : `Filter ${slotIdx + 1}`}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* Unpin × */}
                                            {selectedCol && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Clear values for this column
                                                        onFilterChange(selectedCol, []);
                                                        onSlotChange(slotIdx, null);
                                                    }}
                                                    className="hover:text-red-400 transition-colors"
                                                    aria-label="Remove filter"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </span>
                                            )}
                                            <svg className={`w-3 h-3 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`}
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Column picker dropdown */}
                                    {isPickerOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                            {/* Clear slot option */}
                                            {selectedCol && (
                                                <button
                                                    onClick={() => {
                                                        onFilterChange(selectedCol, []);
                                                        onSlotChange(slotIdx, null);
                                                        setOpenPicker(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                                                >
                                                    — No filter (clear slot)
                                                </button>
                                            )}
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {availableCols.map(col => (
                                                    <button
                                                        key={col}
                                                        onClick={() => {
                                                            // Clear old column's values if switching
                                                            if (selectedCol && selectedCol !== col) {
                                                                onFilterChange(selectedCol, []);
                                                            }
                                                            onSlotChange(slotIdx, col);
                                                            setOpenPicker(null);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${col === selectedCol
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        {toLabel(col)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Value picker button (only when column is chosen) ── */}
                                {selectedCol && (
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setOpenPicker(null);
                                                setOpenValues(isValuesOpen ? null : slotIdx);
                                            }}
                                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${slotValues.length > 0
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                                                : 'bg-white dark:bg-[#0e1117] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400'
                                                }`}
                                        >
                                            <span className="truncate text-xs">
                                                {slotValues.length === 0
                                                    ? 'All values'
                                                    : slotValues.length === 1
                                                        ? slotValues[0]
                                                        : `${slotValues.length} selected`}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {slotValues.length > 0 && (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                                                        {slotValues.length}
                                                    </span>
                                                )}
                                                <svg className={`w-3 h-3 transition-transform ${isValuesOpen ? 'rotate-180' : ''}`}
                                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {/* Values dropdown */}
                                        {isValuesOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                                    <button
                                                        onClick={() => onFilterChange(selectedCol, [...geoFilters[selectedCol]])}
                                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                                                    >Select all</button>
                                                    <button
                                                        onClick={() => onFilterChange(selectedCol, [])}
                                                        className="text-xs text-gray-400 hover:text-red-400 font-medium transition-colors"
                                                    >Clear</button>
                                                </div>
                                                <div className="max-h-52 overflow-y-auto py-1">
                                                    {geoFilters[selectedCol].map(val => (
                                                        <label
                                                            key={val}
                                                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={slotValues.includes(val)}
                                                                onChange={() => toggleValue(selectedCol, val)}
                                                                className="w-3.5 h-3.5 rounded accent-blue-500"
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{val}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Correlation Heatmap ──────────────────────────────────────────────────────
// Pearson correlation matrix — diverging blue → white → red color scale

function corrColor(v: number): string {
    const t = (v + 1) / 2;
    if (t < 0.5) {
        const p = t * 2;
        return `rgba(${Math.round(59 + p * 196)},${Math.round(130 + p * 125)},246,${(0.9 - p * 0.3).toFixed(2)})`;
    }
    const p = (t - 0.5) * 2;
    return `rgba(239,${Math.round(255 - p * 187)},${Math.round(255 - p * 187)},${(0.6 + p * 0.3).toFixed(2)})`;
}

const CorrelationHeatmapCard = ({
    corr,
    loading,
    isDark
}: {
    corr: CorrelationMatrix | null;
    loading: boolean;
    isDark: boolean;
}) => {
    const [tip, setTip] = useState<{ x: number; y: number; row: string; col: string; val: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    if (loading) {
        return (
            <ChartCard title="Feature Correlation Matrix">
                <div className="h-48 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
                </div>
            </ChartCard>
        );
    }

    if (!corr || corr.n < 2) {
        return (
            <ChartCard title="Feature Correlation Matrix">
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h4" />
                    </svg>
                    <span className="text-xs">Not enough numeric columns</span>
                </div>
            </ChartCard>
        );
    }

    const n = corr.n;
    const Y_LBL = 52;
    const CELL = Math.max(16, Math.min(34, Math.floor((268 - Y_LBL) / n)));

    return (
        <ChartCard title="Feature Correlation Matrix">
            <div
                ref={ref}
                className="relative overflow-auto select-none"
                style={{ maxHeight: 220 }}
                onMouseLeave={() => setTip(null)}
            >
                {/* X-axis labels */}
                <div className="flex" style={{ marginLeft: Y_LBL, gap: 2, marginBottom: 4 }}>
                    {corr.displayLabels.map((lbl, ci) => (
                        <div
                            key={ci}
                            title={corr.labels[ci]}
                            style={{
                                width: CELL, minWidth: CELL,
                                fontSize: 8, color: isDark ? '#9CA3AF' : '#6B7280',
                                transform: 'rotate(-40deg)',
                                transformOrigin: 'bottom left',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                            }}
                        >
                            {lbl}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {corr.displayLabels.map((rowLbl, ri) => (
                    <div key={ri} className="flex items-center" style={{ gap: 2, marginBottom: 2 }}>
                        <div
                            title={corr.labels[ri]}
                            style={{
                                width: Y_LBL, minWidth: Y_LBL,
                                fontSize: 8, color: isDark ? '#9CA3AF' : '#6B7280',
                                textAlign: 'right',
                                paddingRight: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {rowLbl}
                        </div>

                        {corr.matrix[ri].map((val, ci) => {
                            const diag = ri === ci;
                            return (
                                <div
                                    key={ci}
                                    className="rounded-[2px] cursor-default flex items-center justify-center transition-opacity hover:opacity-80"
                                    style={{
                                        width: CELL, height: CELL,
                                        minWidth: CELL, minHeight: CELL,
                                        background: diag ? 'rgba(99,102,241,0.55)' : corrColor(val),
                                        outline: diag ? '1px solid rgba(129,140,248,0.5)' : undefined,
                                    }}
                                    onMouseEnter={(e) => {
                                        const el = e.currentTarget.getBoundingClientRect();
                                        const par = ref.current!.getBoundingClientRect();
                                        setTip({
                                            x: el.left - par.left + CELL / 2,
                                            y: el.top - par.top - 8,
                                            row: corr.labels[ri],
                                            col: corr.labels[ci],
                                            val,
                                        });
                                    }}
                                >
                                    {CELL >= 26 && (
                                        <span style={{ fontSize: 7, fontWeight: 700, color: Math.abs(val) > 0.55 ? '#fff' : '#9CA3AF', lineHeight: 1 }}>
                                            {diag ? '1' : val.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Tooltip */}
                {tip && (
                    <div
                        className="absolute pointer-events-none z-20 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-2xl text-xs whitespace-nowrap -translate-x-1/2 -translate-y-full transition-colors duration-300"
                        style={{
                            left: tip.x,
                            top: tip.y,
                            color: isDark ? '#F3F4F6' : '#111827'
                        }}
                    >
                        <p className="opacity-60 font-medium mb-0.5">
                            {tip.row === tip.col ? tip.row : `${tip.row} × ${tip.col}`}
                        </p>
                        <p className="font-bold" style={{ color: tip.val >= 0 ? '#F87171' : '#60A5FA' }}>
                            r = {tip.val.toFixed(3)}
                            <span className="ml-1 font-normal opacity-50">
                                ({Math.abs(tip.val) > 0.7 ? 'strong' : Math.abs(tip.val) > 0.4 ? 'moderate' : 'weak'})
                            </span>
                        </p>
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <span className="text-[9px] text-blue-400 font-semibold">-1</span>
                    <div className="h-1.5 w-16 rounded-full" style={{
                        background: 'linear-gradient(to right,rgba(59,130,246,0.9),rgba(255,255,255,0.25),rgba(239,68,68,0.9))'
                    }} />
                    <span className="text-[9px] text-red-400 font-semibold">+1</span>
                </div>
            </div>
        </ChartCard>
    );
};
// ─── Main Dashboard ───────────────────────────────────────────────────────────

/** Professional dashboard titles keyed by detected domain.
 *  Mirrors how enterprise BI tools (Tableau, Power BI, Looker) name views.
 */
const DOMAIN_TITLES: Record<string, string> = {
    sales: 'Revenue Intelligence',
    churn: 'Customer Retention Analytics',
    marketing: 'Campaign Performance',
    finance: 'Financial Overview',
    healthcare: 'Clinical Operations',
    generic: 'Analytics Overview',
};

function getDashboardTitle(domain: string | undefined): string {
    if (!domain) return 'Analytics Overview';
    return DOMAIN_TITLES[domain.toLowerCase()] ?? 'Analytics Overview';
}

export default function UserDashboard() {
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Only for full data loads (Dataset/Domain/Classification)
    const [isKPILoading, setIsKPILoading] = useState(false); // Only for background KPI refreshes (Filters)
    const [error, setError] = useState<string | null>(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState('');
    const [datasets, setDatasets] = useState<any[]>([]);

    // Zustand Store for Filters
    const {
        active_filters,
        clearFilters,
        setFilterValues,
        toggleFilter,
        chart_overrides,
        setChartOverride,
        classification_overrides,
        selected_domain,
        setDomain,
        chartData,
        setDashboardData,
        target_value,
        setTargetValue
    } = useFilterStore();

    // filterSlots: 4 slots, each holds the column name assigned by the user (null = unassigned)
    const [filterSlots, setFilterSlots] = useState<(string | null)[]>([null, null, null, null]);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Dynamic Chart Colors
    const chartColors = {
        grid: isDark ? '#1F2937' : '#E5E7EB',
        axis: isDark ? '#9CA3AF' : '#6B7280',
        text: isDark ? '#D1D5DB' : '#374151',
        tooltip: {
            bg: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '#374151' : '#E5E7EB',
            text: isDark ? '#F3F4F6' : '#111827'
        }
    };

    const [corrMatrix, setCorrMatrix] = useState<CorrelationMatrix | null>(null);
    const [corrLoading, setCorrLoading] = useState(false);

    useEffect(() => { loadDatasets(); }, []);

    // Reset slots + filters when dataset changes
    useEffect(() => {
        setFilterSlots([null, null, null, null]);
        clearFilters();
    }, [selectedDatasetId]);

    // Auto-seed slots on first analytics load for this dataset
    useEffect(() => {
        if (!analytics?.geo_filters || !analytics?.columns?.dimensions) return;
        const alreadySeeded = filterSlots.some(s => s !== null);
        if (alreadySeeded) return;

        // Correct priority for filter slot seeding:
        // 1. Domain-priority dimensions (contract_type, region, segment)
        // 2. Low-to-medium cardinality dimensions (2-20 unique values)
        // 3. EXCLUDE identifiers or high-cardinality (>20 unique values)
        const DOMAIN_PRIORITY = ['contract', 'segment', 'category', 'region', 'type', 'status', 'gender'];

        const dimMetadata = Object.keys(analytics.geo_filters).map(col => ({
            col,
            isPriority: DOMAIN_PRIORITY.some(p => col.toLowerCase().includes(p)),
            cardinality: analytics.geo_filters![col].length
        }));

        const filtered = dimMetadata.filter(d =>
            d.cardinality >= 2 && d.cardinality <= 20 // Guard against high cardinality
        );

        const sorted = [
            ...filtered.filter(d => d.isPriority).sort((a, b) => a.cardinality - b.cardinality),
            ...filtered.filter(d => !d.isPriority).sort((a, b) => a.cardinality - b.cardinality),
        ];

        const finalCols = sorted.map(s => s.col);

        // Seed up to 4 slots with top columns
        setFilterSlots(prev => prev.map((_, i) => finalCols[i] ?? null));
    }, [analytics]);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounce the analytics load
    useEffect(() => {
        if (!selectedDatasetId) return;

        // 1. Instantly recompute correlation matrix in background if dataset changed
        // (Moved from separate useEffect for cleaner logic)

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timer = setTimeout(() => {
            loadAnalytics(controller.signal);
        }, 400);

        return () => {
            clearTimeout(timer);
        };
    }, [selectedDatasetId, target_value, classification_overrides, selected_domain, active_filters, chart_overrides]);

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
            if (data.length > 0) {
                setSelectedDatasetId(data[0].id);
            }
            // If no datasets, ensure loading is false so empty state shows
        } catch {
            setError('Failed to load datasets');
        }
    };

    const loadAnalytics = async (signal?: AbortSignal) => {
        try {
            // If we have rawData already, this is a background KPI refresh
            const isKPIOnly = !!useFilterStore.getState().rawData;

            if (isKPIOnly) setIsKPILoading(true);
            else setIsLoading(true);

            setError(null);
            const data = await analyticsService.getDashboardAnalytics(
                selectedDatasetId,
                target_value,
                active_filters,
                chart_overrides,
                classification_overrides,
                selected_domain,
                signal
            );
            setAnalytics(data);
            if (data.raw_data && data.chart_configs) {
                console.log(`[Hybrid Engine] Received ${data.raw_data.length} rows for local recomputation. Target: ${data.target_column}`);
                const initial: Record<string, any> = {};
                if (data.charts) {
                    Object.entries(data.charts).forEach(([key, chart]: [string, any]) => {
                        initial[key] = chart.data;
                    });
                }
                setDashboardData(data.raw_data, data.chart_configs, initial, data.total_rows, data.target_column);
            } else {
                console.warn('[Hybrid Engine] Missing raw_data or chart_configs. Local filtering disabled.');
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.response?.data?.detail || 'Failed to load analytics');
        } finally {
            setIsLoading(false);
            setIsKPILoading(false);
        }
    };

    // Fetch correlation matrix whenever dataset changes
    useEffect(() => {
        if (!selectedDatasetId) return;
        setCorrLoading(true);
        setCorrMatrix(null);
        correlationService.getMatrix(selectedDatasetId)
            .then(m => setCorrMatrix(m))
            .catch(() => setCorrMatrix(null))
            .finally(() => setCorrLoading(false));
    }, [selectedDatasetId]);

    const formatValue = (value: any, format = 'number') => {
        if (format === 'text') return String(value);
        if (format === 'percent' || format === 'percentage') return `${value}%`;
        if (format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
        return new Intl.NumberFormat('en-US').format(value);
    };

    const kpiEntries = analytics?.kpis ? Object.entries(analytics.kpis) : [];
    const chartArrayRaw = analytics?.charts ? Object.entries(analytics.charts).map(([id, val]) => ({
        id,
        ...(val as any),
        data: chartData?.[id] || (val as any).data,
        data_without_outliers: chartData?.[id] || (val as any).data_without_outliers
    })) : [];

    // Sort: regular charts first, tall hbar charts last so they don't break grid row alignment
    const chartArray = [...chartArrayRaw].sort((a: any, b: any) => {
        const typeA = chart_overrides[a.id]?.type || a.type;
        const typeB = chart_overrides[b.id]?.type || b.type;
        const aIsHbar = typeA === 'hbar' && a.data?.length >= 8 ? 1 : 0;
        const bIsHbar = typeB === 'hbar' && b.data?.length >= 8 ? 1 : 0;
        return aIsHbar - bIsHbar;
    });

    const renderChartActions = (chart: any) => {
        const currentType = chart_overrides[chart.id]?.type || chart.type;
        const currentAgg = (chart_overrides[chart.id]?.aggregation || chart.aggregation || 'sum').toLowerCase();

        const isNumericMetric = chart.value_label?.toLowerCase()?.includes('count') === false &&
            currentAgg !== 'count';

        return (
            <div className="flex items-center gap-1.5">
                {isNumericMetric && (
                    <select
                        value={currentAgg === 'avg' ? 'mean' : currentAgg}
                        onChange={(e) => setChartOverride(chart.id, { aggregation: e.target.value })}
                        className={`text-[10px] px-1 py-0.5 rounded border outline-none transition-colors ${isDark
                            ? 'bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600 focus:border-indigo-500'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 focus:border-indigo-400'
                            }`}
                        title="Aggregation Method"
                    >
                        <option value="sum">Sum</option>
                        <option value="mean">Average</option>
                    </select>
                )}
                <select
                    value={currentType}
                    onChange={(e) => setChartOverride(chart.id, { type: e.target.value })}
                    className={`text-[10px] px-1 py-0.5 rounded border outline-none transition-colors ${isDark
                        ? 'bg-gray-800/80 border-gray-700 text-gray-300 hover:border-gray-600 focus:border-blue-500'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 focus:border-blue-400'
                        }`}
                    title="Chart Type"
                >
                    <option value="bar">Bar</option>
                    <option value="hbar">H-Bar</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                    <option value="pie">Pie</option>
                    <option value="donut">Donut</option>
                    <option value="scatter">Scatter</option>
                    <option value="treemap">Treemap</option>
                    <option value="radar">Radar</option>
                </select>
            </div>
        );
    };

    return (
        <div id="dashboard-root" className="h-full">
            <div className="bg-gray-50 dark:bg-[#0a0f1c] text-gray-800 dark:text-gray-200 font-sans antialiased flex flex-col transition-colors duration-300">

                {/* ── Header ── */}
                <header className="flex justify-between items-center px-6 lg:px-8 py-5 sticky top-0 z-20 bg-white/90 dark:bg-[#0a0f1c]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {getDashboardTitle(analytics?.domain)}
                    </h1>

                    <div className="flex items-center gap-3">
                        {/* Dataset Filter Dropdown */}
                        <FilterDropdown
                            datasets={datasets}
                            selectedDatasetId={selectedDatasetId}
                            onDatasetChange={setSelectedDatasetId}
                        />

                        {/* Refresh */}
                        <button
                            onClick={() => loadAnalytics()}
                            disabled={isLoading}
                            className="p-2.5 rounded-lg bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50"
                            title="Refresh data"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        {/* Settings */}
                        <SettingsDropdown />

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                            V
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8">

                    {/* ── Dataset Info Strip ── */}
                    {analytics && (
                        <div className="flex items-center gap-3 mb-6 text-xs text-gray-500 dark:text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{analytics.dataset_name}</span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span>{analytics.total_rows.toLocaleString()} rows</span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                                <span className="opacity-70">Domain:</span>
                                <select
                                    value={selected_domain || 'auto'}
                                    onChange={(e) => setDomain(e.target.value === 'auto' ? null : e.target.value)}
                                    className="bg-transparent border-none outline-none text-blue-800 dark:text-blue-300 font-bold cursor-pointer capitalize"
                                >
                                    <option value="auto">Auto ({analytics.domain})</option>
                                    <option value="sales">Sales</option>
                                    <option value="churn">Churn</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="finance">Finance</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="generic">Generic</option>
                                </select>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${analytics.domain_confidence === 'HIGH' ? 'bg-green-500/10 text-green-500' :
                                analytics.domain_confidence === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-red-500/10 text-red-500'
                                }`}>
                                {analytics.domain_confidence} Confidence
                            </span>
                        </div>
                    )}

                    {/* ── Target Filter Tabs ── */}
                    {analytics?.target_values && analytics.target_values.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            <button
                                onClick={() => setTargetValue('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${target_value === 'all'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-[#16181D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
                            >
                                All {analytics.target_column?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                            {analytics.target_values.map(val => (
                                <button
                                    key={val}
                                    onClick={() => setTargetValue(val)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${target_value === val
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : 'bg-white dark:bg-[#16181D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
                                >
                                    {val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Multi-Filter Panel ── */}
                    {analytics?.geo_filters && Object.keys(analytics.geo_filters).length > 0 && (
                        <MultiFilterPanel
                            geoFilters={analytics.geo_filters}
                            filterSlots={filterSlots}
                            activeFilters={active_filters}
                            onSlotChange={(slotIdx, col) =>
                                setFilterSlots(prev => prev.map((s, i) => i === slotIdx ? col : s))
                            }
                            onFilterChange={(col, values) => setFilterValues(col, values)}
                            onClearAll={() => clearFilters()}
                        />
                    )}

                    {/* ── No Dataset Selected ── */}
                    {!selectedDatasetId && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-[420px] text-center select-none">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#1C1F26] border border-gray-200 dark:border-gray-700/60 flex items-center justify-center shadow-sm">
                                    <svg className="w-9 h-9 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 11h6M9 14h4" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400/90 flex items-center justify-center shadow">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v4m0 4h.01" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">No Dataset Loaded</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">
                                Select a dataset using the <span className="font-medium text-gray-600 dark:text-gray-400">Select Dataset</span> button above, or upload one to get started.
                            </p>
                        </div>
                    )}

                    {/* ── Loading ── */}
                    {isLoading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading analytics…</p>
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {!isLoading && error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4">
                            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-300">Error Loading Analytics</h3>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Empty State ── */}
                    {!isLoading && !error && !analytics && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Data Yet</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Upload a dataset to see your analytics</p>
                        </div>
                    )}

                    {/* ── Main Content ── */}
                    {!isLoading && !error && analytics && (
                        <>
                            {/* Column Classification Override UI */}
                            {analytics.columns && (
                                <ColumnClassificationPanel columns={analytics.columns} isDark={isDark} />
                            )}

                            {/* KPI Grid — Dynamic Columns */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-7">
                                {kpiEntries.map(([key, kpi], i) => (
                                    <KPICard
                                        key={key}
                                        title={kpi.title}
                                        value={isKPILoading ? "..." : formatValue(kpi.value, kpi.format)}
                                        icon={kpi.icon || 'default'}
                                        index={i}
                                        trend={kpi.trend}
                                        trend_label={kpi.trend_label}
                                        subtitle={(Object.values(active_filters).some(f => f.length > 0) || target_value !== 'all') ? "Filtered View" : kpi.subtitle}
                                    />
                                ))}
                            </div>

                            {/* Chart Row 1 — 3 columns */}
                            {chartArray.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                                    {chartArray.slice(0, 3).map((chart) => (
                                        <ChartCard key={chart.id} title={chart.title || `Insight ${chart.id}`} actions={renderChartActions(chart)}>
                                            <ChartRenderer
                                                chart={{ ...chart, type: chart_overrides[chart.id]?.type || chart.type }}
                                                chartColors={chartColors}
                                                isDark={isDark}
                                                onFilterClick={(col, val) => toggleFilter(col, val)}
                                            />
                                        </ChartCard>
                                    ))}
                                </div>
                            )}

                            {/* Chart Row 2 — 3 columns */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* Correlation heatmap */}
                                <CorrelationHeatmapCard corr={corrMatrix} loading={corrLoading} isDark={isDark} />

                                {/* Remaining charts */}
                                {chartArray.slice(3).map((chart) => (
                                    <ChartCard key={chart.id} title={chart.title || `Insight ${chart.id}`} actions={renderChartActions(chart)}>
                                        <ChartRenderer
                                            chart={{ ...chart, type: chart_overrides[chart.id]?.type || chart.type }}
                                            chartColors={chartColors}
                                            isDark={isDark}
                                            onFilterClick={(col, val) => toggleFilter(col, val)}
                                        />
                                    </ChartCard>
                                ))}

                                {/* Pad to 3 columns if fewer than 2 extra charts */}
                                {chartArray.length < 4 && (
                                    <ChartCard title={chartArray[1]?.title ?? 'Additional Insights'}>
                                        <div className="h-48 flex items-center justify-center">
                                            <p className="text-sm text-gray-400 dark:text-gray-600">Not enough chart types detected</p>
                                        </div>
                                    </ChartCard>
                                )}
                                {chartArray.length < 5 && (
                                    <ChartCard title={chartArray[2]?.title ?? 'More Insights'}>
                                        <div className="h-48 flex items-center justify-center">
                                            <p className="text-sm text-gray-400 dark:text-gray-600">Not enough chart types detected</p>
                                        </div>
                                    </ChartCard>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
