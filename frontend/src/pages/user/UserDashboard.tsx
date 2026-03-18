import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { datasetService } from '../../lib/api/dataset';
import { analyticsService, correlationService, narrativeService, type DashboardAnalytics, type CorrelationMatrix } from '../../lib/api/dashboard';
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

type CachedEntry<T> = {
    value: T;
    createdAt: number;
};

const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;
const DASHBOARD_SESSION_CACHE_KEY = 'vizzy.dashboard.analyticsCache.v1';

class BoundedCache<T> {
    private map = new Map<string, CachedEntry<T>>();
    private readonly maxEntries: number;

    constructor(maxEntries: number) {
        this.maxEntries = maxEntries;
    }

    get(key: string): CachedEntry<T> | undefined {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        // Touch for LRU behavior
        this.map.delete(key);
        this.map.set(key, entry);
        return entry;
    }

    set(key: string, value: T): void {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, { value, createdAt: Date.now() });

        if (this.map.size > this.maxEntries) {
            const oldestKey = this.map.keys().next().value;
            if (oldestKey !== undefined) {
                this.map.delete(oldestKey);
            }
        }
    }

    clear(): void {
        this.map.clear();
    }
}

type DashboardCacheBundle = {
    analytics: BoundedCache<DashboardAnalytics>;
    correlation: BoundedCache<CorrelationMatrix>;
    narrative: BoundedCache<string>;
};

const createDashboardCacheBundle = (): DashboardCacheBundle => ({
    analytics: new BoundedCache<DashboardAnalytics>(30),
    correlation: new BoundedCache<CorrelationMatrix>(10),
    narrative: new BoundedCache<string>(30),
});

// Keep dashboard caches alive across route switches (Dashboard <-> Chat) within the same browser session.
let sharedDashboardCacheBundle: DashboardCacheBundle | null = null;

const getDashboardCacheBundle = (): DashboardCacheBundle => {
    if (!sharedDashboardCacheBundle) {
        sharedDashboardCacheBundle = createDashboardCacheBundle();
    }
    return sharedDashboardCacheBundle;
};

const stableSerialize = (value: unknown): string => {
    const seen = new WeakSet<object>();

    const normalize = (input: any): any => {
        if (input === undefined) return { __type: 'undefined' };
        if (typeof input === 'bigint') return { __type: 'bigint', value: input.toString() };
        if (typeof input === 'symbol') return { __type: 'symbol', value: String(input) };
        if (input instanceof Date) return { __type: 'date', value: input.toISOString() };

        if (Array.isArray(input)) {
            return input.map((item) => normalize(item));
        }

        if (input && typeof input === 'object') {
            if (seen.has(input)) return { __type: 'circular' };
            seen.add(input);
            const out: Record<string, any> = {};
            for (const key of Object.keys(input).sort()) {
                out[key] = normalize(input[key]);
            }
            return out;
        }

        return input;
    };

    return JSON.stringify(normalize(value));
};

const isFresh = (createdAt: number) => Date.now() - createdAt < DASHBOARD_CACHE_TTL_MS;

type SessionAnalyticsCacheEntry = {
    createdAt: number;
    value: DashboardAnalytics;
};

