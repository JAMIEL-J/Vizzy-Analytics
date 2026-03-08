import { create } from 'zustand';

export interface ChartOverride {
    type?: string;
    aggregation?: string;
}

export type ClassificationRole = "Dimension" | "Metric" | "Target" | "Date" | "Excluded";

export interface DashboardState {
    rawData: any[] | null;
    chartConfigs: Record<string, any> | null;
    initialChartData: Record<string, any> | null;
    chartData: Record<string, any> | null;
    active_filters: Record<string, string[]>;
    chart_overrides: Record<string, ChartOverride>;
    classification_overrides: Record<string, ClassificationRole>;
    selected_domain: string | null;
    target_column: string | null;
    target_value: string;
    total_records: number;

    setDashboardData: (rawData: any[], chartConfigs: Record<string, any>, initialChartData: Record<string, any>, totalRows: number, targetCol?: string | null) => void;
    setTargetValue: (value: string) => void;
    setFilter: (column: string, value: string) => void;
    setFilterValues: (column: string, values: string[]) => void;
    toggleFilter: (column: string, value: string) => void;
    removeFilter: (column: string, value: string) => void;
    clearFilters: () => void;
    setChartOverride: (chartId: string, override: ChartOverride) => void;
    setClassificationOverride: (column: string, role: ClassificationRole) => void;
    setDomain: (domain: string | null) => void;
    resetState: () => void;
}

const getRowValue = (row: any, key: string) => {
    if (key in row) return row[key];
    // Case-insensitive fallback
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
    return actualKey ? row[actualKey] : undefined;
};

const applyFilters = (data: any[], filters: Record<string, string[]>, targetCol: string | null, targetVal: string) => {
    if (!data) return [];

    const positiveKeywords = ['yes', 'true', '1'];
    const negativeKeywords = ['no', 'false', '0'];

    return data.filter(row => {
        // 1. Apply Target Tab Filter (e.g. Churned Users)
        if (targetCol && targetVal && targetVal.toLowerCase() !== 'all') {
            const rowVal = String(getRowValue(row, targetCol)).toLowerCase();
            if (targetVal.toLowerCase() === 'yes' || targetVal.toLowerCase() === 'true' || targetVal === '1') {
                if (!positiveKeywords.includes(rowVal)) return false;
            } else if (targetVal.toLowerCase() === 'no' || targetVal.toLowerCase() === 'false' || targetVal === '0') {
                if (!negativeKeywords.includes(rowVal)) return false;
            } else {
                if (rowVal !== targetVal.toLowerCase()) return false;
            }
        }

        // 2. Apply Multi-Column Filters
        return Object.entries(filters).every(([key, values]) => {
            if (!values || values.length === 0) return true;
            const rowVal = getRowValue(row, key);
            if (rowVal === undefined || rowVal === null) return false;

            // Normalize both to strings for comparison (handles 100.0 vs "100.0" and "100" vs 100)
            const rowValStr = String(rowVal);
            return values.some(v => String(v) === rowValStr);
        });
    });
};

const aggregateValues = (values: any[], method: string, scalingFactor: number = 1) => {
    const methodUpper = (method || 'SUM').toUpperCase();
    if (methodUpper === 'COUNT') return Math.round(values.length * scalingFactor);

    // Convert to numbers and strip NaNs
    const nums = values.map(v => Number(v)).filter(v => !isNaN(v) && v !== null);
    if (!nums.length) return 0;

    // Averages/Means do not need scaling as the sample is an unbiased estimator
    if (methodUpper === 'AVG' || methodUpper === 'MEAN') return nums.reduce((a, b) => a + b, 0) / nums.length;

    if (methodUpper === 'MIN') return Math.min(...nums);
    if (methodUpper === 'MAX') return Math.max(...nums);

    // Sums must be scaled by the sampling ratio to represent the full dataset
    return (nums.reduce((a, b) => a + b, 0)) * scalingFactor;
};

