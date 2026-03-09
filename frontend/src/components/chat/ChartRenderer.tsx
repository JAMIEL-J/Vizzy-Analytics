import React from 'react';
import { KPICard } from './KPICard';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';


interface ChartRendererProps {
    type: string;
    data: any;
    title?: string;
    currency?: string;
    variant?: 'default' | 'minimal';
}

// Brutalist color palette for distinct data points (All Orange)
// Brutalist color palette for distinct data points (All Orange)
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
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    currency?: string;
    isCurrency?: boolean;
    isPercentage?: boolean;
}

const CustomTooltip = ({ active, payload, label, currency, isCurrency, isPercentage }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        let formattedValue = '';
        const value = payload[0].value || 0;

        if (isPercentage) {
            formattedValue = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value) + '%';
        } else {
            formattedValue = new Intl.NumberFormat('en-US', {
                style: isCurrency ? 'currency' : 'decimal',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(value).replace('$', isCurrency ? (currency || '$') : '');
        }

        return (
            <div className="rounded-sm px-4 py-3 border border-white/10 backdrop-blur-md min-w-[160px] bg-black/90 shadow-[0_0_15px_rgba(255,105,51,0.1)] text-white font-mono z-[9999]">
                {label && <p className="text-[10px] uppercase font-bold tracking-widest mb-2 pb-2 border-b border-white/10 opacity-70 leading-tight">{label}</p>}
                <div className="mb-0">
                    <p className="text-[10px] opacity-50 uppercase tracking-widest mb-0.5">Value</p>
                    <p className="text-sm font-bold truncate max-w-[200px] text-primary">{formattedValue}</p>
                </div>
            </div>
        );
    }
    return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, title, currency, variant = 'default' }) => {
    const gridColor = '#ffffff10';
    const axisColor = '#6b7280';
    const cursorFill = 'rgba(255,255,255,0.05)';

    // ── Explicit Formatting Hints (from Phase 1 Coercion) ──
    const columnMetadata = data.column_metadata || data.data?.column_metadata || {};

    // Determine if this should be formatted as a percentage
    const isPercentage =
        data.is_percentage === true ||
        data.data?.is_percentage === true ||
        Object.values(columnMetadata).some((m: any) => m.display_format?.type === 'percent') ||
        data.format === 'percent' ||
        data.format === 'percentage' ||
        data.format_type === 'percentage' ||
        data.data?.format === 'percent' ||
        data.data?.format_type === 'percentage' ||
        data.response_type === 'percentage';

    // Determine if this chart should use currency formatting
    const getCurrencyInfo = () => {
        // Find if any metric in this chart has explicit currency metadata
        const metadataValues: any[] = Object.values(columnMetadata);
        const explicitCurrency = metadataValues.find((m: any) => m.display_format?.type === 'currency');

        if (explicitCurrency) {
            return {
                isCurrency: true,
                symbol: explicitCurrency.display_format.currency === 'USD' ? '$' :
                    explicitCurrency.display_format.currency === 'GBP' ? '£' :
                        explicitCurrency.display_format.currency === 'EUR' ? '€' : '$'
            };
        }

        // Fallback to legacy heuristic
        if (isPercentage) return { isCurrency: false, symbol: '$' };
        const explicitMoneyKeywords = ['revenue', 'profit', 'income', 'earnings', 'cost', 'expense', 'price', 'charges', 'payment', 'budget', 'salary', 'wage', 'fee', 'sales', 'discount'];
        const titleLower = (title || '').toLowerCase();
        const dataStr = JSON.stringify(data).toLowerCase();
        const hasKeyword = explicitMoneyKeywords.some(keyword => titleLower.includes(keyword) || dataStr.includes(keyword));

        return { isCurrency: hasKeyword, symbol: currency || '$' };
    };

    const currencyInfo = getCurrencyInfo();
    const isCurrencyChart = currencyInfo.isCurrency;
    const effectiveCurrency = currencyInfo.symbol;

    // Handle NL2SQL wrapper
    if (type === 'nl2sql') {
        const payload = data.chart || {};
        return (
            <ChartRenderer
                type={payload.type || (data.response_type === 'text' ? 'kpi' : 'table')}
                data={payload}
                title={payload.title || title}
                currency={currency}
                variant={variant}
            />
        );
    }

    const renderKPI = () => {
        const value = data.value !== undefined ? data.value : (data.data?.value !== undefined ? data.data.value : 0);
        const label = data.label || data.data?.label || title || "Metric";
        const suffix = data.suffix || data.data?.suffix || (isPercentage ? '%' : '');
        const change = data.change;

        return (
            <KPICard
                value={value}
                label={label}
                change={change}
                prefix={data.prefix || (isCurrencyChart ? effectiveCurrency : undefined)}
                suffix={suffix}
                variant={variant}
            />
        );
    };

    const formatYAxisValue = (val: number) => {
        if (isPercentage) {
            return new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(val) + '%';
        }

        return new Intl.NumberFormat('en-US', {
            style: isCurrencyChart ? 'currency' : 'decimal',
            currency: 'USD',
            notation: "compact",
            compactDisplay: "short",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val).replace('$', effectiveCurrency);
    };

    const renderBarChart = () => {
        let chartData = [];
        // Handle different data formats including NL2SQL nested data
        if (data.data?.rows) {
            chartData = data.data.rows.map((row: any) => {
                const keys = Object.keys(row);
                return {
                    name: row[keys[0]],
                    value: row[keys[1]]
                };
            });
        } else if (data.x && data.y) {
            chartData = data.x.map((x: any, i: number) => ({
                name: x,
                value: data.y[i]
            }));
        }

        if (chartData.length === 0) return <div className="p-4 text-gray-400 text-sm">No chart data available</div>;

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            interval={0}
                            angle={0}
                            textAnchor="middle"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value: any) => formatYAxisValue(Number(value))}
                        />
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} cursor={{ fill: cursorFill }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                            {chartData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderLineChart = () => {
        let chartData = [];
        if (data.data?.series) {
            chartData = data.data.series.map((s: any) => ({
                name: s.timestamp || Object.values(s)[0],
                value: s.value !== undefined ? s.value : Object.values(s)[1]
            }));
        } else if (data.x && data.y) {
            chartData = data.x.map((x: any, i: number) => ({
                name: x,
                value: data.y[i]
            }));
        }

        if (chartData.length === 0) return <div className="p-4 text-gray-400 text-sm">No line data available</div>;

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            angle={0}
                            textAnchor="middle"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: axisColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value: any) => formatYAxisValue(Number(value))}
                        />
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#ff6933"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#ff8f66' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderPieChart = () => {
        let chartData = [];
        if (data.data?.rows) {
            chartData = data.data.rows.map((row: any) => {
                const keys = Object.keys(row);
                return {
                    name: row[keys[0]],
                    value: row[keys[1]]
                };
            });
        } else if (data.labels && data.values) {
            chartData = data.labels.map((l: any, i: number) => ({
                name: l,
                value: data.values[i]
            }));
        }

        return (
            <div className="h-96 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} stroke="#111111" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip currency={effectiveCurrency} isCurrency={isCurrencyChart} isPercentage={isPercentage} />} />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase' }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderTable = () => {
        const rows = data.data?.rows || data.rows || [];
        if (rows.length === 0) return <p className="p-4 text-gray-500 italic">No table data found.</p>;

        const headers = data.data?.columns || Object.keys(rows[0]);

        return (
            <div className="overflow-x-auto rounded-sm border border-white/10 shadow-[0_0_15px_rgba(255,105,51,0.05)] mt-4 glass-panel scrollbar-hide">
                <table className="min-w-full text-sm text-left text-gray-400 font-mono">
                    <thead className="text-[10px] tracking-widest text-[#ff6933] uppercase bg-black/50 border-b border-white/10">
                        <tr>
                            {headers.map((h: string) => <th key={h} className="px-4 py-3 font-bold">{h.replace('_', ' ')}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 10).map((row: any, i: number) => (
                            <tr key={i} className="bg-transparent border-b border-white/5 hover:bg-white/5 transition-colors">
                                {headers.map((h: string) => (
                                    <td key={h} className="px-4 py-3 text-white text-xs">
                                        {typeof row[h] === 'number' && !h.toLowerCase().includes('id') ?
                                            formatYAxisValue(row[h]) :
                                            String(row[h] || '-')
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length > 10 && (
                    <div className="px-4 py-2 bg-black/50 text-[10px] tracking-widest uppercase text-center text-gray-500 border-t border-white/10 font-bold">
                        Showing top 10 of {rows.length} results
                    </div>
                )}
            </div>
        );
    }

    const renderDashboard = () => {
        // ... (existing logic for multi-widget dashboards)
        const dashboard = data.widgets ? data : data.dashboard;

        if (!dashboard || !dashboard.widgets) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                {dashboard.widgets.map((widget: any, index: number) => {
                    const colSpan = widget.type === 'kpi' ? 'col-span-1' : 'col-span-1 md:col-span-2';

                    return (
                        <div key={index} className={`${colSpan} obsidian-card p-4 rounded-sm border border-white/10 shadow-[0_0_15px_rgba(255,105,51,0.05)] hover:border-white/20 transition-all duration-300`}>
                            <h4 className="text-[10px] tracking-widest uppercase font-bold text-gray-400 mb-3 border-b border-white/10 pb-2">{widget.title}</h4>
                            <ChartRenderer
                                type={widget.type}
                                data={{ data: widget.data }}
                                title={widget.title}
                                currency={effectiveCurrency}
                                variant="minimal"
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    switch (type) {
        case 'kpi': return renderKPI();
        case 'bar': return renderBarChart();
        case 'line': return renderLineChart();
        case 'pie': return renderPieChart();
        case 'table': return renderTable();
        case 'dashboard': return renderDashboard();
        default: return (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-700 dark:text-gray-400">
                <span className="text-primary-blue font-bold mb-2 block uppercase text-[10px]">Raw Data Debugger</span>
                {JSON.stringify(data, null, 2)}
            </div>
        );
    }
};

export default ChartRenderer;