const getSessionAnalyticsCache = (): Record<string, SessionAnalyticsCacheEntry> => {
    try {
        const raw = sessionStorage.getItem(DASHBOARD_SESSION_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const getSessionCachedAnalytics = (cacheKey: string): DashboardAnalytics | null => {
    const all = getSessionAnalyticsCache();
    const entry = all[cacheKey];
    if (!entry || !entry.createdAt || !entry.value) return null;
    return isFresh(entry.createdAt) ? entry.value : null;
};

const setSessionCachedAnalytics = (cacheKey: string, value: DashboardAnalytics) => {
    try {
        const all = getSessionAnalyticsCache();
        all[cacheKey] = {
            createdAt: Date.now(),
            value,
        };

        // Bound stored keys to avoid unbounded session growth.
        const entries = Object.entries(all).sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));
        const trimmed = Object.fromEntries(entries.slice(0, 25));
        sessionStorage.setItem(DASHBOARD_SESSION_CACHE_KEY, JSON.stringify(trimmed));
    } catch {
        // Best-effort cache only.
    }
};

// ─── Color Palettes ──────────────────────────────────────────────────────────

const KPI_COLORS = [
    {
        border: 'dark:border-[#ff6933]/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(255,105,51,0.2)]',
        iconGrad: 'from-[#ff6b35] to-[#ff6933]',
        iconShadow: 'shadow-[#ff6933]/30',
        arc: 'bg-[#ff6933]/5 dark:bg-[#ff6933]/10',
    },
    {
        border: 'dark:border-[#ff8f66]/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(255,143,102,0.2)]',
        iconGrad: 'from-[#ff9f7a] to-[#ff8f66]',
        iconShadow: 'shadow-[#ff8f66]/30',
        arc: 'bg-[#ff8f66]/5 dark:bg-[#ff8f66]/10',
    },
    {
        border: 'dark:border-[#cc5429]/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(204,84,41,0.2)]',
        iconGrad: 'from-[#e06536] to-[#cc5429]',
        iconShadow: 'shadow-[#cc5429]/30',
        arc: 'bg-[#cc5429]/5 dark:bg-[#cc5429]/10',
    },
    {
        border: 'dark:border-[#ffa885]/30',
        shadow: 'dark:shadow-[0_0_15px_rgba(255,168,133,0.2)]',
        iconGrad: 'from-[#ffb899] to-[#ffa885]',
        iconShadow: 'shadow-[#ffa885]/30',
        arc: 'bg-[#ffa885]/5 dark:bg-[#ffa885]/10',
    },
];

const CHART_COLORS = [
    '#ff6933', // Primary orange (Medium)
    '#ffcfb3', // Very Light orange
    '#8c2d04', // Very Dark orange
    '#ff9e66', // Light orange
    '#cc4c18', // Dark orange
    '#ffe6d9', // Palest orange
    '#e6550d', // Bright medium-dark orange
    '#591a02', // Extremely dark orange
    '#fd8d3c', // Yellow-orange
    '#a63603', // Deep rust
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

const ThemedTooltip = ({ active, payload, label, formatter, chartTitle, valueLabel, formatType }: any) => {
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
            <div className="rounded-sm px-4 py-3 border border-border-main backdrop-blur-md min-w-[160px] bg-bg-card/95 dark:bg-black/95 shadow-xl text-themed-main font-serif tracking-wide z-[9999]">
                {chartTitle && <p className="text-[10px] uppercase font-bold tracking-widest mb-2 pb-2 border-b border-border-main opacity-70 leading-tight">{chartTitle}</p>}
                {fp.label && <p className="text-[10px] opacity-60 mb-2 pb-2 border-b border-border-main font-bold uppercase tracking-widest">{fp.label}</p>}
                <div className="space-y-1.5">
                    <p className="text-sm flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-sm bg-[#ff6933] inline-block" /><span className="opacity-70 text-[10px] tracking-widest uppercase">{fp.xLabel}:</span></span>
                        <span className="font-bold text-primary">{fmtS(fp.x, fp.xLabel)}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-sm bg-[#cc5429] inline-block" /><span className="opacity-70 text-[10px] tracking-widest uppercase">{fp.yLabel}:</span></span>
                        <span className="font-bold text-primary">{fmtS(fp.y, fp.yLabel)}</span>
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
        <div className="rounded-sm px-4 py-3 border border-border-main backdrop-blur-md min-w-[160px] bg-bg-card/95 dark:bg-black/95 shadow-xl text-themed-main font-mono z-[9999]">
            {chartTitle && <p className="text-[10px] uppercase font-bold tracking-widest mb-2 pb-2 border-b border-border-main opacity-70 leading-tight">{chartTitle}</p>}

            {displayLabel && (
                <div className="mb-2">
                    <p className="text-[10px] opacity-50 uppercase tracking-widest mb-0.5">{dimensionName}</p>
                    <p className="text-sm font-bold truncate max-w-[200px] text-primary">{displayLabel}</p>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {displayPayload.map((p: any, i: number) => {
                    return (
                        <div key={i} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-sm inline-block shadow-[0_0_5px_currentColor]" style={{ background: p.color || p.fill || '#ff6933' }} />
                                <span className="text-[10px] tracking-widest uppercase opacity-70 whitespace-nowrap">{p.name}:</span>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-themed-main group-hover:text-primary transition-colors">
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
    const colorClass = isNeutral ? 'text-themed-muted bg-gray-100 dark:bg-gray-800' :
        (isPositive && !reverseLogic) || (isNegative && reverseLogic) ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' :
            'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10';


    return (
        <div className={`obsidian-card p-5 rounded-sm relative overflow-hidden group flex flex-col justify-between hover:shadow-[0_0_20px_rgba(255,105,51,0.2)] transition-shadow duration-300 ${c.border.replace('dark:', '')}`}>
            {/* Decorative arc */}
            <div className={`absolute top-0 right-0 w-16 h-16 ${c.arc} rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110`} />

            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconGrad} flex items-center justify-center text-themed-main mb-3 shadow-lg ${c.iconShadow}`}>
                {iconEl}
            </div>

            <div className="flex flex-col gap-1 z-10">
                <p className="font-serif text-xs text-themed-muted tracking-wide">{title}</p>
                <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-3xl font-light text-themed-main tracking-tight">{value}</h3>

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
                    <p className="text-[10px] text-themed-muted font-medium text-right mt-0.5">{trend_label}</p>
                )}

                {subtitle && (
                    <p className="text-[10px] text-themed-muted dark:text-themed-muted font-medium mt-1.5 flex items-center gap-1">
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
    <div className={`glass-panel p-6 rounded-sm relative group transition-colors duration-300 h-full flex flex-col ${className || ''}`}>
        <div className="flex justify-between items-start mb-5 flex-shrink-0">
            <h3 className="font-serif text-[18px] tracking-wide text-primary border-l-2 border-primary pl-3">{title}</h3>
            {actions ? (
                <div className="relative z-10">{actions}</div>
            ) : (
                <button className="text-themed-muted hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-themed-muted dark:text-gray-600">
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

        // Recharts emits different click payload shapes by chart type.
        const payload = data?.payload || data;
        const val = payload?.[nameKey]
            ?? payload?.name
            ?? payload?.date
            ?? payload?.x
            ?? data?.activeLabel
            ?? data?.label
            ?? data?.name;

        if (val === undefined || val === null || val === '') return;
        onFilterClick(filterCol, String(val));
    };

    const renderOutlierToggle = () => {
        if (!chart.outliers?.count) return null;
        return (
            <div className="flex justify-end mb-2 relative z-10 w-full">
                <button
                    onClick={() => setShowOutliers(!showOutliers)}
                    className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isDark
                        ? (showOutliers ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-gray-800 border-border-main text-themed-muted hover:bg-gray-700')
                        : (showOutliers ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 border-gray-200 text-themed-muted hover:bg-gray-100')
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
                                    <stop offset="0%" stopColor="#ff8f66" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#ff6933" stopOpacity={0.7} />
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
                                    <stop offset="0%" stopColor="#ff8f66" />
                                    <stop offset="100%" stopColor="#cc5429" />
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
                                    <stop offset="0%" stopColor="#ff6933" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#ff6933" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="stackedNeg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#cc5429" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#cc5429" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey={nameKey} {...axisProps} stroke={chartColors.axis} tick={{ ...textStyle }} />
                            <YAxis {...axisProps} stroke={chartColors.axis} tickFormatter={fmtTick} tick={{ ...textStyle }} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} chartTitle={chart.title} valueLabel={chart.value_label} formatType={chart.format_type} />} cursor={{ fill: isDark ? 'rgba(0,240,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                            <Legend iconType="circle" iconSize={8}
                                formatter={(v: string) => <span className="text-xs text-themed-muted">{v === 'positive' ? 'Churned' : 'Retained'}</span>} />
                            <Bar dataKey="positive" stackId="a" fill="url(#stackedPos)" maxBarSize={40} name="positive" onClick={handleSliceClick} cursor={onFilterClick ? 'pointer' : 'default'} />
                            <Bar dataKey="negative" stackId="a" fill="url(#stackedNeg)" maxBarSize={40} name="negative" onClick={handleSliceClick} cursor={onFilterClick ? 'pointer' : 'default'} />
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
                                    return <span className="text-xs text-themed-muted">{v.length > 12 ? v.slice(0, 12) + '…' : v} <span className="opacity-50">{pct}%</span></span>;
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
                                    return <span className="text-xs text-themed-muted">{v.length > 12 ? v.slice(0, 12) + '…' : v} <span className="opacity-50">{pct}%</span></span>;
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
                                    <stop offset="0%" stopColor="#ff8f66" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#ff8f66" stopOpacity={0.02} />
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
                            <Area type="monotone" dataKey="value" stroke="#ff8f66" strokeWidth={2.5}
                                fill="url(#areaDark)" dot={false}
                                activeDot={{ r: 5, fill: '#ff8f66', stroke: '#111111', onClick: (e: any) => handleSliceClick(e?.payload || e) }}
                                onClick={handleSliceClick}
                                cursor={onFilterClick ? 'pointer' : 'default'} />
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
                                formatter={v => <span className="text-xs text-themed-muted">{v}</span>} />
                            {(chart.categories || []).map((cat: string, i: number) => (
                                <Area key={cat} type="monotone" dataKey={cat} stackId="a"
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                    fill={`url(#stackGrad${i})`} strokeWidth={1.5}
                                    onClick={handleSliceClick}
                                    cursor={onFilterClick ? 'pointer' : 'default'} />
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
                            <Radar dataKey="value" stroke="#ff6933" fill="#ff6933" fillOpacity={0.35} onClick={handleSliceClick} cursor={onFilterClick ? 'pointer' : 'default'} />
                            <Tooltip content={<ThemedTooltip formatter={fmtVal} chartColors={chartColors} valueLabel={chart.value_label} />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            );

        case 'geo_map':
            return (
                <div className="flex flex-col h-full w-full">
                    {renderOutlierToggle()}
                    <GeoMapCard data={chartData} mapType={chart.geo_meta?.map_type ?? 'world'} chartTitle={chart.title} formatType={chart.format_type} isDark={isDark} />
                </div>
            );

        default:
            return <div className="h-48 flex items-center justify-center text-themed-muted text-sm">Unsupported chart type</div>;
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
                className="flex items-center gap-2 obsidian-card rounded-sm px-4 py-2.5 shadow-sm text-[15px] font-serif tracking-wide text-themed-main hover:border-primary/50 transition-colors focus:outline-none"
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
                <div className="absolute right-0 top-full mt-2 w-56 obsidian-card rounded-sm shadow-2xl z-50 overflow-hidden font-serif">
                    <div className="py-1">
                        {datasets.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-themed-muted">No datasets available</p>
                        ) : (
                            datasets.map(ds => (
                                <button
                                    key={ds.id}
                                    onClick={() => { onDatasetChange(ds.id); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs uppercase tracking-widest transition-colors flex items-center gap-2 ${ds.id === selectedDatasetId
                                        ? 'bg-primary/10 text-primary font-bold'
                                        : 'text-themed-muted hover:bg-bg-hover hover:text-themed-main'}`}
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
        <div ref={panelRef} className="mb-6 relative z-30">
            {/* Panel card */}
            <div className="glass-panel rounded-sm shadow-sm p-4">

                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-themed-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span className="text-sm font-serif tracking-wide text-themed-muted uppercase">Filters</span>
                        {totalActive > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm bg-primary text-black text-[11px] font-bold">
                                {totalActive} active
                            </span>
                        )}
                    </div>
                    {totalActive > 0 && (
                        <button
                            onClick={onClearAll}
                            className="text-xs text-themed-muted hover:text-red-400 transition-colors"
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
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm text-[15px] font-serif border transition-all ${selectedCol
                                            ? 'bg-bg-card border-white/20 text-themed-main'
                                            : 'bg-bg-card border-dashed border-border-main text-themed-muted hover:border-primary/50'
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
                                        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-bg-card rounded-sm shadow-2xl z-50 overflow-hidden">
                                            {/* Clear slot option */}
                                            {selectedCol && (
                                                <button
                                                    onClick={() => {
                                                        onFilterChange(selectedCol, []);
                                                        onSlotChange(slotIdx, null);
                                                        setOpenPicker(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[13px] font-serif text-themed-muted hover:text-red-400 hover:bg-bg-hover transition-colors border-b border-border-main"
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
                                                        className={`w-full text-left px-3 py-2 text-[14px] font-serif transition-colors ${col === selectedCol
                                                            ? 'bg-primary/10 text-primary font-medium'
                                                            : 'text-themed-main hover:bg-bg-hover'
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
                                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm text-[14px] font-serif border transition-all ${slotValues.length > 0
                                                ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                                                : 'bg-bg-card border-border-main text-themed-muted hover:border-primary/50'
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
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-black text-[9px] font-bold">
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
                                            <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-bg-card border border-border-main rounded-sm shadow-2xl z-50 overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-main bg-bg-card/50 backdrop-blur-sm">
                                                    <button
                                                        onClick={() => onFilterChange(selectedCol, [...geoFilters[selectedCol]])}
                                                        className="text-[12px] uppercase tracking-wider font-serif text-primary hover:text-primary/80 font-bold transition-colors"
                                                    >Select all</button>
                                                    <button
                                                        onClick={() => onFilterChange(selectedCol, [])}
                                                        className="text-[12px] uppercase tracking-wider font-serif text-themed-muted hover:text-red-400 font-bold transition-colors"
                                                    >Clear</button>
                                                </div>
                                                <div className="max-h-52 overflow-y-auto py-1">
                                                    {geoFilters[selectedCol].map(val => (
                                                        <label
                                                            key={val}
                                                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg-hover cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={slotValues.includes(val)}
                                                                onChange={() => toggleValue(selectedCol, val)}
                                                                className="w-3.5 h-3.5 rounded accent-[#ff6933]"
                                                            />
                                                            <span className="text-[14px] font-serif text-themed-main truncate">{val}</span>
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
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-themed-muted">
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
                        className="absolute pointer-events-none z-20 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-border-main rounded-lg px-3 py-2 shadow-2xl text-xs whitespace-nowrap -translate-x-1/2 -translate-y-full transition-colors duration-300"
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
    const cacheRef = useRef<DashboardCacheBundle>(getDashboardCacheBundle());
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Only for full data loads (Dataset/Domain/Classification)
    const [isKPILoading, setIsKPILoading] = useState(false); // Only for background KPI refreshes (Filters)
    const [error, setError] = useState<string | null>(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState(() => sessionStorage.getItem('vizzy.dashboard.selectedDatasetId') || '');
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

    // Narrative insight state
    const [narrative, setNarrative] = useState<string | null>(null);
    const [narrativeLoading, setNarrativeLoading] = useState(false);
    const [dataQualityOpen, setDataQualityOpen] = useState(false);

    const previousDatasetIdRef = useRef<string>('');

    const normalizedActiveFilters = useMemo(
        () => Object.fromEntries(
            Object.entries(active_filters || {}).filter(([, vals]) => Array.isArray(vals) && vals.length > 0)
        ),
        [active_filters]
    );

    useEffect(() => { loadDatasets(); }, []);

    useEffect(() => {
        if (selectedDatasetId) {
            sessionStorage.setItem('vizzy.dashboard.selectedDatasetId', selectedDatasetId);
        }
    }, [selectedDatasetId]);

    useEffect(() => {
        const prev = previousDatasetIdRef.current;
        if (prev && prev !== selectedDatasetId) {
            // Recreate caches on dataset switches to avoid stale cross-dataset payloads.
            cacheRef.current = createDashboardCacheBundle();
        }
        previousDatasetIdRef.current = selectedDatasetId;
    }, [selectedDatasetId]);

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
    const kpiAbortControllerRef = useRef<AbortController | null>(null);

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
    }, [selectedDatasetId, target_value, classification_overrides, selected_domain]);

    const buildDashboardCacheKey = () => {
        return stableSerialize({
            datasetId: selectedDatasetId,
            targetValue: target_value || 'all',
            selectedDomain: selected_domain || 'auto',
            filters: normalizedActiveFilters,
            classificationOverrides: classification_overrides || {},
        });
    };

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
            if (data.length > 0) {
                const retained = sessionStorage.getItem('vizzy.dashboard.selectedDatasetId') || selectedDatasetId;
                const hasRetainedDataset = !!retained && data.some((d: any) => d.id === retained);
                setSelectedDatasetId(hasRetainedDataset ? retained : data[0].id);
            }
            // If no datasets, ensure loading is false so empty state shows
        } catch {
            setError('Failed to load datasets');
        }
    };

    const loadAnalytics = async (signal?: AbortSignal, forceRefresh = false) => {
        try {
            const cacheKey = buildDashboardCacheKey();
            const cached = cacheRef.current.analytics.get(cacheKey);
            if (!forceRefresh && cached && isFresh(cached.createdAt)) {
                const cachedData = cached.value;
                setAnalytics(cachedData);
                if (cachedData.raw_data && cachedData.chart_configs) {
                    const initial: Record<string, any> = {};
                    if (cachedData.charts) {
                        Object.entries(cachedData.charts).forEach(([key, chart]: [string, any]) => {
                            initial[key] = chart.data;
                        });
                    }
                    setDashboardData(cachedData.raw_data, cachedData.chart_configs, initial, cachedData.total_rows, cachedData.target_column);
                }
                return;
            }

            if (!forceRefresh) {
                const sessionCached = getSessionCachedAnalytics(cacheKey);
                if (sessionCached) {
                    setAnalytics(sessionCached);
                    cacheRef.current.analytics.set(cacheKey, sessionCached);
                    if (sessionCached.raw_data && sessionCached.chart_configs) {
                        const initial: Record<string, any> = {};
                        if (sessionCached.charts) {
                            Object.entries(sessionCached.charts).forEach(([key, chart]: [string, any]) => {
                                initial[key] = chart.data;
                            });
                        }
                        setDashboardData(sessionCached.raw_data, sessionCached.chart_configs, initial, sessionCached.total_rows, sessionCached.target_column);
                    }
                    return;
                }
            }

            // If we have rawData already, this is a background KPI refresh
            const isKPIOnly = !!useFilterStore.getState().rawData;

            if (isKPIOnly) setIsKPILoading(true);
            else setIsLoading(true);

            setError(null);
            const data = await analyticsService.getDashboardAnalytics(
                selectedDatasetId,
                target_value,
                normalizedActiveFilters,
                {},
                classification_overrides,
                selected_domain,
                signal
            );
            setAnalytics(data);
            cacheRef.current.analytics.set(cacheKey, data);
            setSessionCachedAnalytics(cacheKey, data);
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

    const loadKpisForInteractiveState = async (signal?: AbortSignal) => {
        try {
            setIsKPILoading(true);
            const data = await analyticsService.getDashboardAnalytics(
                selectedDatasetId,
                target_value,
                normalizedActiveFilters,
                chart_overrides,
                classification_overrides,
                selected_domain,
                signal
            );

            setAnalytics(prev => {
                if (!prev) return data;
                return {
                    ...prev,
                    kpis: data.kpis,
                    target_column: data.target_column ?? prev.target_column,
                    target_values: data.target_values ?? prev.target_values,
                };
            });
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
        } finally {
            setIsKPILoading(false);
        }
    };

    useEffect(() => {
        if (!selectedDatasetId) return;

        const hasActiveFilters = Object.keys(normalizedActiveFilters).length > 0;
        const hasChartOverrides = Object.keys(chart_overrides || {}).length > 0;

        if (!hasActiveFilters && !hasChartOverrides) {
            const baseKey = stableSerialize({
                datasetId: selectedDatasetId,
                targetValue: target_value || 'all',
                selectedDomain: selected_domain || 'auto',
                filters: {},
                classificationOverrides: classification_overrides || {},
            });
            const baseCached = cacheRef.current.analytics.get(baseKey);
            if (baseCached && isFresh(baseCached.createdAt)) {
                setAnalytics(baseCached.value);
            }
            return;
        }

        if (kpiAbortControllerRef.current) {
            kpiAbortControllerRef.current.abort();
        }

        const controller = new AbortController();
        kpiAbortControllerRef.current = controller;

        const timer = setTimeout(() => {
            loadKpisForInteractiveState(controller.signal);
        }, 260);

        return () => {
            clearTimeout(timer);
        };
    }, [selectedDatasetId, target_value, selected_domain, classification_overrides, normalizedActiveFilters, chart_overrides]);

    const handleChartFilterClick = (col: string, val: string) => {
        const rawCol = String(col || '').trim();
        const rawVal = String(val || '').trim();
        if (!rawVal) return;

        const isGeneric = !rawCol || ['name', 'date', 'label'].includes(rawCol.toLowerCase());
        let resolvedCol = rawCol;

        if (isGeneric && analytics?.geo_filters) {
            const candidates = Object.entries(analytics.geo_filters)
                .filter(([, values]) => Array.isArray(values) && values.some(v => String(v).trim().toLowerCase() === rawVal.toLowerCase()))
                .map(([key]) => key);

            if (candidates.length === 1) {
                resolvedCol = candidates[0];
            } else if (candidates.length > 1) {
                const slotPreferred = filterSlots.find(slot => !!slot && candidates.includes(slot));
                resolvedCol = slotPreferred || candidates[0];
            }
        }

        if (!resolvedCol || ['name', 'date', 'label'].includes(resolvedCol.toLowerCase())) return;

        toggleFilter(resolvedCol, rawVal);

        // Ensure chart-driven filter remains visible in the multi-filter slots.
        setFilterSlots(prev => {
            if (!resolvedCol || prev.includes(resolvedCol)) return prev;
            const firstEmpty = prev.findIndex(slot => slot === null);
            if (firstEmpty >= 0) {
                const next = [...prev];
                next[firstEmpty] = resolvedCol;
                return next;
            }
            const next = [...prev];
            next[0] = resolvedCol;
            return next;
        });
    };

    useEffect(() => {
        if (!selectedDatasetId) return;
        const cached = cacheRef.current.correlation.get(selectedDatasetId);
        if (cached && isFresh(cached.createdAt)) {
            setCorrMatrix(cached.value);
            setCorrLoading(false);
            return;
        }
        setCorrLoading(true);
        setCorrMatrix(null);
        correlationService.getMatrix(selectedDatasetId)
            .then(m => {
                cacheRef.current.correlation.set(selectedDatasetId, m);
                setCorrMatrix(m);
            })
            .catch(() => setCorrMatrix(null))
            .finally(() => setCorrLoading(false));
    }, [selectedDatasetId]);

    // Fetch narrative when KPIs and charts are loaded
    useEffect(() => {
        if (!analytics?.kpis || !selectedDatasetId) return;
        const narrativeKey = stableSerialize({
            datasetId: selectedDatasetId,
            domain: analytics.domain,
            datasetName: analytics.dataset_name,
            kpis: analytics.kpis,
            charts: analytics.charts,
        });
        const cached = cacheRef.current.narrative.get(narrativeKey);
        if (cached && isFresh(cached.createdAt)) {
            setNarrative(cached.value);
            setNarrativeLoading(false);
            return;
        }
        setNarrativeLoading(true);
        narrativeService.generate(
            selectedDatasetId,
            analytics.kpis,
            analytics.domain,
            analytics.dataset_name,
            analytics.charts,
        )
            .then(text => {
                cacheRef.current.narrative.set(narrativeKey, text);
                setNarrative(text);
            })
            .catch(() => setNarrative(null))
            .finally(() => setNarrativeLoading(false));
    }, [analytics?.kpis, analytics?.charts, selectedDatasetId]);

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
        dimension: (val as any).dimension ?? analytics?.chart_configs?.[id]?.dimension,
        metric: (val as any).metric ?? analytics?.chart_configs?.[id]?.metric,
        aggregation: (val as any).aggregation ?? analytics?.chart_configs?.[id]?.aggregation,
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

    const exportChartCSV = (chart: any) => {
        const rows = chart.data;
        if (!Array.isArray(rows) || rows.length === 0) return;

        const escapeCell = (v: any) => {
            let s = v === null || v === undefined ? '' : String(v);
            s = s.replace(/"/g, '""');
            if (/^[=+\-@]/.test(s)) s = "'" + s;
            return `"${s}"`;
        };

        const keys = Object.keys(rows[0]);
        const headers = keys.map(escapeCell).join(',');
        const body = rows.map((row: any) => keys.map(k => escapeCell(row[k])).join(',')).join('\n');

        const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(chart.title || 'insight').replace(/\s+/g, '_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportChartHTML = (chart: any) => {
        try {
            const data = chart.data;
            if (!Array.isArray(data) || data.length === 0) return;

            const currentType = String(chart_overrides[chart.id]?.type || chart.type || 'bar').toLowerCase();
            const isHorizontal = currentType === 'hbar';
            const mapType = chart.geo_meta?.map_type || 'world';

            const firstRow = data[0] || {};
            const labelKey = 'name' in firstRow ? 'name' : Object.keys(firstRow).find(k => typeof firstRow[k] === 'string') || 'name';
            const valueKey = chart.value_label || Object.keys(firstRow).find(k => typeof firstRow[k] === 'number') || 'value';

            let htmlContent = '';
            const safeTitle = (chart.title || 'Vizzy Export').replace(/</g, '&lt;');
            const reportDate = new Date().toLocaleDateString();

            const safeJSON = (obj: any) => JSON.stringify(obj).replace(/`/g, '\\`').replace(/\$/g, '\\$');

            if (currentType === 'geo_map' || currentType === 'map') {
                const mapData = [['Region', valueKey]];
                data.forEach((d: any) => {
                    const val = Number(d[valueKey]) || 0;
                    mapData.push([String(d[labelKey] || 'Unknown'), val]);
                });

                htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <style>
        body { background-color: #0e1015; color: #f3f4f6; font-family: 'Inter', sans-serif; margin: 0; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .accent-bar { width: 3px; height: 24px; background-color: #FF6933; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-4xl glass-panel p-8 rounded-xl shadow-2xl">
        <div class="flex items-center gap-3 mb-8">
            <div class="accent-bar"></div>
            <h1 class="text-2xl font-light tracking-tight uppercase text-[#FF6933] font-['Outfit']">${safeTitle}</h1>
        </div>
        
        <div id="vizzyChart" style="width: 100%; height: 500px;" class="rounded-lg overflow-hidden border border-white/5"></div>

        <div class="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-xs text-white/20 uppercase tracking-widest font-mono">
            <span>Generated by Vizzy Analytics</span>
            <span>${reportDate}</span>
        </div>
    </div>

    <script type="text/javascript">
      google.charts.load('current', {
        'packages':['geochart'],
      });
      google.charts.setOnLoadCallback(drawRegionsMap);

      function drawRegionsMap() {
        var data = google.visualization.arrayToDataTable(${safeJSON(mapData)});
        var options = {
            colorAxis: {colors: ['#2A2D35', '#FF6933']},
            backgroundColor: 'transparent',
            datalessRegionColor: '#16181D',
            defaultColor: '#1a1d24',
            legend: {textStyle: {color: '#f3f4f6', fontName: 'Inter'}}
        };
        
        // Handle US states map specifically
        if ('${mapType}' === 'us_states') {
            options.region = 'US';
            options.resolution = 'provinces';
        }

        var chart = new google.visualization.GeoChart(document.getElementById('vizzyChart'));
        chart.draw(data, options);
      }
    </script>
</body>
</html>`;
            } else {
                let chartJsType = 'bar';
                if (['line', 'area', 'stacked'].includes(currentType)) chartJsType = 'line';
                if (['pie'].includes(currentType)) chartJsType = 'pie';
                if (['donut', 'doughnut'].includes(currentType)) chartJsType = 'doughnut';
                if (['radar'].includes(currentType)) chartJsType = 'radar';
                if (['scatter'].includes(currentType)) chartJsType = 'scatter';
                if (['treemap'].includes(currentType)) chartJsType = 'treemap';

                let scriptInjects = `<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>`;
                if (chartJsType === 'treemap') {
                    scriptInjects += `\n    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3.1.0/dist/chartjs-chart-treemap.min.js"></script>`;
                }

                let labels = data.map((d: any) => d[labelKey]);
                let datasetsStr = '';
                let optionsExtra = '';

                if (currentType === 'scatter') {
                    labels = [];
                    datasetsStr = `[
                        {
                            label: ${safeJSON(chart.title || 'Scatter')},
                            data: ${safeJSON(data.map((d: any) => ({ x: Number(d.x) || 0, y: Number(d.y) || 0 })))},
                            backgroundColor: '#FF6933',
                            borderColor: '#FF6933',
                            pointRadius: 6,
                            pointHoverRadius: 8
                        }
                    ]`;
                    optionsExtra = `
                        scales: {
                            x: { type: 'linear', position: 'bottom', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } },
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } }
                        }
                    `;
                } else if (currentType === 'treemap') {
                    labels = [];
                    datasetsStr = `[{
                        label: ${safeJSON(valueKey)},
                        tree: ${safeJSON(data)},
                        key: 'value',
                        groups: [${safeJSON(labelKey)}],
                        backgroundColor: (ctx) => {
                            const colors = ["#FF6933", "#FF8B5B", "#FFAE83", "#FFD0AB", "#FFB199", "#FF9270"];
                            return colors[ctx.dataIndex % colors.length] || '#FF6933';
                        },
                        labels: { display: true, color: '#0e1015', font: { family: 'Inter', weight: 600 } },
                        borderWidth: 1,
                        borderColor: '#0e1015'
                    }]`;
                } else if (currentType === 'stacked_bar' || currentType === 'stacked') {
                    const categories = chart.categories || ['positive', 'negative'];
                    const colors = ['#FF6933', '#CC5429', '#E6A23C', '#F56C6C', '#67C23A'];
                    const ds = categories.map((cat: string, i: number) => ({
                        label: cat,
                        data: data.map((d: any) => Number(d[cat]) || 0),
                        backgroundColor: colors[i % colors.length],
                        borderColor: colors[i % colors.length],
                        borderWidth: 1,
                        fill: currentType === 'stacked',
                        stack: 'Stack 0'
                    }));
                    datasetsStr = safeJSON(ds);
                    optionsExtra = `
                        scales: {
                            x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } },
                            y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } }
                        }
                    `;
                } else {
                    const values = data.map((d: any) => Number(d[valueKey]) || 0);
                    const isRadar = chartJsType === 'radar';
                    const isPie = ['pie', 'doughnut'].includes(chartJsType);

                    let bgStr = isPie
                        ? '["#FF6933", "#FF8B5B", "#FFAE83", "#FFD0AB", "#FFF2D3", "#FFB199", "#FF9270"]'
                        : (isRadar ? '"rgba(255, 105, 51, 0.4)"' : '"rgba(255, 105, 51, 0.8)"');

                    let borderColorStr = isPie ? '"#0e1015"' : '"#FF6933"';
                    let fillStr = (currentType === 'area' || isRadar) ? 'true' : 'false';

                    datasetsStr = `[{
                        label: ${safeJSON(valueKey)},
                        data: ${safeJSON(values)},
                        backgroundColor: ${bgStr},
                        borderColor: ${borderColorStr},
                        borderWidth: ${isPie ? '2' : '1'},
                        fill: ${fillStr},
                        tension: 0.4
                    }]`;

                    if (!isPie && !isRadar) {
                        optionsExtra = `
                            scales: {
                                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } },
                                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)' } }
                            }
                        `;
                    } else if (isRadar) {
                        optionsExtra = `
                            scales: {
                                r: { 
                                    grid: { color: 'rgba(255,255,255,0.1)' }, 
                                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                                    pointLabels: { color: 'rgba(255,255,255,0.5)' },
                                    ticks: { display: false, backdropColor: 'transparent' }
                                }
                            }
                        `;
                    }
                }

                htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${scriptInjects}
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { background-color: #0e1015; color: #f3f4f6; font-family: 'Inter', sans-serif; margin:0; padding:0; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .accent-bar { width: 3px; height: 24px; background-color: #FF6933; }
        canvas { width: 100% !important; height: 100% !important; max-height: 500px; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-4xl glass-panel p-8 rounded-xl shadow-2xl">
        <div class="flex items-center gap-3 mb-8">
            <div class="accent-bar"></div>
            <h1 class="text-2xl font-light tracking-tight uppercase text-[#FF6933] font-['Outfit']">${safeTitle}</h1>
        </div>
        
        <div class="relative w-full overflow-hidden" style="height: 500px;">
            <canvas id="vizzyChart"></canvas>
        </div>

        <div class="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-xs text-white/20 uppercase tracking-widest font-mono">
            <span>Generated by Vizzy Analytics</span>
            <span>${reportDate}</span>
        </div>
    </div>

    <script>
        function initChart() {
            try {
                if (typeof Chart === 'undefined') {
                    setTimeout(initChart, 50);
                    return;
                }
                const ctx = document.getElementById('vizzyChart').getContext('2d');
                const chartType = '${chartJsType}';
                const isRadial = ['pie', 'doughnut', 'radar', 'polarArea'].includes(chartType);
                
                const config = {
                    type: chartType,
                    data: {
                        labels: ${safeJSON(labels)},
                        datasets: ${datasetsStr}
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: isRadial, 
                        aspectRatio: isRadial ? 2 : undefined,
                        animation: { duration: 600 },
                        plugins: {
                            legend: { 
                                display: ${['pie', 'donut', 'doughnut', 'radar', 'stacked_bar', 'stacked'].includes(currentType)}, 
                                position: isRadial ? 'right' : 'top',
                                labels: { 
                                    color: 'rgba(255,255,255,0.7)', 
                                    padding: 20,
                                    font: { family: 'Inter', size: 12 } 
                                } 
                            },
                            tooltip: {
                                backgroundColor: '#16181D',
                                titleColor: '#FF6933',
                                bodyColor: '#fff',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                padding: 12,
                                displayColors: true,
                                usePointStyle: true
                            }
                        },
                        ${optionsExtra}
                    }
                };

                if (!isRadial) {
                    config.options.maintainAspectRatio = false;
                    config.options.indexAxis = ${isHorizontal} ? 'y' : 'x';
                }

                new Chart(ctx, config);
            } catch (e) {
                console.error("Vizzy Export Error:", e);
                document.body.innerHTML += '<div style="position:fixed;bottom:20px;left:20px;background:red;color:white;padding:10px;z-index:9999">Render Error: ' + e.message + '</div>';
            }
        }
        // Small delay ensures Tailwind and Glassmorphism layout is fully settled
        window.addEventListener('load', () => setTimeout(initChart, 150));
    </script>
</body>
</html>`;
            }

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(chart.title || 'insight').replace(/\s+/g, '_')}_interactive.html`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export chart:', error);
        }
    };

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
                        className="text-[12px] font-serif px-2 py-1 rounded-sm border border-border-main outline-none transition-colors bg-bg-card dark:bg-black/50 text-themed-muted hover:border-primary/40 focus:border-primary cursor-pointer"
                        title="Aggregation Method"
                    >
                        <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="sum">Sum</option>
                        <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="mean">Average</option>
                    </select>
                )}
                <select
                    value={currentType}
                    onChange={(e) => setChartOverride(chart.id, { type: e.target.value })}
                    className="text-[12px] font-serif px-2 py-1 rounded-sm border border-border-main outline-none transition-colors bg-bg-card dark:bg-black/50 text-themed-main hover:border-primary/40 focus:border-primary cursor-pointer"
                    title="Chart Type"
                >
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="bar">Bar</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="hbar">H-Bar</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="line">Line</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="area">Area</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="pie">Pie</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="donut">Donut</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="scatter">Scatter</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="treemap">Treemap</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="radar">Radar</option>
                    <option className="bg-bg-card dark:bg-[#16181D] text-themed-main" value="geo_map">Map</option>
                </select>
                <button
                    onClick={() => exportChartCSV(chart)}
                    className="p-1.5 rounded-sm border border-border-main text-themed-muted hover:text-primary hover:border-primary/40 transition-colors bg-bg-card dark:bg-black/50"
                    title="Export CSV"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button
                    onClick={() => exportChartHTML(chart)}
                    className="p-1.5 rounded-sm border border-border-main text-themed-muted hover:text-primary hover:border-primary/40 transition-colors bg-bg-card dark:bg-black/50"
                    title="Export Interactive HTML"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </button>
            </div>
        );
    };

    return (
        <div id="dashboard-root" className="min-h-screen bg-bg-main text-themed-main font-display antialiased selection:bg-primary selection:text-black relative">
            <div className="grain-overlay z-0"></div>
            <div className="flex flex-col min-h-screen relative z-10">

                {/* ── Header ── */}
                <header className="flex justify-between items-center px-6 lg:px-8 py-5 sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-border-main transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary text-2xl">diamond</span>
                        <h1 className="text-xl lg:text-2xl font-light tracking-widest uppercase text-themed-main">
                            {getDashboardTitle(analytics?.domain)}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                        {/* Dataset Filter Dropdown */}
                        <FilterDropdown
                            datasets={datasets}
                            selectedDatasetId={selectedDatasetId}
                            onDatasetChange={setSelectedDatasetId}
                        />

                        {/* Refresh */}
                        <button
                            onClick={() => loadAnalytics(undefined, true)}
                            disabled={isLoading}
                            className="p-2.5 rounded-sm bg-transparent border border-border-main text-themed-muted hover:text-primary hover:border-primary/50 transition-all shadow-sm disabled:opacity-50"
                            title="Refresh data"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        {/* Settings */}
                        <SettingsDropdown />

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-sm bg-primary border-b-2 border-[#b5461c] flex items-center justify-center text-black text-xs font-bold shadow-md flex-shrink-0">
                            VX
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8">

                    {/* ── Dataset Info Strip ── */}
                    {analytics && (
                        <div className="flex items-center gap-3 mb-6 text-xs text-themed-muted dark:text-themed-muted">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium text-gray-700 dark:text-themed-main">{analytics.dataset_name}</span>
                            <span className="text-themed-main dark:text-gray-600">•</span>
                            <span>{analytics.total_rows.toLocaleString()} rows</span>
                            <span className="text-themed-main dark:text-gray-600">•</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-primary font-medium">
                                <span className="opacity-70">Domain:</span>
                                <select
                                    value={selected_domain || 'auto'}
                                    onChange={(e) => setDomain(e.target.value === 'auto' ? null : e.target.value)}
                                    className="bg-transparent border-none outline-none text-primary font-bold cursor-pointer capitalize"
                                >
                                    <option className="bg-[#16181D] text-gray-300" value="auto">Auto ({analytics.domain})</option>
                                    <option className="bg-[#16181D] text-gray-300" value="sales">Sales</option>
                                    <option className="bg-[#16181D] text-gray-300" value="churn">Churn</option>
                                    <option className="bg-[#16181D] text-gray-300" value="marketing">Marketing</option>
                                    <option className="bg-[#16181D] text-gray-300" value="finance">Finance</option>
                                    <option className="bg-[#16181D] text-gray-300" value="healthcare">Healthcare</option>
                                    <option className="bg-[#16181D] text-gray-300" value="generic">Generic</option>
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
                                className={`px-4 py-2 rounded-sm text-[13px] font-serif uppercase tracking-widest font-bold transition-all ${target_value === 'all'
                                    ? 'bg-primary text-black shadow-md shadow-primary/20'
                                    : 'bg-bg-card border border-border-main text-themed-muted hover:text-primary hover:border-primary/50'}`}
                            >
                                All {analytics.target_column?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                            {analytics.target_values.map(val => (
                                <button
                                    key={val}
                                    onClick={() => setTargetValue(val)}
                                    className={`px-4 py-2 rounded-sm text-[13px] font-serif uppercase tracking-widest font-bold transition-all ${target_value === val
                                        ? 'bg-primary text-black shadow-md shadow-primary/20'
                                        : 'bg-bg-card border border-border-main text-themed-muted hover:text-primary hover:border-primary/50'}`}
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
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#1C1F26] border border-gray-200 dark:border-border-main/60 flex items-center justify-center shadow-sm">
                                    <svg className="w-9 h-9 text-themed-muted dark:text-themed-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 11h6M9 14h4" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400/90 flex items-center justify-center shadow">
                                    <svg className="w-3 h-3 text-themed-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v4m0 4h.01" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">No Dataset Loaded</h3>
                            <p className="text-sm text-themed-muted dark:text-themed-muted max-w-xs">
                                Select a dataset using the <span className="font-medium text-gray-600 dark:text-themed-muted">Select Dataset</span> button above, or upload one to get started.
                            </p>
                        </div>
                    )}

                    {/* ── Loading ── */}
                    {isLoading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
                                <p className="text-sm text-themed-muted dark:text-themed-muted mt-4">Loading analytics…</p>
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
                            <svg className="w-16 h-16 text-themed-main dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-themed-main">No Data Yet</h3>
                            <p className="text-sm text-themed-muted dark:text-themed-muted mt-1">Upload a dataset to see your analytics</p>
                        </div>
                    )}

                    {/* ── Main Content ── */}
                    {!isLoading && !error && analytics && (
                        <>
                            {analytics.columns && (
                                <ColumnClassificationPanel columns={analytics.columns} isDark={isDark} />
                            )}

                            {/* Data Quality Report Panel */}
                            {analytics.data_quality && analytics.data_quality.length > 0 && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => setDataQualityOpen(!dataQualityOpen)}
                                        className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-themed-muted hover:text-primary transition-colors mb-2"
                                    >
                                        <svg className={`w-3 h-3 transition-transform ${dataQualityOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                        Data Quality Report ({analytics.data_quality.filter(d => d.null_pct > 0).length} columns with nulls)
                                    </button>
                                    {dataQualityOpen && (
                                        <div className="glass-panel rounded-sm p-4 overflow-x-auto">
                                            <table className="w-full text-xs font-mono">
                                                <thead>
                                                    <tr className="text-themed-muted border-b border-border-main">
                                                        <th className="text-left py-2 pr-4">Column</th>
                                                        <th className="text-right py-2 pr-4">Null %</th>
                                                        <th className="text-right py-2 pr-4">Null Count</th>
                                                        <th className="text-left py-2 pr-4">Type</th>
                                                        <th className="text-left py-2">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analytics.data_quality.map((dq: any) => (
                                                        <tr key={dq.column} className="border-b border-border-main/30 hover:bg-white/5 transition-colors">
                                                            <td className="py-1.5 pr-4 text-themed-main">{dq.column}</td>
                                                            <td className={`py-1.5 pr-4 text-right font-bold ${dq.null_pct > 20 ? 'text-red-400' : dq.null_pct > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                                {dq.null_pct}%
                                                            </td>
                                                            <td className="py-1.5 pr-4 text-right text-themed-muted">{dq.null_count.toLocaleString()}</td>
                                                            <td className="py-1.5 pr-4 text-themed-muted">{dq.dtype}</td>
                                                            <td className="py-1.5">
                                                                {dq.action !== 'none' ? (
                                                                    <span className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] uppercase">{dq.action}</span>
                                                                ) : (
                                                                    <span className="text-themed-muted">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Insight Narrative Card */}
                            <div className="mb-6 glass-panel rounded-sm p-5 border-l-2 border-primary">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span className="text-xs font-serif uppercase tracking-widest text-primary font-bold">Vizzy Insight</span>
                                </div>
                                {narrativeLoading ? (
                                    <div className="space-y-2">
                                        <div className="h-3 bg-white/5 rounded-sm animate-pulse w-full" />
                                        <div className="h-3 bg-white/5 rounded-sm animate-pulse w-5/6" />
                                        <div className="h-3 bg-white/5 rounded-sm animate-pulse w-4/6" />
                                    </div>
                                ) : narrative ? (
                                    <div className="space-y-2">
                                        {narrative.split('\n').filter(line => line.trim()).map((line, i) => (
                                            <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-serif flex gap-2">
                                                <span className="text-primary font-bold shrink-0">{line.match(/^\d+\./) ? line.match(/^\d+\./)![0] : `${i + 1}.`}</span>
                                                <span>{line.replace(/^\d+\.\s*/, '')}</span>
                                            </p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic font-serif">Generating insights…</p>
                                )}
                            </div>

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
                                            <div data-chart-id={chart.id}>
                                                <ChartRenderer
                                                    chart={{ ...chart, type: chart_overrides[chart.id]?.type || chart.type }}
                                                    chartColors={chartColors}
                                                    isDark={isDark}
                                                    onFilterClick={handleChartFilterClick}
                                                />
                                            </div>
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
                                        <div data-chart-id={chart.id}>
                                            <ChartRenderer
                                                chart={{ ...chart, type: chart_overrides[chart.id]?.type || chart.type }}
                                                chartColors={chartColors}
                                                isDark={isDark}
                                                onFilterClick={handleChartFilterClick}
                                            />
                                        </div>
                                    </ChartCard>
                                ))}

                                {/* Pad to 3 columns if fewer than 2 extra charts */}
                                {chartArray.length < 4 && (
                                    <ChartCard title={chartArray[1]?.title ?? 'Additional Insights'}>
                                        <div className="h-48 flex items-center justify-center">
                                            <p className="text-sm text-themed-muted dark:text-gray-600">Not enough chart types detected</p>
                                        </div>
                                    </ChartCard>
                                )}
                                {chartArray.length < 5 && (
                                    <ChartCard title={chartArray[2]?.title ?? 'More Insights'}>
                                        <div className="h-48 flex items-center justify-center">
                                            <p className="text-sm text-themed-muted dark:text-gray-600">Not enough chart types detected</p>
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