const recomputeCharts = (
    rawData: any[],
    chartConfigs: Record<string, any>,
    filters: Record<string, string[]>,
    overrides: Record<string, ChartOverride>,
    targetCol: string | null,
    targetVal: string,
    existingCharts: Record<string, any> | null = null,
    targetChartId?: string,
    totalRecords: number = 0,
    initialChartData: Record<string, any> | null = null
) => {
    if (!rawData || !chartConfigs) return existingCharts;
    const filtered = applyFilters(rawData, filters, targetCol, targetVal);

    const hasNoFilters = Object.keys(filters).length === 0 && targetVal === 'all';

    // Calculate scaling factor to account for sampling in the raw data
    const scalingFactor = (totalRecords > 0 && rawData.length > 0)
        ? totalRecords / rawData.length
        : 1;

    // If existingCharts is provided, we merge into it (targeted update).
    // Otherwise we start fresh (full update).
    const charts: Record<string, any> = existingCharts ? { ...existingCharts } : {};

    const configsToProcess = targetChartId
        ? (chartConfigs[targetChartId] ? { [targetChartId]: chartConfigs[targetChartId] } : null)
        : chartConfigs;

    if (!configsToProcess) return charts;

    for (const [slotId, config] of Object.entries(configsToProcess)) {
        const override = overrides[slotId] || {};
        const aggregation = (override.aggregation || config.aggregation || 'SUM').toUpperCase();
        const dimension = config.dimension;
        const metric = config.metric;

        if (dimension && metric) {
            const chartType = (override.type || config.type || '').toLowerCase();
            const originalType = (config.type || '').toLowerCase();
            const isTrend = ['line', 'area', 'area_bounds', 'area-bounds'].includes(chartType) && config.is_date;
            const originalWasTrend = ['line', 'area', 'area_bounds', 'area-bounds'].includes(originalType) && config.is_date;
            // PERFORMANCE OPTIMIZATION: Reuse high-fidelity backend data if no filters are active and analytics logic hasn't changed
            const sameAgg = !override.aggregation || override.aggregation.toLowerCase() === (config.aggregation || 'sum').toLowerCase();
            const sameTrend = isTrend === originalWasTrend;

            if (hasNoFilters && initialChartData?.[slotId]) {
                if (sameAgg && sameTrend) {
                    charts[slotId] = initialChartData[slotId];
                    continue;
                }
            }

            // STABILITY FIX: If we are only overriding TYPE (Bar -> H-Bar) and have NO other reason to recompute
            // (e.g. no active filters and same aggregation), reuse existing chart data to avoid naive local recalc.
            const hasActiveFilters = Object.keys(filters).length > 0 || (targetVal && targetVal !== 'all');

            if (!hasActiveFilters && existingCharts?.[slotId]) {
                if (sameAgg && sameTrend) {
                    charts[slotId] = existingCharts[slotId];
                    continue;
                }
            }

            // 1. Calculate Date Binning if needed
            let freq: 'D' | 'W' | 'M' = 'D';
            let maxMonthDay = '';
            if (isTrend || config.granularity === 'ytd' || config.granularity === 'year') {
                const dates = filtered.map(r => new Date(getRowValue(r, dimension))).filter(d => !isNaN(d.getTime()));
                if (dates.length > 0) {
                    const times = dates.map(d => d.getTime());
                    const minDate = Math.min(...times);
                    const maxDate = Math.max(...times);
                    const days = (maxDate - minDate) / (1000 * 60 * 60 * 24);
                    if (days > 365) freq = 'M';
                    else if (days > 60) freq = 'W';

                    if (config.granularity === 'ytd') {
                        const dMax = new Date(maxDate);
                        maxMonthDay = (dMax.getMonth() + 1).toString().padStart(2, '0') + dMax.getDate().toString().padStart(2, '0');
                    }
                }
            }

            // 2. Group by dimension (with date binning & YTD filter)
            const grouped = filtered.reduce((acc, row) => {
                let val = getRowValue(row, dimension);
                let key: string;

                const isYearly = config.granularity === 'year';
                const isYTD = config.granularity === 'ytd';

                if ((isTrend || isYearly || isYTD) && val) {
                    const d = new Date(val);
                    if (isNaN(d.getTime())) {
                        key = 'Unknown';
                    } else if (isYearly) {
                        key = String(d.getFullYear());
                    } else if (isYTD) {
                        // YTD Filter: Only include rows if month/day <= max visible month/day
                        const currentMD = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
                        if (maxMonthDay && currentMD > maxMonthDay) return acc;
                        key = `${d.getFullYear()} YTD`;
                    } else {
                        if (freq === 'M') {
                            d.setDate(1); // First of month
                        } else if (freq === 'W') {
                            const day = d.getDay();
                            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
                            d.setDate(diff);
                        }
                        key = d.toISOString().split('T')[0];
                    }
                } else {
                    key = val === null || val === undefined ? 'Unknown' : String(val);
                }

                if (!acc[key]) acc[key] = [];
                const metricVal = getRowValue(row, metric);
                acc[key].push(aggregation === 'COUNT' ? 1 : metricVal);
                return acc;
            }, {} as Record<string, any[]>);

            let chartData = Object.entries(grouped).map(([name, values]) => {
                const item: any = { value: aggregateValues(values as any[], aggregation, scalingFactor) };
                if (isTrend) {
                    item.date = name;
                } else {
                    item.name = name;
                }
                return item;
            });

            const isFullData = chartType === 'scatter' || isTrend || config.granularity === 'year' || config.granularity === 'ytd';

            if (isFullData) {
                if (chartType !== 'scatter') {
                    chartData = chartData.filter(d => (d.date || d.name) !== 'Unknown');
                    // Sort chronologically (handling ISO dates, Year labels, and YTD labels)
                    chartData.sort((a, b) => {
                        const labelA = String(a.date || a.name || '');
                        const labelB = String(b.date || b.name || '');

                        const timeA = new Date(labelA).getTime();
                        const timeB = new Date(labelB).getTime();

                        // If both are valid full dates, use precise timestamp
                        if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;

                        // Fallback: extract year for benchmarking labels (e.g. "2016 YTD")
                        const yearA = parseInt(labelA.slice(0, 4));
                        const yearB = parseInt(labelB.slice(0, 4));
                        if (!isNaN(yearA) && !isNaN(yearB)) return yearA - yearB;

                        // Final fallback to alphabetical
                        return labelA.localeCompare(labelB);
                    });

                    // Cap at 30 points to match backend .tail(30) and maintain readability
                    if (chartData.length > 30) {
                        chartData = chartData.slice(-30);
                    }
                }
                charts[slotId] = chartData;
            } else {
                chartData.sort((a, b) => b.value - a.value);
                charts[slotId] = chartData.slice(0, 10);
            }
        }
    }
    return charts;
};

