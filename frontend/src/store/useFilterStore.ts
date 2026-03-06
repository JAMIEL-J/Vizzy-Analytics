import { create } from 'zustand';

export interface ChartOverride {
    type?: string;
    aggregation?: string;
}

export type ClassificationRole = "Dimension" | "Metric" | "Target" | "Date" | "Excluded";

export interface DashboardState {
    rawData: any[] | null;
    chartConfigs: Record<string, any> | null;
    chartData: Record<string, any> | null;
    active_filters: Record<string, string[]>;
    chart_overrides: Record<string, ChartOverride>;
    classification_overrides: Record<string, ClassificationRole>;
    selected_domain: string | null;
    target_column: string | null;
    target_value: string;

    setDashboardData: (rawData: any[], chartConfigs: Record<string, any>, initialChartData: Record<string, any>, targetCol?: string | null) => void;
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

const aggregateValues = (values: any[], method: string) => {
    const methodUpper = (method || 'SUM').toUpperCase();
    if (methodUpper === 'COUNT') return values.length;

    // Convert to numbers and strip NaNs
    const nums = values.map(v => Number(v)).filter(v => !isNaN(v) && v !== null);
    if (!nums.length) return 0;

    if (methodUpper === 'AVG' || methodUpper === 'MEAN') return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (methodUpper === 'MIN') return Math.min(...nums);
    if (methodUpper === 'MAX') return Math.max(...nums);
    return nums.reduce((a, b) => a + b, 0); // SUM default
};

const recomputeCharts = (
    rawData: any[],
    chartConfigs: Record<string, any>,
    filters: Record<string, string[]>,
    overrides: Record<string, ChartOverride>,
    targetCol: string | null,
    targetVal: string,
    existingCharts: Record<string, any> | null = null,
    targetChartId?: string
) => {
    if (!rawData || !chartConfigs) return existingCharts;
    const filtered = applyFilters(rawData, filters, targetCol, targetVal);

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
            // Group by dimension
            const grouped = filtered.reduce((acc, row) => {
                const val = getRowValue(row, dimension);
                const key = val === null || val === undefined ? 'Unknown' : String(val);
                if (!acc[key]) acc[key] = [];

                const metricVal = getRowValue(row, metric);
                acc[key].push(aggregation === 'COUNT' ? 1 : metricVal);
                return acc;
            }, {} as Record<string, any[]>);

            let chartData = Object.entries(grouped).map(([name, values]) => ({
                name,
                value: aggregateValues(values as any[], aggregation)
            }));

            const type = (override.type || config.type || '').toLowerCase();
            const isFullData = ['line', 'area', 'scatter'].includes(type);

            if (isFullData) {
                // Filter out "Unknown" for cleaner trend lines if needed, 
                // but at minimum ensure they don't cause sorting spikes
                if (type !== 'scatter') {
                    chartData = chartData.filter(d => d.name !== 'Unknown');
                    // Sort chronologically for trend charts
                    chartData.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
                }
                charts[slotId] = chartData; // No capping for trends/scatter
            } else {
                // Sort by value desc (standard analytical presentation)
                chartData.sort((a, b) => b.value - a.value);
                // Cap at top 10 to maintain readability and match backend behavior
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
    target_value: 'all',

    setDashboardData: (rawData, chartConfigs, initialChartData, targetCol) => {
        const state = get();
        const finalTargetCol = targetCol || state.target_column;
        const hasFiltersOrOverrides = Object.keys(state.active_filters).length > 0 ||
            Object.keys(state.chart_overrides).length > 0 ||
            state.target_value !== 'all';

        const finalChartData = hasFiltersOrOverrides
            ? (recomputeCharts(rawData, chartConfigs, state.active_filters, state.chart_overrides, finalTargetCol, state.target_value) || initialChartData)
            : initialChartData;

        set({
            rawData,
            chartConfigs,
            chartData: finalChartData,
            target_column: finalTargetCol
        });
    },

    setTargetValue: (value) => {
        const state = get();
        set({
            target_value: value,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, state.active_filters, state.chart_overrides, state.target_column, value, state.chartData)
        });
    },

    setFilter: (column, value) => {
        const state = get();
        const newFilters = { ...state.active_filters, [column]: [value] };
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData)
        });
    },

    setFilterValues: (column, values) => {
        const state = get();
        const newFilters = { ...state.active_filters };
        if (values.length > 0) newFilters[column] = values;
        else delete newFilters[column];
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData)
        });
    },

    toggleFilter: (column, value) => {
        const state = get();
        const currentVals = state.active_filters[column] || [];
        const valStr = String(value);
        const isSelected = currentVals.includes(valStr);
        const newVals = isSelected ? currentVals.filter(v => v !== valStr) : [...currentVals, valStr];
        const newFilters = { ...state.active_filters };
        if (newVals.length > 0) newFilters[column] = newVals;
        else delete newFilters[column];
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData)
        });
    },

    removeFilter: (column, value) => {
        const state = get();
        const currentVals = state.active_filters[column] || [];
        const newVals = currentVals.filter(v => v !== value);
        const newFilters = { ...state.active_filters };
        if (newVals.length > 0) newFilters[column] = newVals;
        else delete newFilters[column];
        set({
            active_filters: newFilters,
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, newFilters, state.chart_overrides, state.target_column, state.target_value, state.chartData)
        });
    },

    clearFilters: () => {
        const state = get();
        set({
            active_filters: {},
            chartData: recomputeCharts(state.rawData || [], state.chartConfigs || {}, {}, state.chart_overrides, state.target_column, state.target_value, state.chartData)
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
                state.chartData, // Existing charts
                chartId          // ONLY recompute this one
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