export const useFilterStore = create<DashboardState>((set, get) => ({
    rawData: null,
    chartConfigs: null,
    chartData: null,
    active_filters: {},
    chart_overrides: {},
    classification_overrides: {},
    selected_domain: null,
    target_column: null,
    initialChartData: null,
    target_value: 'all',
    total_records: 0,

    setDashboardData: (rawData, chartConfigs, initialChartData, totalRows, targetCol) => {
        const state = get();
        const finalTargetCol = targetCol || state.target_column;

        set({
            rawData,
            chartConfigs,
            initialChartData,
            chartData: initialChartData || state.chartData,
            target_column: finalTargetCol,
            total_records: totalRows
        });
    },

    setTargetValue: (value) => {
        const state = get();
        set({
            target_value: value,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, state.active_filters, state.chart_overrides, state.target_column, value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    setFilter: (column, value) => {
        const state = get();
        const newFilters = { ...state.active_filters, [column]: [value] };
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    setFilterValues: (column, values) => {
        const state = get();
        const newFilters = { ...state.active_filters, [column]: values };
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    toggleFilter: (column, value) => {
        const state = get();
        const current = state.active_filters[column] || [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        const newFilters = { ...state.active_filters, [column]: next };
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    removeFilter: (column, value) => {
        const state = get();
        const next = (state.active_filters[column] || []).filter(v => v !== value);
        const newFilters = { ...state.active_filters, [column]: next };
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    clearFilters: () => {
        const state = get();
        set({
            active_filters: {},
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, {}, state.chart_overrides, state.target_column, state.target_value, state.chartData, undefined, state.total_records, state.initialChartData)
        });
    },

    setChartOverride: (chartId, override) => {
        const state = get();
        const newOverrides = { ...state.chart_overrides, [chartId]: { ...state.chart_overrides[chartId], ...override } };
        set({
            chart_overrides: newOverrides,
            chartData: recomputeCharts(
                state.rawData || [],
                state.chartConfigs || {},
                state.active_filters,
                newOverrides,
                state.target_column,
                state.target_value,
                state.chartData,
                chartId,
                state.total_records,
                state.initialChartData
            )
        });
    },

    setClassificationOverride: (column, role) => set((state) => ({
        classification_overrides: { ...state.classification_overrides, [column]: role }
    })),

    setDomain: (domain) => set({ selected_domain: domain }),

    resetState: () => set({
        rawData: null,
        chartConfigs: null,
        chartData: null,
        active_filters: {},
        chart_overrides: {},
        classification_overrides: {},
        selected_domain: null,
        target_column: null,
        target_value: 'all'
    })
}));
